// auth.js
// SINGLE shared file — include this (+ firebase-config.js) on EVERY page.
//
// - On login.html: the elements below (authCard, tabLogin, authForm, etc.)
//   exist, so the full login/signup form logic runs.
// - On every other page: those elements are null, so that block is skipped
//   entirely, and only the navbar profile-dropdown logic runs.

import { auth, googleProvider, isFirebaseConfigured } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getStoredAuthUser,
  registerLocalUser,
  signInLocalUser,
  signInWithLocalGoogle,
  signOutLocalUser,
  subscribeToLocalAuth
} from './auth-core.mjs';

// Where to send the user after a successful login/signup, and after logout.
const REDIRECT_URL = 'index.html';

/* =========================================================================
   PART 1 — LOGIN / SIGNUP FORM LOGIC (only runs on login.html)
   ========================================================================= */

const authCard = document.getElementById('authCard');

if (authCard) {
  const tabLogin = document.getElementById('tabLogin');
  const tabSignup = document.getElementById('tabSignup');
  const welcomeText = document.getElementById('welcomeText');
  const switchText = document.getElementById('switchText');
  const switchModeBtn = document.getElementById('switchModeBtn');
  const submitBtn = document.getElementById('submitBtn');
  const authForm = document.getElementById('authForm');
  const authMsg = document.getElementById('authMsg');
  const btnGoogle = document.getElementById('btnGoogle');
  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');

  const fullNameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');

  function setMode(mode) {
    authCard.setAttribute('data-mode', mode);
    clearMessage();

    if (mode === 'login') {
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
      welcomeText.textContent = 'Welcome back! Please login to your account.';
      submitBtn.textContent = 'Login';
      switchText.textContent = "Don't have an account?";
      switchModeBtn.textContent = 'Sign Up';
    } else {
      tabSignup.classList.add('active');
      tabLogin.classList.remove('active');
      welcomeText.textContent = 'Create an account to get started.';
      submitBtn.textContent = 'Sign Up';
      switchText.textContent = 'Already have an account?';
      switchModeBtn.textContent = 'Login';
    }
  }

  tabLogin.addEventListener('click', () => setMode('login'));
  tabSignup.addEventListener('click', () => setMode('signup'));
  switchModeBtn.addEventListener('click', () => {
    const current = authCard.getAttribute('data-mode');
    setMode(current === 'login' ? 'signup' : 'login');
  });

  document.querySelectorAll('.toggle-eye').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  });

  function showMessage(text, type = 'error') {
    authMsg.textContent = text;
    authMsg.className = `auth-msg ${type}`;
  }

  function clearMessage() {
    authMsg.textContent = '';
    authMsg.className = 'auth-msg';
  }

  function friendlyError(error) {
    const code = error.code || '';
    const map = {
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-credential': 'Incorrect email or password.',
      'auth/email-already-in-use': 'An account already exists with this email.',
      'auth/weak-password': 'Password should be at least 6 characters.',
      'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
      'auth/too-many-requests': 'Too many attempts. Please try again later.',
      'auth/configuration-not-found': 'Authentication is currently unavailable. Please check the Firebase configuration.',
      'auth/invalid-api-key': 'Authentication is currently unavailable. Please check the Firebase configuration.',
      'auth/network-request-failed': 'Network error. Please check your connection and try again.'
    };
    return map[code] || 'Something went wrong. Please try again.';
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    btnGoogle.disabled = isLoading;
  }

  function ensureAuthReady() {
    if (auth && googleProvider && isFirebaseConfigured) {
      return true;
    }

    return true;
  }

  async function handleAuthSubmit(mode, email, password, name = '') {
    if (!ensureAuthReady()) {
      return;
    }

    try {
      setLoading(true);

      if (auth && googleProvider && isFirebaseConfigured) {
        if (mode === 'signup') {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(cred.user, { displayName: name });
        } else {
          await signInWithEmailAndPassword(auth, email, password);
        }
      } else {
        if (mode === 'signup') {
          registerLocalUser({ email, password, displayName: name });
        } else {
          signInLocalUser({ email, password });
        }
      }

      showMessage('Authentication successful! Redirecting...', 'success');
      setTimeout(() => (window.location.href = REDIRECT_URL), 800);
    } catch (error) {
      showMessage(friendlyError(error));
    } finally {
      setLoading(false);
    }
  }

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessage();

    const mode = authCard.getAttribute('data-mode');
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (mode === 'signup') {
      const name = fullNameInput.value.trim();
      const confirmPassword = confirmPasswordInput.value;

      if (!name) {
        showMessage('Please enter your full name.');
        return;
      }
      if (password !== confirmPassword) {
        showMessage('Passwords do not match.');
        return;
      }

      if (!ensureAuthReady()) {
        return;
      }

      try {
        await handleAuthSubmit('signup', email, password, name);
      } catch (error) {
        showMessage(friendlyError(error));
      }
    } else {
      if (!ensureAuthReady()) {
        return;
      }

      try {
        await handleAuthSubmit('login', email, password);
      } catch (error) {
        showMessage(friendlyError(error));
      }
    }
  });

  btnGoogle.addEventListener('click', async () => {
    clearMessage();
    if (!ensureAuthReady()) {
      return;
    }

    try {
      setLoading(true);
      if (auth && googleProvider && isFirebaseConfigured) {
        await signInWithPopup(auth, googleProvider);
      } else {
        signInWithLocalGoogle();
      }
      showMessage('Login successful! Redirecting...', 'success');
      setTimeout(() => (window.location.href = REDIRECT_URL), 800);
    } catch (error) {
      showMessage(friendlyError(error));
    } finally {
      setLoading(false);
    }
  });

  forgotPasswordBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    if (!email) {
      showMessage('Enter your email above first, then click "Forgot Password?".');
      return;
    }
    if (!ensureAuthReady()) {
      return;
    }
    try {
      if (auth && isFirebaseConfigured) {
        await sendPasswordResetEmail(auth, email);
        showMessage('Password reset email sent! Check your inbox.', 'success');
      } else {
        showMessage('Password reset is available once Firebase is configured.', 'success');
      }
    } catch (error) {
      showMessage(friendlyError(error));
    }
  });
}

/* =========================================================================
   PART 2 — NAVBAR PROFILE DROPDOWN (runs on every page, including login.html)
   ========================================================================= */

function injectNavAuthStyles() {
  if (document.getElementById('nav-auth-styles')) return;

  const style = document.createElement('style');
  style.id = 'nav-auth-styles';
  style.textContent = `
    .profile-dropdown {
      position: relative;
      display: inline-flex;
      align-items: center;
    }
    .profile-trigger {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 176, 31, 0.08);
      border: 1px solid rgba(255, 176, 31, 0.3);
      border-radius: 999px;
      padding: 5px 14px 5px 5px;
      cursor: pointer;
      font-family: 'Outfit', sans-serif;
      color: inherit;
    }
    .profile-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, hsl(27,100%,55%), hsl(43,85%,52%));
      color: #12141c;
      font-weight: 700;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .profile-name {
      font-size: 0.88rem;
      font-weight: 500;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .profile-caret {
      width: 10px;
      height: 10px;
      border-right: 2px solid currentColor;
      border-bottom: 2px solid currentColor;
      transform: rotate(45deg);
      margin-top: -3px;
      transition: transform 0.2s;
      opacity: 0.7;
    }
    .profile-dropdown.open .profile-caret {
      transform: rotate(-135deg);
      margin-top: 3px;
    }
    .profile-menu {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      min-width: 190px;
      background: hsl(222, 35%, 12%);
      border: 1px solid rgba(255, 176, 31, 0.25);
      border-radius: 12px;
      box-shadow: 0 20px 45px rgba(0,0,0,0.5);
      padding: 8px;
      display: none;
      z-index: 999;
    }
    .profile-dropdown.open .profile-menu {
      display: block;
    }
    .profile-menu-email {
      padding: 8px 10px 10px;
      font-size: 0.75rem;
      color: hsl(215, 20%, 65%);
      border-bottom: 1px solid rgba(255,255,255,0.08);
      margin-bottom: 6px;
      word-break: break-all;
    }
    .profile-menu-btn {
      width: 100%;
      text-align: left;
      background: none;
      border: none;
      color: hsl(210, 40%, 98%);
      font-family: 'Outfit', sans-serif;
      font-size: 0.88rem;
      padding: 9px 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .profile-menu-btn:hover {
      background: rgba(255, 176, 31, 0.12);
      color: hsl(43, 85%, 52%);
    }
  `;
  document.head.appendChild(style);
}

function buildProfileDropdown(user) {
  const name = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
  const initial = name.charAt(0).toUpperCase();

  const wrapper = document.createElement('div');
  wrapper.className = 'profile-dropdown';
  wrapper.id = 'profileDropdown';
  wrapper.innerHTML = `
    <button class="profile-trigger" type="button" id="profileTrigger">
      <span class="profile-avatar">${initial}</span>
      <span class="profile-name">${name}</span>
      <span class="profile-caret"></span>
    </button>
    <div class="profile-menu">
      <div class="profile-menu-email">${user.email || ''}</div>
      <button class="profile-menu-btn" id="logoutBtn" type="button">Logout</button>
    </div>
  `;

  wrapper.querySelector('#profileTrigger').addEventListener('click', (e) => {
    e.stopPropagation();
    wrapper.classList.toggle('open');
  });

  wrapper.querySelector('#logoutBtn').addEventListener('click', async () => {
    if (auth && isFirebaseConfigured) {
      await signOut(auth);
    } else {
      signOutLocalUser();
    }
    window.location.href = REDIRECT_URL;
  });

  document.addEventListener('click', () => wrapper.classList.remove('open'));

  return wrapper;
}

function handleNavAuthState(user) {
  const loginLink = document.getElementById('link-login');
  const existingDropdown = document.getElementById('profileDropdown');

  if (user) {
    if (loginLink) loginLink.style.display = 'none';
    if (!existingDropdown) {
      injectNavAuthStyles();
      const dropdown = buildProfileDropdown(user);
      if (loginLink && loginLink.parentNode) {
        loginLink.parentNode.insertBefore(dropdown, loginLink.nextSibling);
      } else {
        const navMenu = document.getElementById('nav-menu');
        if (navMenu) navMenu.appendChild(dropdown);
      }
    }
  } else {
    if (loginLink) loginLink.style.display = '';
    if (existingDropdown) existingDropdown.remove();
  }
}

/* =========================================================================
   PART 3 — SINGLE AUTH STATE LISTENER (drives both parts above)
   ========================================================================= */

if (auth && isFirebaseConfigured) {
  onAuthStateChanged(auth, (user) => {
    if (authCard && user) {
      window.location.href = REDIRECT_URL;
      return;
    }
    handleNavAuthState(user);
  });
} else {
  const localUser = getStoredAuthUser();
  handleNavAuthState(localUser);

  if (authCard) {
    if (localUser) {
      window.location.href = REDIRECT_URL;
    }
  }

  subscribeToLocalAuth((user) => {
    if (authCard && user) {
      window.location.href = REDIRECT_URL;
      return;
    }
    handleNavAuthState(user);
  });
}
