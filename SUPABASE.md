# Documentação Técnica — Supabase Database

**Database:** PostgreSQL 15
**Owner padrão das funções/tabelas:** `postgres`

---

## Extensões Instaladas

| Extensão             | Schema       | Observação                        |
| -------------------- | ------------ | --------------------------------- |
| `pg_graphql`         | `graphql`    | GraphQL automático sobre o schema |
| `pg_stat_statements` | `extensions` | Monitoramento de queries          |
| `pgcrypto`           | `extensions` | bcrypt (`crypt`, `gen_salt`)      |
| `supabase_vault`     | `vault`      | Armazenamento seguro de secrets   |
| `uuid-ossp`          | `extensions` | Geração de UUIDs                  |

---

## Modelo de Autenticação

| Contexto                  | Mecanismo                                             |
| ------------------------- | ----------------------------------------------------- |
| Usuários finais (desktop) | Token customizado via `login` / `verify_session`      |
| Usuários finais (web)     | Token customizado via `web_login`                     |
| Painel admin (Vue)        | Supabase Auth → JWT com `app_metadata.is_admin: true` |

As **RLS policies** usam o JWT do Supabase Auth — funcionam apenas para o painel admin.
As **RPCs** usam tokens armazenados em `users.web_token` e `users.active_token`.
Tabelas sem policies (`keys`, `transactions`, `pix_payments`) bloqueiam acesso direto para todos — acessíveis exclusivamente via RPCs `SECURITY DEFINER`.

---

## Tabelas

### `plans`

Planos de licença disponíveis para compra pelos usuários.

```sql
CREATE TABLE public.plans (
  duration_days integer PRIMARY KEY,
  price         numeric NOT NULL,
  CONSTRAINT plans_price_check CHECK (price > 0)
);
```

**RLS:** Habilitado. Policy pública de leitura (`plans_public_read`): `SELECT WHERE true`.
Sem políticas de escrita — modificações apenas via SQL direto.

---

### `resale_plans`

Planos promocionais para geração de keys por revendedores.

```sql
CREATE TABLE public.resale_plans (
  duration_days integer     PRIMARY KEY,
  price         numeric     NOT NULL CHECK (price >= 0),
  is_active     boolean     DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
```

**RLS:** Habilitado. Três policies — todas requerem JWT admin (`app_metadata.is_admin = true`):

| Policy                          | Operação |
| ------------------------------- | -------- |
| `Admin can read resale_plans`   | SELECT   |
| `Admin can insert resale_plans` | INSERT   |
| `Admin can update resale_plans` | UPDATE   |

Leitura por revendedores via RPC `get_active_resale_plan()`.

---

### `users`

Tabela central. Contém usuários finais e o admin.

```sql
CREATE TABLE public.users (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  username              text        NOT NULL,
  password_hash         text        NOT NULL,
  email                 text,
  is_active             boolean     NOT NULL DEFAULT true,
  credits               numeric     NOT NULL DEFAULT 0 CHECK (credits >= 0),
  software_access_until timestamptz,
  active_token          text,
  machine_id            text,
  last_seen             timestamptz,
  web_token             text,
  is_admin              boolean     NOT NULL DEFAULT false,
  CONSTRAINT users_username_key UNIQUE (username)
);
```

**Índices:**

```sql
CREATE INDEX idx_users_active_token ON public.users USING btree (active_token);
CREATE INDEX idx_users_web_token    ON public.users USING btree (web_token);
CREATE INDEX idx_users_username     ON public.users USING btree (username);
```

**RLS:** Habilitado. Três policies — todas requerem JWT admin:

| Policy               | Operação |
| -------------------- | -------- |
| `admin_read_users`   | SELECT   |
| `admin_insert_users` | INSERT   |
| `admin_update_users` | UPDATE   |

Usuários nunca são deletados — apenas desativados via `is_active = false`.

**Trigger `hash_password_trigger`** (BEFORE INSERT OR UPDATE, FOR EACH ROW):

Executa `hash_user_password()`. Em `INSERT` sempre aplica bcrypt. Em `UPDATE` aplica bcrypt apenas se `new.password_hash <> old.password_hash`.

---

### `keys`

Keys de ativação geradas por revendedores ou pelo admin.

```sql
CREATE TABLE public.keys (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  key           text        NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  duration_days integer     NOT NULL REFERENCES public.plans(duration_days),
  price         numeric     NOT NULL,
  created_by    uuid        NOT NULL REFERENCES public.users(id),
  used          boolean     NOT NULL DEFAULT false,
  used_by       uuid        REFERENCES public.users(id),
  used_at       timestamptz,
  reverted      boolean     NOT NULL DEFAULT false,
  reverted_at   timestamptz
);
```

`duration_days` possui FK para `plans(duration_days)` — só é possível gerar keys para durações que existam em `plans`.
Todas as FKs usam `ON DELETE NO ACTION` (padrão).

**Índices:**

```sql
CREATE INDEX idx_keys_created_by ON public.keys (created_by);
```

**RLS:** Habilitado, sem nenhuma policy — acesso exclusivo via RPCs.

---

### `transactions`

Histórico de todas as movimentações de crédito.

```sql
CREATE TABLE public.transactions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  user_id      uuid        NOT NULL REFERENCES public.users(id),
  type         text        NOT NULL CHECK (type IN (
                             'pix_credit', 'key_generate', 'key_revert',
                             'days_purchase', 'admin_credit_add', 'admin_credit_remove'
                           )),
  amount       numeric     NOT NULL,
  reference_id text
);
```

**Índices:**

```sql
CREATE INDEX idx_transactions_user_id ON public.transactions (user_id);
```

**RLS:** Habilitado, sem nenhuma policy — acesso exclusivo via RPCs.

---

### `pix_payments`

Pagamentos PIX criados pelo sistema.

```sql
CREATE TABLE public.pix_payments (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  user_id      uuid        NOT NULL REFERENCES public.users(id),
  amount       numeric     NOT NULL CHECK (amount > 0),
  status       text        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'confirmed', 'failed')),
  external_id  text        NOT NULL UNIQUE,
  confirmed_at timestamptz
);
```

**RLS:** Habilitado, sem nenhuma policy — acesso exclusivo via RPCs.

---

### `login_attempts`

Registro de tentativas de login para rate limiting. Usada por `login` e `web_login`.

```sql
CREATE TABLE public.login_attempts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  attempted_at timestamptz NOT NULL DEFAULT now(),
  username     text        NOT NULL,
  success      boolean     NOT NULL
);

CREATE INDEX idx_login_attempts_username_at ON public.login_attempts (username, attempted_at);
```

**RLS:** Habilitado, sem nenhuma policy — acesso exclusivo via RPCs.

Limpeza recomendada periodicamente:

```sql
DELETE FROM login_attempts WHERE attempted_at < now() - interval '7 days';
```

| Tabela         | Coluna          | Referencia             | ON DELETE |
| -------------- | --------------- | ---------------------- | --------- |
| `keys`         | `duration_days` | `plans(duration_days)` | NO ACTION |
| `keys`         | `created_by`    | `users(id)`            | NO ACTION |
| `keys`         | `used_by`       | `users(id)`            | NO ACTION |
| `pix_payments` | `user_id`       | `users(id)`            | NO ACTION |
| `transactions` | `user_id`       | `users(id)`            | NO ACTION |

Deletar um usuário referenciado em qualquer dessas tabelas causará erro de FK.

---

## RLS — Resumo por Tabela

| Tabela           | RLS   | Policies                             | Acesso público |
| ---------------- | ----- | ------------------------------------ | -------------- |
| `plans`          | ✅ ON | `plans_public_read` (SELECT: `true`) | Leitura livre  |
| `resale_plans`   | ✅ ON | Admin: SELECT, INSERT, UPDATE        | Nenhum         |
| `users`          | ✅ ON | Admin: SELECT, INSERT, UPDATE        | Nenhum         |
| `keys`           | ✅ ON | Nenhuma policy                       | Bloqueado      |
| `transactions`   | ✅ ON | Nenhuma policy                       | Bloqueado      |
| `pix_payments`   | ✅ ON | Nenhuma policy                       | Bloqueado      |
| `login_attempts` | ✅ ON | Nenhuma policy                       | Bloqueado      |

---

## Grants por Role

Todas as funções públicas têm `EXECUTE` para `anon`, `authenticated` e `service_role`.
Todas as tabelas têm `ALL` para `anon`, `authenticated` e `service_role` — acesso controlado via RLS.

---

## RPCs (Funções)

Todas as RPCs são `SECURITY DEFINER`, linguagem `plpgsql`, owner `postgres`.

---

### `resolve_user_by_token(p_token text) → users`

Função helper interna. Busca a row do usuário pelo `active_token` **ou** `web_token`. Retorna row vazia se não encontrado.

---

### `activate_key(p_key, p_username, p_password, p_email?) → json`

Cria uma nova conta usando uma key de ativação.

**Fluxo:**

1. Busca a key com `FOR UPDATE`
2. Valida: não usada, não revertida
3. Verifica que o username não existe
4. Cria usuário com `software_access_until = now() + duration_days`
5. Marca a key: `used = true`, `used_by`, `used_at = now()`

`p_password` é inserido direto em `password_hash` — o trigger aplica bcrypt automaticamente no INSERT.

| Retorno               | Significado              |
| --------------------- | ------------------------ |
| `ok`                  | Conta criada com sucesso |
| `key_not_found`       | Key inexistente          |
| `key_already_used`    | Key já foi utilizada     |
| `key_reverted`        | Key foi cancelada        |
| `user_already_exists` | Username já cadastrado   |

---

### `login(p_username, p_password, p_machine_id) → json`

Login do cliente desktop.

**Fluxo:**

1. Verifica rate limit: 5 tentativas `success = false` no último minuto para o username
2. Valida credenciais com `crypt(p_password, password_hash)`
3. Registra tentativa em `login_attempts`
4. Verifica `is_active` e `software_access_until`
5. Detecção de session sharing: se `machine_id` diverge e `last_seen > now() - 7 days`, retorna `session_sharing`
6. Gera `active_token = encode(gen_random_bytes(32), 'hex')`
7. Atualiza `active_token`, `machine_id`, `last_seen`

| Retorno                                  | Significado                  |
| ---------------------------------------- | ---------------------------- |
| `ok` + `token` + `software_access_until` | Login bem-sucedido           |
| `invalid_credentials`                    | Usuário ou senha incorretos  |
| `inactive`                               | Conta desativada             |
| `expired`                                | Licença expirada ou nula     |
| `session_sharing` + `days_ago`           | Sessão ativa em outro device |
| `too_many_attempts`                      | Rate limit atingido          |

---

### `verify_session(p_token, p_machine_id) → json`

Verifica e renova sessão do cliente desktop. Aceita **apenas** `active_token`.

**Fluxo:**

1. Busca por `active_token = p_token`
2. Valida `is_active` e `software_access_until`
3. Mesma lógica de `session_sharing` do `login`
4. Atualiza `machine_id` e `last_seen`
5. Retorna o **mesmo token** recebido (não gera novo)

| Retorno                                  | Significado                  |
| ---------------------------------------- | ---------------------------- |
| `ok` + `token` + `software_access_until` | Sessão válida                |
| `session_invalid`                        | Token não encontrado         |
| `inactive`                               | Conta desativada             |
| `expired`                                | Licença expirada             |
| `session_sharing` + `days_ago`           | Sessão ativa em outro device |

---

### `web_login(p_username, p_password) → json`

Login do painel web.

**Fluxo:**

1. Verifica rate limit: 5 tentativas `success = false` no último minuto para o username
2. Valida credenciais
3. Registra tentativa em `login_attempts`
4. Verifica `is_active`
5. Verifica `software_access_until` — admin (`is_admin = true`) é isento desta verificação
6. Gera `web_token = encode(gen_random_bytes(32), 'hex')`

| Retorno                                  | Significado                 |
| ---------------------------------------- | --------------------------- |
| `ok` + `token` + `software_access_until` | Login bem-sucedido          |
| `invalid_credentials`                    | Usuário ou senha incorretos |
| `inactive`                               | Conta desativada            |
| `expired`                                | Licença expirada            |
| `too_many_attempts`                      | Rate limit atingido         |

---

### `get_user_profile(p_token) → json`

Retorna perfil do usuário autenticado. Aceita `active_token` ou `web_token`.

```json
{
  "status": "ok",
  "id": "uuid",
  "username": "string",
  "email": "string|null",
  "is_active": true,
  "is_admin": false,
  "credits": 0,
  "software_access_until": "timestamptz|null"
}
```

| Retorno           | Significado    |
| ----------------- | -------------- |
| `ok` + campos     | Sucesso        |
| `session_invalid` | Token inválido |

---

### `get_user_transactions(p_token) → json`

Retorna histórico de transações do usuário. Aceita `active_token` ou `web_token`. Ordenado por `created_at DESC`.

Campos: `id`, `created_at`, `type`, `amount`, `reference_id`, `label`.

| `type`                | `label`                                 |
| --------------------- | --------------------------------------- |
| `pix_credit`          | Créditos adicionados via PIX            |
| `key_generate`        | Key gerada                              |
| `key_revert`          | Key revertida                           |
| `days_purchase`       | Compra de licença (`reference_id` dias) |
| `admin_credit_add`    | Créditos adicionados pelo admin         |
| `admin_credit_remove` | Créditos removidos pelo admin           |

---

### `get_user_keys(p_token) → json`

Retorna todas as keys criadas pelo usuário. Aceita `active_token` ou `web_token`. Ordenado por `created_at DESC`.

Campos: `id`, `key`, `duration_days`, `price`, `created_at`, `used`, `used_at`, `reverted`, `reverted_at`.

---

### `generate_key(p_token) → json`

Gera uma key usando o plano de revenda ativo (30 dias). Aceita `active_token` ou `web_token`.

**Fluxo:**

1. Busca usuário com `FOR UPDATE`
2. Verifica `is_active`
3. Busca `resale_plans WHERE duration_days = 30 AND is_active = true`
4. Verifica créditos: `credits >= plan.price`
5. Gera key: `encode(gen_random_bytes(16), 'hex')`
6. Debita créditos do usuário
7. Insere key com `price = resale_plan.price`, `duration_days = 30`, `created_by = user.id`
8. Registra transação `key_generate` com `amount = -plan.price`

| Retorno                | Significado                             |
| ---------------------- | --------------------------------------- |
| `ok` + `key`           | Key gerada                              |
| `session_invalid`      | Token inválido                          |
| `inactive`             | Conta desativada                        |
| `no_resale_plan`       | Plano de 30 dias inativo ou inexistente |
| `insufficient_credits` | Créditos insuficientes                  |

---

### `revert_key(p_token, p_key_id) → json`

Reverte uma key não utilizada, estornando os créditos. Aceita `active_token` ou `web_token`.

**Fluxo:**

1. Resolve usuário pelo token
2. Busca key por `id` com `FOR UPDATE`
3. Valida: pertence ao usuário, não usada, não revertida
4. Estorna `key.price` nos créditos do usuário
5. Marca `reverted = true`, `reverted_at = now()`
6. Registra transação `key_revert` com `amount = +key.price`

| Retorno                | Significado                  |
| ---------------------- | ---------------------------- |
| `ok`                   | Key revertida                |
| `session_invalid`      | Token inválido               |
| `key_not_found`        | Key inexistente              |
| `forbidden`            | Key pertence a outro usuário |
| `key_already_used`     | Key já foi utilizada         |
| `key_already_reverted` | Key já foi revertida         |

---

### `buy_days(p_token, p_duration_days) → json`

Compra dias de licença usando créditos. Aceita `active_token` ou `web_token`.

**Fluxo:**

1. Busca usuário com `FOR UPDATE`
2. Verifica `is_active`
3. Busca plano em `plans WHERE duration_days = p_duration_days`
4. Verifica créditos
5. Calcula: `GREATEST(COALESCE(software_access_until, now()), now()) + interval`
6. Debita créditos e atualiza `software_access_until`
7. Registra transação `days_purchase` com `amount = -plan.price`, `reference_id = duration_days::text`

| Retorno                        | Significado            |
| ------------------------------ | ---------------------- |
| `ok` + `software_access_until` | Licença estendida      |
| `session_invalid`              | Token inválido         |
| `inactive`                     | Conta desativada       |
| `invalid_plan`                 | Plano não encontrado   |
| `insufficient_credits`         | Créditos insuficientes |

---

### `create_pix_payment(p_token, p_amount, p_external_id) → json`

Cria um pagamento PIX com status `pending`. Aceita **apenas** `active_token` (desktop).

**Fluxo:**

1. Busca usuário por `active_token`
2. Valida `p_amount > 0`
3. Insere em `pix_payments` com `status = 'pending'`
4. Retorna `payment_id`

| Retorno             | Significado          |
| ------------------- | -------------------- |
| `ok` + `payment_id` | Pagamento criado     |
| `session_invalid`   | Token inválido       |
| `invalid_amount`    | Valor inválido (≤ 0) |

---

### `confirm_pix_payment(p_external_id, p_webhook_secret) → json`

Confirma pagamento via webhook. Idempotente.

**Fluxo:**

1. Valida `p_webhook_secret` contra `current_setting('app.webhook_secret', true)`
2. Busca pagamento por `external_id` com `FOR UPDATE`
3. Se já `confirmed`, retorna `already_confirmed`
4. Atualiza `status = 'confirmed'`, `confirmed_at = now()`
5. Credita `payment.amount` no usuário
6. Registra transação `pix_credit` com `amount = +payment.amount`

| Retorno             | Significado              |
| ------------------- | ------------------------ |
| `ok`                | Pagamento confirmado     |
| `unauthorized`      | Webhook secret inválido  |
| `payment_not_found` | Pagamento não encontrado |
| `already_confirmed` | Já estava confirmado     |

---

### `get_active_resale_plan() → json`

Retorna o plano de revenda de 30 dias se ativo. Sem autenticação requerida.

| Retorno                            | Significado       |
| ---------------------------------- | ----------------- |
| `ok` + `days` + `price`            | Plano encontrado  |
| `not_found` + `days: 30, price: 0` | Plano inexistente |

---

### `get_license_plans() → json`

Retorna todos os planos de licença disponíveis para compra. Sem autenticação requerida.

Campos de cada plano: `days`, `price`.

| Retorno          | Significado       |
| ---------------- | ----------------- |
| `ok` + `plans[]` | Planos retornados |

---

### `admin_get_user_keys(p_user_id uuid) → json` _(requer JWT admin)_

Retorna todas as keys geradas por um usuário específico. Ordenado por `created_at DESC`.

Campos: `id`, `key`, `duration_days`, `price`, `created_at`, `used`, `used_at`, `reverted`, `reverted_at`.

| Retorno         | Significado     |
| --------------- | --------------- |
| `ok` + `keys[]` | Keys retornadas |
| `forbidden`     | Não é admin     |

---

### `admin_adjust_credits(p_user_id, p_amount, p_operation) → json` _(requer JWT admin)_

Adiciona ou remove créditos de um usuário.

**Parâmetros:**

- `p_operation`: `'add'` ou `'remove'`
- `p_amount`: deve ser `> 0`

**Fluxo:**

1. Verifica JWT admin
2. Valida parâmetros
3. Busca usuário por `p_user_id`
4. Calcula novos créditos — não permite negativos em `remove`
5. Atualiza créditos
6. Registra transação `admin_credit_add` ou `admin_credit_remove` com `reference_id = 'admin_adjustment'`

Retorna: `status`, `username`, `previous_credits`, `new_credits`.

| Retorno                | Significado                  |
| ---------------------- | ---------------------------- |
| `ok` + campos          | Sucesso                      |
| `forbidden`            | Não é admin                  |
| `invalid_amount`       | `p_amount <= 0`              |
| `invalid_operation`    | Fora de `'add'` / `'remove'` |
| `user_not_found`       | Usuário não encontrado       |
| `insufficient_credits` | Saldo ficaria negativo       |

---

### `admin_update_resale_plan(p_duration_days, p_price, p_is_active) → json` _(requer JWT admin)_

Cria ou atualiza um plano de revenda (upsert por `duration_days`).

**Validações:** `p_price >= 0`, `p_duration_days > 0`.

Retorna: `status`, `days`, `price`, `is_active`.

---

## Funções de Sistema

### `rls_auto_enable() → event_trigger`

Habilita RLS automaticamente em qualquer nova tabela criada no schema `public`. Disparado nos eventos `CREATE TABLE`, `CREATE TABLE AS`, `SELECT INTO`. Ignora schemas de sistema.

---

## Supabase Auth — Setup do Admin

**Passo 1** — Criar conta pelo app via `activate_key`.

**Passo 2** — Promover em `public.users`:

```sql
UPDATE public.users SET is_admin = true WHERE username = 'seu_username';
```

**Passo 3** — Criar conta no Supabase Auth (Dashboard → Authentication → Add User) com o mesmo email.

**Passo 4** — Setar `is_admin` no `app_metadata` (não editável pela UI do Dashboard):

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"is_admin": true}'::jsonb
WHERE email = 'seu_email';
```

**Passo 5** — Garantir `software_access_until > now()` em `public.users` para o usuário admin, pois apenas `web_login` de usuários comuns exige licença. Admin é isento, mas o campo ainda precisa existir para outros contextos.

---

## Variáveis de Ambiente

```env
# Supabase / Edge Functions
WEBHOOK_SECRET=seu_secret_aqui
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=seu_anon_key_aqui

# Vue (painel admin)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=seu_anon_key_aqui

# Python / outros clientes
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=seu_anon_key_aqui
```

---

## Queries de Manutenção

```sql
-- Limpar tokens inativos há mais de 30 dias
UPDATE users
SET active_token = NULL, machine_id = NULL, web_token = NULL
WHERE last_seen < now() - interval '30 days';

-- Desativar usuários com licença expirada há mais de 90 dias
UPDATE users
SET is_active = false
WHERE software_access_until < now() - interval '90 days'
  AND is_active = true;

-- Marcar pagamentos pendentes há mais de 24h como failed
UPDATE pix_payments
SET status = 'failed'
WHERE status = 'pending'
  AND created_at < now() - interval '24 hours';
```

---

## Relatórios

```sql
-- Transações por tipo
SELECT type, COUNT(*) AS quantidade, SUM(amount) AS total
FROM transactions
GROUP BY type
ORDER BY quantidade DESC;

-- Top 10 revendedores
SELECT u.username,
  COUNT(k.id)                          AS keys_geradas,
  COUNT(CASE WHEN k.used THEN 1 END)  AS keys_vendidas,
  SUM(k.price)                         AS receita_total
FROM users u
LEFT JOIN keys k ON k.created_by = u.id
GROUP BY u.id, u.username
ORDER BY keys_vendidas DESC
LIMIT 10;

-- Keys por status
SELECT
  COUNT(*) FILTER (WHERE NOT used AND NOT reverted) AS disponiveis,
  COUNT(*) FILTER (WHERE used)                      AS usadas,
  COUNT(*) FILTER (WHERE reverted)                  AS revertidas,
  COUNT(*)                                           AS total
FROM keys;

-- Créditos em circulação
SELECT SUM(credits) AS total, AVG(credits) AS media, COUNT(*) AS usuarios_ativos
FROM users
WHERE is_active = true;
```

---

## Troubleshooting

### "permission denied for table X"

RLS ativo sem JWT válido, ou tabela sem policies. `keys`, `transactions` e `pix_payments` são inacessíveis diretamente mesmo com JWT admin. Use RPCs.

### "new row violates check constraint"

- `plans`: `price` deve ser `> 0`
- `pix_payments`: `amount > 0`, `status` fora do enum
- `users`: `credits >= 0`

### "violates foreign key constraint 'keys_duration_days_fkey'"

O `duration_days` usado não existe em `plans`. Verifique se o valor do `resale_plan` tem correspondente na tabela `plans`.

### "duplicate key value violates unique constraint"

`username`, `key` ou `external_id` já existe.

### `login` ou `web_login` retorna `too_many_attempts`

5 tentativas com credenciais inválidas no último minuto para o username. Aguarde 1 minuto e tente novamente.

### Sessão desktop não funciona

1. `active_token` salvo corretamente no cliente
2. `machine_id` gerado de forma consistente entre sessões
3. Usuário ativo e licença não expirada
4. Sem sessão ativa em outro device nos últimos 7 dias

### Admin não consegue acessar o painel Vue

1. `public.users.is_admin = true`
2. `auth.users.raw_app_meta_data->>'is_admin' = 'true'`
3. JWT sendo enviado corretamente
4. Sessão do Supabase Auth não expirada
5. `software_access_until` válido

---

## Backup

```bash
# Backup
pg_dump -h db.seu-projeto.supabase.co -U postgres -d postgres --schema=public \
  > backup_$(date +%Y%m%d).sql

# Restore
psql -h db.seu-projeto.supabase.co -U postgres -d postgres < backup.sql
```
