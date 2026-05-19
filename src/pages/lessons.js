import { supabase } from '../lib/supabase.js';
import { state } from '../state.js';
import { lessons } from '../data/lessons.js';
import { escapeHTML, moduleStyleVars, formatTime } from '../utils.js';
import { view, animateSurface } from '../app.js';
import { loadDashboardProgress } from '../services/dashboard.js';
import { loadModuleAccuracy } from '../services/quiz.js';
import { getQuizHistory } from '../services/quiz.js';

export function openLessonNotes(target = 'Principles of Flight') {
  window.setNav?.('lessons');
  state.selectedLessonTitle = target;
  renderLessons();
  const button = [...document.querySelectorAll('.lesson')].find(item => item.querySelector('b')?.textContent === target);
  if (!button) return;
  button.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function showLessonsHome() {
  state.selectedLessonTitle = '';
  window.setNav?.('lessons');
  renderLessons();
}

function quizResumeCard() {
  if (!state.quizSessionActive) return '';
  const quizRows = state.activeQuestions?.length ? state.activeQuestions : [];
  const count = Object.keys(state.answered).length;
  return `<article class="card quiz-resume"><div><div class="kicker">Quiz in Progress</div><h3>${state.activeQuizTitle}</h3><p class="sub">${count}/${quizRows.length} answered &middot; ${window.formatTime?.(state.quizElapsed) || '00:00'} elapsed</p></div><button class="btn resume-btn" onclick="continueQuiz()">Continue Quiz</button></article>`;
}

export function renderLessons() {
  const lessonGroups = lessons.map((lesson, lessonIndex) => ({ number: lessonIndex + 1, title: lesson[0], subtitle: lesson[1], icon: lesson[2] }));
  const hasSelection = Boolean(state.selectedLessonTitle);
  const resumeCard = state.quizSessionActive ? `<article class="card quiz-resume"><div><div class="kicker">Quiz in Progress</div><h3>${state.activeQuizTitle}</h3><p class="sub">${Object.keys(state.answered).length}/${(state.activeQuestions?.length || 0)} answered</p></div><button class="btn resume-btn" onclick="continueQuiz()">Continue Quiz</button></article>` : '';
  const featuredCourse = hasSelection
    ? `<article class="card course"><div class="course-icon">✈</div><div><div class="title">PPL – Principles of Flight</div><div class="meta">Private Pilot License</div><div class="progress-row"><span>Progress</span><b>0%</b></div><div class="bar"><div class="fill" style="width:0%"></div></div></div></article>`
    : `<article class="card course featured-course"><div class="featured-course-content"><div class="course-icon">✈</div><div class="featured-course-copy"><div class="course-badge">Featured Course</div><div class="title">PPL – Principles of Flight</div><div class="meta">Private Pilot License</div><div class="progress-row"><span>Your progress</span><b>0%</b></div><div class="bar"><div class="fill" style="width:0%"></div></div></div></div><div class="lesson-hero-image"><button class="btn primary course-action" onclick="openLessonNotes('Principles of Flight')">Continue Learning</button></div></article>`;
  view.innerHTML = `<div class="split lessons-layout ${hasSelection ? 'lesson-selected' : 'lesson-empty'}"><section class="panel glass"><div class="panel-head"><div class="kicker">Course Library</div><h1>Lessons</h1><p class="sub">${hasSelection ? 'Choose another module or click the selected one to return to the full library.' : 'Choose a module to read the notes.'}</p></div><div class="lesson-tools"><div class="search">⌕ Search modules or topics...</div><select class="lesson-filter" aria-label="Filter modules"><option value="all">All Modules</option>${lessonGroups.map(group => `<option value="${escapeHTML(group.title)}">${escapeHTML(group.title)}</option>`).join('')}</select></div>${featuredCourse}${resumeCard}<div class="card list">${lessonGroups.map(group => `<div class="module-item" style="${moduleStyleVars(group.title)}"><button class="lesson module-lesson ${group.title === state.selectedLessonTitle ? 'active' : ''}" title="${group.subtitle}"><span class="module-icon" aria-hidden="true">${group.icon}</span><span class="module-copy"><b>${group.title}</b><small class="module-row-accuracy" data-module="${escapeHTML(group.title)}">Module Accuracy: ${state.currentUser ? '--%' : 'Sign in to track'}</small></span><span class="module-arrow" aria-hidden="true">›</span></button></div>`).join('')}</div>${hasSelection ? '' : `<div class="card lesson-guide"><b>Start with any module</b><span>Your quiz mix adjusts after each completed module attempt.</span></div>`}</section>${hasSelection ? `<section class="reader glass"></section>` : ''}</div>`;
  setupLessonButtons();
  setupLessonSearch();
  updateLessonModuleAccuracyLabels();
  updateLessonProgressSummary();
  if (hasSelection) {
    const activeButton = [...document.querySelectorAll('.list .lesson')].find(button => button.querySelector('b')?.textContent === state.selectedLessonTitle);
    if (activeButton) { renderLesson(activeButton); updateModuleAnalysisPanels(state.selectedLessonTitle); }
  }
  animateSurface();
}

export function setupLessonButtons() {
  document.querySelectorAll('.list .lesson').forEach(button => {
    button.addEventListener('click', () => {
      const title = button.querySelector('b')?.textContent || '';
      state.selectedLessonTitle = state.selectedLessonTitle === title ? '' : title;
      renderLessons();
    });
  });
}

export function setupLessonSearch() {
  const search = document.querySelector('.lesson-tools .search,.search');
  if (!search) return;
  search.innerHTML = '<input type="search" aria-label="Search modules" placeholder="Search modules or topics...">';
  const input = search.querySelector('input');
  const filter = document.querySelector('.lesson-filter');
  const applyLessonFilters = () => {
    const query = input.value.trim().toLowerCase();
    const selectedFilter = filter?.value || 'all';
    let visible = 0;
    document.querySelectorAll('.list .lesson').forEach(lesson => {
      const text = lesson.textContent.toLowerCase();
      const title = lesson.querySelector('b')?.textContent || '';
      const matchQuery = !query || text.includes(query);
      const matchFilter = selectedFilter === 'all' || title === selectedFilter;
      const match = matchQuery && matchFilter;
      const item = lesson.closest('.module-item');
      if (item) item.hidden = !match; else lesson.hidden = !match;
      if (match) visible += 1;
    });
    const reader = document.querySelector('.reader');
    if (reader && query && !visible) {
      reader.innerHTML = `<div class="top"><span>PPL - Principles of Flight</span><span>0 results</span></div><h2>No module found</h2><p class="sub">Try another topic, module name, or keyword.</p>`;
    }
  };
  input.addEventListener('input', applyLessonFilters);
  filter?.addEventListener('change', applyLessonFilters);
}

export function updateLessonModuleAccuracyLabels() {
  const labels = [...document.querySelectorAll('.module-row-accuracy')];
  if (!labels.length) return;
  const refreshToken = ++state.lessonAccuracyRefreshToken;
  if (!state.currentUser) { labels.forEach(label => label.textContent = 'Module Accuracy: Sign in to track'); return; }
  labels.forEach(label => label.textContent = 'Module Accuracy: --%');
  const modules = [...new Set(labels.map(label => label.dataset.module).filter(Boolean))];
  if (!modules.length) return;
  supabase.from('exp_user_module_stats').select('module,accuracy,last_updated').eq('user_id', state.currentUser.id).in('module', modules).order('last_updated', { ascending: true }).then(({ data, error }) => {
    if (error) throw error;
    if (refreshToken !== state.lessonAccuracyRefreshToken) return;
    const accuracyByModule = new Map((data || []).map(row => [row.module, row.accuracy]));
    labels.forEach(label => {
      const accuracy = accuracyByModule.get(label.dataset.module);
      label.textContent = `Module Accuracy: ${accuracy === undefined || accuracy === null ? '--%' : accuracy + '%'}`;
    });
  }).catch(error => console.warn('Module row accuracy load failed', error));
}

export async function updateLessonProgressSummary() {
  const labels = [...document.querySelectorAll('.course .progress-row b')];
  const fills = [...document.querySelectorAll('.course .bar .fill')];
  if (!labels.length && !fills.length) return;
  let progressValue = 0;
  if (state.currentUser) {
    try {
      const progress = await loadDashboardProgress();
      if (window.activePage?.() !== 'lessons') return;
      progressValue = progress?.overallProgress || 0;
    } catch (error) { console.warn('Lesson progress load failed', error); }
  } else {
    const attempted = new Set(getQuizHistory().map(item => String(item.title || '').replace(/ Quiz$/, ''))).size;
    progressValue = lessons.length ? Math.min(100, Math.round(attempted / lessons.length * 100)) : 0;
  }
  labels.forEach(label => label.textContent = progressValue + '%');
  fills.forEach(fill => fill.style.width = progressValue + '%');
}

function moduleAreaLabel(row) {
  const topic = row?.topic || 'General', subtopic = row?.subtopic || 'General';
  return topic && subtopic && topic !== subtopic ? `${topic} / ${subtopic}` : (subtopic || topic || 'General');
}

export function moduleAnalysisHTML(title, label, showHeading = false) {
  const heading = showHeading ? `<div class="module-detail-title"><b>${escapeHTML(title)}</b><span>${escapeHTML(label)}</span></div>` : '';
  return `<div class="module-analysis" data-module="${escapeHTML(title)}" style="${moduleStyleVars(title)}">${heading}<div class="module-analysis-grid"><div class="module-analysis-card accent"><span>Accuracy</span><b data-analysis="accuracy">Module Accuracy: ${state.currentUser ? '--%' : 'Sign in to track'}</b></div><div class="module-analysis-card"><span>Strongest Area</span><b data-analysis="strength-title">Not enough data yet</b><p data-analysis="strength-copy">Complete a quiz to reveal your strengths.</p></div><div class="module-analysis-card"><span>Weakest Area</span><b data-analysis="weakness-title">Not enough data yet</b><p data-analysis="weakness-copy">Complete a quiz to reveal review needs.</p></div></div><div class="module-recommendation"><span>Module Insight</span><p data-analysis="summary">No completed quiz data is available for this module yet. Start with a diagnostic quiz to build a baseline. After that, this panel will compare your stronger and weaker topic areas. Your next quiz will adjust while still keeping module-wide coverage.</p></div><div class="module-recommendation"><span>Recommended Next Step</span><p data-analysis="recommendation">Start with a diagnostic quiz to unlock your module analysis.</p></div></div>`;
}

export async function loadModuleAnalysis(moduleName) {
  if (!state.currentUser) return { accuracyText: 'Module Accuracy: Sign in to track', strengthTitle: 'Not enough data yet', strengthCopy: 'Sign in to track your strongest areas.', weaknessTitle: 'Not enough data yet', weaknessCopy: 'Sign in to track areas that need review.', summary: 'Sign in to see a deeper analysis for this module. Once you complete a quiz, the app will compare your stronger and weaker topic areas. Your next quiz can then adjust to your progress. Until then, start with the diagnostic flow when you are ready.', recommendation: 'Start with a diagnostic quiz to unlock your module analysis.' };
  const [accuracy, statsResult] = await Promise.all([
    loadModuleAccuracy(moduleName),
    supabase.from('exp_user_topic_stats').select('*').eq('user_id', state.currentUser.id).eq('module', moduleName),
  ]);
  if (statsResult.error) throw statsResult.error;
  const rows = Array.isArray(statsResult.data) ? statsResult.data.filter(row => Number(row.attempts || 0) > 0) : [];
  if (!rows.length) return { accuracyText: `Module Accuracy: ${accuracy === null ? '--%' : accuracy + '%'}`, strengthTitle: 'Not enough data yet', strengthCopy: 'Complete a quiz to reveal your strengths.', weaknessTitle: 'Not enough data yet', weaknessCopy: 'Complete a quiz to reveal review needs.', summary: 'No completed topic data is available for this module yet. Start with a diagnostic quiz to build a baseline. After that, this panel will identify your strongest and weakest topic areas. Your next quiz will use that history to guide practice without dropping broad module coverage.', recommendation: 'Start with a diagnostic quiz to unlock your module analysis.' };
  const enoughRows = rows.filter(row => Number(row.attempts || 0) >= 2);
  const strengthPool = enoughRows.length ? enoughRows : rows;
  const strengths = [...strengthPool].sort((a, b) => (Number(a.weakness_score || 0) - Number(b.weakness_score || 0)) || (Number(a.wrong_count || 0) - Number(b.wrong_count || 0)));
  const weaknesses = [...rows].sort((a, b) => (Number(b.weakness_score || 0) - Number(a.weakness_score || 0)) || (Number(b.wrong_count || 0) - Number(a.wrong_count || 0)));
  const strongest = strengths[0], weakest = weaknesses[0];
  const worstWeakness = Number(weakest?.weakness_score || 0);
  const accuracyValue = accuracy === null ? null : Number(accuracy);
  const recommendation = accuracyValue !== null && accuracyValue >= 75 && worstWeakness <= 35
    ? 'Continue progressive reviews to maintain mastery.'
    : `Take a progressive quiz. Your next quiz will include more practice from ${moduleAreaLabel(weakest)} while still covering the full module.`;
  const accuracySentence = accuracyValue === null ? 'Your synced module accuracy is not available yet.' : `Your synced module accuracy is currently ${accuracyValue}%.`;
  const summary = accuracyValue !== null && accuracyValue >= 75 && worstWeakness <= 35
    ? `${accuracySentence} Your strongest area is ${moduleAreaLabel(strongest)}, which suggests this topic is becoming more dependable. ${moduleAreaLabel(weakest)} is still the area to watch, but its weakness score is controlled for now. Continue progressive reviews to keep the module fresh and protect that mastery over time.`
    : `${accuracySentence} Your strongest area right now is ${moduleAreaLabel(strongest)}, so you can treat it as your current confidence point. The main review priority is ${moduleAreaLabel(weakest)}, where the weakness score or wrong-answer count is higher. Your next progressive quiz will add extra practice from that area while still rotating through the rest of the module.`;
  return { accuracyText: `Module Accuracy: ${accuracy === null ? '--%' : accuracy + '%'}`, strengthTitle: moduleAreaLabel(strongest), strengthCopy: 'You are performing better in this area.', weaknessTitle: moduleAreaLabel(weakest), weaknessCopy: 'This area needs more review.', summary, recommendation };
}

export async function updateModuleAnalysisPanels(moduleName) {
  const panels = [...document.querySelectorAll('.module-analysis')].filter(panel => panel.dataset.module === moduleName);
  if (!panels.length) return;
  try {
    const analysis = await loadModuleAnalysis(moduleName);
    panels.forEach(panel => {
      const set = (key, value) => { const node = panel.querySelector(`[data-analysis="${key}"]`); if (node) node.textContent = value; };
      set('accuracy', analysis.accuracyText); set('strength-title', analysis.strengthTitle); set('strength-copy', analysis.strengthCopy);
      set('weakness-title', analysis.weaknessTitle); set('weakness-copy', analysis.weaknessCopy); set('summary', analysis.summary); set('recommendation', analysis.recommendation);
    });
  } catch (error) { console.warn('Module analysis load failed', error); }
}

export function renderLesson(button) {
  const title = button.querySelector('b')?.textContent || button.querySelector('span')?.textContent || 'Lesson';
  const label = lessons.find(lesson => lesson[0] === title)?.[1] || 'Study';
  const reader = document.querySelector('.reader');
  if (!reader) return;
  const action = `startProgressiveModuleQuiz('${title.replace(/'/g, "\\'")}')`;
  const hasActiveModuleQuiz = state.activeModuleName === title && state.quizSessionActive;
  reader.innerHTML = `<div class="top"><span>PPL – Principles of Flight</span><span>♡ ⋮</span></div><div class="kicker">${escapeHTML(label)}</div><h2>${escapeHTML(title)}</h2><p class="sub">${hasActiveModuleQuiz ? `You already have this module quiz in progress with ${Object.keys(state.answered).length}/${(state.activeQuestions?.length || 0)} answered.` : 'Review your current module performance, then take the next progressive quiz when you are ready.'}</p><div class="divider"></div><div class="section"><h3>Module Analysis</h3><div class="card note">${moduleAnalysisHTML(title, label)}<div class="actions"><button class="btn primary" onclick="${action}">Take Quiz</button></div></div></div>`;
  animateSurface(reader);
}
