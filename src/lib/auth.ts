import { UserAccount } from './types';

export const DEMO_USERS: Record<string, UserAccount> = {
  'pengantin': {
    id: 'user_sarah_dimas',
    name: 'Sarah & Dimas',
    email: 'sarah@sudutbingkai.id',
    role: 'host',
    phone: '081298765432'
  },
  'vendor': {
    id: 'vendor_vows_co',
    name: 'Arya Pratama',
    email: 'arya@vowsandco.id',
    role: 'vendor',
    companyName: 'Vows & Co. Wedding Planner',
    phone: '08118899001',
    instagram: '@vowsandco.wo',
    tier: 'pro',
    clientCount: 14
  }
};

const STORAGE_KEY = 'sb_auth_session';

export function getClientSession(): UserAccount | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setClientSession(user: UserAccount): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearClientSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
