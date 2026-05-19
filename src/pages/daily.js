import { state } from '../state.js';
import { dailyQuestions } from '../data/questions.js';
import { escapeHTML, ordinalRank, localDateString, addDays } from '../utils.js';
import { view, animateSurface } from '../app.js';
import { loadDailyTaskData, saveTodayDailyResult, loadDailyGlobalLeaderboard, loadDailyAllTimeLeaderboard, loadDailyFriendsLeaderboard, calculateBestDailyStreak } from '../services/daily.js';
import { getCurrentProfile } from '../services/profile.js';
import { profileDisplayName, profileUsername, profileInitials } from './friends.js';

const DAILY_SECONDS = 20;

function dailyDateKey() {
  return localDateString(new Date());
}

function dailyDateKeyFromDate(date) {
  return localDateString(date);
}

function shiftDailyDateKey(key, days) {
  const [year, month, date] = key.split('-').map(Number);
  return localDateString(addDays(new Date(year, month - 1, date), days));
}

function dailyProgressKey() {
  return `dailyFlightChallengeProgress_${state.currentUser?.id || 'guest'}_${dailyDateKey()}`;
}

export function resetDailyTaskSession() {
  clearDailyTimer();
  state.dailyState = null;
  state.dailyLocked = false;
  state.dailyPaused = false;
  state.dailyTaskHistoryCache = [];
  state.dailyTaskLoadedFor = null;
}

function getDailyHistory() {
  return state.currentUser ? state.dailyTaskHistoryCache : [];
}

function getDailyResult() {
  return getDailyHistory().find(item => item.date === dailyDateKey()) || null;
}

function getTodayDailyResult() { return getDailyResult(); }

function getDailyProgress() {
  try {
    const progress = JSON.parse(localStorage.getItem(dailyProgressKey()) || 'null');
    return progress && progress.date === dailyDateKey() ? progress : null;
  } catch { return null; }
}

function saveDailyProgress(dailyStateSnap = state.dailyState) {
  if (!dailyStateSnap) return;
  const now = Date.now();
  const remaining = state.dailyLocked ? dailyStateSnap.timeLeft
    : state.dailyPaused ? state.dailyPauseRemaining
    : state.dailyQuestionDeadline ? Math.max(0, Math.ceil((state.dailyQuestionDeadline - now) / 1000))
    : dailyStateSnap.timeLeft;
  localStorage.setItem(dailyProgressKey(), JSON.stringify({ ...dailyStateSnap, timeLeft: Math.max(0, Math.min(DAILY_SECONDS, remaining)), deadlineAt: state.dailyPaused ? null : state.dailyQuestionDeadline || null, date: dailyDateKey(), updatedAt: new Date().toISOString() }));
}

function clearDailyProgress() { localStorage.removeItem(dailyProgressKey()); }

function calculateCurrentDailyStreak(history = getDailyHistory()) {
  const completed = new Set(history.map(item => item.date));
  let cursor = completed.has(dailyDateKey()) ? dailyDateKey() : shiftDailyDateKey(dailyDateKey(), -1), streak = 0;
  while (completed.has(cursor)) { streak += 1; cursor = shiftDailyDateKey(cursor, -1); }
  return streak;
}

function getDailyMilestone(streak) {
  const target = streak < 7 ? 7 : streak < 14 ? 14 : 30;
  return { target, label: `${target} Day Streak`, reward: target === 7 ? '+100 Points' : target === 14 ? '+150 Points' : '+300 Points', progress: Math.min(100, Math.round((streak / target) * 100)) };
}

function getDailyStats() {
  const history = getDailyHistory(), todayResult = getTodayDailyResult(), currentStreak = calculateCurrentDailyStreak(history), bestStreak = calculateBestDailyStreak(history), questionCount = dailyQuestions.length, estimatedMinutes = Math.max(1, Math.ceil((questionCount * DAILY_SECONDS) / 60)), todayPoints = todayResult?.totalPoints || 0, milestone = getDailyMilestone(currentStreak);
  return { history, todayResult, currentStreak, bestStreak, questionCount, estimatedMinutes, todayPoints, milestone };
}

function getDailyResetCountdown() {
  const now = new Date(), reset = new Date(now);
  reset.setHours(24, 0, 0, 0);
  const diff = Math.max(0, reset - now), hours = Math.floor(diff / 3600000), minutes = Math.floor((diff % 3600000) / 60000), seconds = Math.floor((diff % 60000) / 1000);
  return `${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`;
}

export function clearDailyResetTimer() { clearInterval(state.dailyResetTimer); state.dailyResetTimer = null; }

function startDailyResetCountdown() {
  clearDailyResetTimer();
  const tick = () => {
    const label = document.getElementById('dailyResetCountdown');
    if (!label) { clearDailyResetTimer(); return; }
    label.textContent = getDailyResetCountdown();
  };
  tick();
  state.dailyResetTimer = setInterval(tick, 1000);
}

function dailyWeekRowHTML(history = getDailyHistory()) {
  const completed = new Set(history.map(item => item.date)), today = new Date(), todayKey = dailyDateKey(), labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() - 6 + offset);
    const key = dailyDateKeyFromDate(date), done = completed.has(key), isToday = key === todayKey;
    return `<span class="${done ? 'done' : ''} ${isToday ? 'today' : ''}">${done ? '✓' : labels[date.getDay()]}</span>`;
  }).join('');
}

function dailyPreviewHTML() {
  const q = dailyQuestions[0];
  if (!q) return `<section class="daily-preview-card"><div class="daily-preview-media" aria-hidden="true"><span>✈</span></div><div class="daily-preview-copy"><div class="daily-preview-top"><h3>Today's Preview</h3><span>No questions</span></div><p>No daily questions available.</p><div class="daily-preview-answers"></div></div></section>`;
  return `<section class="daily-preview-card"><div class="daily-preview-media" aria-hidden="true"><span>✈</span></div><div class="daily-preview-copy"><div class="daily-preview-top"><h3>Today's Preview</h3><span>Question 1 of ${dailyQuestions.length}</span></div><p>"${escapeHTML(q.question)}"</p><div class="daily-preview-answers">${q.choices.map((choice, i) => `<span>${String.fromCharCode(65 + i)}. ${escapeHTML(choice)}</span>`).join('')}</div><button class="daily-outline-btn" type="button">View Full Test Outline</button></div></section>`;
}

function dailyLeaderboardPointsLabel(row) {
  if (row.points == null) return row.emptyLabel || 'No score yet';
  return `${Number(row.points).toLocaleString()} pts`;
}

function dailyLeaderboardNameHTML(row) {
  if (row.profile) {
    return `<span>${escapeHTML(profileDisplayName(row.profile))}${row.isYou ? ` <em>You</em>` : ''}</span><small>${escapeHTML(profileUsername(row.profile))}</small>`;
  }
  return `<span>${escapeHTML(row.name)}${row.isYou ? ` <em>${escapeHTML(row.meta || 'You')}</em>` : ''}</span>`;
}

function dailyLeaderboardRowsHTML(rows = []) {
  if (!rows.length) return `<div class="daily-leader-empty">Add friends to compare today's challenge.</div>`;
  return rows.map((row, i) => `<div class="${row.isYou ? 'you' : ''} ${row.points == null ? 'no-score' : ''}"><b>${row.profile ? escapeHTML(profileInitials(row.profile)) : i + 1}</b><span>${dailyLeaderboardNameHTML(row)}</span><strong>${dailyLeaderboardPointsLabel(row)}</strong></div>`).join('') + (rows.some(row => row.friendEmpty) ? `<div class="daily-leader-empty">Add friends to compare today's challenge.</div>` : '');
}

function fallbackLeaderboardRows(todayResult = null, profile = null) {
  const myName = profileDisplayName(profile || {}) || 'Alex Morgan', myPoints = todayResult?.totalPoints ?? 820;
  return [
    { name: 'Leo Cruz', points: 980, bestStreak: 14 },
    { name: 'Maya Santos', points: 940, bestStreak: 12 },
    { name: 'Ari Tan', points: 890, bestStreak: 10 },
    { name: 'Nico Reyes', points: 850, bestStreak: 9 },
    { name: `You (${myName})`, points: myPoints, bestStreak: 7, isYou: true, meta: 'Current pilot' },
    { name: 'Zoe Mitchell', points: 790, bestStreak: 6 },
    { name: 'Jordan Lee', points: 740, bestStreak: 5 },
    { name: 'Sam Patel', points: 710, bestStreak: 4 },
  ];
}

function normalizeLeaderboardDisplayRows(rows = [], tab = 'school', profile = null, stats = null) {
  const fallback = tab === 'friends' ? [] : fallbackLeaderboardRows(stats?.todayResult, profile);
  const source = rows.length ? rows : fallback;
  return source.slice(0, 8).map((row, index) => {
    const isYou = Boolean(row.isYou || (state.currentUser && row.userId === state.currentUser.id));
    const name = row.profile ? profileDisplayName(row.profile) : (row.name || 'Student Pilot');
    const sub = row.profile ? profileUsername(row.profile) : (row.meta || 'Student Pilot');
    const points = typeof row.points === 'number' ? row.points : null;
    return { rank: index + 1, isYou, name: isYou && row.profile ? `You (${name})` : name, sub, points, emptyLabel: row.emptyLabel || 'No score yet', bestStreak: row.bestStreak ?? (isYou ? stats?.bestStreak : null), initials: row.profile ? profileInitials(row.profile) : name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() };
  });
}

function leaderboardRowsTableHTML(rows = []) {
  if (!rows.length) return `<div class="leader-table-empty">Add friends to compare today's challenge.</div>`;
  return rows.map(row => `<div class="leader-table-row ${row.isYou ? 'you' : ''}"><div class="leader-rank-cell">#${row.rank}</div><div class="leader-pilot"><div class="leader-avatar">${escapeHTML(row.initials || 'SP')}</div><div><b>${escapeHTML(row.name)}</b><span>${escapeHTML(row.sub || 'Student Pilot')}</span></div></div><div class="leader-points-cell">${row.points == null ? escapeHTML(row.emptyLabel) : `${Number(row.points).toLocaleString()} pts`}</div><div class="leader-streak-cell">${row.bestStreak == null ? 'No data' : `${row.bestStreak} days`}</div></div>`).join('');
}

export function renderDailyLeaderboardCard(mode = state.dailyLeaderboardMode, cardState = 'ready', rows = null) {
  const isFriends = mode === 'friends', title = isFriends ? 'Friends Leaderboard' : 'Global Rankings', label = isFriends ? 'Accepted friends' : "Today's Standings";
  const boardHTML = cardState === 'loading' ? `<div class="daily-leader-empty">Loading leaderboard...</div>` : cardState === 'error' ? `<div class="daily-leader-empty">Unable to load leaderboard.</div>` : dailyLeaderboardRowsHTML(rows || []);
  return `<section class="daily-leader-preview" id="dailyLeaderboardCard"><div class="daily-card-head daily-leader-card-head"><div><div class="kicker">${title.toUpperCase()}</div><h3>${label}</h3></div><div class="daily-leader-toggle" role="tablist" aria-label="Daily leaderboard view"><button class="${mode === 'school' ? 'active' : ''}" onclick="setDailyLeaderboardMode('school')" type="button">Global</button><button class="${mode === 'friends' ? 'active' : ''}" onclick="setDailyLeaderboardMode('friends')" type="button">Friends</button></div></div><div class="daily-preview-board">${boardHTML}</div><button class="btn secondary" onclick="renderDailyLeaderboard('${mode}')">View Full Leaderboard</button></section>`;
}

export function setDailyLeaderboardMode(mode) {
  state.dailyLeaderboardMode = mode === 'friends' ? 'friends' : 'school';
  const card = document.getElementById('dailyLeaderboardCard');
  if (card) card.outerHTML = renderDailyLeaderboardCard(state.dailyLeaderboardMode, 'loading');
  const loader = state.dailyLeaderboardMode === 'friends' ? loadDailyFriendsLeaderboard : loadDailyGlobalLeaderboard;
  loader().then(rows => {
    const next = document.getElementById('dailyLeaderboardCard');
    if (next) next.outerHTML = renderDailyLeaderboardCard(state.dailyLeaderboardMode, 'ready', rows.slice(0, 5));
  }).catch(error => {
    console.warn('Daily leaderboard failed', error);
    const next = document.getElementById('dailyLeaderboardCard');
    if (next) next.outerHTML = renderDailyLeaderboardCard(state.dailyLeaderboardMode, 'error', []);
  });
}

export function clearDailyTimer() {
  clearInterval(state.dailyTimer);
  state.dailyTimer = null;
  clearDailyResetTimer();
}

function dailyAudio() {
  try {
    state.dailyAudioCtx = state.dailyAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (state.dailyAudioCtx.state === 'suspended') state.dailyAudioCtx.resume();
    return state.dailyAudioCtx;
  } catch { return null; }
}

function dailyTone(freq = 440, duration = .08, type = 'sine', gain = .035, delay = 0) {
  const ctx = dailyAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator(), vol = ctx.createGain(), start = ctx.currentTime + delay;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  vol.gain.setValueAtTime(0.0001, start);
  vol.gain.exponentialRampToValueAtTime(gain, start + .012);
  vol.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(vol).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + .02);
}

function playDailySfx(kind) {
  if (kind === 'start') { dailyTone(520, .08, 'sine', .035); dailyTone(760, .10, 'sine', .03, .07); return; }
  if (kind === 'select') { dailyTone(360, .055, 'triangle', .026); return; }
  if (kind === 'correct') { dailyTone(620, .075, 'sine', .035); dailyTone(880, .11, 'sine', .03, .075); return; }
  if (kind === 'wrong') { dailyTone(220, .11, 'sawtooth', .025); dailyTone(170, .13, 'triangle', .022, .08); return; }
  if (kind === 'tick') { dailyTone(760, .04, 'square', .018); return; }
  if (kind === 'expired') { dailyTone(180, .16, 'triangle', .026); return; }
  if (kind === 'next') { dailyTone(460, .06, 'sine', .018); return; }
  if (kind === 'finish') { dailyTone(520, .08, 'sine', .035); dailyTone(700, .08, 'sine', .032, .07); dailyTone(920, .14, 'sine', .03, .14); }
}

export async function renderDailyTask() {
  const render = { page: 'daily', token: ++state.appRenderToken };
  clearDailyTimer();
  if (!state.currentUser) {
    state.dailyTaskHistoryCache = [];
    state.dailyTaskLoadedFor = null;
    if (window.activePage?.() !== 'daily' || render.token !== state.appRenderToken) return;
    view.innerHTML = `<section class="page"><div class="daily-page daily-landing daily-dashboard"><section class="daily-dash-shell"><header class="daily-dash-head"><div><div class="kicker">DAILY TASK</div><h1>Daily Flight Challenge</h1><p class="sub">Sign in to keep Daily Task attempts separate and synced to your account.</p></div></header><section class="card glass" style="padding:28px;border-radius:24px"><h2>Sign in to start today's challenge.</h2><p class="sub">Daily completions, points, streaks, and results are saved per Supabase account.</p><div class="actions"><button class="btn primary" onclick="renderTempLoginModal(true)">Sign In</button></div></section></section></div></section>`;
    animateSurface();
    return;
  }
  await loadDailyTaskData();
  if (window.activePage?.() !== 'daily' || render.token !== state.appRenderToken) return;
  const stats = getDailyStats(), completed = Boolean(stats.todayResult), inProgress = Boolean(getDailyProgress() && !completed), startAction = completed ? 'renderDailyResults(getTodayDailyResult(),true)' : 'startDailyChallenge()';
  view.innerHTML = `<section class="page"><div class="daily-page daily-landing daily-dashboard"><section class="daily-dash-shell"><header class="daily-dash-head"><div><div class="kicker">DAILY TASK</div><h1>Daily Flight Challenge</h1><p class="sub">Sharpen your knowledge. Climb the leaderboard. Earn rewards.</p></div></header><div class="daily-dash-grid"><main class="daily-dash-main"><section class="daily-challenge-hero"><div class="daily-hero-content"><span class="daily-pill">DAILY CHALLENGE</span><h2>Test your knowledge. Take flight every day.</h2><p>${completed ? 'Review your results or check the leaderboard.' : inProgress ? "Resume today's active challenge where you left off." : "Complete today's challenge to keep your streak alive and earn rewards."}</p><div class="daily-hero-actions"><button class="btn primary" onclick="${startAction}">${completed ? "View Today's Results" : inProgress ? 'Resume Daily Test' : 'Start Daily Test'}</button><div class="daily-countdown-card"><span>Next Reset</span><b id="dailyResetCountdown">${getDailyResetCountdown()}</b><small>HRS / MIN / SEC</small></div></div></div><div class="daily-reward-strip"><div><i class="daily-reward-icon" aria-hidden="true">+</i><b>100</b><span>Points</span></div><div><i class="daily-reward-icon" aria-hidden="true">1</i><b>1</b><span>Streak Boost</span></div></div></section><section class="daily-stat-grid"><article><span>Your Points</span><b>${stats.todayPoints.toLocaleString()}</b><small>${completed ? 'Completed today' : inProgress ? 'In progress' : 'Not attempted'}</small></article><article><span>Current Streak</span><b>${stats.currentStreak} ${stats.currentStreak === 1 ? 'Day' : 'Days'}</b><small>Best: ${stats.bestStreak} ${stats.bestStreak === 1 ? 'Day' : 'Days'}</small></article><article><span>Est. Time</span><b>${stats.estimatedMinutes} Min</b><small>${stats.questionCount ? `${DAILY_SECONDS}s per question` : 'No questions'}</small></article><article><span>Questions</span><b>${stats.questionCount}</b><small>Multiple choice</small></article></section>${dailyPreviewHTML()}</main><aside class="daily-dash-side">${renderDailyLeaderboardCard(state.dailyLeaderboardMode)}<section class="daily-streak-card"><div class="daily-card-head"><div><div class="kicker">STREAK &amp; REWARDS</div><h3>${stats.currentStreak} ${stats.currentStreak === 1 ? 'Day' : 'Days'} Streak</h3></div><div class="daily-gift">☼</div></div><div class="daily-week-row">${dailyWeekRowHTML(stats.history)}</div><div class="daily-milestone"><span>Next Milestone</span><b>${stats.milestone.label}</b><small>${stats.milestone.reward}</small><div class="bar"><div class="fill" style="width:${stats.milestone.progress}%"></div></div><em>${stats.currentStreak} / ${stats.milestone.target} days</em></div></section></aside></div></section></div></section>`;
  animateSurface();
  startDailyResetCountdown();
  setDailyLeaderboardMode(state.dailyLeaderboardMode);
}

export async function startDailyChallenge() {
  await loadDailyTaskData(true);
  if (window.activePage?.() !== 'daily') return;
  const todayResult = getTodayDailyResult();
  if (todayResult) { renderDailyResults(todayResult, true); return; }
  if (!dailyQuestions.length) { window.showToast?.('No daily questions available.'); renderDailyTask(); return; }
  const savedProgress = getDailyProgress();
  if (savedProgress) {
    const deadlineLeft = savedProgress.deadlineAt ? Math.ceil((savedProgress.deadlineAt - Date.now()) / 1000) : savedProgress.timeLeft;
    state.dailyState = { ...savedProgress, timeLeft: Math.max(1, Math.min(DAILY_SECONDS, Number(deadlineLeft) || DAILY_SECONDS)) };
    state.dailyLastTickSecond = null;
    state.dailyPaused = false;
    renderDailyQuestion();
    return;
  }
  playDailySfx('start');
  state.dailyLastTickSecond = null;
  state.dailyPaused = false;
  state.dailyState = { index: 0, answers: [], correctCount: 0, basePoints: 0, speedBonus: 0, streak: 0, streakBonus: 0, perfectBonus: 0, totalPoints: 0, timeLeft: DAILY_SECONDS };
  saveDailyProgress();
  renderDailyQuestion();
}

export function renderDailyQuestion() {
  if (window.activePage?.() !== 'daily') return;
  clearDailyTimer();
  state.dailyLocked = false;
  if (!state.dailyState || state.dailyState.index >= dailyQuestions.length) { finishDailyChallenge(); return; }
  state.dailyPaused = false;
  state.dailyState.timeLeft = Math.max(1, Math.min(DAILY_SECONDS, Number(state.dailyState.timeLeft) || DAILY_SECONDS));
  state.dailyQuestionDeadline = Date.now() + state.dailyState.timeLeft * 1000;
  state.dailyPauseRemaining = state.dailyState.timeLeft;
  saveDailyProgress();
  const q = dailyQuestions[state.dailyState.index], progress = Math.round(((state.dailyState.index + 1) / dailyQuestions.length) * 100), timerAngle = Math.round((state.dailyState.timeLeft / DAILY_SECONDS) * 360);
  view.innerHTML = `<section class="page"><div class="daily-page daily-active"><div class="daily-quiz-shell"><header class="daily-active-head"><h1>Daily Flight Challenge</h1><div class="daily-active-stats"><span>⚡ <b id="dailyPoints">${state.dailyState.totalPoints}</b> pts</span><span>🔥 <b id="dailyStreak">${state.dailyState.streak}</b> Streak</span></div></header><section class="daily-progress-block"><div class="daily-progress-copy"><div><div class="progress-row"><span>Question ${state.dailyState.index + 1} of ${dailyQuestions.length}</span><b>${progress}%</b></div><div class="bar"><div class="fill" style="width:${progress}%"></div></div></div><aside class="daily-side"><div class="daily-timer" style="--timer-angle:${timerAngle}deg"><div><b id="dailyTimer">${state.dailyState.timeLeft}</b><span>Sec</span></div></div></aside></div></section><div class="daily-active-main"><main class="daily-question-card"><h2>${escapeHTML(q.question)}</h2><div class="daily-answer-grid">${q.choices.map((choice, i) => `<button class="daily-answer" onclick="answerDailyQuestion(${i})"><span class="letter">${String.fromCharCode(65 + i)}</span><span>${escapeHTML(choice)}</span><span class="daily-check">✓</span></button>`).join('')}</div><div class="daily-info-note">Answer before time runs out. You can't go back.</div><div id="dailyFeedback" class="daily-feedback"></div></main></div><div class="daily-next-loader">Loading next question...</div></div></div></section>`;
  animateSurface();
  startDailyCountdown();
}

function updateDailyTimerUI(seconds) {
  const remaining = Math.max(0, Math.min(DAILY_SECONDS, Number(seconds) || 0));
  const label = document.getElementById('dailyTimer');
  if (label) label.textContent = remaining;
  const timer = document.querySelector('.daily-timer');
  if (timer) {
    timer.style.setProperty('--timer-angle', `${Math.round((remaining / DAILY_SECONDS) * 360)}deg`);
    timer.classList.toggle('urgent', remaining <= 5 && remaining > 0);
  }
}

function startDailyCountdown() {
  clearDailyTimer();
  state.dailyQuestionDeadline = Date.now() + Math.max(0, Number(state.dailyState?.timeLeft) || DAILY_SECONDS) * 1000;
  updateDailyTimerUI(state.dailyState?.timeLeft || DAILY_SECONDS);
  state.dailyTimer = setInterval(() => {
    if (window.activePage?.() !== 'daily') { clearDailyTimer(); return; }
    if (state.dailyPaused || state.dailyLocked || !state.dailyState) return;
    state.dailyState.timeLeft = Math.max(0, Math.ceil((state.dailyQuestionDeadline - Date.now()) / 1000));
    updateDailyTimerUI(state.dailyState.timeLeft);
    if (state.dailyState.timeLeft <= 5 && state.dailyState.timeLeft > 0 && state.dailyLastTickSecond !== state.dailyState.timeLeft) { state.dailyLastTickSecond = state.dailyState.timeLeft; playDailySfx('tick'); }
    if (state.dailyState.timeLeft <= 0) { clearDailyTimer(); answerDailyQuestion(null, true); }
  }, 250);
}

export function toggleDailyPause() {
  if (!state.dailyState || state.dailyLocked) return;
  state.dailyPaused = !state.dailyPaused;
  if (state.dailyPaused) {
    state.dailyPauseRemaining = Math.max(0, Math.ceil((state.dailyQuestionDeadline - Date.now()) / 1000));
    state.dailyState.timeLeft = state.dailyPauseRemaining;
  } else {
    state.dailyQuestionDeadline = Date.now() + Math.max(0, state.dailyPauseRemaining || state.dailyState.timeLeft) * 1000;
  }
  const button = document.getElementById('dailyPauseBtn');
  if (button) button.textContent = state.dailyPaused ? 'Resume Timer' : 'Pause Timer';
  updateDailyTimerUI(state.dailyState.timeLeft);
  saveDailyProgress();
  window.showToast?.(state.dailyPaused ? 'Daily timer paused.' : 'Daily timer resumed.');
}

export function answerDailyQuestion(choice, missed = false) {
  if (state.dailyLocked || !state.dailyState) return;
  state.dailyLocked = true;
  clearDailyTimer();
  state.dailyQuestionDeadline = 0;
  const q = dailyQuestions[state.dailyState.index], correct = choice === q.correct, remaining = Math.max(0, state.dailyState.timeLeft);
  playDailySfx(missed ? 'expired' : 'select');
  if (correct) {
    state.dailyState.correctCount += 1;
    state.dailyState.basePoints += 80;
    state.dailyState.speedBonus += remaining * 2;
    state.dailyState.streak += 1;
    if (state.dailyState.streak % 3 === 0) state.dailyState.streakBonus += 20;
  } else {
    state.dailyState.streak = 0;
  }
  state.dailyState.totalPoints = Math.min(1000, state.dailyState.basePoints + state.dailyState.speedBonus + state.dailyState.streakBonus);
  state.dailyState.answers.push({ question: q.question, choice, correct, missed, remaining });
  document.querySelectorAll('.daily-answer').forEach((button, i) => {
    button.disabled = true;
    if (i === choice) button.classList.add('selected');
    if (i === q.correct) button.classList.add('correct');
    if (i === choice && i !== q.correct) button.classList.add('wrong');
  });
  const points = document.getElementById('dailyPoints'), streak = document.getElementById('dailyStreak'), feedback = document.getElementById('dailyFeedback');
  if (points) points.textContent = state.dailyState.totalPoints;
  if (streak) streak.textContent = state.dailyState.streak;
  setTimeout(() => playDailySfx(correct ? 'correct' : 'wrong'), 90);
  if (feedback) { feedback.classList.add('show'); feedback.innerHTML = `<b>${correct ? 'Correct.' : missed ? 'Time expired.' : 'Not quite.'}</b><br>${escapeHTML(q.explanation || '')}`; }
  saveDailyProgress({ ...state.dailyState, index: state.dailyState.index + 1, timeLeft: DAILY_SECONDS });
  setTimeout(() => {
    if (window.activePage?.() !== 'daily' || !state.dailyState) return;
    playDailySfx('next');
    const shell = document.querySelector('.daily-quiz-shell');
    if (shell) shell.classList.add('daily-next-loading');
    setTimeout(() => {
      if (window.activePage?.() !== 'daily' || !state.dailyState) return;
      state.dailyState.index += 1;
      state.dailyState.timeLeft = DAILY_SECONDS;
      state.dailyLastTickSecond = null;
      renderDailyQuestion();
    }, 350);
  }, 2000);
}

export async function skipDailyTest() {
  if (!window.isDevUser?.()) { window.showToast?.('Dev only.'); return; }
  clearDailyTimer();
  try {
    const result = await saveTodayDailyResult({ date: dailyDateKey(), correctCount: 8, totalQuestions: dailyQuestions.length, basePoints: 640, speedBonus: 150, streakBonus: 40, perfectBonus: 0, totalPoints: 830, completedAt: new Date().toISOString(), answers: [] });
    renderDailyResults(result, false);
  } catch (error) { window.showToast?.(error.message || 'Unable to save Daily Task.'); }
}

async function finishDailyChallenge() {
  clearDailyTimer();
  if (!state.dailyState) return;
  state.dailyState.perfectBonus = state.dailyState.correctCount === dailyQuestions.length ? 50 : 0;
  state.dailyState.totalPoints = Math.min(1000, state.dailyState.basePoints + state.dailyState.speedBonus + state.dailyState.streakBonus + state.dailyState.perfectBonus);
  playDailySfx('finish');
  try {
    const result = await saveTodayDailyResult({ date: dailyDateKey(), correctCount: state.dailyState.correctCount, totalQuestions: dailyQuestions.length, basePoints: state.dailyState.basePoints, speedBonus: state.dailyState.speedBonus, streakBonus: state.dailyState.streakBonus, perfectBonus: state.dailyState.perfectBonus, totalPoints: state.dailyState.totalPoints, completedAt: new Date().toISOString(), answers: state.dailyState.answers, answerHistory: state.dailyState.answers });
    renderDailyResults(result, false);
  } catch (error) { window.showToast?.(error.message || 'Unable to save Daily Task.'); }
}

export function renderDailyResults(result, completed = false) {
  clearDailyTimer();
  const normalizeResult = r => ({ totalQuestions: r?.totalQuestions || dailyQuestions.length || 10, correctCount: r?.correctCount || 0, streakBonus: r?.streakBonus || 0, totalPoints: r?.totalPoints || 0, ...r });
  result = normalizeResult(result || getTodayDailyResult() || {});
  const { totalQuestions, correctCount, streakBonus, totalPoints } = result;
  const confettiKey = `revitDailyConfetti:${state.currentUser?.id || 'guest'}:${dailyDateKey()}`;
  const runConfetti = !localStorage.getItem(confettiKey);
  if (runConfetti) localStorage.setItem(confettiKey, 'shown');
  view.innerHTML = `<section class="page"><div class="daily-page daily-complete"><section class="daily-complete-card"><div class="daily-confetti ${runConfetti ? 'daily-confetti-run' : ''}" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="daily-complete-head"><div class="daily-success-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6 9 17l-5-5"/></svg></div><h1>Great Job!</h1><p class="sub">You completed today's challenge.</p></div><div class="daily-complete-stats"><article class="daily-complete-stat"><span>Score</span><b>${totalPoints.toLocaleString()}</b><small>/1000</small></article><article class="daily-complete-stat"><span>Correct Answers</span><b>${correctCount}</b><small>/${totalQuestions}</small></article><article class="daily-complete-stat"><span>Streak Bonus</span><b>+${streakBonus.toLocaleString()}</b><small>bonus</small></article><article class="daily-complete-stat"><span>Total Points</span><b>${totalPoints.toLocaleString()}</b><small>points</small></article></div><div class="daily-complete-actions"><button class="btn primary" onclick="renderDailyLeaderboard()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M5 6H3v2a4 4 0 0 0 4 4"/><path d="M19 6h2v2a4 4 0 0 1-4 4"/></svg>View Leaderboard</button><button class="btn secondary" onclick="navigateToPage('dashboard')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>Back to Dashboard</button></div></section></div></section>`;
  animateSurface();
}

export async function renderDailyLeaderboard(tab = 'school') {
  clearDailyTimer();
  await loadDailyTaskData();
  let rows = [], leaderboardError = false;
  try {
    rows = tab === 'friends' ? await loadDailyFriendsLeaderboard() : tab === 'all' ? await loadDailyAllTimeLeaderboard() : await loadDailyGlobalLeaderboard();
  } catch (error) { console.warn('Daily leaderboard failed', error); leaderboardError = true; }
  const stats = getDailyStats();
  const profile = state.currentUser ? await getCurrentProfile().catch(() => null) : null;
  const displayRows = leaderboardError ? [] : normalizeLeaderboardDisplayRows(rows, tab, profile, stats);
  const youRow = displayRows.find(row => row.isYou) || displayRows[4] || displayRows[0] || { rank: 5, points: stats.todayPoints || 0, bestStreak: stats.bestStreak || 0 };
  const totalPilots = Math.max(displayRows.length, 1);
  const showingEnd = Math.min(displayRows.length, totalPilots) || 0;
  view.innerHTML = `<section class="page"><div class="leaderboard-page"><div class="leaderboard-return"><button class="btn secondary" type="button" onclick="navigateToPage('daily')">Back to Daily Task</button></div><div class="leaderboard-shell"><aside class="leaderboard-side"><section class="leader-card leader-standing-card"><h2>Your Standing</h2><div class="leader-medal" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 3h8l-1 6H9L8 3Z"></path><path d="M12 9v4"></path><circle cx="12" cy="16" r="5"></circle><path d="m10.6 16 1 1 2-2"></path></svg></div><b class="leader-rank-large">${ordinalRank(youRow.rank || 5)}</b><div class="leader-sub">of ${totalPilots} pilots</div><div class="leader-mini-stats"><div><span>Points</span><b>${youRow.points == null ? '0' : Number(youRow.points).toLocaleString()} points</b></div><div><span>Best streak</span><b>${youRow.bestStreak || stats.bestStreak || 0} days</b></div></div></section><section class="leader-card leader-challenge-card"><div class="leader-friend-illo" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"></path><circle cx="9.5" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div><div><h2>Challenge Friends</h2><p>Invite your friends and climb the leaderboard</p></div><button class="btn primary" onclick="navigateToPage('friends')">Invite Friends</button></section></aside><main class="leader-table-card"><div class="leader-table-head"><div><div class="kicker">Daily Flight Challenge</div><h1>Leaderboard</h1></div><div class="leader-controls"><button class="btn secondary" type="button" onclick="navigateToPage('daily')">Back to Daily Task</button><select aria-label="Leaderboard scope" onchange="renderDailyLeaderboard(this.value)"><option value="school" ${tab === 'school' || tab === 'all' ? 'selected' : ''}>Overall</option><option value="friends" ${tab === 'friends' ? 'selected' : ''}>Friends</option></select><select aria-label="Leaderboard period" onchange="renderDailyLeaderboard(this.value)"><option value="school" ${tab !== 'all' ? 'selected' : ''}>Today</option><option value="all" ${tab === 'all' ? 'selected' : ''}>All Time</option></select></div></div><div class="leader-table-wrap"><div class="leader-table"><div class="leader-table-header"><span>Rank</span><span>Pilot</span><span>Points</span><span>Best Streak</span></div>${leaderboardError ? `<div class="leader-table-empty">Unable to load leaderboard.</div>` : leaderboardRowsTableHTML(displayRows)}</div></div><div class="leader-table-footer"><span>Showing ${displayRows.length ? '1' : '0'} to ${showingEnd} of ${totalPilots} pilots</span><div class="leader-pages" aria-label="Leaderboard pagination"><button type="button" aria-label="Previous page">&lt;</button><button type="button" class="active">1</button><button type="button">2</button><span>...</span><button type="button">8</button><button type="button" aria-label="Next page">&gt;</button></div></div></main></div></div></section>`;
  animateSurface();
}

export function getTodayDailyResultExport() { return getTodayDailyResult(); }
