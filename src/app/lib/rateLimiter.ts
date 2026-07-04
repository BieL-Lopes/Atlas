/**
 * Rate Limiter client-side (sliding window).
 * Camada extra de proteção contra brute-force via UI.
 * Não substitui rate limit server-side (Supabase Auth já faz).
 */

interface Attempt {
  timestamp: number;
}

export class RateLimiter {
  private attempts: Attempt[] = [];
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts: number, windowSeconds: number) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowSeconds * 1000;
  }

  /** Remove tentativas fora da janela. */
  private prune(): void {
    const now = Date.now();
    this.attempts = this.attempts.filter(a => now - a.timestamp < this.windowMs);
  }

  /** Verifica se pode fazer mais uma tentativa. */
  canAttempt(): boolean {
    this.prune();
    return this.attempts.length < this.maxAttempts;
  }

  /** Registra uma tentativa. */
  recordAttempt(): void {
    this.prune();
    this.attempts.push({ timestamp: Date.now() });
  }

  /** Retorna quantos segundos faltam até poder tentar novamente (0 se já pode). */
  getRetryAfterSeconds(): number {
    this.prune();
    if (this.attempts.length < this.maxAttempts) return 0;
    const oldest = this.attempts[0];
    if (!oldest) return 0;
    const elapsed = Date.now() - oldest.timestamp;
    const remaining = this.windowMs - elapsed;
    return Math.max(0, Math.ceil(remaining / 1000));
  }

  /** Reseta todas as tentativas (útil após login bem-sucedido). */
  reset(): void {
    this.attempts = [];
  }
}

// ── Instâncias pré-configuradas ──

/** Login: máx 5 tentativas por minuto. */
export const loginLimiter = new RateLimiter(5, 60);

/** Signup: máx 3 tentativas por minuto. */
export const signupLimiter = new RateLimiter(3, 60);

/** Recuperação de senha: máx 3 tentativas por minuto. */
export const passwordResetLimiter = new RateLimiter(3, 60);

/** Validação de convite: máx 5 tentativas por minuto. */
export const inviteLimiter = new RateLimiter(5, 60);
