import { state } from '../state.js';
import { escapeHTML, accuracySparklineHTML, accuracyTrendDeltaHTML, streakActivityBarsHTML, streakMiniTrendHTML, streakValueHTML } from '../utils.js';
import { view, animateSurface, setMotionText, setStreakCardValue } from '../app.js';
import { loadDashboardAccuracy, loadAccuracyTrend, loadAccuracyTrendDelta, loadDashboardProgress, loadDailyStreak, loadTopWeakAreas, loadWeakestPerformanceData } from '../services/dashboard.js';
import { getCurrentProfile } from '../services/profile.js';
import { loadDailyFriendsLeaderboard } from '../services/daily.js';
import { getQuizHistory, latestScore, averageScore } from '../services/quiz.js';
import { profileDisplayName, profileInitials, profileUsername } from './friends.js';

function dashboardCacheKey() {
  return `${state.currentUser?.id || 'guest'}:${getQuizHistory().length}:${state.dailyTaskLoadedFor || ''}`;
}

export function invalidateDashboardPreload() {
  state.dashboardPreloadCache = null;
  state.dashboardPreloadKey = '';
}

function dashboardProfilePillHTML() {
  return `<button class="dashboard-profile-pill" onclick="toggleDashboardSidebar()" aria-label="${state.dashboardSidebarCollapsed ? 'Open profile sidebar' : 'Collapse profile sidebar'}" aria-expanded="${!state.dashboardSidebarCollapsed}"><span class="profile-pill-avatar">VP</span><span class="profile-pill-copy"><b>Student Pilot</b><span>Private Pilot License</span></span><span class="profile-pill-caret">&lt;</span></button>`;
}

function dashboardProfileSummary(profile = null) {
  const google = state.currentUser ? (state.currentUser.user_metadata || {}) : {};
  const fallbackName = google.full_name || google.name || state.currentUser?.email?.split('@')[0] || 'Student Pilot';
  const name = profileDisplayName(profile || { full_name: fallbackName });
  const track = profile?.license_track || profile?.role || 'Private Pilot License';
  const initials = profileInitials(profile || { full_name: name });
  return { name, track, initials };
}

export function updateDashboardProfileSummary(profile = null) {
  const summary = dashboardProfileSummary(profile);
  document.querySelectorAll('.profile-card h3,.profile-pill-copy b').forEach(node => node.textContent = summary.name);
  document.querySelectorAll('.profile-card p,.profile-pill-copy span').forEach(node => node.textContent = summary.track);
  document.querySelectorAll('.profile-card .avatar span,.profile-pill-avatar').forEach(node => node.textContent = summary.initials);
}

async function loadDashboardProfileSummary() {
  updateDashboardProfileSummary();
  if (!state.currentUser) return;
  const token = state.dashboardRefreshToken;
  try {
    const profile = await getCurrentProfile();
    if (token !== state.dashboardRefreshToken || window.activePage?.() !== 'dashboard') return;
    updateDashboardProfileSummary(profile);
  } catch (error) { console.warn('Dashboard profile load failed', error); }
}

export function toggleDashboardSidebar() {
  state.dashboardSidebarCollapsed = !state.dashboardSidebarCollapsed;
  const layout = document.querySelector('.dashboard-layout');
  if (layout) layout.classList.toggle('sidebar-collapsed', state.dashboardSidebarCollapsed);
  const pill = document.querySelector('.dashboard-profile-pill');
  if (pill) {
    pill.setAttribute('aria-expanded', String(!state.dashboardSidebarCollapsed));
    pill.setAttribute('aria-label', state.dashboardSidebarCollapsed ? 'Open profile sidebar' : 'Collapse profile sidebar');
  }
}

export function applyDashboardData(data = {}) {
  const latest = data.latest ?? latestScore(), average = data.average ?? averageScore(), dashboardProgress = data.progress || null;
  const metricHeads = [document.querySelector('.modules-card h3'), document.querySelector('.accuracy-card .metric-copy h3'), document.querySelector('.streak-card .metric-copy h3')];
  if (metricHeads[0] && dashboardProgress) metricHeads[0].textContent = `${dashboardProgress.modulesAttempted}/${dashboardProgress.totalModules} Modules`;
  if (metricHeads[1]) {
    const accuracy = data.accuracy;
    const syncedAccuracy = accuracy?.hasData ? accuracy.accuracy : null;
    metricHeads[1].textContent = state.currentUser ? (accuracy?.accuracy ?? 0) + '%' : (average === null ? '0%' : average + '%');
    metricHeads[1].nextElementSibling.textContent = state.currentUser ? (accuracy?.hasData ? "Today's combined quiz accuracy." : 'Complete a quiz today to start daily accuracy.') : 'Log in to sync quiz accuracy.';
    const trend = document.querySelector('.accuracy-trend');
    const delta = document.querySelector('.accuracy-trend-delta');
    if (trend) trend.innerHTML = accuracySparklineHTML(data.trend || [], state.currentUser ? syncedAccuracy : (average === null ? null : average));
    if (delta) delta.innerHTML = accuracyTrendDeltaHTML(data.delta);
  }
  if (metricHeads[2]) {
    const streak = data.streak;
    const currentStreak = streak?.currentStreak || 0;
    setStreakCardValue(metricHeads[2], currentStreak);
    metricHeads[2].nextElementSibling.textContent = currentStreak ? 'Active quiz streak from completed sessions.' : 'Complete a quiz today to start a streak.';
    const dashboardBestStreak = document.querySelector('.streak-best-pill span');
    if (dashboardBestStreak) dashboardBestStreak.textContent = `Best streak: ${streak?.bestStreak || 0} ${(streak?.bestStreak || 0) === 1 ? 'day' : 'days'}`;
    const dashboardStreakBars = document.querySelector('.streak-card .streak-bars');
    if (dashboardStreakBars) dashboardStreakBars.innerHTML = streakActivityBarsHTML(streak?.dayCounts, streak?.last14Days);
  }
  if (dashboardProgress) {
    const sideValues = document.querySelectorAll('.side-row b');
    if (sideValues[0]) sideValues[0].textContent = dashboardProgress.overallProgress + '%';
    if (sideValues[1]) sideValues[1].textContent = `${dashboardProgress.modulesAttempted}/${dashboardProgress.totalModules}`;
    if (sideValues[2]) sideValues[2].textContent = dashboardProgress.quizzesCompleted + ' done';
    const heroProgress = document.querySelector('.hero-card .progress-row b');
    const heroFill = document.querySelector('.hero-card .fill');
    const avatar = document.querySelector('.profile-card .avatar');
    if (heroProgress) heroProgress.textContent = dashboardProgress.overallProgress + '%';
    if (heroFill) heroFill.style.width = dashboardProgress.overallProgress + '%';
    if (avatar) {
      avatar.style.setProperty('--course-angle', `${dashboardProgress.overallProgress * 3.6}deg`);
      avatar.dataset.progress = dashboardProgress.overallProgress + '%';
      avatar.setAttribute('aria-label', `${dashboardProgress.overallProgress}% overall course progress`);
    }
  } else {
    const sideValues = document.querySelectorAll('.side-row b');
    if (sideValues[2]) sideValues[2].textContent = getQuizHistory().length + ' done';
  }
  const testScore = document.querySelector('.test-score b');
  if (testScore && latest && !state.currentUser) testScore.textContent = latest.percent + '%';
  if (data.profile) updateDashboardProfileSummary(data.profile);
  if (data.friendsRows) {
    const card = document.querySelector('.dashboard-friends-card');
    if (card) card.outerHTML = renderDashboardFriendsLeaderboard('ready', data.friendsRows);
  }
  if ('weakest' in data) applyWeakestPerformanceRow(data.weakest);
}

export async function refreshDashboardMetrics() {
  const refreshToken = ++state.dashboardRefreshToken;
  const average = averageScore();
  const metricHeads = [document.querySelector('.modules-card h3'), document.querySelector('.accuracy-card .metric-copy h3'), document.querySelector('.streak-card .metric-copy h3')];
  let dashboardProgress = null;
  if (state.currentUser) {
    try {
      dashboardProgress = await loadDashboardProgress();
      if (refreshToken !== state.dashboardRefreshToken) return;
    } catch (error) {
      if (refreshToken !== state.dashboardRefreshToken) return;
      console.warn('Dashboard progress load failed', error);
    }
  }
  if (metricHeads[0] && dashboardProgress) setMotionText(metricHeads[0], `${dashboardProgress.modulesAttempted}/${dashboardProgress.totalModules} Modules`);
  if (metricHeads[1]) {
    if (state.currentUser) {
      try {
        const dashboardAccuracy = await loadDashboardAccuracy();
        if (refreshToken !== state.dashboardRefreshToken) return;
        setMotionText(metricHeads[1], (dashboardAccuracy?.accuracy ?? 0) + '%');
        metricHeads[1].nextElementSibling.textContent = dashboardAccuracy?.hasData ? "Today's combined quiz accuracy." : 'Complete a quiz today to start daily accuracy.';
        const trend = document.querySelector('.accuracy-trend');
        const delta = document.querySelector('.accuracy-trend-delta');
        const [trendData, deltaData] = await Promise.all([loadAccuracyTrend(), loadAccuracyTrendDelta()]);
        if (refreshToken !== state.dashboardRefreshToken) return;
        if (trend) trend.innerHTML = accuracySparklineHTML(trendData, dashboardAccuracy?.hasData ? dashboardAccuracy.accuracy : null);
        if (delta) delta.innerHTML = accuracyTrendDeltaHTML(deltaData);
      } catch (error) {
        if (refreshToken !== state.dashboardRefreshToken) return;
        console.warn('Dashboard accuracy load failed', error);
        setMotionText(metricHeads[1], average === null ? '0%' : average + '%');
        metricHeads[1].nextElementSibling.textContent = average === null ? 'Log in to sync quiz accuracy.' : "Today's combined quiz accuracy.";
        const trend = document.querySelector('.accuracy-trend');
        if (trend) trend.innerHTML = accuracySparklineHTML([], average === null ? null : average);
        const delta = document.querySelector('.accuracy-trend-delta');
        if (delta) delta.innerHTML = accuracyTrendDeltaHTML();
      }
    } else {
      setMotionText(metricHeads[1], average === null ? '0%' : average + '%');
      metricHeads[1].nextElementSibling.textContent = 'Log in to sync quiz accuracy.';
      const trend = document.querySelector('.accuracy-trend');
      if (trend) trend.innerHTML = accuracySparklineHTML([], average === null ? null : average);
      const delta = document.querySelector('.accuracy-trend-delta');
      if (delta) delta.innerHTML = accuracyTrendDeltaHTML();
    }
  }
  if (metricHeads[2] && !state.currentUser) {
    setStreakCardValue(metricHeads[2], 0);
    const streakBars = document.querySelector('.streak-card .streak-bars');
    if (streakBars) streakBars.innerHTML = streakActivityBarsHTML();
  }
  if (state.currentUser) {
    try {
      const streak = await loadDailyStreak();
      if (refreshToken !== state.dashboardRefreshToken) return;
      if (streak) {
        if (metricHeads[2]) {
          setStreakCardValue(metricHeads[2], streak.currentStreak);
          metricHeads[2].nextElementSibling.textContent = streak.currentStreak ? 'Active quiz streak from completed sessions.' : 'Complete a quiz today to start a streak.';
        }
        const streakNumber = document.querySelector('.streak-number');
        const streakLabel = document.querySelector('.streak-label');
        const bestStreak = document.querySelector('.streak-foot b');
        const dashboardBestStreak = document.querySelector('.streak-best-pill span');
        if (streakNumber) setMotionText(streakNumber, streak.currentStreak);
        if (streakLabel) streakLabel.textContent = streak.currentStreak === 1 ? 'day in a row' : 'days in a row';
        if (bestStreak) setMotionText(bestStreak, streak.bestStreak + ' days');
        if (dashboardBestStreak) dashboardBestStreak.textContent = `Best streak: ${streak.bestStreak} ${streak.bestStreak === 1 ? 'day' : 'days'}`;
        const dashboardStreakBars = document.querySelector('.streak-card .streak-bars');
        if (dashboardStreakBars) dashboardStreakBars.innerHTML = streakActivityBarsHTML(streak.dayCounts, streak.last14Days);
        document.querySelectorAll('.cube-day').forEach((day, index) => {
          day.classList.toggle('done', streak.activeDaysThisWeek.includes(streak.weekDays[index]));
        });
      }
    } catch (error) {
      if (refreshToken !== state.dashboardRefreshToken) return;
      console.warn('Daily streak load failed', error);
    }
  }
  const sideValues = document.querySelectorAll('.side-row b');
  if (dashboardProgress) {
    if (sideValues[0]) setMotionText(sideValues[0], dashboardProgress.overallProgress + '%');
    if (sideValues[1]) setMotionText(sideValues[1], `${dashboardProgress.modulesAttempted}/${dashboardProgress.totalModules}`);
    if (sideValues[2]) setMotionText(sideValues[2], dashboardProgress.quizzesCompleted + ' done');
    const heroProgress = document.querySelector('.hero-card .progress-row b');
    const heroFill = document.querySelector('.hero-card .fill');
    const avatar = document.querySelector('.profile-card .avatar');
    if (heroProgress) setMotionText(heroProgress, dashboardProgress.overallProgress + '%');
    if (heroFill) heroFill.style.width = dashboardProgress.overallProgress + '%';
    if (avatar) {
      avatar.style.setProperty('--course-angle', `${dashboardProgress.overallProgress * 3.6}deg`);
      avatar.dataset.progress = dashboardProgress.overallProgress + '%';
      avatar.setAttribute('aria-label', `${dashboardProgress.overallProgress}% overall course progress`);
    }
  } else if (sideValues[2]) {
    setMotionText(sideValues[2], getQuizHistory().length + ' done');
  }
  const testScore = document.querySelector('.test-score b');
  if (testScore && latestScore() && !state.currentUser) setMotionText(testScore, latestScore().percent + '%');
}

export function applyWeakestPerformanceRow(weakest) {
  const card = document.querySelector('.test-card');
  if (!card) return;
  const title = card.querySelector('.test-card-main h3');
  const description = card.querySelector('.test-card-main p');
  const tags = card.querySelector('.test-tags');
  const score = card.querySelector('.test-score b');
  const scoreLabel = card.querySelector('.test-score span');
  const action = card.querySelector('.test-actions .btn.primary');
  const clearWeakest = () => {
    if (title) title.textContent = 'Recommended Review';
    if (description) description.textContent = 'Take a quiz to unlock recommendations.';
    if (tags) tags.innerHTML = '';
    if (score) score.textContent = '--';
    if (scoreLabel) scoreLabel.textContent = 'Weak Topic Accuracy';
    if (action) { action.textContent = 'Start Recommended Review'; action.disabled = true; action.removeAttribute('onclick'); action.setAttribute('aria-disabled', 'true'); }
  };
  if (!state.currentUser || !weakest) { clearWeakest(); return; }
  if (title) title.textContent = `${weakest.topic} Weak Topic Review`;
  if (description) description.textContent = `Your current weakest area inside ${weakest.module} is ${weakest.topic} / ${weakest.subtopic}. Take a recommended review that boosts this topic while still mixing in broader coverage.`;
  if (tags) tags.innerHTML = [weakest.module, weakest.topic, weakest.subtopic].map(tag => `<span class="test-tag">${escapeHTML(tag || 'General')}</span>`).join('');
  if (score) score.textContent = (weakest.weakness_score ?? 0) + '%';
  if (scoreLabel) scoreLabel.textContent = 'Weakness';
  if (action) {
    action.textContent = 'Start Recommended Review';
    action.disabled = false;
    action.removeAttribute('aria-disabled');
    action.setAttribute('onclick', `startProgressiveModuleQuiz('${String(weakest.module || '').replace(/'/g, "\\'")}')`);
  }
}

export async function showWeakAreas() {
  const card = document.querySelector('.test-card-main');
  if (!card) return;
  let note = card.querySelector('.weak-note');
  if (note) { note.remove(); return; }
  note = document.createElement('div');
  note.className = 'card note weak-note';
  note.innerHTML = '<b>Weak Areas</b><br>Loading weak area tracking...';
  card.appendChild(note);
  animateSurface(note);
  try {
    const weakAreas = await loadTopWeakAreas();
    if (!weakAreas.length) { note.innerHTML = '<b>Weak Areas</b><br>Take a quiz to unlock weak area tracking.'; return; }
    note.innerHTML = `<b>Weak Areas</b>${weakAreas.map(area => `<div style="margin-top:10px"><strong>${escapeHTML(area.module || 'Module')}</strong><br>${escapeHTML(area.topic || 'General')} / ${escapeHTML(area.subtopic || 'General')}<br><span class="sub">${area.weakness_score ?? 0}% weakness &middot; ${area.wrong_count || 0}/${area.attempts || 0} wrong</span></div>`).join('')}`;
  } catch (error) {
    console.warn('Weak areas load failed', error);
    note.innerHTML = '<b>Weak Areas</b><br>Take a quiz to unlock weak area tracking.';
  }
}

export async function loadWeakestPerformance() {
  const refreshToken = ++state.weakestRefreshToken;
  if (!document.querySelector('.test-card')) return;
  if (!state.currentUser) { applyWeakestPerformanceRow(null); return; }
  let weakest = null, error = null;
  try {
    weakest = state.dashboardPreloadCache && state.dashboardPreloadKey === dashboardCacheKey()
      ? state.dashboardPreloadCache.weakest
      : await loadWeakestPerformanceData();
  } catch (loadError) { error = loadError; }
  if (refreshToken !== state.weakestRefreshToken) return;
  if (error) { console.warn('Weakest performance load failed', error); applyWeakestPerformanceRow(null); return; }
  applyWeakestPerformanceRow(weakest);
}

export function dashboardFriendsLeaderboardRowsHTML(rows = []) {
  if (!state.currentUser) return `<div class="dashboard-friends-empty">Sign in to compare Daily Task points with friends.</div>`;
  if (!rows.length) return `<div class="dashboard-friends-empty">Add friends to compare today's challenge.</div>`;
  return rows.slice(0, 3).map((row, index) => {
    const scored = typeof row.points === 'number';
    const name = row.profile ? profileDisplayName(row.profile) : (row.isYou ? 'You' : 'Student Pilot');
    const user = row.profile ? profileUsername(row.profile) : (row.isYou ? '@you' : '');
    return `<div class="dashboard-friend-rank ${row.isYou ? 'you' : ''} ${scored ? '' : 'no-score'}"><b>#${index + 1}</b><span><strong>${escapeHTML(name)}${row.isYou ? ' <em>You</em>' : ''}</strong><small>${escapeHTML(user)}</small></span><i>${scored ? `${Number(row.points).toLocaleString()} pts` : escapeHTML(row.emptyLabel || 'No score yet')}</i></div>`;
  }).join('') + (rows.some(row => row.friendEmpty) ? `<div class="dashboard-friends-empty">Add friends to compare today's challenge.</div>` : '');
}

export function renderDashboardFriendsLeaderboard(state = 'loading', rows = []) {
  const board = state === 'loading' ? `<div class="dashboard-friends-empty">Loading friends leaderboard...</div>` : state === 'error' ? `<div class="dashboard-friends-empty">Unable to load friends leaderboard.</div>` : dashboardFriendsLeaderboardRowsHTML(rows);
  return `<div class="card placeholder dashboard-friends-card"><div class="dashboard-friends-head"><div class="kicker">FRIENDS LEADERBOARD</div><p>Daily Task ranking</p></div><div class="dashboard-friends-board">${board}</div><button class="dashboard-friends-link" type="button" onclick="navigateToPage('daily')">View all</button></div>`;
}

export async function loadDashboardFriendsLeaderboardCard() {
  const card = document.querySelector('.dashboard-friends-card');
  if (!card) return;
  if (!state.currentUser) { card.outerHTML = renderDashboardFriendsLeaderboard('ready', []); return; }
  try {
    const rows = await loadDailyFriendsLeaderboard();
    card.outerHTML = renderDashboardFriendsLeaderboard('ready', rows);
  } catch (error) {
    console.warn('Dashboard friends leaderboard failed', error);
    card.outerHTML = renderDashboardFriendsLeaderboard('error', []);
  }
}

export function setupDashboardInteractions() {
  const search = document.querySelector('.dashboard-search');
  if (search) {
    const label = search.querySelector('span');
    if (label) label.innerHTML = '<input type="search" aria-label="Search dashboard" placeholder="Search modules, quizzes, or topics...">';
    const input = search.querySelector('input');
    input?.addEventListener('input', () => {
      const query = input.value.trim().toLowerCase();
      const cards = document.querySelectorAll('.hero-card,.placeholder,.test-card');
      cards.forEach(card => card.hidden = Boolean(query) && !card.textContent.toLowerCase().includes(query));
    });
    search.querySelector('.filter-btn')?.addEventListener('click', () => {
      if (!input) return;
      input.value = 'four forces';
      input.dispatchEvent(new Event('input'));
      input.focus();
    });
  }
  [...document.querySelectorAll('button')].forEach(button => {
    const label = button.textContent.trim();
    if (label === 'View Notes') button.addEventListener('click', () => window.openLessonNotes?.('Principles of Flight'));
    if (label === 'View Weak Areas') button.addEventListener('click', showWeakAreas);
  });
}

export function renderDashboard() {
  view.innerHTML = `<section class="page"><div class="dashboard-layout ${state.dashboardSidebarCollapsed ? 'sidebar-collapsed' : ''}">${dashboardProfilePillHTML()}<div class="dashboard-main"><div class="dashboard-search glass"><span>⌕ Search modules, quizzes, or topics...</span><div class="search-actions"><kbd>⌘ K</kbd><button class="filter-btn" aria-label="Filter dashboard search"><svg viewBox="0 0 24 24"><path d="M4 6h16"></path><path d="M7 12h10"></path><path d="M10 18h4"></path></svg></button></div></div>${state.quizSessionActive ? `<article class="card quiz-resume"><div><div class="kicker">Quiz in Progress</div><h3>${state.activeQuizTitle}</h3><p class="sub">${Object.keys(state.answered).length}/${(state.activeQuestions?.length || 0)} answered</p></div><button class="btn resume-btn" onclick="continueQuiz()">Continue Quiz</button></article>` : ''}<div class="hero-card glass"><div class="hero-content"><div class="kicker">Continue Learning</div><h1 class="hero-title">PPL – Principles of Flight</h1><p class="sub" style="max-width:620px;font-size:1rem">Resume Principles of Flight and continue building your flight fundamentals.</p><div class="progress-row" style="max-width:420px"><span>Course Progress</span><b>0%</b></div><div class="bar" style="max-width:420px"><div class="fill" style="width:0%"></div></div><div class="actions"><button class="btn primary" onclick="showLessonsHome()">Continue</button><button class="btn secondary">View Notes</button></div></div></div><div class="dash-grid">${renderDashboardFriendsLeaderboard()}<div class="card placeholder accuracy-card"><div class="accuracy-card-head"><div class="kicker">ACCURACY</div><a class="accuracy-view-all" href="#" aria-label="View all accuracy history">View all</a></div><div class="metric-copy"><h3>0%</h3><p>Past 7 days daily accuracy</p></div><div class="accuracy-trend">${accuracySparklineHTML([], null)}</div><div class="accuracy-trend-delta">${accuracyTrendDeltaHTML()}</div></div><div class="card placeholder streak-card"><div class="streak-copy"><div class="kicker">STREAK</div><div class="metric-copy"><h3>${streakValueHTML(0)}</h3><p>Active quiz streak from completed sessions.</p></div></div><div class="metric-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3c1.8 2.4 3 4.3 3 6.4 0 1.2-.4 2.2-1.1 3.1"></path><path d="M8.5 8.5C6.8 10 6 11.8 6 14a6 6 0 0 0 12 0c0-2.1-.9-4-2.5-5.5"></path><path d="M10 17.5c0-1.3.8-2.3 2-3.5 1.2 1.2 2 2.2 2 3.5a2 2 0 0 1-4 0Z"></path></svg></div><div class="streak-bottom"><div class="streak-best-pill"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18"></path><path d="m7 8 5-5 5 5"></path></svg><span>Best streak: 0 days</span></div><div class="streak-bars" aria-label="Streak progression bars"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div></div></div></div><section class="recommended-tests"><article class="card test-card"><div class="test-card-main"><span class="weak-label">Weakest Performance</span><h3>Recommended Review</h3><p>Take a quiz to unlock recommendations.</p><div class="test-tags"></div><div class="test-actions"><button class="btn primary" disabled aria-disabled="true">Start Recommended Review</button><button class="btn secondary">View Weak Areas</button></div></div><div class="test-score"><div><b>--</b><span>Weak Topic Accuracy</span></div></div></article></section></div><aside class="dashboard-right glass"><button class="dashboard-side-toggle" onclick="toggleDashboardSidebar()" aria-label="Collapse profile sidebar"><span>Profile</span><span>&gt;</span></button><div class="profile-card"><div class="avatar" style="--course-angle:0deg" data-progress="0%" aria-label="0% overall course progress"><span>VP</span></div><h3>Student Pilot</h3><p>Private Pilot License track</p></div><div class="side-section card"><h3>Overview</h3><div class="side-row"><span>Overall</span><b>0%</b></div><div class="side-row"><span>Modules</span><b>0/8</b></div><div class="side-row"><span>Quizzes</span><b>0 done</b></div></div><div class="streak-cube card"><div class="streak-head"><div><div class="kicker">Daily Streak</div><div class="streak-number">0</div><div class="streak-label">days in a row</div></div><div class="streak-badge">🔥</div></div><div class="cube-grid"><div class="cube-day">M</div><div class="cube-day">T</div><div class="cube-day">W</div><div class="cube-day">T</div><div class="cube-day">F</div><div class="cube-day">S</div><div class="cube-day">S</div></div><div class="streak-foot"><span>Best streak</span><b>0 days</b></div></div></aside></div></section>`;
  const cachedDashboardData = state.dashboardPreloadCache && state.dashboardPreloadKey === dashboardCacheKey() ? state.dashboardPreloadCache : null;
  if (cachedDashboardData) applyDashboardData(cachedDashboardData);
  setupDashboardInteractions();
  if (!cachedDashboardData) {
    refreshDashboardMetrics();
    loadDashboardProfileSummary();
    loadWeakestPerformance();
    loadDashboardFriendsLeaderboardCard();
  }
  animateSurface();
}
