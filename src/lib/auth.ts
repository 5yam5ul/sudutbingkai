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
    name: 'Arya Pratama',
    email: 'vendor@sudutbingkai.id',
    password: 'vendor123',
    role: 'vendor',
    companyName: 'Vows & Co. Wedding Planner',
    phone: '08118899001',
    instagram: '@vowsandco.wo',
    tier: 'pro',
    clientCount: 14
  }
};

// Backward-compatible alias
export const DEMO_USERS = SYSTEM_USERS;

export function authenticateUser(email: string, pass: string, role?: 'host' | 'vendor'): UserAccount | null {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();

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

  // Allow custom test login if user enters their own valid email and password
  if (cleanEmail && cleanPass.length >= 4) {
    return {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name: cleanEmail.split('@')[0].toUpperCase(),
      email: cleanEmail,
      role: role || 'host',
      companyName: role === 'vendor' ? 'Mitra Organizer' : undefined
    };
  }

  return null;
}

const STORAGE_KEY = 'sb_auth_session';

export function getClientSession(): UserAccount | null {
  if (typeof window === 'undefined') return null;
  
  // 1. Try reading from localStorage first
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) return parsed;
    }
  } catch (e) {
    // Ignore localStorage parse failure
  }

  // 2. Fallback to 60-day persistent cookie
  try {
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
      c = c.trim();
      if (c.startsWith(`${STORAGE_KEY}=`)) {
        const val = decodeURIComponent(c.substring(STORAGE_KEY.length + 1));
        const parsed = JSON.parse(val);
        if (parsed && parsed.id) {
          // Re-sync to localStorage
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          } catch {}
          return parsed;
        }
      }
    }
  } catch (e) {
    // Ignore cookie read failure
  }

  return null;
}

export function setClientSession(user: UserAccount): void {
  if (typeof window === 'undefined') return;
  const serialized = JSON.stringify(user);

  try {
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {
    console.error('Failed to write session to localStorage', e);
  }

  try {
    // 60 days cookie (60 * 24 * 60 * 60 seconds)
    const maxAge = 60 * 24 * 60 * 60;
    document.cookie = `${STORAGE_KEY}=${encodeURIComponent(serialized)}; max-age=${maxAge}; path=/; SameSite=Lax`;
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

