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
    window.navigateToPage?.('dashboard');
    window.updateLessonModuleAccuracyLabels?.();
    if (state.selectedLessonTitle) window.updateModuleAnalysisPanels?.(state.selectedLessonTitle);
    if (document.querySelector('.settings-wrap')) renderSettings();
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

// ── Multi-step onboarding state ────────────────────────────────────────────────
let _obStep = 1;
let _obData = {}; // collected from step 1
let _obTrack = null; // selected in step 2, null = nothing chosen yet
let _obTestQs = []; // 5 questions for step 3
let _obTestIdx = 0;
let _obTestAnswered = []; // boolean array

const COURSES = [
  { track: 'PPL', icon: '⚖️', title: 'Private Pilot License (PPL)', desc: 'Start your journey and learn the fundamentals of flying.' },
  { track: 'CPL', icon: '✈', title: 'Commercial Pilot License (CPL)', desc: 'Build advanced skills for professional pilot training.' },
  { track: 'IR', icon: '🧭', title: 'Instrument Rating (IR)', desc: 'Learn to fly with instruments, procedures, and precision.' },
  { track: 'ATPL', icon: '🛫', title: 'Airline Transport Pilot (ATPL)', desc: 'The highest pilot certification for airline operations.' },
];

const COURSE_SVGS = {
  PPL: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M5 6h14"/><path d="m6 6-3 7h6L6 6Z"/><path d="m18 6-3 7h6l-3-7Z"/><path d="M7 21h10"/></svg>`,
  CPL: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a8 8 0 0 1 16 0"/><path d="M6.5 19h11"/><path d="M12 14l4-4"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>`,
  IR: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/><path d="M12 3v2"/><path d="M12 19v2"/><path d="M3 12h2"/><path d="M19 12h2"/></svg>`,
  ATPL: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2a1 1 0 0 0-.5 1.7l2.5 2.5L2.5 14l1.5 1.5 3.75-1.25 2.5 2.5a1 1 0 0 0 1.7-.5z"/></svg>`,
};

function obProgressHTML(step) {
  const labels = ['PROFILE SETUP', 'CHOOSE COURSE', 'QUICK TEST'];
  const displayStep = Math.min(step, 3); // steps 3 & 4 both display as STEP 3
  const icon = displayStep > 1 ? '✓' : '✈';
  return `<div class="onboarding-progress-row">
    <div class="onboarding-progress-side">
      <span class="onboarding-check">${icon}</span>
      <span>STEP ${displayStep} OF 3</span>
    </div>
    <div class="onboarding-progress-line"><i></i></div>
    <div class="onboarding-progress-side right">
      <span>${labels[displayStep - 1] || ''}</span>
    </div>
  </div>`;
}

function obCard() { return document.querySelector('.profile-onboarding-card'); }

export function showCompleteProfileOnboarding(profile = {}) {
  const google = googleProfileMetadata();
  _obData.name   = profile.full_name || google.name || '';
  _obData.avatar = profile.avatar_url || google.avatar || '';
  _obData.email  = profile.email || google.email || '';
  _obData.username     = profile.username || '';
  _obData.birth_date   = profile.birth_date || '';
  _obData.flight_school = profile.flight_school || '';
  _obTrack = ['PPL','CPL','IR','ATPL'].includes(profile.license_track) ? profile.license_track : null;
  _obStep = 1; _obTestIdx = 0; _obTestAnswered = [];

  document.querySelector('.profile-onboarding-backdrop')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'profile-onboarding-backdrop';
  overlay.innerHTML = `<section class="profile-onboarding-card" role="dialog" aria-modal="true" aria-labelledby="profileOnboardingTitle"></section>`;
  document.body.appendChild(overlay);
  _renderObStep1();
  animateSurface(overlay);
}

function _renderObStep1() {
  const { name, avatar, email, username, birth_date, flight_school } = _obData;
  const avatarHTML = avatar ? `<img src="${escapeHTML(avatar)}" alt="">` : escapeHTML((name || email || 'SP').slice(0, 2).toUpperCase());
  obCard().innerHTML = `
    ${obProgressHTML(1)}
    <div class="profile-onboarding-title"><h1 id="profileOnboardingTitle">Complete Your Pilot Profile</h1><p class="sub">Set the public details classmates use to find you. Birthday stays private and only appears in Settings.</p></div>
    <div class="google-preview"><div class="google-avatar">${avatarHTML}</div><div><b>${escapeHTML(name || 'Your account')}</b><span>${escapeHTML(email || 'Signed in')}</span><small>✓ Connected</small></div></div>
    <form class="onboarding-profile-form" onsubmit="event.preventDefault();onboardingNextStep()">
      <div class="onboarding-form-row"><div class="onboarding-label"><span class="field-icon"><svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="7" r="4"></circle></svg></span><b>Full Name</b></div><div class="onboarding-control"><input id="onboardFullName" type="text" autocomplete="name" value="${escapeHTML(name)}" placeholder="Vianna Pilot" required></div></div>
      <div class="onboarding-form-row"><div class="onboarding-label"><span class="field-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"></circle><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"></path></svg></span><b>Username</b></div><div class="onboarding-control username-field"><input id="onboardUsername" type="text" autocomplete="username" value="${escapeHTML(username)}" placeholder="student_pilot" inputmode="text"></div></div>
      <div class="onboarding-form-row"><div class="onboarding-label"><span class="field-icon"><svg viewBox="0 0 24 24"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect x="3" y="4" width="18" height="18" rx="3"></rect><path d="M3 10h18"></path></svg></span><b>Birthday</b></div><div class="onboarding-control"><input id="onboardBirthDate" type="date" value="${escapeHTML(birth_date)}"><small class="onboarding-control-note">Only visible to you.</small></div></div>
      <div class="onboarding-form-row"><div class="onboarding-label"><span class="field-icon"><svg viewBox="0 0 24 24"><path d="M22 10 12 5 2 10l10 5 10-5Z"></path><path d="M6 12v5c3 2 9 2 12 0v-5"></path><path d="M22 10v6"></path></svg></span><b>Flight School</b></div><div class="onboarding-control"><input id="onboardFlightSchool" type="text" value="${escapeHTML(flight_school)}" placeholder="Revit Flight Academy"><small class="onboarding-control-note">Connect with friends and see your school on leaderboards.</small></div></div>
      <div class="onboarding-actions"><p id="profileOnboardingStatus" class="onboarding-status" data-type="muted"></p><button class="btn primary" id="profileOnboardingSave" type="submit">Continue <span style="margin-left:4px">→</span></button></div>
    </form>`;
  document.getElementById('onboardUsername')?.addEventListener('input', e => { e.target.value = normalizeUsername(e.target.value); });
}

function _renderObStep2() {
  obCard().innerHTML = `
    <button class="ob-close-btn" type="button" onclick="onboardingBack()" aria-label="Go back">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>
    <div class="profile-onboarding-title ob-step2-title"><h1 id="profileOnboardingTitle">Choose your course</h1><p class="sub">Pick the certification path you want to pursue.</p></div>
    <div class="ob-course-list">
      ${COURSES.map(c => `
        <button class="ob-course-option${_obTrack === c.track ? ' ob-course-selected' : ''}" type="button" onclick="selectOnboardingCourse('${c.track}')">
          <span class="ob-course-icon">${COURSE_SVGS[c.track] || c.icon}</span>
          <div class="ob-course-copy"><b>${escapeHTML(c.title)}</b><span>${escapeHTML(c.desc)}</span></div>
          <span class="ob-course-chev">›</span>
        </button>`).join('')}
    </div>
    <div class="ob-course-actions">
      <button class="btn secondary" type="button" onclick="onboardingBack()">Cancel</button>
      <button class="btn primary ob-continue-btn" id="profileOnboardingSave" type="button" onclick="onboardingNextStep()" ${_obTrack ? '' : 'disabled'}>Continue</button>
    </div>`;
}

function _renderObInstructions() {
  const course = COURSES.find(c => c.track === _obTrack);
  const courseTitle = course?.title || _obTrack || 'Your Course';
  const courseSvg = COURSE_SVGS[_obTrack] || '';
  obCard().innerHTML = `
    <button class="ob-close-btn" type="button" onclick="onboardingBack()" aria-label="Go back">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>
    <div class="profile-onboarding-title ob-step2-title"><h1 id="profileOnboardingTitle">Before you begin</h1><p class="sub">Let's set you up for success.</p></div>
    <div class="ob-selected-course-pill">
      <span class="ob-selected-course-icon">${courseSvg}</span>
      <strong>${escapeHTML(courseTitle)}</strong>
    </div>
    <div class="ob-instruction-box">
      <h3>How the initial test works</h3>
      <div class="ob-instruction-list">
        <div class="ob-instruction-item"><span class="ob-instruction-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11.5 11 13.5 15.5 9"/><circle cx="12" cy="12" r="9"/></svg></span><span>Initial assessment to analyze performance.</span></div>
        <div class="ob-instruction-item"><span class="ob-instruction-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></svg></span><span>Answer honestly for accurate recommendations.</span></div>
        <div class="ob-instruction-item"><span class="ob-instruction-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2"/><path d="M9 2h6"/></svg></span><span>Timer may apply to simulate exam conditions.</span></div>
        <div class="ob-instruction-item"><span class="ob-instruction-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"/><path d="M8 9h8"/><path d="M8 13h5"/></svg></span><span>Explanations come after submission.</span></div>
        <div class="ob-instruction-item"><span class="ob-instruction-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 3-3 3 2 5-7"/></svg></span><span>Your progress will be tracked after saving.</span></div>
      </div>
    </div>
    <div class="ob-next-box">
      <h3>What happens next</h3>
      <div class="ob-next-steps">
        <div class="ob-next-step"><span class="ob-next-step-num">1</span><strong>Initial Test</strong><span>Take a short test</span></div>
        <div class="ob-next-step"><span class="ob-next-step-num">2</span><strong>View performance</strong><span>Check out which needs more focus</span></div>
        <div class="ob-next-step"><span class="ob-next-step-num">3</span><strong>Start Learning</strong><span>Begin your journey</span></div>
      </div>
    </div>
    <div class="ob-course-actions" style="margin-top:20px">
      <button class="btn secondary" type="button" onclick="onboardingBack()">Back</button>
      <button class="btn primary" type="button" onclick="onboardingNextStep()">Start Initial Test ›</button>
    </div>`;
}

function _renderObStep3() {
  const allQs = state.activeQuestions;
  // pick 5 spread across the available questions
  const total = allQs.length;
  _obTestQs = total >= 5
    ? [0, Math.floor(total*0.2), Math.floor(total*0.4), Math.floor(total*0.6), Math.floor(total*0.8)].map(i => allQs[i])
    : allQs.slice(0, Math.min(5, total));
  _obTestIdx = 0;
  _obTestAnswered = new Array(_obTestQs.length).fill(null);
  _renderObQuestion();
}

function _renderObQuestion() {
  const q = _obTestQs[_obTestIdx];
  const total = _obTestQs.length;
  const answered = _obTestAnswered[_obTestIdx];
  const letters = ['A','B','C','D'];
  const card = obCard();
  card.innerHTML = `
    ${obProgressHTML(_obStep)}
    <div class="profile-onboarding-title"><h1>Quick Knowledge Check</h1><p class="sub">Question ${_obTestIdx + 1} of ${total} — Answer to calibrate your starting point.</p></div>
    <div class="ob-test-bar"><div class="ob-test-bar-fill" style="width:${((_obTestIdx) / total) * 100}%"></div></div>
    <p class="ob-test-question">${escapeHTML(q[0])}</p>
    <div class="ob-test-options">
      ${q[1].map((opt, i) => {
        let cls = 'ob-test-opt';
        if (answered !== null) {
          if (i === q[2]) cls += ' ob-opt-correct';
          else if (i === answered && i !== q[2]) cls += ' ob-opt-wrong';
        }
        return `<button class="${cls}" type="button" ${answered !== null ? 'disabled' : ''} onclick="answerOnboardingTest(${i})"><span class="ob-opt-letter">${letters[i]}</span><span>${escapeHTML(opt)}</span></button>`;
      }).join('')}
    </div>
    ${answered !== null ? `
      <p class="ob-test-feedback ${answered === q[2] ? 'ob-feedback-correct' : 'ob-feedback-wrong'}">${answered === q[2] ? '✓ Correct! ' : '✗ The answer is ' + letters[q[2]] + '. '}${escapeHTML(q[3] || '')}</p>
      <div class="onboarding-actions" style="flex-direction:row;gap:10px;margin-top:14px">
        <button class="btn secondary" type="button" onclick="onboardingBack()" style="flex:0 0 auto">← Back</button>
        ${_obTestIdx < total - 1
          ? `<button class="btn primary" type="button" onclick="onboardingTestNext()" style="flex:1">Next question →</button>`
          : `<button class="btn primary" id="profileOnboardingSave" type="button" onclick="saveProfileOnboarding()" style="flex:1">✈ Finish & Enter Dashboard</button>`}
      </div>` : ''}`;
}

export function selectOnboardingCourse(track) {
  _obTrack = track;
  document.querySelectorAll('.ob-course-option').forEach(btn => btn.classList.toggle('ob-course-selected', btn.textContent.includes(COURSES.find(c=>c.track===track)?.title || '')));
  // simpler: re-render step 2
  _renderObStep2();
}

export function onboardingNextStep() {
  if (_obStep === 1) {
    const fullName = document.getElementById('onboardFullName')?.value.trim() || '';
    const username = normalizeUsername(document.getElementById('onboardUsername')?.value || '');
    const birthDate = document.getElementById('onboardBirthDate')?.value || '';
    const flightSchool = document.getElementById('onboardFlightSchool')?.value.trim() || '';
    const status = document.getElementById('profileOnboardingStatus');
    const setErr = msg => { if (status) { status.textContent = msg; status.dataset.type = 'error'; } };
    if (!fullName) { setErr('Full name is required.'); return; }
    const validation = validateUsername(username);
    if (validation) { setErr(validation); return; }
    if (!flightSchool) { setErr('Flight school is required.'); return; }
    _obData = { ..._obData, fullName, username, birthDate, flightSchool };
    _obStep = 2;
    _renderObStep2();
  } else if (_obStep === 2) {
    if (!_obTrack) return; // nothing selected yet
    _obStep = 3;
    _renderObInstructions();
  } else if (_obStep === 3) {
    _obStep = 4;
    _renderObStep3();
  }
}

export function onboardingBack() {
  if (_obStep === 2) { _obStep = 1; _renderObStep1(); }
  else if (_obStep === 3) { _obStep = 2; _renderObStep2(); }
  else if (_obStep === 4) { _obStep = 3; _renderObInstructions(); }
}

export function answerOnboardingTest(answerIdx) {
  _obTestAnswered[_obTestIdx] = answerIdx;
  _renderObQuestion();
}

export function onboardingTestNext() {
  if (_obTestIdx < _obTestQs.length - 1) { _obTestIdx++; _renderObQuestion(); }
}

export function setOnboardingLicense(value) {
  _obTrack = value;
  document.querySelectorAll('.license-segments button').forEach(b => b.classList.toggle('active', b.dataset.track === value));
}

function profileOnboardingStatus(message, type = 'muted') {
  const status = document.getElementById('profileOnboardingStatus');
  if (status) { status.textContent = message; status.dataset.type = type; }
}

export async function saveProfileOnboarding() {
  if (state.profileOnboardingSaving || !state.currentUser) return;
  // Collect data from stored onboarding state (multi-step) or fallback to DOM (legacy)
  const fullName    = _obData.fullName    || document.getElementById('onboardFullName')?.value.trim() || '';
  const username    = normalizeUsername(_obData.username || document.getElementById('onboardUsername')?.value || '');
  const birthDate   = (_obData.birthDate   ?? document.getElementById('onboardBirthDate')?.value) || null;
  const flightSchool= _obData.flightSchool|| document.getElementById('onboardFlightSchool')?.value.trim() || '';
  const licenseTrack= _obTrack || document.getElementById('onboardLicenseTrack')?.value || 'PPL';
  if (!fullName) { profileOnboardingStatus('Full name is required.', 'error'); return; }
  const validation = validateUsername(username);
  if (validation) { profileOnboardingStatus(validation, 'error'); return; }
  if (!flightSchool) { profileOnboardingStatus('Flight school is required.', 'error'); return; }
  try {
    state.profileOnboardingSaving = true;
    const button = document.getElementById('profileOnboardingSave');
    if (button) { button.disabled = true; button.textContent = 'Saving...'; }
    profileOnboardingStatus('Checking username...');
    if (!(await checkUsernameAvailable(username))) { profileOnboardingStatus('That username is already taken. Try another one.', 'error'); return; }
    const google = googleProfileMetadata();
    const payload = { id: state.currentUser.id, email: state.currentUser.email || google.email, full_name: fullName, username, birth_date: birthDate || null, flight_school: flightSchool, license_track: licenseTrack, avatar_url: state.profileOnboardingProfile?.avatar_url || google.avatar };
    let result = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select(PROFILE_SELECT_COLUMNS).single();
    if (result.error) result = await supabase.from('profiles').update(payload).eq('id', state.currentUser.id).select(PROFILE_SELECT_COLUMNS).single();
    if (result.error) throw result.error;
    state.profileOnboardingProfile = result.data;
    state.friendsState = null;
    document.querySelector('.profile-onboarding-backdrop')?.remove();
    window.navigateToPage?.('dashboard');
    if (document.querySelector('.settings-wrap')) renderSettings();
  } catch (error) {
    console.warn('Profile onboarding save failed', error);
    profileOnboardingStatus(error.message || 'Could not save profile.', 'error');
  } finally {
    state.profileOnboardingSaving = false;
    const button = document.getElementById('profileOnboardingSave');
    if (button) { button.disabled = false; button.innerHTML = '✈ Finish & Enter Dashboard'; }
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
