import { supabase } from '../lib/supabase.js';
import { state } from '../state.js';
import { dailyQuestions } from '../data/questions.js';
import { fetchProfilesByIds, fetchAllLeaderboardProfiles, loadFriendState } from './friends.js';

function dailyDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function dailyDateKeyFromDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function shiftDailyDateKey(key, days) {
  const [year, month, date] = key.split('-').map(Number), next = new Date(year, month - 1, date);
  next.setDate(next.getDate() + days);
  return dailyDateKeyFromDate(next);
}

function getTodayChallengeDate() { return dailyDateKey(); }

function normalizeDailyResult(result) {
  const totalQuestions = Number(result?.totalQuestions || dailyQuestions.length || 0);
  const correctCount = Number(result?.correctCount ?? result?.correctAnswers ?? 0);
  const totalPoints = Number(result?.totalPoints ?? result?.pointsEarned ?? 0);
  const completedAt = result?.completedAt || result?.completedTime || new Date().toISOString();
  return { ...result, date: result?.date || dailyDateKey(), score: totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0, totalQuestions, correctCount, correctAnswers: correctCount, basePoints: Number(result?.basePoints || 0), speedBonus: Number(result?.speedBonus || 0), streakBonus: Number(result?.streakBonus || 0), perfectBonus: Number(result?.perfectBonus || 0), totalPoints, pointsEarned: totalPoints, completedAt, completedTime: completedAt, answerHistory: result?.answerHistory || result?.answers || [] };
}

function normalizeDailyResultRow(row) {
  if (!row) return null;
  const extras = (row.answers_json && typeof row.answers_json === 'object') ? row.answers_json : {};
  return normalizeDailyResult({ id: row.id, date: row.challenge_date, score: row.score, totalQuestions: row.total_questions, correctCount: row.correct_answers, correctAnswers: row.correct_answers, totalPoints: row.points_earned, pointsEarned: row.points_earned, basePoints: extras.basePoints || 0, speedBonus: extras.speedBonus || 0, streakBonus: row.streak_boost || extras.streakBonus || 0, perfectBonus: extras.perfectBonus || 0, completedAt: row.completed_at || row.created_at, completedTime: row.completed_at || row.created_at, answers: extras.answers || extras.answerHistory || [], answerHistory: extras.answerHistory || extras.answers || [], userId: row.user_id });
}

function normalizeDailyResultRows(rows = []) {
  return (rows || []).map(normalizeDailyResultRow).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date));
}

export function calculateBestDailyStreak(history = []) {
  const dates = [...new Set(history.map(item => item.date))].sort();
  let best = 0, current = 0, previous = null;
  dates.forEach(date => { current = previous && date === shiftDailyDateKey(previous, 1) ? current + 1 : 1; best = Math.max(best, current); previous = date; });
  return best;
}

export async function loadDailyTaskData(force = false) {
  if (!state.currentUser) { state.dailyTaskHistoryCache = []; state.dailyTaskLoadedFor = null; return []; }
  const loadKey = `${state.currentUser.id}:${getTodayChallengeDate()}`;
  if (!force && state.dailyTaskLoadedFor === loadKey) return state.dailyTaskHistoryCache;
  const { data, error } = await supabase.from('daily_task_results').select('*').eq('user_id', state.currentUser.id).order('challenge_date', { ascending: true });
  if (error) { console.warn('Daily task history failed', error); window.showToast?.('Unable to load Daily Task progress.'); state.dailyTaskHistoryCache = []; state.dailyTaskLoadedFor = loadKey; return []; }
  state.dailyTaskHistoryCache = normalizeDailyResultRows(data);
  state.dailyTaskLoadedFor = loadKey;
  return state.dailyTaskHistoryCache;
}

export async function saveTodayDailyResult(result) {
  if (!state.currentUser) throw new Error('Sign in to save Daily Task results.');
  const normalized = normalizeDailyResult(result);
  const history = state.dailyTaskHistoryCache.filter(item => item.date !== normalized.date);
  const payload = { user_id: state.currentUser.id, challenge_date: normalized.date, score: normalized.score, total_questions: normalized.totalQuestions, correct_answers: normalized.correctCount, points_earned: normalized.totalPoints, streak_boost: normalized.streakBonus, answers_json: { answers: normalized.answerHistory, answerHistory: normalized.answerHistory, basePoints: normalized.basePoints, speedBonus: normalized.speedBonus, streakBonus: normalized.streakBonus, perfectBonus: normalized.perfectBonus }, completed_at: normalized.completedAt };
  const { data, error } = await supabase.from('daily_task_results').upsert(payload, { onConflict: 'user_id,challenge_date' }).select('*').single();
  if (error) { console.warn('Daily task save failed', error); throw error; }
  const saved = normalizeDailyResultRow(data) || normalized;
  history.push(normalized);
  history.sort((a, b) => a.date.localeCompare(b.date));
  state.dailyTaskHistoryCache = history.map(item => item.date === saved.date ? saved : item);
  state.dailyTaskLoadedFor = `${state.currentUser.id}:${getTodayChallengeDate()}`;
  localStorage.removeItem(`dailyFlightChallengeProgress_${state.currentUser?.id || 'guest'}_${dailyDateKey()}`);
  return saved;
}

export async function loadDailyGlobalLeaderboard() {
  if (state.currentUser) await loadDailyTaskData();
  const todayKey = getTodayChallengeDate();
  const [profiles, { data, error }] = await Promise.all([
    fetchAllLeaderboardProfiles(),
    supabase.from('daily_task_results').select('*').eq('challenge_date', todayKey).order('points_earned', { ascending: false }).order('completed_at', { ascending: true }).limit(500),
  ]);
  if (error) throw error;
  const resultRows = (data || []).map(normalizeDailyResultRow);
  const scoresByUser = new Map(resultRows.filter(row => row.userId).map(row => [row.userId, row]));
  let rows = profiles.map(profile => {
    const result = scoresByUser.get(profile.id);
    return { profile, points: result ? Number(result.totalPoints ?? result.pointsEarned ?? 0) : 0, userId: profile.id, completedAt: result?.completedAt, emptyLabel: null, isYou: Boolean(state.currentUser && profile.id === state.currentUser.id) };
  });
  const profileIds = new Set(profiles.map(profile => profile.id));
  resultRows.forEach(row => {
    if (!row.userId || profileIds.has(row.userId)) return;
    rows.push({ profile: { id: row.userId, full_name: 'Student Pilot', username: String(row.userId || 'pilot').slice(0, 8) }, points: Number(row.totalPoints ?? row.pointsEarned ?? 0), userId: row.userId, completedAt: row.completedAt, isYou: Boolean(state.currentUser && row.userId === state.currentUser.id) });
  });
  if (state.currentUser && !rows.some(row => row.userId === state.currentUser.id)) {
    const myProfile = (await fetchProfilesByIds([state.currentUser.id]))[state.currentUser.id] || { id: state.currentUser.id, full_name: 'You', username: 'you' };
    rows.push({ isYou: true, profile: { ...myProfile, full_name: myProfile.full_name || 'You', username: myProfile.username || 'you' }, points: 0, userId: state.currentUser.id });
  }
  rows = rows.map(row => ({ ...row, isYou: row.isYou || Boolean(state.currentUser && row.userId === state.currentUser.id) }));
  return rows.filter(row => row.profile || row.isYou).sort((a, b) => {
    if (Number(b.points || 0) !== Number(a.points || 0)) return Number(b.points || 0) - Number(a.points || 0);
    const nameA = a.profile?.full_name || a.profile?.username || '';
    const nameB = b.profile?.full_name || b.profile?.username || '';
    return nameA.localeCompare(nameB);
  });
}

export async function loadDailyAllTimeLeaderboard() {
  if (state.currentUser) await loadDailyTaskData();
  const [profiles, { data, error }] = await Promise.all([
    fetchAllLeaderboardProfiles(),
    supabase.from('daily_task_results').select('*').order('points_earned', { ascending: false }).order('completed_at', { ascending: true }).limit(500),
  ]);
  if (error) throw error;
  const resultRows = (data || []).map(normalizeDailyResultRow);
  const grouped = new Map();
  resultRows.forEach(row => {
    if (!row.userId) return;
    const current = grouped.get(row.userId) || { userId: row.userId, points: 0, dates: [], bestSingle: 0 };
    current.points += Number(row.totalPoints ?? row.pointsEarned ?? 0);
    current.bestSingle = Math.max(current.bestSingle, Number(row.totalPoints ?? row.pointsEarned ?? 0));
    if (row.date) current.dates.push(row.date);
    grouped.set(row.userId, current);
  });
  const profileIds = new Set(profiles.map(profile => profile.id));
  const rows = profiles.map(profile => {
    const row = grouped.get(profile.id) || { userId: profile.id, points: 0, dates: [] };
    return { ...row, profile, points: Number(row.points || 0), bestStreak: calculateBestDailyStreak((row.dates || []).map(date => ({ date }))), isYou: Boolean(state.currentUser && profile.id === state.currentUser.id) };
  });
  grouped.forEach(row => {
    if (profileIds.has(row.userId)) return;
    rows.push({ ...row, profile: { id: row.userId, full_name: 'Student Pilot', username: String(row.userId || 'pilot').slice(0, 8) }, bestStreak: calculateBestDailyStreak(row.dates.map(date => ({ date }))), isYou: Boolean(state.currentUser && row.userId === state.currentUser.id) });
  });
  if (state.currentUser && !rows.some(row => row.userId === state.currentUser.id)) {
    const myProfile = (await fetchProfilesByIds([state.currentUser.id]))[state.currentUser.id] || { id: state.currentUser.id, full_name: 'You', username: 'you' };
    rows.push({ userId: state.currentUser.id, profile: { ...myProfile, full_name: myProfile.full_name || 'You', username: myProfile.username || 'you' }, points: 0, bestStreak: 0, isYou: true });
  }
  return rows.sort((a, b) => Number(b.points || 0) - Number(a.points || 0));
}

export async function loadDailyFriendsLeaderboard() {
  if (!state.currentUser) return [];
  await loadDailyTaskData();
  const friendState = await loadFriendState();
  const profileIds = friendState.friendships.map(row => row.user_a === state.currentUser.id ? row.user_b : row.user_a);
  const profiles = await fetchProfilesByIds([...profileIds, state.currentUser.id]);
  const todayKey = getTodayChallengeDate(), ids = [...new Set([state.currentUser.id, ...profileIds])];
  let resultMap = {};
  if (ids.length) {
    const { data, error } = await supabase.from('daily_task_results').select('*').in('user_id', ids).eq('challenge_date', todayKey);
    if (error) throw error;
    resultMap = Object.fromEntries((data || []).map(row => [row.user_id, normalizeDailyResultRow(row)]));
  }
  const todayResult = resultMap[state.currentUser.id] || state.dailyTaskHistoryCache.find(item => item.date === todayKey) || null;
  const myProfile = profiles[state.currentUser.id] || { id: state.currentUser.id, full_name: 'You', username: 'you' };
  const rows = [{ isYou: true, friendEmpty: profileIds.length === 0, profile: { ...myProfile, full_name: myProfile.full_name || 'You', username: myProfile.username || 'you' }, points: todayResult?.totalPoints ?? null, emptyLabel: 'Not attempted' }];
  profileIds.forEach(id => rows.push({ profile: profiles[id], points: resultMap[id]?.totalPoints ?? null, emptyLabel: 'No score yet' }));
  return rows.filter(row => row.isYou || row.profile).sort((a, b) => {
    const ap = typeof a.points === 'number', bp = typeof b.points === 'number';
    if (ap && bp) return b.points - a.points;
    if (ap !== bp) return ap ? -1 : 1;
    if (a.isYou !== b.isYou) return a.isYou ? -1 : 1;
    const nameA = a.profile?.full_name || a.profile?.username || '';
    const nameB = b.profile?.full_name || b.profile?.username || '';
    return nameA.localeCompare(nameB);
  });
}
