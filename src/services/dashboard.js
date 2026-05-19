import { supabase } from '../lib/supabase.js';
import { state } from '../state.js';
import { lessons } from '../data/lessons.js';
import { localDateString, addDays, clamp, groupByTopic, combinedQuizAccuracy, averageValues, sessionAccuracy, lastAccuracyTrendDays, accuracyTrendDateKey, formatAccuracyTrendDate } from '../utils.js';
import { loadSupabaseQuestions } from './quiz.js';

export async function loadDashboardAccuracy() {
  if (!state.currentUser) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const { data, error } = await supabase.from('exp_quiz_sessions').select('score,total_questions,completed_at').eq('user_id', state.currentUser.id).not('completed_at', 'is', null).gte('completed_at', today.toISOString()).lt('completed_at', tomorrow.toISOString());
  if (error) throw error;
  const accuracy = combinedQuizAccuracy(data || []);
  return { accuracy: accuracy ?? 0, hasData: accuracy !== null };
}

export async function loadAccuracyTrend() {
  if (!state.currentUser) return [];
  const days = lastAccuracyTrendDays();
  const { data, error } = await supabase.from('exp_quiz_sessions').select('score,total_questions,completed_at').eq('user_id', state.currentUser.id).not('completed_at', 'is', null).gte('completed_at', days[0].start.toISOString()).order('completed_at', { ascending: true });
  if (error) throw error;
  const grouped = new Map();
  days.forEach(day => grouped.set(day.key, []));
  (Array.isArray(data) ? data : []).forEach(row => {
    const key = accuracyTrendDateKey(row.completed_at);
    if (!grouped.has(key)) return;
    const bucket = grouped.get(key) || [];
    bucket.push(row);
  });
  return days.map(day => {
    const rows = grouped.get(day.key) || [];
    const accuracy = combinedQuizAccuracy(rows);
    return { date: formatAccuracyTrendDate(day.start), value: accuracy, hasData: accuracy !== null };
  });
}

export async function loadAccuracyTrendDelta() {
  if (!state.currentUser) return null;
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const { data, error } = await supabase.from('exp_quiz_sessions').select('score,total_questions,completed_at').eq('user_id', state.currentUser.id).not('completed_at', 'is', null).gte('completed_at', since.toISOString());
  if (error) throw error;
  const now = Date.now(), day = 24 * 60 * 60 * 1000;
  const current = (data || []).filter(row => now - new Date(row.completed_at).getTime() <= 7 * day).map(sessionAccuracy);
  const previous = (data || []).filter(row => {
    const age = now - new Date(row.completed_at).getTime();
    return age > 7 * day && age <= 14 * day;
  }).map(sessionAccuracy);
  const currentAvg = averageValues(current), previousAvg = averageValues(previous);
  if (currentAvg === null || previousAvg === null) return null;
  return currentAvg - previousAvg;
}

export async function loadDashboardProgress() {
  if (!state.currentUser) return null;
  if (!state.allQuestions.length) await loadSupabaseQuestions();
  const moduleNames = lessons.map(lesson => lesson[0]);
  const totalModules = moduleNames.length;
  const [{ data: sessionRows, error: sessionError }, { data: answerRows, error: answerError }, { data: moduleRows, error: moduleError }, { data: topicRows, error: topicError }] = await Promise.all([
    supabase.from('exp_quiz_sessions').select('id,module,completed_at').eq('user_id', state.currentUser.id).not('completed_at', 'is', null),
    supabase.from('exp_user_answers').select('module,topic,subtopic').eq('user_id', state.currentUser.id),
    supabase.from('exp_user_module_stats').select('module,accuracy').eq('user_id', state.currentUser.id),
    supabase.from('exp_user_topic_stats').select('module,weakness_score').eq('user_id', state.currentUser.id),
  ]);
  if (sessionError) throw sessionError;
  if (answerError) throw answerError;
  if (moduleError) throw moduleError;
  if (topicError) throw topicError;
  const sessionModules = new Set((sessionRows || []).map(row => row.module).filter(Boolean));
  const answersByModule = new Map();
  (answerRows || []).forEach(row => {
    if (!row.module) return;
    if (!answersByModule.has(row.module)) answersByModule.set(row.module, new Set());
    answersByModule.get(row.module).add([row.topic || 'General', row.subtopic || 'General'].join('||'));
  });
  const accuracyByModule = new Map((moduleRows || []).map(row => [row.module, Number(row.accuracy) || 0]));
  const weaknessByModule = new Map();
  (topicRows || []).forEach(row => {
    if (!row.module) return;
    const weakness = Number(row.weakness_score) || 0;
    weaknessByModule.set(row.module, Math.max(weaknessByModule.get(row.module) || 0, weakness));
  });
  const moduleProgress = moduleNames.map(moduleName => {
    if (!sessionModules.has(moduleName)) return 0;
    const totalSubtopics = groupByTopic(state.allQuestions.filter(q => q.module === moduleName)).size;
    const seenSubtopics = answersByModule.get(moduleName)?.size || 0;
    const coverageRatio = totalSubtopics ? clamp(seenSubtopics / totalSubtopics, 0, 1) : 0;
    const accuracy = accuracyByModule.get(moduleName) || 0;
    const worstWeakness = weaknessByModule.has(moduleName) ? weaknessByModule.get(moduleName) : 100;
    if (accuracy >= 75 && worstWeakness <= 35) return 100;
    let progress = Math.round(30 + (coverageRatio * 55));
    if (coverageRatio >= .70) progress = Math.max(progress, 60);
    return clamp(progress, 30, 85);
  });
  const modulesAttempted = moduleProgress.filter(progress => progress > 0).length;
  const quizzesCompleted = (sessionRows || []).length;
  const overallProgress = totalModules ? Math.round(moduleProgress.reduce((sum, progress) => sum + progress, 0) / totalModules) : 0;
  return { modulesAttempted, totalModules, quizzesCompleted, overallProgress, moduleProgress };
}

export async function loadDailyStreak() {
  if (!state.currentUser) return null;
  const { data, error } = await supabase.from('exp_quiz_sessions').select('completed_at').eq('user_id', state.currentUser.id).not('completed_at', 'is', null).order('completed_at', { ascending: true });
  if (error) throw error;
  const dayCounts = (data || []).reduce((map, row) => {
    const key = localDateString(row.completed_at);
    if (key) map[key] = (map[key] || 0) + 1;
    return map;
  }, {});
  const activeDates = [...new Set((data || []).map(row => localDateString(row.completed_at)).filter(Boolean))].sort();
  const activeSet = new Set(activeDates);
  const today = new Date(), todayKey = localDateString(today), yesterdayKey = localDateString(addDays(today, -1));
  let currentStreak = 0;
  if (activeSet.has(todayKey) || activeSet.has(yesterdayKey)) {
    let cursor = activeSet.has(todayKey) ? addDays(today, 0) : addDays(today, -1);
    while (activeSet.has(localDateString(cursor))) { currentStreak += 1; cursor = addDays(cursor, -1); }
  }
  let bestStreak = 0, run = 0, previous = null;
  activeDates.forEach(key => {
    const date = new Date(`${key}T00:00:00`);
    run = previous && localDateString(addDays(previous, 1)) === key ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    previous = date;
  });
  const weekStart = addDays(today, -((today.getDay() + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, i) => localDateString(addDays(weekStart, i)));
  const last14Days = Array.from({ length: 14 }, (_, i) => localDateString(addDays(today, i - 13)));
  return { currentStreak, bestStreak, weekDays, last14Days, activeDaysThisWeek: weekDays.filter(day => activeSet.has(day)), dayCounts };
}

export async function loadTopWeakAreas() {
  if (!state.currentUser) return [];
  const { data, error } = await supabase.from('exp_user_topic_stats').select('*').eq('user_id', state.currentUser.id).order('weakness_score', { ascending: false }).order('wrong_count', { ascending: false }).limit(3);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function loadWeakestPerformanceData() {
  if (!state.currentUser) return null;
  const { data, error } = await supabase.from('exp_user_topic_stats').select('*').eq('user_id', state.currentUser.id).order('weakness_score', { ascending: false }).order('wrong_count', { ascending: false }).limit(1);
  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : null;
}
