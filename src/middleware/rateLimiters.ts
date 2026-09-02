import rateLimit from 'express-rate-limit';

// Scoped tightly to credential-guessing-sensitive endpoints (login, password
// reset) — separate from the generous general '/api' limiter in server.ts,
// which is intentionally loose to accommodate legitimate multi-terminal
// billing traffic and would do nothing to slow down a password brute force.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
