import { supabase } from './lib/supabase.js';
import { state } from './state.js';
import { questions } from './data/questions.js';

import { activePage, animateSurface } from './app.js';
import { loadSupabaseQuestions } from './services/quiz.js';
import { getOrCreateUserProfile } from './services/profile.js';
import { loadFriendState } from './services/friends.js';
import { loadDailyTaskData } from './services/daily.js';

import { renderLessons, showLessonsHome, openLessonNotes, setupLessonButtons, updateLessonModuleAccuracyLabels, updateLessonProgressSummary, updateModuleAnalysisPanels } from './pages/lessons.js';
import { renderSettings, renderTempLoginModal, tempLogin, tempLogout, handleProfileOnboarding, setOnboardingLicense, showCompleteProfileOnboarding, saveProfileOnboarding, setProfileStatus, saveProfileSettings } from './pages/settings.js';
import { renderDashboard, refreshDashboardMetrics, applyDashboardData, applyWeakestPerformanceRow, showWeakAreas, loadWeakestPerformance, toggleDashboardSidebar, updateDashboardProfileSummary, renderDashboardFriendsLeaderboard, dashboardFriendsLeaderboardRowsHTML, loadDashboardFriendsLeaderboardCard, setupDashboardInteractions, invalidateDashboardPreload } from './pages/dashboard.js';
import { renderFriends, selectFriend, closeFriendDetail, setupFriendSearch, profileDisplayName, profileUsername, profileInitials } from './pages/friends.js';
import { renderDailyTask, startDailyChallenge, renderDailyQuestion, answerDailyQuestion, skipDailyTest, renderDailyResults, renderDailyLeaderboard, renderDailyLeaderboardCard, setDailyLeaderboardMode, clearDailyTimer, clearDailyResetTimer, toggleDailyPause, resetDailyTaskSession, getTodayDailyResultExport } from './pages/daily.js';
import { renderQuiz, renderSetup, closeSetup, questionHTML, answerQ, restoreQuizAnswers, updateQuiz, showScoreModal, jumpToQ, startTimer, pauseQuizTimer, continueQuiz, isActiveQuiz, startModuleQuiz, startProgressiveModuleQuiz, startLessonQuiz } from './pages/quiz.js';

import { sendFriendRequest, cancelFriendRequest, acceptFriendRequestById, declineFriendRequestById, removeFriend } from './services/friends.js';

const APP_AUTH_ROUTE = /\/app\/?$/i.test(location.pathname) || /\/app\/index\.html$/i.test(location.pathname);
const LANDING_PAGE_URL = new URL('/landing.html', location.href).href;
const TAB_LOADING_MIN_MS = 700;
const TAB_ASSETS = {
  dashboard: ['dashboardhero-optimized.jpg', 'backgroundmountain-optimized.jpg', 'friendsherobg-optimized.jpg'],
  lessons: ['lessonsherobg2-optimized.jpg', 'backgroundmountain-optimized.jpg'],
  daily: ['dailytaskherobg-optimized.jpg', 'backgroundmountain-optimized.jpg'],
  friends: ['friendsherobg-optimized.jpg', 'backgroundmountain-optimized.jpg'],
  settings: ['backgroundmountain-optimized.jpg'],
};
const preloadedAssets = new Set();

function hasAuthCallbackHash() {
  return /(?:^|[&#])(access_token|refresh_token|error|error_code)=/i.test(location.hash);
}

function redirectToLanding() { location.replace(LANDING_PAGE_URL); }

function applyTheme() {
  document.body.dataset.theme = state.themeMode;
  localStorage.setItem('revitTheme', state.themeMode);
  syncThemeButtons();
}

function syncThemeButtons() {
  const dark = state.themeMode === 'dark';
  document.querySelectorAll('[data-theme-toggle]').forEach(button => {
    button.classList.toggle('active', dark);
    button.setAttribute('aria-pressed', dark);
    const icon = button.querySelector('svg');
    const label = button.querySelector('span');
    if (icon) icon.innerHTML = dark ? '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2.2"></path><path d="M12 19.8V22"></path><path d="m4.93 4.93 1.56 1.56"></path><path d="m17.51 17.51 1.56 1.56"></path><path d="M2 12h2.2"></path><path d="M19.8 12H22"></path><path d="m4.93 19.07 1.56-1.56"></path><path d="m17.51 6.49 1.56-1.56"></path>' : '<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z"></path>';
    if (label && button.classList.contains('theme-toggle')) label.textContent = dark ? '☾' : '☼';
  });
}

export function toggleTheme() {
  state.themeMode = state.themeMode === 'dark' ? 'light' : 'dark';
  document.body.classList.add('theme-transition');
  applyTheme();
  setTimeout(() => document.body.classList.remove('theme-transition'), 260);
}

function showToast(message) {
  document.querySelector('.hub-toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'hub-toast card';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function syncAuthUI() {
  const signedIn = Boolean(state.currentUser);
  const logout = document.querySelector('.logout');
  if (logout) logout.innerHTML = signedIn ? '<span>↪</span>Logout' : '<span>↩</span>Login';
}

function handleAuthButton() { state.currentUser ? tempLogout() : renderTempLoginModal(true); }

function preloadAsset(src) {
  if (!src || preloadedAssets.has(src)) return Promise.resolve();
  preloadedAssets.add(src);
  return new Promise(resolve => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = resolve;
    image.decoding = 'async';
    image.src = src;
  });
}

function preloadTabAssets(page) {
  return Promise.all((TAB_ASSETS[page] || []).map(preloadAsset));
}

function preloadTabData(page) {
  if (page === 'daily') return loadDailyTaskData().catch(error => console.warn('Daily preload failed', error));
  if (page === 'friends') return loadFriendState().catch(error => console.warn('Friends preload failed', error));
  if (page === 'settings' && state.currentUser) return getOrCreateUserProfile().catch(error => console.warn('Settings preload failed', error));
  return Promise.resolve();
}

function waitForTabLoading() { return new Promise(resolve => setTimeout(resolve, TAB_LOADING_MIN_MS)); }

function tabTitle(page) {
  return { dashboard: 'Dashboard', lessons: 'Lessons', daily: 'Daily Task', friends: 'Friends', settings: 'Settings' }[page] || 'Page';
}

function tabLoadingMessage(page) {
  return { dashboard: 'Lining up your progress, streaks, and next review.', lessons: 'Pulling your modules onto the flight deck.', daily: "Checking today's challenge window and reset timer.", friends: 'Syncing classmates, requests, and study circle status.', settings: 'Loading your pilot profile and preferences.' }[page] || 'Preparing the latest synced workspace.';
}

function showTabLoading(page) {
  const { escapeHTML } = window;
  const title = tabTitle(page);
  document.getElementById('view').innerHTML = `<section class="page"><div class="tab-loading-shell glass" role="status" aria-live="polite"><div class="tab-loading-card"><div class="tab-loading-mark" aria-hidden="true"></div><div class="kicker">LOADING</div><h2>${title}</h2><p>${tabLoadingMessage(page)}</p><div class="tab-loading-runway" aria-hidden="true"></div></div></div></section>`;
}

function setNav(page) {
  state.appRenderToken++;
  if (page !== 'daily') clearDailyTimer();
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
}

function releaseNavRepeatLock() {
  clearTimeout(state.navRepeatLockTimer);
  state.navRepeatLockTimer = null;
  document.querySelectorAll('.nav-btn').forEach(button => button.disabled = false);
}

function lockRepeatedNavClick(page) {
  releaseNavRepeatLock();
  const button = [...document.querySelectorAll('.nav-btn')].find(item => item.dataset.page === page);
  if (!button) return;
  button.disabled = true;
  state.navRepeatLockTimer = setTimeout(() => { button.disabled = false; state.navRepeatLockTimer = null; }, 2000);
}

async function navigateToPage(page) {
  pauseQuizTimer();
  setNav(page);
  showTabLoading(page);
  await Promise.all([waitForTabLoading(), preloadTabAssets(page), preloadTabData(page)]);
  if (activePage() !== page) return;
  try {
    if (page === 'dashboard') renderDashboard();
    if (page === 'lessons') { state.selectedLessonTitle = ''; renderLessons(); }
    if (page === 'daily') renderDailyTask();
    if (page === 'friends') await renderFriends({ skipLoading: true });
    if (page === 'settings') await renderSettings();
  } catch (error) {
    console.warn('Tab navigation failed', error);
    if (activePage() === page) document.getElementById('view').innerHTML = `<section class="page"><div class="glass settings-wrap"><div class="kicker">Loading issue</div><h1>${tabTitle(page)} could not load</h1><p class="sub">Refresh the page and try again.</p></div></section>`;
  }
}

function handleNavClick(page) {
  if (page === activePage()) { lockRepeatedNavClick(page); return; }
  releaseNavRepeatLock();
  navigateToPage(page);
}

async function getCurrentUser({ showLogin = true } = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error) { console.warn('Supabase session error', error); return null; }
  state.currentUser = data?.session?.user || null;
  if (state.currentUser) {
    showToast(`Logged in as ${state.currentUser.email}`);
  } else if (showLogin) {
    renderTempLoginModal(true);
  }
  syncAuthUI();
  updateLessonModuleAccuracyLabels();
  if (activePage() === 'lessons') updateLessonProgressSummary();
  if (state.selectedLessonTitle) updateModuleAnalysisPanels(state.selectedLessonTitle);
  if (state.currentUser) handleProfileOnboarding();
  return state.currentUser;
}

async function enforceAppAuthGate() {
  if (!APP_AUTH_ROUTE) return true;
  const user = await getCurrentUser({ showLogin: false });
  if (user) return true;
  if (hasAuthCallbackHash()) return true;
  redirectToLanding();
  return false;
}

async function bootApp() {
  try {
    applyTheme();
    syncAuthUI();
    supabase.auth.onAuthStateChange((_event, session) => {
      state.currentUser = session?.user || null;
      resetDailyTaskSession();
      syncAuthUI();
      updateLessonModuleAccuracyLabels();
      if (activePage() === 'lessons') updateLessonProgressSummary();
      if (state.selectedLessonTitle) updateModuleAnalysisPanels(state.selectedLessonTitle);
      if (activePage() === 'daily') renderDailyTask();
      if (state.currentUser) handleProfileOnboarding();
      if (!state.currentUser) {
        document.querySelector('.profile-onboarding-backdrop')?.remove();
        if (APP_AUTH_ROUTE && !hasAuthCallbackHash()) redirectToLanding();
        else renderTempLoginModal(true);
      }
    });
    const canOpenApp = await enforceAppAuthGate();
    if (!canOpenApp) return;
    renderLessons();
    getCurrentUser({ showLogin: !APP_AUTH_ROUTE }).then(user => {
      if (user) return loadSupabaseQuestions();
      return null;
    }).catch(error => {
      console.warn('Supabase init failed', error);
      state.activeQuestions = questions;
    });
  } catch (error) {
    console.error('Preview boot failed', error);
    const view = document.getElementById('view');
    if (view) view.innerHTML = '<section class="page"><div class="glass settings-wrap"><div class="kicker">Preview</div><h1>Preview loading issue</h1><p class="sub">Refresh the page. If this keeps happening, check the browser console for the startup error.</p></div></section>';
  }
}

// ── Window bindings (for inline onclick= handlers in HTML templates) ──────────
window.navigateToPage = navigateToPage;
window.showToast = showToast;
window.activePage = activePage;
window.toggleTheme = toggleTheme;
window.syncThemeButtons = syncThemeButtons;
window.setNav = setNav;

// Auth
window.tempLogin = tempLogin;
window.tempLogout = tempLogout;
window.handleProfileOnboarding = handleProfileOnboarding;
window.renderTempLoginModal = renderTempLoginModal;
window.setOnboardingLicense = setOnboardingLicense;
window.saveProfileOnboarding = saveProfileOnboarding;
window.setProfileStatus = setProfileStatus;
window.saveProfileSettings = saveProfileSettings;
window.setSettingsLicense = window.setSettingsLicense || (() => {});

// Lessons
window.openLessonNotes = openLessonNotes;
window.showLessonsHome = showLessonsHome;
window.renderLessons = renderLessons;

// Dashboard
window.renderDashboard = renderDashboard;
window.refreshDashboardMetrics = refreshDashboardMetrics;
window.toggleDashboardSidebar = toggleDashboardSidebar;
window.showWeakAreas = showWeakAreas;
window.startAdaptiveQuiz = startProgressiveModuleQuiz;
window.invalidateDashboardPreload = invalidateDashboardPreload;

// Quiz
window.renderQuiz = renderQuiz;
window.renderSetup = renderSetup;
window.closeSetup = closeSetup;
window.answerQ = answerQ;
window.showScoreModal = showScoreModal;
window.jumpToQ = jumpToQ;
window.continueQuiz = continueQuiz;
window.startModuleQuiz = startModuleQuiz;
window.startProgressiveModuleQuiz = startProgressiveModuleQuiz;
window.startLessonQuiz = startLessonQuiz;

// Friends
window.renderFriends = renderFriends;
window.selectFriend = selectFriend;
window.closeFriendDetail = closeFriendDetail;
window.sendFriendRequest = sendFriendRequest;
window.cancelFriendRequest = cancelFriendRequest;
window.acceptFriendRequestById = acceptFriendRequestById;
window.declineFriendRequestById = declineFriendRequestById;
window.removeFriend = removeFriend;

// Daily
window.renderDailyTask = renderDailyTask;
window.startDailyChallenge = startDailyChallenge;
window.answerDailyQuestion = answerDailyQuestion;
window.skipDailyTest = skipDailyTest;
window.renderDailyResults = renderDailyResults;
window.renderDailyLeaderboard = renderDailyLeaderboard;
window.setDailyLeaderboardMode = setDailyLeaderboardMode;
window.toggleDailyPause = toggleDailyPause;
window.getTodayDailyResult = getTodayDailyResultExport;
window.isDevUser = () => false;

// Settings
window.renderSettings = renderSettings;

// Nav listeners
document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => handleNavClick(btn.dataset.page)));
document.querySelector('.logout')?.addEventListener('click', handleAuthButton);

bootApp();
