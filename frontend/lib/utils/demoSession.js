'use client';

const DEMO_SESSION_KEY = 'hope_demo_session';

const DEMO_USERS = {
  user: {
    id: 'demo-user-001',
    name: 'Demo User',
    username: 'Demo User',
    email: 'demo.user@hope.local',
    role: 'user',
    is_demo: true,
    rank_name: 'Bronze',
    sponsor_id: 'sponsor-demo-01'
  },
  seller: {
    id: 'demo-seller-001',
    name: 'Demo Seller',
    username: 'Demo Seller',
    email: 'demo.seller@hope.local',
    role: 'seller',
    is_demo: true,
    rank_name: 'Silver',
    sponsor_id: 'sponsor-demo-02'
  },
  admin: {
    id: 'demo-admin-001',
    name: 'Demo Admin',
    username: 'Demo Admin',
    email: 'demo.admin@hope.local',
    role: 'admin',
    is_demo: true,
    rank_name: 'Gold',
    sponsor_id: 'board-demo-01'
  }
};

const DEMO_REDIRECTS = {
  user: '/shop',
  seller: '/seller',
  admin: '/admin'
};

function canUseStorage() {
  return typeof window !== 'undefined';
}

export function getDemoRedirectPath(role) {
  return DEMO_REDIRECTS[role] || '/shop';
}

export function buildDemoSession(role) {
  const user = DEMO_USERS[role] || DEMO_USERS.user;
  return {
    token: `demo-token-${user.role}`,
    user
  };
}

export function storeDemoSession(session) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
}

export function getStoredDemoSession() {
  if (!canUseStorage()) return null;
  const raw = window.localStorage.getItem(DEMO_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.user?.is_demo && parsed?.token) return parsed;
  } catch (_error) {
    window.localStorage.removeItem(DEMO_SESSION_KEY);
  }

  return null;
}

export function clearDemoSession() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(DEMO_SESSION_KEY);
}

export function isDemoSessionActive() {
  return Boolean(getStoredDemoSession()?.user?.is_demo);
}
