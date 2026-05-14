import argon2 from "argon2";

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
};

const COMMON_PASSWORDS = new Set([
  "password", "123456", "12345678", "qwerty", "abc123",
  "monkey", "letmein", "dragon", "111111", "baseball",
  "iloveyou", "trustno1", "sunshine", "master", "welcome",
  "shadow", "superman", "michael", "jesus", "ninja",
  "mustang", "password1", "123456789",
  "password123", "password123456", "qwerty123456",
  "12345678901", "123456789012", "1234567890123",
  "passw0rd", "pass@word1", "admin123456",
]);

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain, ARGON2_OPTIONS);
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 12) return "Password must be at least 12 characters.";
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return "Password is too common.";
  return null;
}
