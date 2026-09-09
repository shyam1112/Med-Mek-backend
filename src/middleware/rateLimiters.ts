import rateLimit from 'express-rate-limit';

// Scoped tightly to credential-guessing-sensitive endpoints (login, password
// reset) — separate from the generous general '/api' limiter in server.ts,
// which is intentionally loose to accommodate legitimate multi-terminal
// billing traffic and would do nothing to slow down a password brute force.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // A pharmacy's staff often share one public IP (same shop WiFi, multiple
  // billing terminals) — this counter is per IP, not per account, so a
  // handful of legitimate concurrent logins/password resets could trip a
  // tight limit and lock out the whole shop. 30 still meaningfully slows a
  // credential-brute-force attempt while giving real multi-user shops room.
  max: 30,
  message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
