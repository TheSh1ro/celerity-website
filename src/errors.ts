// src/errors.ts

export class SessionInvalidError extends Error {
  constructor() {
    super('session_invalid')
    this.name = 'SessionInvalidError'
  }
}

const errorMessages: Record<string, string> = {
  // Sessão
  session_invalid: 'Sessão expirada. Faça login novamente.',
  session_sharing: 'Conta em uso em outro dispositivo.',

  // Autenticação
  invalid_credentials: 'Usuário ou senha incorretos.',
  inactive: 'Conta desativada. Entre em contato com o suporte.',
  expired: 'Sua licença expirou.',

  // Ativação de key
  key_not_found: 'Key não encontrada.',
  key_already_used: 'Essa key já foi utilizada.',
  key_reverted: 'Essa key foi cancelada.',
  key_already_reverted: 'Essa key já foi revertida.',
  user_already_exists: 'Esse usuário já existe.',

  // Créditos e planos
  insufficient_credits: 'Créditos insuficientes.',
  no_resale_plan: 'Plano de revenda não configurado.',
  plan_not_found: 'Plano não encontrado.',

  // Permissões
  forbidden: 'Sem permissão para realizar essa ação.',

  // Rede
  network_error: 'Erro de conexão. Tente novamente.',
}

export function resolveError(status: string): string {
  return errorMessages[status] ?? `Erro inesperado: ${status}`
}
