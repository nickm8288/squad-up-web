import bcrypt from 'bcryptjs';

/**
 * Hash a PIN using bcrypt. This runs on the client before storing the
 * hash in the database. Never store raw PINs.
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(pin, salt);
}

/**
 * Compare a raw PIN against a stored hash. Note that because hashing
 * happens on the client, this utility is only for client-side checks.
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(pin, hash);
}
