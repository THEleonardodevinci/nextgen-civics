#!/usr/bin/env node
/**
 * Generates the value for ADMIN_ACCESS_CODE_HASH.
 *
 *   node scripts/hash-admin-code.mjs "some-long-random-code"
 *
 * Print the result into .env.local (or your Vercel environment variables).
 * The plaintext code is never stored anywhere by the application.
 */
import { scrypt, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const code = process.argv[2];

if (!code || code.length < 12) {
  console.error('Usage: node scripts/hash-admin-code.mjs "<code of at least 12 characters>"');
  process.exit(1);
}

const salt = randomBytes(16);
const key = await scryptAsync(code, salt, 32);

console.log(`ADMIN_ACCESS_CODE_HASH=scrypt$${salt.toString('hex')}$${key.toString('hex')}`);
