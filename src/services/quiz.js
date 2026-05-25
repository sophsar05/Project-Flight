import { supabase } from '../lib/supabase.js';
import { state } from '../state.js';
import { answerLetter, clamp, escapeHTML, normalizeQuestion, groupByTopic, selectDiagnostic, selectProgressiveQuestions, selectWeakTopicReview, progressiveDifficultyRatios, distribution, topDistributionItems, difficultyValue } from '../utils.js';
import { questions } from '../data/questions.js';
import { agkQuestions } from '../data/questions-agk.js';
import { humanPerformanceQuestions } from '../data/questions-human-performance.js';
import { principlesOfFlightQuestions } from '../data/questions-principles-of-flight.js';

// Local question banks merged into allQuestions when Supabase data loads
const LOCAL_QUESTION_BANKS = [
  ...agkQuestions,
  ...humanPerformanceQuestions,
  ...principlesOfFlightQuestions,
];

const DEV_EMAILS = [];

export function isDevUser() {
  const email = String(state.currentUser?.email || '').trim().toLowerCase();
  return Boolean(email && DEV_EMAILS.includes(email));
}

export function quizHistoryKey() {
  return state.currentUser?.id ? `revitQuizHistory:${state.currentUser.id}` : 'revitQuizHistory:guest';
}

export function getQuizHistory() {
  try { return JSON.parse(localStorage.getItem(quizHistoryKey()) || '[]'); } catch { return []; }
}

export function saveQuizResult(result) {
  const history = [result, ...getQuizHistory()].slice(0, 12);
  localStorage.setItem(quizHistoryKey(), JSON.stringify(history));
}

export function latestScore() { return getQuizHistory()[0] || null; }

export function averageScore() {
  const history = getQuizHistory();
  if (!history.length) return null;
  return Math.round(history.reduce((sum, item) => sum + item.percent, 0) / history.length);
}

export function mergeLocalQuestions(supabaseRows) {
  // Avoid duplicates: skip a local question if Supabase already has one with the
  // same module + question text (case-insensitive).
  const supabaseKeys = new Set(
    (supabaseRows || []).map(q => `${q.module}||${String(q.question || '').trim().toLowerCase()}`)
  );
  const unique = LOCAL_QUESTION_BANKS.filter(
    q => !supabaseKeys.has(`${q.module}||${String(q.question || '').trim().toLowerCase()}`)
  );
  return [...(supabaseRows || []), ...unique];
}

export async function loadSupabaseQuestions() {
  if (!state.currentUser) {
    // Still expose local question banks for guest / offline use
    state.allQuestions = mergeLocalQuestions([]);
    return state.allQuestions;
  }
  const columns = 'id,module,topic,subtopic,skill_tag,question_type,difficulty,question,option_a,option_b,option_c,option_d,correct_option,discussion,diagram_needed,diagram_ref';
  const { data, error } = await supabase.from('exp_questions').select(columns);
  if (error) throw error;
  state.allQuestions = mergeLocalQuestions(Array.isArray(data) ? data : []);
  return state.allQuestions;
}

export async function getModuleStats(moduleName) {
  if (!state.currentUser) return null;
  const { data, error } = await supabase.from('exp_user_module_stats').select('*').eq('user_id', state.currentUser.id).eq('module', moduleName).limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

export async function getWeakTopics(moduleName, limit = 3) {
  if (!state.currentUser) return [];
  const { data, error } = await supabase.from('exp_user_topic_stats').select('*').eq('user_id', state.currentUser.id).eq('module', moduleName).order('weakness_score', { ascending: false }).order('wrong_count', { ascending: false }).limit(limit);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getWeakestTopic(moduleName) {
  if (!state.currentUser) return null;
  const { data, error } = await supabase.from('exp_user_topic_stats').select('*').eq('user_id', state.currentUser.id).eq('module', moduleName).order('weakness_score', { ascending: false }).order('wrong_count', { ascending: false }).limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

export async function getRecentQuestionIds(moduleName) {
  if (!state.currentUser) return new Set();
  const { data: sessions, error: sessionError } = await supabase.from('exp_quiz_sessions').select('id').eq('user_id', state.currentUser.id).eq('module', moduleName).order('completed_at', { ascending: false }).limit(1);
  if (sessionError) throw sessionError;
  const sessionId = sessions?.[0]?.id;
  if (!sessionId) return new Set();
  const { data: answers, error: answersError } = await supabase.from('exp_user_answers').select('question_id').eq('session_id', sessionId);
  if (answersError) throw answersError;
  return new Set((answers || []).map(row => row.question_id).filter(Boolean));
}

export async function loadModuleAccuracy(moduleName) {
  if (!state.currentUser) return null;
  const { data, error } = await supabase.from('exp_user_module_stats').select('accuracy').eq('user_id', state.currentUser.id).eq('module', moduleName).order('last_updated', { ascending: false }).limit(1);
  if (error) throw error;
  return data?.[0]?.accuracy ?? null;
}

export async function updateModuleStats(results, moduleName) {
  if (!state.currentUser) return;
  const quizRows = state.activeQuestions?.length ? state.activeQuestions : questions;
  const answeredIndexes = Object.keys(state.answered).map(Number);
  const attempts = answeredIndexes.length || quizRows.length;
  const correct = answeredIndexes.length ? answeredIndexes.reduce((sum, index) => sum + (state.answered[index] === quizRows[index]?.[2] ? 1 : 0), 0) : (results?.correct || 0);
  const wrong = Math.max(0, attempts - correct);
  const { data: existingRows, error: selectError } = await supabase.from('exp_user_module_stats').select('*').eq('user_id', state.currentUser.id).eq('module', moduleName).order('last_updated', { ascending: false }).limit(1);
  if (selectError) throw selectError;
  const existing = existingRows?.[0];
  const mergedAttempts = (existing?.attempts || 0) + attempts;
  const correctCount = (existing?.correct_count || 0) + correct;
  const wrongCount = (existing?.wrong_count || 0) + wrong;
  const accuracy = mergedAttempts ? Math.round((correctCount / mergedAttempts) * 100) : 0;
  const payload = { user_id: state.currentUser.id, module: moduleName, attempts: mergedAttempts, correct_count: correctCount, wrong_count: wrongCount, accuracy, last_updated: new Date().toISOString() };
  if (existing) {
    const { error } = await supabase.from('exp_user_module_stats').update(payload).eq('user_id', state.currentUser.id).eq('module', moduleName);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('exp_user_module_stats').insert(payload);
    if (error) throw error;
  }
}

export async function saveQuizToSupabase(result) {
  if (!state.currentUser) { return; }
  const completedAt = result?.completedAt || new Date().toISOString();
  const quizRows = state.activeQuestions?.length ? state.activeQuestions : questions;
  const answeredCount = Object.keys(state.answered).length || quizRows.length || 1;
  const timePerQuestion = Math.round((state.quizElapsed || 0) / answeredCount);
  const sessionPayload = {
    user_id: state.currentUser.id,
    module: state.activeModuleName || state.activeQuizTitle.replace(/ Quiz$/, ''),
    mode: state.currentMode || 'diagnostic',
    score: result?.correct || 0,
    total_questions: quizRows.length,
    strategy: 'diagnostic_random_30',
    completed_at: completedAt,
  };
  const { data: session, error: sessionError } = await supabase.from('exp_quiz_sessions').insert(sessionPayload).select('id').single();
  if (sessionError) throw sessionError;
  const answerRows = quizRows.map((question, index) => {
    const selected = state.answered[index];
    const correct = question[2];
    return {
      user_id: state.currentUser.id,
      session_id: session.id,
      question_id: question.id || null,
      module: question.module || sessionPayload.module,
      topic: question.topic || 'General',
      subtopic: question.subtopic || 'General',
      selected_answer: answerLetter(selected),
      correct_answer: question.correct_option || answerLetter(correct),
      is_correct: selected === correct,
      time_seconds: timePerQuestion,
    };
  });
  const { error: answersError } = await supabase.from('exp_user_answers').insert(answerRows);
  if (answersError) throw answersError;
  await updateModuleStats(result, sessionPayload.module);
  const topicGroups = new Map();
  answerRows.forEach(row => {
    const key = [row.module, row.topic, row.subtopic].join('||');
    const group = topicGroups.get(key) || { module: row.module, topic: row.topic, subtopic: row.subtopic, attempts: 0, correct: 0, wrong: 0, totalTime: 0 };
    group.attempts += 1;
    group.correct += row.is_correct ? 1 : 0;
    group.wrong += row.is_correct ? 0 : 1;
    group.totalTime += row.time_seconds || 0;
    topicGroups.set(key, group);
  });
  for (const group of topicGroups.values()) {
    const { data: existingRows, error: selectError } = await supabase.from('exp_user_topic_stats').select('*').eq('user_id', state.currentUser.id).eq('module', group.module).eq('topic', group.topic).eq('subtopic', group.subtopic).limit(1);
    if (selectError) throw selectError;
    const existing = existingRows?.[0];
    const attempts = (existing?.attempts || 0) + group.attempts;
    const correctCount = (existing?.correct_count || 0) + group.correct;
    const wrongCount = (existing?.wrong_count || 0) + group.wrong;
    const previousTime = (existing?.avg_time_seconds || 0) * (existing?.attempts || 0);
    const avgTime = Math.round((previousTime + group.totalTime) / attempts);
    const weaknessScore = clamp(Math.round((wrongCount / attempts) * 100));
    const payload = { user_id: state.currentUser.id, module: group.module, topic: group.topic, subtopic: group.subtopic, attempts, correct_count: correctCount, wrong_count: wrongCount, avg_time_seconds: avgTime, weakness_score: weaknessScore };
    if (existing?.id) {
      const { error } = await supabase.from('exp_user_topic_stats').update(payload).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('exp_user_topic_stats').insert(payload);
      if (error) throw error;
    }
  }
  for (const row of answerRows.filter(item => item.question_id)) {
    const { data: existingRows, error: selectError } = await supabase.from('exp_user_question_stats').select('*').eq('user_id', state.currentUser.id).eq('question_id', row.question_id).limit(1);
    if (selectError) throw selectError;
    const existing = existingRows?.[0];
    const attempts = (existing?.attempts || 0) + 1;
    const correctCount = (existing?.correct_count || 0) + (row.is_correct ? 1 : 0);
    const wrongCount = (existing?.wrong_count || 0) + (row.is_correct ? 0 : 1);
    const previousTime = (existing?.avg_time_seconds || 0) * (existing?.attempts || 0);
    const avgTime = Math.round((previousTime + (row.time_seconds || 0)) / attempts);
    const masteryScore = clamp((existing?.mastery_score ?? 50) + (row.is_correct ? 10 : -18));
    const payload = { user_id: state.currentUser.id, question_id: row.question_id, attempts, correct_count: correctCount, wrong_count: wrongCount, avg_time_seconds: avgTime, mastery_score: masteryScore };
    if (existing?.id) {
      const { error } = await supabase.from('exp_user_question_stats').update(payload).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('exp_user_question_stats').insert(payload);
      if (error) throw error;
    }
  }
}

export function buildQuizSelectionSummary(rows, { mode, moduleName, weakTopics = [], recentQuestionIds = new Set() } = {}) {
  const weakKeys = new Set((weakTopics || []).map(topic => [topic.topic || 'General', topic.subtopic || 'General'].join(' / ')));
  const topicDistribution = distribution(rows, row => [row.topic || 'General', row.subtopic || 'General'].join(' / '));
  const summary = {
    mode,
    module: moduleName,
    totalQuestions: rows.length,
    difficultyDistribution: distribution(rows, row => `Difficulty ${difficultyValue(row)}`),
    topicSubtopicDistribution: topicDistribution,
    weakTopicBoostedCount: weakKeys.size ? [...rows].filter(row => weakKeys.has([row.topic || 'General', row.subtopic || 'General'].join(' / '))).length : 0,
    avoidedRecentQuestionCount: recentQuestionIds?.size ? [...rows].filter(row => row.id && !recentQuestionIds.has(row.id)).length : 0,
  };
  if (isDevUser()) console.log('Quiz Selection Summary:', summary);
  return summary;
}

export function quizSelectionSummaryHTML() {
  if (!isDevUser() || !state.quizSelectionSummary) return '';
  const diff = Object.entries(state.quizSelectionSummary.difficultyDistribution || {}).map(([label, count]) => `${label.replace('Difficulty ', 'D')}: ${count}`).join(' · ') || 'None';
  const topics = topDistributionItems(state.quizSelectionSummary.topicSubtopicDistribution, 3).map(([label, count]) => `${escapeHTML(label)} (${count})`).join('<br>') || 'None';
  return `<article class="card quiz-course"><div class="quiz-icon">i</div><div><div class="title">Quiz Selection Summary</div><div class="meta">Mode: ${escapeHTML(state.quizSelectionSummary.mode || 'preview')}</div><div class="meta">Module: ${escapeHTML(state.quizSelectionSummary.module || 'Module')}</div><div class="meta">Difficulty: ${escapeHTML(diff)}</div><div class="meta">Top topics:<br>${topics}</div><div class="meta">Weak-topic boost: ${state.quizSelectionSummary.weakTopicBoostedCount || 0}</div></div></article>`;
}
