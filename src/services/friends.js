import { supabase } from '../lib/supabase.js';
import { state } from '../state.js';

export async function fetchProfilesByIds(ids = []) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return {};
  const columns = 'id,full_name,username,email,avatar_url,license_track,flight_school,role,created_at';
  let result = await supabase.from('profiles').select(columns).in('id', unique);
  if (result.error) result = await supabase.from('profiles').select('*').in('id', unique);
  if (result.error) { console.warn('Profile lookup failed', result.error); return {}; }
  return Object.fromEntries((result.data || []).map(profile => [profile.id, profile]));
}

export async function fetchAllLeaderboardProfiles() {
  const columns = 'id,full_name,username,email,avatar_url,license_track,flight_school,role,created_at';
  let result = await supabase.from('profiles').select(columns).order('created_at', { ascending: true }).limit(500);
  if (result.error) result = await supabase.from('profiles').select('*').limit(500);
  if (result.error) result = await supabase.from('profiles').select('*');
  if (result.error) { console.warn('Leaderboard profiles load failed', result.error); return []; }
  return result.data || [];
}

export async function searchProfiles(query) {
  const term = String(query || '').trim().toLowerCase();
  if (!state.currentUser || term.length < 2) return [];
  const columns = 'id,full_name,username,email,avatar_url,license_track,flight_school,role,created_at';
  const safeTerm = term.replace(/[%_,]/g, '');
  let result = await supabase.from('profiles').select(columns).or(`username.ilike.%${safeTerm}%,full_name.ilike.%${safeTerm}%,flight_school.ilike.%${safeTerm}%`).limit(12);
  if (result.error) result = await supabase.from('profiles').select(columns).limit(120);
  if (result.error) result = await supabase.from('profiles').select('*').limit(120);
  if (result.error) { console.warn('Profile search failed', result.error); return []; }
  return (result.data || [])
    .filter(profile => profile.id !== state.currentUser.id)
    .filter(profile => [profile.username, profile.full_name, profile.flight_school].some(value => String(value || '').toLowerCase().includes(term)))
    .sort((a, b) => {
      const au = String(a.username || '').toLowerCase(), bu = String(b.username || '').toLowerCase();
      const scoreA = au === term ? 0 : au.startsWith(term) ? 1 : au.includes(term) ? 2 : 3;
      const scoreB = bu === term ? 0 : bu.startsWith(term) ? 1 : bu.includes(term) ? 2 : 3;
      return scoreA - scoreB || profileDisplayName(a).localeCompare(profileDisplayName(b));
    }).slice(0, 8);
}

export async function loadFriendState() {
  if (!state.currentUser) return null;
  const [incomingRes, sentRes, friendshipRes, searchResults] = await Promise.all([
    supabase.from('revit_friend_requests').select('*').eq('receiver_id', state.currentUser.id).eq('status', 'pending'),
    supabase.from('revit_friend_requests').select('*').eq('sender_id', state.currentUser.id).eq('status', 'pending'),
    supabase.from('revit_friendships').select('*').or(`user_a.eq.${state.currentUser.id},user_b.eq.${state.currentUser.id}`),
    searchProfiles(state.friendsSearchQuery),
  ]);
  const errors = [incomingRes.error, sentRes.error, friendshipRes.error].filter(Boolean);
  if (errors.length) throw errors[0];
  const incoming = incomingRes.data || [], sent = sentRes.data || [], friendships = friendshipRes.data || [];
  const friendIds = friendships.map(row => row.user_a === state.currentUser.id ? row.user_b : row.user_a);
  const profileIds = [...incoming.map(row => row.sender_id), ...sent.map(row => row.receiver_id), ...friendIds, ...searchResults.map(row => row.id)];
  const profiles = await fetchProfilesByIds(profileIds);
  state.friendsState = { incoming, sent, friendships, profiles, searchResults };
  return state.friendsState;
}

export async function sendFriendRequest(receiverId) {
  if (!state.currentUser) return;
  const { error } = await supabase.from('revit_friend_requests').insert({ sender_id: state.currentUser.id, receiver_id: receiverId, status: 'pending' });
  if (error) { window.showToast?.(error.message || 'Could not send request.'); return; }
  window.showToast?.('Friend request sent.');
  await window.renderFriends?.();
}

export async function cancelFriendRequest(requestId) {
  const { error } = await supabase.from('revit_friend_requests').update({ status: 'cancelled', responded_at: new Date().toISOString() }).eq('id', requestId);
  if (error) { window.showToast?.(error.message || 'Could not cancel request.'); return; }
  await window.renderFriends?.();
}

export async function acceptFriendRequest(request) {
  if (!request) return;
  const responded_at = new Date().toISOString();
  const { error: updateError } = await supabase.from('revit_friend_requests').update({ status: 'accepted', responded_at }).eq('id', request.id);
  if (updateError) { window.showToast?.(updateError.message || 'Could not accept request.'); return; }
  const { data: existing } = await supabase.from('revit_friendships').select('id').or(`and(user_a.eq.${request.sender_id},user_b.eq.${request.receiver_id}),and(user_a.eq.${request.receiver_id},user_b.eq.${request.sender_id})`).limit(1);
  if (!existing?.length) {
    const { error: insertError } = await supabase.from('revit_friendships').insert({ user_a: request.sender_id, user_b: request.receiver_id });
    if (insertError) console.warn('Friendship insert warning', insertError);
  }
  await window.renderFriends?.();
}

export async function acceptFriendRequestById(requestId) {
  const request = state.friendsState?.incoming?.find(row => row.id === requestId);
  await acceptFriendRequest(request);
}

export async function declineFriendRequest(request) {
  if (!request) return;
  const { error } = await supabase.from('revit_friend_requests').update({ status: 'declined', responded_at: new Date().toISOString() }).eq('id', request.id);
  if (error) { window.showToast?.(error.message || 'Could not decline request.'); return; }
  await window.renderFriends?.();
}

export async function declineFriendRequestById(requestId) {
  const request = state.friendsState?.incoming?.find(row => row.id === requestId);
  await declineFriendRequest(request);
}

export async function removeFriend(friendshipId) {
  const removed = state.friendsState?.friendships?.find(row => row.id === friendshipId);
  const { error } = await supabase.from('revit_friendships').delete().eq('id', friendshipId);
  if (error) { window.showToast?.(error.message || 'Could not remove friend.'); return; }
  const removedId = removed ? (removed.user_a === state.currentUser.id ? removed.user_b : removed.user_a) : null;
  if (state.friendsSelectedId === removedId) state.friendsSelectedId = null;
  await window.renderFriends?.();
}

export async function getFriendComparisonStats(userId) {
  if (!userId) return null;
  const stats = { quizCount: 0, avgScore: null, bestModule: 'No quiz data yet', weakTopic: 'No quiz data yet' };
  try {
    const { data: sessions, error } = await supabase.from('exp_quiz_sessions').select('score,total_questions,module,completed_at').eq('user_id', userId).not('completed_at', 'is', null).limit(200);
    if (!error && sessions?.length) {
      stats.quizCount = sessions.length;
      stats.avgScore = Math.round(sessions.reduce((sum, row) => sum + Number(row.score || 0), 0) / sessions.length);
    }
  } catch {}
  try {
    const { data: modules, error } = await supabase.from('exp_user_module_stats').select('module,accuracy').eq('user_id', userId).order('accuracy', { ascending: false }).limit(1);
    if (!error && modules?.[0]) stats.bestModule = `${modules[0].module || 'Module'} (${Math.round(Number(modules[0].accuracy || 0))}%)`;
  } catch {}
  try {
    const { data: topics, error } = await supabase.from('exp_user_topic_stats').select('topic,subtopic,weakness_score').eq('user_id', userId).order('weakness_score', { ascending: false }).limit(1);
    if (!error && topics?.[0]) stats.weakTopic = `${topics[0].topic || 'Topic'}${topics[0].subtopic ? ' / ' + topics[0].subtopic : ''}`;
  } catch {}
  return stats;
}

function profileDisplayName(profile = {}) {
  return profile.full_name || profile.username || 'Student Pilot';
}
