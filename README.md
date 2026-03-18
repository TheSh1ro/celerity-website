# Visão Geral do Projeto

**Última atualização:** 18/03/2026

---

## Descrição

Sistema completo de licenciamento para um bot de automação desktop. O produto central é um aplicativo Python que automatiza ações repetitivas em um jogo de PC. O acesso ao app é controlado por licença, sem licença ativa, o app não abre.

O modelo de negócio tem dois caminhos:

- **Uso próprio:** O usuário compra créditos via Pix no site e usa os créditos para estender sua própria licença.
- **Revenda:** O usuário compra créditos, gera keys de licença a preço promocional e as vende por fora do sistema (grupos, Pix direto, etc). O cliente final ativa a key no site e cria sua própria conta.

Qualquer conta pode revender, não há hierarquia. Se uma key gerada não for usada, o revendedor pode revertê-la e recuperar os créditos.

---

## App Python (Desktop)

Bot de automação para jogo de PC. Controla o mouse via sequências temporizadas, com múltiplos modos de operação. A interface é feita em tkinter.

O acesso ao bot é controlado por licença em dias. Ao abrir, o app verifica se o usuário tem licença ativa. Sem licença, a execução é bloqueada.

---

## Sistema de Vendas - Vue (Usuário Final)

Painel web usado pelo usuário para gerenciar sua conta.

### Login e Ativação

- Usuários existentes acessam com username e senha.
- Novos usuários chegam via key de revenda, informam a key, criam suas credenciais e já recebem acesso.

### Dashboard

Após login, o usuário pode:

- Ver seu saldo de créditos e o prazo da licença.
- **Comprar créditos** via Pix para usar no sistema.
- **Estender a licença** usando créditos, escolhendo entre planos de dias disponíveis.
- **Gerar keys de revenda** usando créditos, com preço promocional em relação ao uso próprio.
- **Gerenciar keys geradas**: ver status de cada key (disponível, usada ou revertida) e reverter as não utilizadas para recuperar créditos.

---

## Admin - Vue (Painel Administrativo)

Painel separado, acessível apenas por administradores.

O admin pode:

- Visualizar e buscar todos os usuários.
- Editar dados de usuários: senha, prazo de licença e status da conta.
- Adicionar ou remover créditos de qualquer usuário.
- Configurar o plano de revenda: duração, preço e se está ativo.
- Gerar keys gratuitamente, sem débito de créditos.
- Forçar logout de usuários.

---

## Stack

- **App desktop:** Python
- **Painel web (usuário e admin):** Vue 3
- **Backend / banco de dados:** Supabase (PostgreSQL)
- **Pagamentos:** Pix: gateway a ser definido
