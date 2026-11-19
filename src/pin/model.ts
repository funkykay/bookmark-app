import { storage } from '../storage';

export interface PinSettings {
  salt: string;
  hash: string;
  attempts: number;
  lockUntil: number;
}

const iterations = 600_000;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const password = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const saltBytes = Uint8Array.from(salt.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' }, password, 256);
  return toHex(new Uint8Array(bits));
}

export async function createPinSettings(pin: string): Promise<PinSettings> {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, hash: await hashPin(pin, salt), attempts: 0, lockUntil: 0 };
}

export async function matchesPin(pin: string, settings: PinSettings): Promise<boolean> {
  return await hashPin(pin, settings.salt) === settings.hash;
}

export function loadPinSettings(): PinSettings | null {
  try {
    const stored = storage.read('pin');
    if (stored === null) return null;

    const item: unknown = JSON.parse(stored);
    if (typeof item !== 'object' || item === null) return null;
    if (!('salt' in item) || typeof item.salt !== 'string' || !/^[a-f0-9]{32}$/.test(item.salt)) return null;
    if (!('hash' in item) || typeof item.hash !== 'string' || !/^[a-f0-9]{64}$/.test(item.hash)) return null;

    const attempts = 'attempts' in item && typeof item.attempts === 'number' && Number.isInteger(item.attempts)
      ? Math.max(0, Math.min(2, item.attempts)) : 0;
    const lockUntil = 'lockUntil' in item && typeof item.lockUntil === 'number' && Number.isFinite(item.lockUntil)
      ? Math.max(0, item.lockUntil) : 0;
    return { salt: item.salt, hash: item.hash, attempts, lockUntil };
  } catch {
    return null;
  }
}

export function savePinSettings(settings: PinSettings | null): void {
  if (settings) storage.write('pin', JSON.stringify(settings));
  else storage.remove('pin');
}
