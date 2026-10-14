const MINIMUM_SECRET_LENGTH = 16;

export function getSessionSecret() {
  const value = process.env.AUTHFA_SESSION_SECRET;
  if (!value || value.length < MINIMUM_SECRET_LENGTH) {
    throw new Error("Defina AUTHFA_SESSION_SECRET com pelo menos 16 caracteres.");
  }
  return new TextEncoder().encode(value);
}
