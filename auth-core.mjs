const AUTH_USER_KEY = 'incredible-india-auth-user';
const AUTH_ACCOUNTS_KEY = 'incredible-india-auth-accounts';

function getStorage() {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
}

function readJson(key, fallback = null) {
  const storage = getStorage();
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJson(key, value) {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(key, JSON.stringify(value));
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashPassword(password) {
  let hash = 0;
  for (let index = 0; index < password.length; index += 1) {
    hash = (hash * 31 + password.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function createSessionUser(email, displayName, provider = 'local') {
  return {
    uid: `${provider}:${normalizeEmail(email)}`,
    email: normalizeEmail(email),
    displayName: displayName || 'User',
    photoURL: '',
    provider,
    createdAt: new Date().toISOString(),
    token: `${provider}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  };
}

export function getStoredAuthUser() {
  return readJson(AUTH_USER_KEY, null);
}

export function persistAuthUser(user) {
  if (!user) return;
  writeJson(AUTH_USER_KEY, user);
}

export function clearStoredAuthUser() {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(AUTH_USER_KEY);
}

export function getStoredAccounts() {
  return readJson(AUTH_ACCOUNTS_KEY, []);
}

function saveAccounts(accounts) {
  writeJson(AUTH_ACCOUNTS_KEY, accounts);
}

export function registerLocalUser({ email, password, displayName }) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password || password.length < 6) {
    const error = new Error('Password must be at least 6 characters.');
    error.code = 'auth/weak-password';
    throw error;
  }

  const accounts = getStoredAccounts();
  const existing = accounts.find((account) => normalizeEmail(account.email) === normalizedEmail);

  if (existing) {
    const error = new Error('An account already exists with this email.');
    error.code = 'auth/email-already-in-use';
    throw error;
  }

  const userRecord = {
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    displayName: displayName || normalizedEmail.split('@')[0],
    provider: 'local'
  };

  accounts.push(userRecord);
  saveAccounts(accounts);

  const user = createSessionUser(normalizedEmail, userRecord.displayName, 'local');
  persistAuthUser(user);
  return user;
}

export function signInLocalUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const accounts = getStoredAccounts();
  const account = accounts.find((item) => normalizeEmail(item.email) === normalizedEmail);

  if (!account) {
    const error = new Error('No account found with this email.');
    error.code = 'auth/user-not-found';
    throw error;
  }

  if (!account.passwordHash || account.passwordHash !== hashPassword(password)) {
    const error = new Error('Incorrect password. Please try again.');
    error.code = 'auth/wrong-password';
    throw error;
  }

  const user = createSessionUser(normalizedEmail, account.displayName || normalizedEmail.split('@')[0], 'local');
  persistAuthUser(user);
  return user;
}

export function signInWithLocalGoogle(displayName = 'Google User') {
  const accounts = getStoredAccounts();
  const existingGoogleAccount = accounts.find((account) => account.provider === 'google');

  if (existingGoogleAccount) {
    const user = createSessionUser(existingGoogleAccount.email, existingGoogleAccount.displayName || displayName, 'google');
    persistAuthUser(user);
    return user;
  }

  const email = `google-user-${Date.now()}@local.auth`;
  const account = {
    email,
    displayName: displayName || 'Google User',
    provider: 'google'
  };

  accounts.push(account);
  saveAccounts(accounts);

  const user = createSessionUser(email, account.displayName, 'google');
  persistAuthUser(user);
  return user;
}

export function signOutLocalUser() {
  clearStoredAuthUser();
}

export function subscribeToLocalAuth(listener) {
  if (typeof window === 'undefined') {
    listener(getStoredAuthUser());
    return () => {};
  }

  const handleStorage = (event) => {
    if (event.key === AUTH_USER_KEY) {
      listener(getStoredAuthUser());
    }
  };

  window.addEventListener('storage', handleStorage);
  listener(getStoredAuthUser());

  return () => {
    window.removeEventListener('storage', handleStorage);
  };
}
