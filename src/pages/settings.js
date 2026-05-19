import { supabase } from '../lib/supabase.js';
import { state } from '../state.js';
import { escapeHTML } from '../utils.js';
import { view, animateSurface } from '../app.js';
import { getOrCreateUserProfile, checkUsernameAvailable, validateUsername, normalizeUsername, normalizeLicenseTrack, googleProfileMetadata, PROFILE_SELECT_COLUMNS } from '../services/profile.js';

export function renderTempLoginModal(required = false) {
  document.querySelector('.modal-backdrop')?.remove();
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  if (required) modal.dataset.authRequired = 'true';
  modal.innerHTML = `<div class="setup-modal stopwatch-modal glass"><div class="modal-top"><div class="stopwatch-copy"><div class="kicker">Account Required</div><h1>Log in to continue</h1><p class="sub">Use a Supabase test account to access the course and sync quiz progress.</p></div>${required ? '' : `<button class="modal-close" onclick="closeSetup()" aria-label="Close login">×</button>`}</div><form onsubmit="event.preventDefault();tempLogin('signIn')" style="display:grid;gap:12px;margin-top:20px"><div class="search" style="margin:0"><input id="tempAuthEmail" type="email" autocomplete="email" placeholder="Email"></div><div class="search" style="margin:0"><input id="tempAuthPassword" type="password" autocomplete="current-password" placeholder="Password"></div><div class="actions"><button class="btn primary" type="submit">Log In</button><button class="btn secondary" type="button" onclick="tempLogin('signUp')">Create Test Account</button></div></form></div>`;
  modal.addEventListener('click', e => { if (e.target === modal && !required) window.closeSetup?.(); });
  document.body.appendChild(modal);
  animateSurface(modal);
}

export async function tempLogin(mode = 'signIn') {
  const email = document.getElementById('tempAuthEmail')?.value.trim();
  const password = document.getElementById('tempAuthPassword')?.value;
  if (!email || !password) { window.showToast?.('Enter an email and password.'); return; }
  const request = mode === 'signUp' ? supabase.auth.signUp({ email, password }) : supabase.auth.signInWithPassword({ email, password });
  const { data, error } = await request;
  if (error) { window.showToast?.(error.message); return; }
  state.currentUser = data?.user || data?.session?.user || null;
  if (!state.currentUser) {
    const { data: sessionData } = await supabase.auth.getSession();
    state.currentUser = sessionData?.session?.user || null;
  }
  if (state.currentUser) {
    window.syncAuthUI?.();
    window.loadWeakestPerformance?.();
    window.showToast?.(`Logged in as ${state.currentUser.email}`);
    const { loadSupabaseQuestions } = await import('../services/quiz.js');
    await loadSupabaseQuestions().catch(e => console.warn('Question preload failed', e));
    window.closeSetup?.(true);
    window.updateLessonModuleAccuracyLabels?.();
    if (window.activePage?.() === 'lessons') window.updateLessonProgressSummary?.();
    if (state.selectedLessonTitle) window.updateModuleAnalysisPanels?.(state.selectedLessonTitle);
    if (document.querySelector('.settings-wrap')) renderSettings();
    if (document.querySelector('.nav-btn.active')?.dataset.page === 'daily') window.renderDailyTask?.();
    await handleProfileOnboarding();
  } else {
    window.showToast?.('Check your email to confirm this account.');
    renderTempLoginModal(true);
  }
}

export async function tempLogout() {
  await supabase.auth.signOut();
  state.currentUser = null;
  document.querySelector('.profile-onboarding-backdrop')?.remove();
  state.profileOnboardingProfile = null;
  window.resetDailyTaskSession?.();
  state.answered = {};
  state.quizSessionActive = false;
  window.syncAuthUI?.();
  window.loadWeakestPerformance?.();
  window.showToast?.('Logged out.');
  window.updateLessonModuleAccuracyLabels?.();
  if (window.activePage?.() === 'lessons') window.updateLessonProgressSummary?.();
  if (state.selectedLessonTitle) window.updateModuleAnalysisPanels?.(state.selectedLessonTitle);
  renderTempLoginModal(true);
}

export async function handleProfileOnboarding() {
  if (!state.currentUser) { document.querySelector('.profile-onboarding-backdrop')?.remove(); return null; }
  try {
    const { ensureUserProfile, isProfileComplete } = await import('../services/profile.js');
    const profile = await ensureUserProfile();
    state.profileOnboardingProfile = profile;
    if (!isProfileComplete(profile)) { showCompleteProfileOnboarding(profile); return profile; }
    document.querySelector('.profile-onboarding-backdrop')?.remove();
    return profile;
  } catch (error) {
    console.warn('Profile onboarding check failed', error);
    window.showToast?.(error.message || 'Could not load profile setup.');
    return null;
  }
}

export function setOnboardingLicense(value) {
  document.getElementById('onboardLicenseTrack').value = value;
  document.querySelectorAll('.license-segments button').forEach(button => button.classList.toggle('active', button.dataset.track === value));
}

export function showCompleteProfileOnboarding(profile = {}) {
  const google = googleProfileMetadata();
  const name = profile.full_name || google.name || '';
  const avatar = profile.avatar_url || google.avatar || '';
  const email = profile.email || google.email || '';
  const track = ['PPL', 'CPL', 'IR', 'ATPL'].includes(profile.license_track) ? profile.license_track : 'PPL';
  document.querySelector('.profile-onboarding-backdrop')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'profile-onboarding-backdrop';
  overlay.innerHTML = `<section class="profile-onboarding-card" role="dialog" aria-modal="true" aria-labelledby="profileOnboardingTitle"><div class="onboarding-progress-row"><div class="onboarding-progress-side"><span class="onboarding-check">✓</span><b>Step 1 of 1</b></div><div class="onboarding-progress-line"><i></i></div><div class="onboarding-progress-side right"><b>Profile Setup</b></div></div><div class="profile-onboarding-title"><h1 id="profileOnboardingTitle">Complete Your Pilot Profile</h1><p class="sub">Set the public details classmates use to find you. Birthday stays private and only appears in Settings.</p></div><div class="google-preview"><div class="google-avatar">${avatar ? `<img src="${escapeHTML(avatar)}" alt="">` : escapeHTML((name || email || 'SP').slice(0, 2).toUpperCase())}</div><div><b>${escapeHTML(name || 'Google account')}</b><span>${escapeHTML(email || 'Signed in with Google')}</span><small>✓ Connected with Google</small></div></div><form class="onboarding-profile-form" onsubmit="event.preventDefault();saveProfileOnboarding()"><div class="onboarding-form-row"><div class="onboarding-label"><span class="field-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="7" r="4"></circle></svg></span><b>Full Name</b></div><div class="onboarding-control"><input id="onboardFullName" type="text" autocomplete="name" value="${escapeHTML(name)}" placeholder="Vianna Pilot"></div></div><div class="onboarding-form-row"><div class="onboarding-label"><span class="field-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"></path></svg></span><b>Username</b></div><div class="onboarding-control username-field"><input id="onboardUsername" type="text" autocomplete="username" value="${escapeHTML(profile.username || '')}" placeholder="student_pilot" inputmode="text"></div></div><div class="onboarding-form-row"><div class="onboarding-label"><span class="field-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect x="3" y="4" width="18" height="18" rx="3"></rect><path d="M3 10h18"></path></svg></span><b>Birthday</b></div><div class="onboarding-control"><input id="onboardBirthDate" type="date" value="${escapeHTML(profile.birth_date || '')}"><small class="onboarding-control-note">Only visible to you.</small></div></div><div class="onboarding-form-row"><div class="onboarding-label"><span class="field-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 10 12 5 2 10l10 5 10-5Z"></path><path d="M6 12v5c3 2 9 2 12 0v-5"></path><path d="M22 10v6"></path></svg></span><b>Flight School</b></div><div class="onboarding-control"><input id="onboardFlightSchool" type="text" value="${escapeHTML(profile.flight_school || '')}" placeholder="Revit Flight Academy"><small class="onboarding-control-note">Connect with friends and see your school on leaderboards.</small></div></div><input id="onboardLicenseTrack" type="hidden" value="${escapeHTML(track)}"><div class="onboarding-form-row"><div class="onboarding-label"><span class="field-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 4.5 21 12 10.5 19.5 12 13H3l-1-1 1-1h9l-1.5-6.5Z"></path></svg></span><b>License Track</b></div><div class="onboarding-control license-segments"><div>${['PPL', 'CPL', 'IR', 'ATPL'].map(item => `<button class="${item === track ? 'active' : ''}" data-track="${item}" type="button" onclick="setOnboardingLicense('${item}')">${item}</button>`).join('')}</div></div></div><div class="onboarding-actions"><p id="profileOnboardingStatus" class="onboarding-status" data-type="muted"></p><button class="btn primary" id="profileOnboardingSave" type="submit"><span>✈</span> Save & Enter Dashboard</button><p class="onboarding-note">You can edit this later in Settings.</p></div></form></section>`;
  document.body.appendChild(overlay);
  animateSurface(overlay);
  document.getElementById('onboardUsername')?.addEventListener('input', event => { event.target.value = normalizeUsername(event.target.value); });
}

function profileOnboardingStatus(message, type = 'muted') {
  const status = document.getElementById('profileOnboardingStatus');
  if (status) { status.textContent = message; status.dataset.type = type; }
}

export async function saveProfileOnboarding() {
  if (state.profileOnboardingSaving || !state.currentUser) return;
  const fullName = document.getElementById('onboardFullName')?.value.trim() || '';
  const username = normalizeUsername(document.getElementById('onboardUsername')?.value);
  const birthDate = document.getElementById('onboardBirthDate')?.value || null;
  const flightSchool = document.getElementById('onboardFlightSchool')?.value.trim() || '';
  const licenseTrack = document.getElementById('onboardLicenseTrack')?.value || '';
  if (!fullName) { profileOnboardingStatus('Full name is required.', 'error'); return; }
  const validation = validateUsername(username);
  if (validation) { profileOnboardingStatus(validation, 'error'); return; }
  if (!flightSchool) { profileOnboardingStatus('Flight school is required.', 'error'); return; }
  if (!licenseTrack) { profileOnboardingStatus('Choose a license track.', 'error'); return; }
  try {
    state.profileOnboardingSaving = true;
    const button = document.getElementById('profileOnboardingSave');
    if (button) { button.disabled = true; button.textContent = 'Saving...'; }
    profileOnboardingStatus('Checking username...');
    if (!(await checkUsernameAvailable(username))) { profileOnboardingStatus('That username is already taken. Try another one.', 'error'); return; }
    const google = googleProfileMetadata();
    const payload = { id: state.currentUser.id, email: state.currentUser.email || google.email, full_name: fullName, username, birth_date: birthDate, flight_school: flightSchool, license_track: licenseTrack, avatar_url: state.profileOnboardingProfile?.avatar_url || google.avatar };
    let result = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select(PROFILE_SELECT_COLUMNS).single();
    if (result.error) result = await supabase.from('profiles').update(payload).eq('id', state.currentUser.id).select(PROFILE_SELECT_COLUMNS).single();
    if (result.error) throw result.error;
    state.profileOnboardingProfile = result.data;
    state.friendsState = null;
    profileOnboardingStatus('Profile saved. Opening dashboard.', 'success');
    document.querySelector('.profile-onboarding-backdrop')?.remove();
    window.navigateToPage?.('dashboard');
    if (document.querySelector('.settings-wrap')) renderSettings();
  } catch (error) {
    console.warn('Profile onboarding save failed', error);
    profileOnboardingStatus(error.message || 'Could not save profile.', 'error');
  } finally {
    state.profileOnboardingSaving = false;
    const button = document.getElementById('profileOnboardingSave');
    if (button) { button.disabled = false; button.innerHTML = '<span>✈</span> Save & Enter Dashboard'; }
  }
}

export function setProfileStatus(message, type = 'muted') {
  const status = document.getElementById('profileSaveStatus');
  if (status) { status.textContent = message; status.dataset.type = type; }
}

export function setSettingsLicense(value) {
  const track = normalizeLicenseTrack(value);
  const input = document.getElementById('profileLicenseTrack');
  if (input) input.value = track;
  document.querySelectorAll('.settings-license-segments button').forEach(button => button.classList.toggle('active', button.dataset.track === track));
  setProfileStatus('', 'muted');
}

export async function saveProfileSettings() {
  if (!state.currentUser) { window.showToast?.('Sign in to save profile.'); return; }
  const fullName = document.getElementById('profileFullName')?.value.trim() || '';
  const username = normalizeUsername(document.getElementById('profileUsername')?.value);
  const birthDate = document.getElementById('profileBirthDate')?.value || null;
  const flightSchool = document.getElementById('profileFlightSchool')?.value.trim() || '';
  const licenseTrack = normalizeLicenseTrack(document.getElementById('profileLicenseTrack')?.value);
  const validation = validateUsername(username);
  if (validation) { setProfileStatus(validation, 'error'); return; }
  try {
    setProfileStatus('Checking username...');
    if (!(await checkUsernameAvailable(username))) { setProfileStatus('That username is already taken. Try another one.', 'error'); return; }
    const payload = { id: state.currentUser.id, email: state.currentUser.email, full_name: fullName, username, birth_date: birthDate, flight_school: flightSchool, license_track: licenseTrack };
    let result = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select(PROFILE_SELECT_COLUMNS).single();
    if (result.error) result = await supabase.from('profiles').update(payload).eq('id', state.currentUser.id).select(PROFILE_SELECT_COLUMNS).single();
    if (result.error) throw result.error;
    setProfileStatus('Profile saved. Classmates can now find you by username.', 'success');
    window.showToast?.('Profile saved');
    state.friendsState = null;
  } catch (error) {
    console.warn('Profile save failed', error);
    setProfileStatus(error.message || 'Could not save profile.', 'error');
  }
}

export async function renderSettings() {
  const dark = state.themeMode === 'dark', signedIn = Boolean(state.currentUser);
  let profile = null, profileError = '';
  if (signedIn) {
    try { profile = await getOrCreateUserProfile(); } catch (error) { console.warn('Profile load failed', error); profileError = error.message || 'Could not load profile.'; }
  }
  const trackValue = normalizeLicenseTrack(profile?.license_track);
  const profileCard = signedIn ? `<article class="settings-card profile-settings-card"><div class="settings-card-head"><span class="settings-icon-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="7" r="4"></circle></svg></span><div class="settings-card-title"><h3>Account Profile</h3><p>Your username and flight school help classmates find you.</p></div><span class="settings-pill"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z"></path><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.05.05a2 2 0 0 1-2.83 2.83l-.05-.05a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.66V21.2a2 2 0 0 1-4 0v-.09a1.8 1.8 0 0 0-1.1-1.66 1.8 1.8 0 0 0-1.98.36l-.05.05a2 2 0 0 1-2.83-2.83l.05-.05A1.8 1.8 0 0 0 4.3 15a1.8 1.8 0 0 0-1.66-1.1H2.55a2 2 0 0 1 0-4h.09A1.8 1.8 0 0 0 4.3 8.8a1.8 1.8 0 0 0-.36-1.98l-.05-.05a2 2 0 0 1 2.83-2.83l.05.05a1.8 1.8 0 0 0 1.98.36 1.8 1.8 0 0 0 1.1-1.66V2.6a2 2 0 0 1 4 0v.09a1.8 1.8 0 0 0 1.1 1.66 1.8 1.8 0 0 0 1.98-.36l.05-.05a2 2 0 0 1 2.83 2.83l-.05.05a1.8 1.8 0 0 0-.36 1.98 1.8 1.8 0 0 0 1.66 1.1h.09a2 2 0 0 1 0 4h-.09A1.8 1.8 0 0 0 19.4 15Z"></path></svg>Profile</span></div><form class="profile-settings-form" onsubmit="event.preventDefault();saveProfileSettings()"><div class="settings-form-column"><label class="settings-field"><span>Full Name</span><div class="settings-input"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="7" r="4"></circle></svg><input id="profileFullName" type="text" autocomplete="name" value="${escapeHTML(profile?.full_name || '')}" placeholder="Vianna Pilot"></div></label><label class="settings-field"><span>Birthday</span><div class="settings-input"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect x="3" y="4" width="18" height="18" rx="3"></rect><path d="M3 10h18"></path></svg><input id="profileBirthDate" type="date" value="${escapeHTML(profile?.birth_date || '')}"></div></label><label class="settings-field"><span>License Track</span><input id="profileLicenseTrack" type="hidden" value="${escapeHTML(trackValue)}"><div class="settings-input locked"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 4.5 21 12 10.5 19.5 12 13H3l-1-1 1-1h9l-1.5-6.5Z"></path></svg><div class="settings-readonly-value">${escapeHTML(trackValue)}<small>Locked</small></div></div></label></div><div class="settings-form-column"><label class="settings-field"><span>Username</span><div class="settings-input username-field"><input id="profileUsername" type="text" autocomplete="username" value="${escapeHTML(profile?.username || '')}" placeholder="student_pilot" inputmode="text"></div></label><label class="settings-field"><span>Flight School</span><div class="settings-input"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 10 12 5 2 10l10 5 10-5Z"></path><path d="M6 12v5c3 2 9 2 12 0v-5"></path><path d="M22 10v6"></path></svg><input id="profileFlightSchool" type="text" value="${escapeHTML(profile?.flight_school || '')}" placeholder="Revit Flight Academy"></div></label></div><div class="profile-settings-actions"><button class="btn primary" type="submit"><span>✈</span> Save Profile</button><p id="profileSaveStatus" class="profile-save-status" data-type="${profileError ? 'error' : 'muted'}">${escapeHTML(profileError || '')}</p></div></form></article>` : `<article class="settings-card settings-medium-card"><span class="settings-icon-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="7" r="4"></circle></svg></span><div class="settings-medium-copy"><h3>Account Profile</h3><p>Sign in to create a username, add your flight school, and let classmates find you.</p></div><button class="btn primary" onclick="renderTempLoginModal(true)">Sign In</button></article>`;
  const authControl = signedIn ? `<button class="btn secondary" onclick="tempLogout()">Log Out</button>` : `<form class="settings-auth-form" onsubmit="event.preventDefault();tempLogin('signIn')"><div class="search"><input id="tempAuthEmail" type="email" autocomplete="email" placeholder="Email"></div><div class="search"><input id="tempAuthPassword" type="password" autocomplete="current-password" placeholder="Password"></div><div class="actions"><button class="btn primary" type="submit">Log In</button><button class="btn secondary" type="button" onclick="tempLogin('signUp')">Create Test Account</button></div></form>`;
  view.innerHTML = `<section class="page"><div class="settings-wrap"><div class="settings-shell"><section class="settings-hero"><div class="kicker">Settings</div><h1>Settings</h1><p class="sub">Manage your account, preferences, and application settings.</p></section>${profileCard}<article class="settings-card settings-medium-card"><span class="settings-icon-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 21s8-4 8-10V5l-8-3-8 3v6c0 6 8 10 8 10Z"></path><path d="m9 12 2 2 4-5"></path></svg></span><div class="settings-medium-copy"><h3>Temporary Supabase Login</h3><p>${signedIn ? `Signed in as ${escapeHTML(state.currentUser.email)}. Quiz history on this device is separated for this account.` : 'Sign in with a test account to separate quiz progress while testing.'}</p></div>${authControl}</article><article class="settings-card settings-medium-card"><span class="settings-icon-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z"></path></svg></span><div class="settings-medium-copy"><h3>Dark mode</h3><p>Switch to a low-light cockpit-style theme while keeping the sunrise orange action color.</p></div><button class="theme-toggle ${dark ? 'active' : ''}" data-theme-toggle onclick="toggleTheme()" aria-label="Toggle dark mode" aria-pressed="${dark}"><span>${dark ? '☾' : '☼'}</span></button></article></div></div></section>`;
  window.syncThemeButtons?.();
  animateSurface();
}
