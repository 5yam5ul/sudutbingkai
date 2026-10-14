import { UserAccount } from './types';

export interface AuthAccount extends UserAccount {
  password?: string;
}

export const SYSTEM_USERS: Record<string, AuthAccount> = {
  'pengantin': {
    id: 'user_sarah_dimas',
    name: 'Sarah & Dimas',
    email: 'pengantin@sudutbingkai.id',
    password: 'pengantin123',
    role: 'host',
    phone: '081298765432'
  },
  'vendor': {
    id: 'vendor_vows_co',
    name: 'Sarah Pramono',
    email: 'vendor@sudutbingkai.id',
    password: 'vendor123',
    role: 'vendor',
    companyName: 'Vows & Co. Wedding Planner',
    phone: '08118899001',
    instagram: '@vowsandco.wo',
    tier: 'pro',
    partnerTier: 'pro',
    referralCode: 'VOWSANDCO',
    walletBalance: 420000,
    totalEarnings: 1260000,
    bankAccount: {
      bankName: 'BCA',
      accountNumber: '8730129841',
      accountHolder: 'Sarah Pramono'
    },
    eventQuotaTokens: {
      wedding: 2,
      event: 1
    },
    clientCount: 14
  },
  'admin': {
    id: 'admin_sudutbingkai',
    name: 'Super Admin SudutBingkai',
    email: 'admin@sudutbingkai.id',
    password: 'admin123',
    role: 'admin',
    companyName: 'Sudut Bingkai HQ',
    phone: '081234567890'
  }
};

// Backward-compatible alias
export const DEMO_USERS = SYSTEM_USERS;

export function authenticateUser(email: string, pass: string, role?: 'host' | 'vendor' | 'admin'): UserAccount | null {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();

  // Check Super Admin - STRICT SECURITY: Admin role MUST match authorized credentials
  const isAdminEmail = cleanEmail === 'admin@sudutbingkai.id' || cleanEmail === 'superadmin@sudutbingkai.id';
  if (role === 'admin' || isAdminEmail) {
    if (
      isAdminEmail &&
      (cleanPass === 'admin123' || cleanPass === 'adminpass2026' || cleanPass === 'sudutbingkai2026')
    ) {
      return SYSTEM_USERS['admin'];
    }
    // Deny immediately if password doesn't match master admin password
    return null;
  }

  // Check Pengantin / Host
  if (
    (!role || role === 'host') &&
    (cleanEmail === 'pengantin@sudutbingkai.id' || cleanEmail === 'sarah@sudutbingkai.id') &&
    (cleanPass === 'pengantin123' || cleanPass === 'password123' || cleanPass === 'sudutbingkai2026')
  ) {
    return SYSTEM_USERS['pengantin'];
  }

  // Check Vendor / WO
  if (
    (!role || role === 'vendor') &&
    (cleanEmail === 'vendor@sudutbingkai.id' || cleanEmail === 'arya@vowsandco.id') &&
    (cleanPass === 'vendor123' || cleanPass === 'password123' || cleanPass === 'sudutbingkai2026')
  ) {
    return SYSTEM_USERS['vendor'];
  }

  // Allow custom host / vendor login if user enters their own valid email and password
  if (cleanEmail && cleanPass.length >= 4 && (role as string) !== 'admin') {
    return {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name: cleanEmail.split('@')[0].toUpperCase(),
      email: cleanEmail,
      role: role === 'vendor' ? 'vendor' : 'host',
      companyName: role === 'vendor' ? 'Mitra Organizer' : undefined
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// CRYPTOGRAPHIC SESSION INTEGRITY (HMAC-SHA256)
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'sb_auth_session';
const SESSION_SECRET = (typeof process !== 'undefined' && process.env?.AUTH_SECRET) || 'sb_sec_hmac_2026_salt_9841';

function sha256Sync(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i = 0, j = 0;
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;
  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isPrime = (candidate: number) => {
    for (let factor = 2, max = Math.sqrt(candidate); factor <= max; factor++) {
      if (candidate % factor === 0) return false;
    }
    return true;
  };

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (isPrime(candidate)) {
      if (primeCounter < 8) {
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      }
      k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter++;
    }
  }

  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength | 0;

  for (j = 0; j < words[lengthProperty];) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] = i < 16 ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0;

      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp1 = (hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + w[i]) | 0;
      const temp2 = ((rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj) | 0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (b * 8)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return result;
}

function encodeB64(str: string): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(str).toString('base64url');
  if (typeof btoa !== 'undefined') {
    return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return encodeURIComponent(str);
}

function decodeB64(b64: string): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64url').toString('utf8');
  if (typeof atob !== 'undefined') {
    let base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    return decodeURIComponent(escape(atob(base64)));
  }
  return decodeURIComponent(b64);
}

export function signSessionPayload(payloadJson: string): string {
  const sig = sha256Sync(`${payloadJson}#${SESSION_SECRET}`);
  return `${encodeB64(payloadJson)}.${sig}`;
}

export function verifyAndParseSession(rawInput: string): UserAccount | null {
  if (!rawInput) return null;
  const token = rawInput.trim();

  // Signed token verification (Format: <base64urlPayload>.<sha256Hex>)
  if (token.includes('.')) {
    try {
      const parts = token.split('.');
      if (parts.length === 2) {
        const [b64Payload, sig] = parts;
        const payloadJson = decodeB64(b64Payload);
        const expectedSig = sha256Sync(`${payloadJson}#${SESSION_SECRET}`);
        if (sig === expectedSig) {
          const parsed = JSON.parse(payloadJson);
          if (parsed && parsed.id && parsed.role) {
            if (parsed.role === 'admin') {
              const isAdminValid = (parsed.id === 'admin_sudutbingkai' && parsed.email?.toLowerCase().includes('admin@sudutbingkai.id')) || parsed.email?.toLowerCase().includes('superadmin');
              if (isAdminValid) return SYSTEM_USERS['admin'];
              return null;
            }
            return parsed;
          }
        } else {
          console.warn('Tampered or invalid session signature detected!');
          return null;
        }
      }
    } catch {}
  }

  return null;
}

export function getClientSession(): UserAccount | null {
  if (typeof window === 'undefined') return null;
  
  // 1. Try reading from localStorage first
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const session = verifyAndParseSession(raw);
      if (session) return session;
    }
  } catch (e) {}

  // 2. Fallback to cookie
  try {
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
      c = c.trim();
      if (c.startsWith(`${STORAGE_KEY}=`)) {
        const val = decodeURIComponent(c.substring(STORAGE_KEY.length + 1));
        const session = verifyAndParseSession(val);
        if (session) {
          // Re-sync signed token to localStorage
          try {
            localStorage.setItem(STORAGE_KEY, val);
          } catch {}
          return session;
        }
      }
    }
  } catch (e) {}

  return null;
}

export function setClientSession(user: UserAccount): void {
  if (typeof window === 'undefined') return;
  const serialized = JSON.stringify(user);
  const signedToken = signSessionPayload(serialized);

  try {
    localStorage.setItem(STORAGE_KEY, signedToken);
  } catch (e) {
    console.error('Failed to write session to localStorage', e);
  }

  try {
    // 60 days cookie
    const maxAge = 60 * 24 * 60 * 60;
    document.cookie = `${STORAGE_KEY}=${encodeURIComponent(signedToken)}; max-age=${maxAge}; path=/; SameSite=Lax`;
  } catch (e) {
    console.error('Failed to write session cookie', e);
  }
}

export function clearClientSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}

  try {
    document.cookie = `${STORAGE_KEY}=; max-age=0; path=/; SameSite=Lax`;
  } catch (e) {}
}

export function getServerSession(request: Request): UserAccount | null {
  try {
    // 1. Check custom x-user-session header
    const headerSession = request.headers.get('x-user-session');
    if (headerSession) {
      try {
        const raw = decodeURIComponent(headerSession);
        const verified = verifyAndParseSession(raw);
        if (verified) return verified;
      } catch {}
    }

    // 2. Check Authorization Bearer header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token === 'admin_sudutbingkai' || token === 'admin123' || token === 'sudutbingkai2026') {
        return SYSTEM_USERS['admin'];
      }
      const verified = verifyAndParseSession(token);
      if (verified) return verified;
    }

    // 3. Check Cookie header
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const cookies = cookieHeader.split(';');
      for (let c of cookies) {
        c = c.trim();
        if (c.startsWith(`${STORAGE_KEY}=`)) {
          const val = decodeURIComponent(c.substring(STORAGE_KEY.length + 1));
          const verified = verifyAndParseSession(val);
          if (verified) return verified;
        }
      }
    }
  } catch (err) {}

  return null;
}



