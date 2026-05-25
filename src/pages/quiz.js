import { state } from '../state.js';
import { questions } from '../data/questions.js';
import { escapeHTML, formatTime, normalizeQuestion, progressiveDifficultyRatios, selectDiagnostic, selectProgressiveQuestions, selectWeakTopicReview } from '../utils.js';
import { view, animateSurface, popElement, reducedMotion } from '../app.js';
import { loadSupabaseQuestions, getModuleStats, getWeakTopics, getWeakestTopic, getRecentQuestionIds, buildQuizSelectionSummary, quizSelectionSummaryHTML, saveQuizResult, saveQuizToSupabase } from '../services/quiz.js';

function quizQuestions() {
  return state.activeQuestions?.length ? state.activeQuestions : questions;
}

function progress() {
  return quizQuestions().length ? Math.round(Object.keys(state.answered).length / quizQuestions().length * 100) : 0;
}

export function pauseQuizTimer() {
  clearInterval(state.timer);
  state.timer = null;
}

export function continueQuiz() {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  renderQuiz(true);
}

export function isActiveQuiz(title, meta) {
  return state.quizSessionActive && state.activeQuizTitle === title && state.activeQuizMeta === meta;
}

export function renderSetup() {
  document.querySelector('.modal-backdrop')?.remove();
  state.quizMode = 'Stopwatch';
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="setup-modal stopwatch-modal glass"><div class="modal-top"><div class="stopwatch-copy"><div class="kicker">Stopwatch Quiz</div><h1>Ready when you are</h1><p class="sub">The clock counts up while you answer. Your choices still lock in and reveal feedback instantly.</p></div><button class="modal-close" onclick="closeSetup()" aria-label="Close quiz setup">×</button></div><div class="stopwatch-face" aria-label="Stopwatch quiz mode"><div class="stopwatch-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 2h6"></path><path d="M12 14l3-3"></path><path d="M19 5l-1.5 1.5"></path><circle cx="12" cy="14" r="8"></circle></svg></div><b class="stopwatch-time">00:00</b><span>Stopwatch starts on quiz launch</span></div><div class="quiz-instruction"><b>i</b><span>After each answer, the correct choice and explanation appear right away so you can review as you go.</span></div><div class="actions"><button class="btn secondary" onclick="closeSetup()">Cancel</button><button class="btn primary" onclick="closeSetup();renderQuiz()">Start Stopwatch</button></div></div>`;
  modal.addEventListener('click', e => { if (e.target === modal) closeSetup(); });
  document.body.appendChild(modal);
  animateSurface(modal);
}

export function closeSetup(force = false) {
  const modal = document.querySelector('.modal-backdrop');
  if (modal?.dataset.authRequired === 'true' && !force) return;
  modal?.remove();
}

export function renderQuiz(resume = false) {
  pauseQuizTimer();
  state.quizMode = 'Stopwatch';
  if (!resume) { state.answered = {}; state.quizElapsed = 0; state.quizSubmitting = false; }
  state.quizSessionActive = true;
  view.innerHTML = `<div class="page"><div class="quiz-layout"><aside class="quiz-side glass"><div class="quiz-hero card"><div class="kicker">Study Quiz</div><h1>${state.activeQuizTitle}</h1><p class="sub">Answer each question in one continuous scroll.</p></div><article class="card quiz-course"><div class="quiz-icon">✈</div><div><div class="title">PPL – Principles of Flight</div><div class="meta">${state.activeQuizMeta}</div></div></article>${quizSelectionSummaryHTML()}<div class="stats"><div class="stat"><b id="count">0</b><div class="meta">Answered</div></div><div class="stat"><b>${quizQuestions().length}</b><div class="meta">Questions</div></div></div><div class="progress-row"><span>Progress</span><b id="percent">0%</b></div><div class="bar"><div id="quizFill" class="fill" style="width:0%"></div></div><div class="map">${quizQuestions().map((_, i) => `<button class="dot ${i === 0 ? 'current' : ''}" onclick="jumpToQ(${i})">${i + 1}</button>`).join('')}</div><button class="btn primary quiz-submit" onclick="showScoreModal()">Submit Quiz</button></aside><section class="quiz-main glass"><span class="timer card floating-timer"><svg viewBox="0 0 24 24" aria-hidden="true" style="width:18px;height:18px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round"><path d="M9 2h6"></path><path d="M12 14l3-3"></path><path d="M19 5l-1.5 1.5"></path><circle cx="12" cy="14" r="8"></circle></svg><b id="timerText">${formatTime(state.quizElapsed)}</b></span><div class="quiz-header"><div class="quiz-breadcrumb card">PPL › ${state.activeQuizMeta} › <b>&nbsp;Quiz</b></div></div><div class="quiz-title-row"><div class="quiz-title-copy"><div class="kicker">Continuous Scroll Exam</div><h2>${state.activeQuizTitle}</h2><p class="sub">Pick one answer. Once selected, it locks in and the explanation appears instantly.</p></div><div class="quiz-title-actions"><span class="quiz-pill card">Stopwatch</span><span class="quiz-pill card">Auto Review</span></div></div><div class="question-stack">${quizQuestions().map(questionHTML).join('')}<div class="card note" style="text-align:center;border-radius:20px"><h3>End of Quiz</h3><p>Score and review features can be connected later.</p><br><button class="btn secondary" onclick="showScoreModal()">Finish Quiz</button></div></div></section></div></div>`;
  restoreQuizAnswers();
  animateSurface();
  startTimer();
}

export function questionHTML(q, i) {
  const diagramNote = q.diagram_needed || q.diagram_ref ? '<div class="card note" style="margin:12px 0;border-radius:14px">Image picture here</div>' : '';
  return `<article class="card question" id="q${i}"><div class="kicker">Question ${i + 1}</div><h3>${escapeHTML(q[0])}</h3>${diagramNote}${q[1].map((a, j) => `<button class="answer" onclick="answerQ(${i},${j},this)"><span class="letter">${String.fromCharCode(65 + j)}</span><span>${escapeHTML(a)}</span></button>`).join('')}<div class="feedback"><b>Why?</b><br>${escapeHTML(q[3])}</div></article>`;
}

export function answerQ(i, j, btn) {
  if (state.answered[i] !== undefined) return;
  state.answered[i] = j;
  const card = btn.closest('.question');
  const right = quizQuestions()[i]?.[2];
  card.classList.add('answered');
  btn.classList.add(j === right ? 'correct' : 'wrong');
  if (j !== right) card.querySelectorAll('.answer')[right].classList.add('correct');
  popElement(card);
  updateQuiz();
}

export function restoreQuizAnswers() {
  Object.keys(state.answered).forEach(key => {
    const i = Number(key), selected = state.answered[key], right = quizQuestions()[i]?.[2];
    const card = document.getElementById('q' + i);
    if (!card || right === undefined) return;
    const buttons = card.querySelectorAll('.answer');
    card.classList.add('answered');
    buttons[selected]?.classList.add(selected === right ? 'correct' : 'wrong');
    buttons[right]?.classList.add('correct');
  });
  updateQuiz(true);
}

export function updateQuiz(skipAnimation = false) {
  const p = progress();
  const fill = document.getElementById('quizFill');
  const count = document.getElementById('count');
  const percent = document.getElementById('percent');
  if (!fill || !count || !percent) return;
  count.textContent = Object.keys(state.answered).length;
  percent.textContent = p + '%';
  if (reducedMotion.matches || skipAnimation) {
    fill.style.width = p + '%';
  } else {
    fill.animate([{ width: fill.style.width || '0%' }, { width: p + '%' }], { duration: 220, easing: 'cubic-bezier(.25,1,.5,1)' }).onfinish = () => fill.style.width = p + '%';
  }
  document.querySelectorAll('.dot').forEach((d, i) => {
    d.classList.toggle('good', state.answered[i] === quizQuestions()[i]?.[2]);
    d.classList.toggle('bad', state.answered[i] !== undefined && state.answered[i] !== quizQuestions()[i]?.[2]);
  });
}

export function showScoreModal() {
  if (state.quizSubmitting) return;
  const total = quizQuestions().length;
  const answeredCount = Object.keys(state.answered).length;
  const skipped = total - answeredCount;
  if (skipped > 0) {
    window.showToast?.(`You have ${skipped} unfinished question${skipped === 1 ? '' : 's'}.`);
    if (!confirm(`You still have ${skipped} unanswered question${skipped === 1 ? '' : 's'}. Submit anyway?`)) return;
  }
  state.quizSubmitting = true;
  document.querySelectorAll('.quiz-submit,.question-stack button[onclick="showScoreModal()"]').forEach(button => {
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
    button.textContent = 'Saving...';
  });
  window.showToast?.('Loading scores...');
  document.querySelector('.modal-backdrop')?.remove();
  pauseQuizTimer();
  state.quizSessionActive = false;
  const correct = quizQuestions().reduce((sum, q, i) => sum + (state.answered[i] === q[2] ? 1 : 0), 0);
  const wrong = answeredCount - correct;
  const percent = total ? Math.round(correct / total * 100) : 0;
  const quizResult = { title: state.activeQuizTitle, meta: state.activeQuizMeta, percent, correct, total, elapsed: state.quizElapsed, completedAt: new Date().toISOString() };
  saveQuizResult(quizResult);
  window.refreshDashboardMetrics?.();
  saveQuizToSupabase(quizResult)
    .then(() => { window.refreshDashboardMetrics?.(); window.showToast?.('Quiz saved.'); })
    .catch(error => console.warn('Supabase quiz save failed', error));
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="score-modal glass" style="--score-angle:${percent * 3.6}deg"><div class="kicker">Quiz Complete</div><h1>Your Score</h1><p class="sub score-message">Saved to the dashboard. Review your result, then continue back to lessons.</p><div class="score-ring"><div class="score-ring-inner"><div class="score-percent">${percent}%</div></div></div><div class="score-grid"><div class="score-stat"><b>${correct}</b><span>Correct</span></div><div class="score-stat"><b>${wrong}</b><span>Wrong</span></div><div class="score-stat"><b>${skipped}</b><span>Skipped</span></div></div><div class="actions score-actions"><button class="btn secondary" onclick="closeSetup();renderQuiz()">Retake</button><button class="btn primary" onclick="closeSetup();showLessonsHome()">Continue to Lessons</button><button class="btn secondary" onclick="closeSetup();navigateToPage('dashboard')">View Dashboard</button></div></div>`;
  setTimeout(() => { document.body.appendChild(modal); animateSurface(modal); }, 650);
}

export function jumpToQ(i) {
  document.getElementById('q' + i)?.scrollIntoView({ behavior: 'smooth' });
  document.querySelectorAll('.dot').forEach((d, x) => d.classList.toggle('current', x === i));
}

export function startTimer() {
  const label = document.getElementById('timerText');
  if (!label) return;
  label.textContent = formatTime(state.quizElapsed);
  state.timer = setInterval(() => {
    state.quizElapsed += 1;
    label.textContent = formatTime(state.quizElapsed);
  }, 1000);
}

export async function startModuleQuiz(moduleName) {
  await startProgressiveModuleQuiz(moduleName);
}

export async function startProgressiveModuleQuiz(moduleName) {
  if (state.quizSessionActive && state.activeModuleName === moduleName) { continueQuiz(); return; }
  state.activeQuestions = questions;
  try {
    if (!state.allQuestions.length) await loadSupabaseQuestions();
    const moduleRows = state.allQuestions.filter(q => q.module === moduleName);
    if (!moduleRows.length) {
      state.quizSelectionSummary = null;
      window.showToast?.(`${moduleName} quiz is coming soon.`);
      return;
    }
    let moduleStats = null, weakTopics = [], recentQuestionIds = new Set();
    if (state.currentUser) {
      moduleStats = await getModuleStats(moduleName);
      const hasHistory = Boolean(moduleStats?.attempts);
      if (hasHistory) {
        weakTopics = await getWeakTopics(moduleName, 3);
        recentQuestionIds = await getRecentQuestionIds(moduleName);
      }
    }
    const hasHistory = Boolean(moduleStats?.attempts);
    const ratios = hasHistory ? progressiveDifficultyRatios(Number(moduleStats.accuracy) || 0) : { 1: .60, 2: .30, 3: .10 };
    const currentQuestions = selectProgressiveQuestions(moduleRows, 30, ratios, weakTopics, recentQuestionIds);
    state.activeQuestions = currentQuestions.map(normalizeQuestion);
    state.activeModuleName = moduleName;
    state.activeQuizTitle = `${moduleName} Quiz`;
    state.activeQuizMeta = hasHistory ? `${moduleName} • Progressive Review` : `${moduleName} • Diagnostic`;
    state.currentMode = hasHistory ? 'adaptive' : 'diagnostic';
    state.quizSelectionSummary = buildQuizSelectionSummary(currentQuestions, { mode: state.currentMode, moduleName, weakTopics, recentQuestionIds });
  } catch (error) {
    console.warn('Progressive quiz setup failed, using local fallback.', error);
    // Try to use local module questions if available
    const localRows = state.allQuestions.filter(q => q.module === moduleName);
    state.activeQuizTitle = `${moduleName} Quiz`;
    state.activeQuizMeta = `${moduleName} • Diagnostic`;
    state.activeModuleName = moduleName;
    state.currentMode = 'preview';
    if (localRows.length) {
      const shuffled = [...localRows].sort(() => Math.random() - 0.5).slice(0, 30);
      state.activeQuestions = shuffled.map(normalizeQuestion);
    } else {
      window.showToast?.('Using preview questions.');
      state.activeQuestions = questions;
    }
    state.quizSelectionSummary = buildQuizSelectionSummary(state.activeQuestions, { mode: state.currentMode, moduleName });
  }
  renderSetup();
}

export async function startLessonQuiz(title, meta, moduleName = 'Principles of Flight', selectionMode = 'diagnostic') {
  if (isActiveQuiz(title, meta)) { continueQuiz(); return; }
  state.activeQuestions = questions;
  try {
    if (!state.allQuestions.length) await loadSupabaseQuestions();
    const moduleRows = state.allQuestions.filter(q => q.module === moduleName);
    if (!moduleRows.length) {
      state.quizSelectionSummary = null;
      window.showToast?.(`${moduleName} quiz is coming soon.`);
      return;
    }
    let weakTopics = [], recentQuestionIds = new Set(), currentQuestions;
    if (selectionMode === 'adaptive' && state.currentUser) {
      const weakest = await getWeakestTopic(moduleName);
      weakTopics = weakest ? [weakest] : [];
      recentQuestionIds = await getRecentQuestionIds(moduleName);
      currentQuestions = selectWeakTopicReview(moduleRows, 30, weakest, recentQuestionIds);
    } else {
      currentQuestions = selectDiagnostic(moduleRows, 30);
    }
    state.activeQuestions = currentQuestions.map(normalizeQuestion);
    state.activeQuizTitle = title;
    state.activeQuizMeta = meta;
    state.activeModuleName = moduleName;
    state.currentMode = selectionMode === 'adaptive' ? 'adaptive' : 'diagnostic';
    state.quizSelectionSummary = buildQuizSelectionSummary(currentQuestions, { mode: state.currentMode, moduleName, weakTopics, recentQuestionIds });
  } catch (error) {
    console.warn('Lesson quiz setup failed, using local fallback.', error);
    const localRows = state.allQuestions.filter(q => q.module === moduleName);
    state.activeQuizTitle = title;
    state.activeQuizMeta = meta;
    state.activeModuleName = moduleName;
    state.currentMode = 'preview';
    if (localRows.length) {
      const shuffled = [...localRows].sort(() => Math.random() - 0.5).slice(0, 30);
      state.activeQuestions = shuffled.map(normalizeQuestion);
    } else {
      window.showToast?.('Using preview questions.');
      state.activeQuestions = questions;
    }
    state.quizSelectionSummary = buildQuizSelectionSummary(state.activeQuestions, { mode: state.currentMode, moduleName });
  }
  renderSetup();
}
