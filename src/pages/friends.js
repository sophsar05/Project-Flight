import { state } from '../state.js';
import { escapeHTML } from '../utils.js';
import { view, animateSurface, startPageRender, isCurrentRender } from '../app.js';
import { loadFriendState, getFriendComparisonStats } from '../services/friends.js';

export function profileDisplayName(profile = {}) {
  return profile.full_name || profile.username || 'Student Pilot';
}

export function profileUsername(profile = {}) {
  return profile.username ? `@${profile.username}` : 'Username not set';
}

export function profileInitials(profile = {}) {
  const name = profileDisplayName(profile).trim();
  const parts = name.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

export function profileSubline(profile = {}) {
  return [profileUsername(profile), profile.flight_school, profile.license_track || profile.role || 'Private Pilot License'].filter(Boolean).join(' · ');
}

export function profileJoined(profile = {}) {
  if (!profile.created_at) return 'Joined date unavailable';
  try { return `Joined ${new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`; } catch { return 'Joined date unavailable'; }
}

export function friendRelation(profileId, friendState = state.friendsState) {
  if (!friendState) return { label: 'Add', action: `sendFriendRequest('${profileId}')`, kind: 'add' };
  const friendship = friendState.friendships.find(row => row.user_a === profileId || row.user_b === profileId);
  if (friendship) return { label: 'Friends', action: `selectFriend('${profileId}')`, kind: 'friends' };
  const incoming = friendState.incoming.find(row => row.sender_id === profileId);
  if (incoming) return { label: 'Accept', action: `acceptFriendRequestById('${incoming.id}')`, kind: 'accept' };
  const sent = friendState.sent.find(row => row.receiver_id === profileId);
  if (sent) return { label: 'Requested', action: `cancelFriendRequest('${sent.id}')`, kind: 'requested' };
  return { label: 'Add', action: `sendFriendRequest('${profileId}')`, kind: 'add' };
}

export function friendDetailModalHTML(profile, { selectedStats = null, myStats = null, loading = false, errorMessage = '' } = {}) {
  const stat = (value, label) => `<div class="friend-detail-stat ${loading ? 'loading' : ''}"><b>${loading ? '...' : value}</b><span>${label}</span></div>`;
  const body = errorMessage
    ? `<div class="friend-detail-empty">${escapeHTML(errorMessage)}</div>`
    : `<div class="friend-detail-grid">${stat(myStats?.avgScore == null ? '--' : myStats.avgScore + '%', 'Your accuracy')}<div class="friend-detail-stats">${stat(selectedStats?.avgScore == null ? '--' : selectedStats.avgScore + '%', 'Accuracy')}${stat(selectedStats?.quizCount || 0, 'Completed quizzes')}${stat(escapeHTML(selectedStats?.bestModule || 'No data yet'), 'Module progress')}${stat(escapeHTML(selectedStats?.weakTopic || 'No data yet'), 'Weak topic')}</div></div>`;
  return `<div class="friend-detail-modal" role="dialog" aria-modal="true" aria-label="Friend comparison" data-friend-detail-id="${escapeHTML(profile.id || '')}"><section class="friend-detail-panel"><div class="friend-detail-top"><div class="friend-detail-profile"><div class="friend-avatar large">${escapeHTML(profileInitials(profile))}</div><div><div class="kicker">Friend Comparison</div><h3>${escapeHTML(profileDisplayName(profile))}</h3><p class="sub">${escapeHTML(profileSubline(profile))} / ${escapeHTML(profileJoined(profile))}</p>${loading ? '<p class="friend-detail-loading-copy">Loading comparison stats...</p>' : ''}</div></div><button class="friend-detail-close" type="button" onclick="closeFriendDetail()" aria-label="Close friend comparison">&times;</button></div>${body}</section></div>`;
}

export function showFriendDetailModal(profile, options = {}) {
  document.querySelector('.friend-detail-modal')?.remove();
  document.body.insertAdjacentHTML('beforeend', friendDetailModalHTML(profile, options));
  animateSurface(document.querySelector('.friend-detail-modal'));
}

export async function selectFriend(friendId) {
  const token = ++state.friendDetailToken;
  state.friendsSelectedId = friendId;
  document.querySelectorAll('.friends-list-panel .friend-row').forEach(row => row.classList.toggle('active', row.dataset.friendId === friendId));
  const profile = state.friendsState?.profiles?.[friendId];
  if (!profile) { await renderFriends({ skipLoading: true }); return; }
  showFriendDetailModal(profile, { loading: true });
  try {
    const [selectedStats, myStats] = await Promise.all([getFriendComparisonStats(friendId), getFriendComparisonStats(state.currentUser.id)]);
    if (token !== state.friendDetailToken || state.friendsSelectedId !== friendId) return;
    showFriendDetailModal(profile, { selectedStats, myStats });
  } catch (error) {
    console.warn('Friend comparison load failed', error);
    if (token !== state.friendDetailToken || state.friendsSelectedId !== friendId) return;
    showFriendDetailModal(profile, { errorMessage: 'Unable to load friend comparison right now.' });
  }
}

export async function closeFriendDetail() {
  state.friendDetailToken++;
  state.friendsSelectedId = null;
  document.querySelector('.friend-detail-modal')?.remove();
  document.querySelectorAll('.friends-list-panel .friend-row.active').forEach(row => row.classList.remove('active'));
}

export function setupFriendSearch() {
  const input = document.getElementById('friendSearchInput');
  if (!input) return;
  input.focus({ preventScroll: true });
  input.setSelectionRange(input.value.length, input.value.length);
  let timer = null;
  input.addEventListener('input', () => {
    state.friendsSearchQuery = input.value;
    clearTimeout(timer);
    timer = setTimeout(() => renderFriends({ skipLoading: true }), 360);
  });
}

export async function renderFriends(options = {}) {
  const render = startPageRender('friends');
  if (!state.currentUser) {
    if (!isCurrentRender(render)) return;
    view.innerHTML = `<section class="page"><div class="friends-shell glass"><div class="friends-intro"><div class="kicker">Study Circle</div><h1>Friends</h1><p class="sub">Sign in to add classmates and compare progress.</p></div><div class="friends-signed-out"><div class="friend-avatar">VP</div><h2>Sign in to add classmates and compare progress.</h2><p class="sub">Your study circle uses Supabase profiles and stays synced across sessions once you are signed in.</p><button class="btn primary" onclick="renderTempLoginModal(true)">Sign In</button></div></div></section>`;
    animateSurface();
    return;
  }
  if (!options.skipLoading) {
    view.innerHTML = `<section class="page"><div class="friends-shell friends-dashboard glass"><section class="friends-hero"><div class="friends-hero-body"><div class="friends-hero-copy"><div class="kicker">STUDY CIRCLE</div><h1>Friends</h1><p class="sub">Build your study circle, manage requests, and compare reviewer progress.</p></div><div class="friends-stat-strip"><div class="friends-stat-tile"><b>...</b><span>Friends</span></div><div class="friends-stat-tile"><b>...</b><span>Incoming</span></div><div class="friends-stat-tile"><b>...</b><span>Sent</span></div></div></div></section><div class="friends-dashboard-grid"><section class="friends-panel friends-list-panel"><div class="friends-panel-head"><h3>My Friends</h3><span>...</span></div><div class="friends-rows"><div class="friends-empty-note">Loading friends.</div></div></section><section class="friends-panel find-classmates-panel"><div class="friends-panel-head"><h3>Find Classmates</h3></div><div class="friend-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4 4"></path></svg><span><input id="friendSearchInput" type="search" aria-label="Search classmates" placeholder="Search by username or full name" value="${escapeHTML(state.friendsSearchQuery)}"></span><kbd>/</kbd></div><p class="friends-search-helper">Syncing classmates.</p><div class="friends-rows"><div class="friends-empty-note friend-empty-visual"><div><b>Loading study circle</b><span>Checking Supabase friendships.</span></div></div></div></section><div class="friends-stack"><section class="friends-panel"><div class="friends-panel-head"><h3>Incoming Requests</h3><span>...</span></div><div class="friends-rows"><div class="friends-empty-note">Loading incoming requests.</div></div></section><section class="friends-panel"><div class="friends-panel-head"><h3>Sent Requests</h3><span>...</span></div><div class="friends-rows"><div class="friends-empty-note">Loading sent requests.</div></div></section></div></div></div></section>`;
    animateSurface();
  }
  let friendState = null, errorMessage = '';
  try { friendState = await loadFriendState(); } catch (error) { console.warn('Friend state failed', error); errorMessage = error.message || 'Unable to load friends.'; friendState = { incoming: [], sent: [], friendships: [], profiles: {}, searchResults: [] }; }
  if (!isCurrentRender(render)) return;
  const friendItems = friendState.friendships.map(row => ({ friendship: row, profile: friendState.profiles[row.user_a === state.currentUser.id ? row.user_b : row.user_a] })).filter(item => item.profile);
  if (state.friendsSelectedId && !friendItems.some(item => item.profile.id === state.friendsSelectedId)) state.friendsSelectedId = null;
  const selected = friendItems.find(item => item.profile.id === state.friendsSelectedId);
  const selectedStats = selected ? await getFriendComparisonStats(selected.profile.id) : null;
  if (!isCurrentRender(render)) return;
  const myStats = selected ? await getFriendComparisonStats(state.currentUser.id) : null;
  if (!isCurrentRender(render)) return;
  const requestRow = (profile, actions, meta = '') => `<article class="friend-card friend-row"><div class="friend-avatar">${escapeHTML(profileInitials(profile))}</div><div class="friend-copy"><h3>${escapeHTML(profileDisplayName(profile))}</h3><p class="sub">${escapeHTML(profileUsername(profile))}</p>${meta ? `<small>${escapeHTML(meta)}</small>` : ''}</div><div class="friend-actions">${actions}</div></article>`;
  const incomingHTML = friendState.incoming.length ? friendState.incoming.map(request => { const profile = friendState.profiles[request.sender_id] || {}; return requestRow(profile, `<button class="friend-chip accept" onclick="acceptFriendRequestById('${request.id}')">Accept</button><button class="friend-chip muted" onclick="declineFriendRequestById('${request.id}')">Ignore</button>`); }).join('') : `<div class="friends-empty-note">No incoming requests right now.</div>`;
  const sentHTML = friendState.sent.length ? friendState.sent.map(request => { const profile = friendState.profiles[request.receiver_id] || {}; return requestRow(profile, `<button class="friend-chip muted" onclick="cancelFriendRequest('${request.id}')">Cancel</button>`, 'Request pending'); }).join('') : `<div class="friends-empty-note">No sent requests right now.</div>`;
  const searchHTML = state.friendsSearchQuery.trim().length < 2 ? `<div class="friends-empty-note friend-empty-visual"><div><b>Search to find classmates</b><span>Add classmates and start comparing your reviewer progress.</span></div></div>` : (friendState.searchResults.length ? friendState.searchResults.map(profile => { const relation = friendRelation(profile.id, friendState), meta = [profile.flight_school, profile.license_track || profile.role].filter(Boolean).join(' / '); return requestRow(profile, `<button class="friend-chip ${relation.kind}" onclick="${relation.action}">${relation.label}</button>`, meta); }).join('') : `<div class="friends-empty-note">No matching classmates found.</div>`);
  const friendsHTML = friendItems.length ? friendItems.map(item => `<article class="friend-card friend-row ${item.profile.id === state.friendsSelectedId ? 'active' : ''}" data-friend-id="${escapeHTML(item.profile.id)}"><div class="friend-avatar">${escapeHTML(profileInitials(item.profile))}</div><button class="friend-copy friend-select" onclick="selectFriend('${item.profile.id}')"><h3>${escapeHTML(profileDisplayName(item.profile))}</h3><p class="sub">${escapeHTML(profileUsername(item.profile))}</p></button><span class="friend-track-pill">${escapeHTML(item.profile.license_track || item.profile.role || 'PPL')}</span><div class="friend-actions"><button class="friend-chip muted" onclick="selectFriend('${item.profile.id}')">View</button><button class="friend-chip muted" onclick="removeFriend('${item.friendship.id}')">Remove</button></div></article>`).join('') : `<div class="friends-empty-note">Search classmates to build your study circle.</div>`;
  const detailHTML = selected ? `<div class="friend-detail-modal" role="dialog" aria-modal="true" aria-label="Friend comparison"><section class="friend-detail-panel"><div class="friend-detail-top"><div class="friend-detail-profile"><div class="friend-avatar large">${escapeHTML(profileInitials(selected.profile))}</div><div><div class="kicker">Friend Comparison</div><h3>${escapeHTML(profileDisplayName(selected.profile))}</h3><p class="sub">${escapeHTML(profileSubline(selected.profile))} / ${escapeHTML(profileJoined(selected.profile))}</p></div></div><button class="friend-detail-close" type="button" onclick="closeFriendDetail()" aria-label="Close friend comparison">&times;</button></div><div class="friend-detail-grid"><div class="friend-detail-stat"><b>${myStats?.avgScore == null ? '--' : myStats.avgScore + '%'}</b><span>Your accuracy</span></div><div class="friend-detail-stats"><div class="friend-detail-stat"><b>${selectedStats?.avgScore == null ? '--' : selectedStats.avgScore + '%'}</b><span>Accuracy</span></div><div class="friend-detail-stat"><b>${selectedStats?.quizCount || 0}</b><span>Completed quizzes</span></div><div class="friend-detail-stat"><b>${escapeHTML(selectedStats?.bestModule || 'No data yet')}</b><span>Module progress</span></div><div class="friend-detail-stat"><b>${escapeHTML(selectedStats?.weakTopic || 'No data yet')}</b><span>Weak topic</span></div></div></div></section></div>` : '';
  view.innerHTML = `<section class="page"><div class="friends-shell friends-dashboard glass"><section class="friends-hero"><div class="friends-hero-body"><div class="friends-hero-copy"><div class="kicker">STUDY CIRCLE</div><h1>Friends</h1><p class="sub">Build your study circle, manage requests, and compare reviewer progress.</p>${errorMessage ? `<p class="friends-error">${escapeHTML(errorMessage)}</p>` : ''}</div><div class="friends-stat-strip"><div class="friends-stat-tile"><b>${friendItems.length}</b><span>${friendItems.length === 1 ? 'Friend' : 'Friends'}</span></div><div class="friends-stat-tile"><b>${friendState.incoming.length}</b><span>Incoming</span></div><div class="friends-stat-tile"><b>${friendState.sent.length}</b><span>Sent</span></div></div></div></section><div class="friends-dashboard-grid"><section class="friends-panel friends-list-panel"><div class="friends-panel-head"><h3>My Friends</h3><span>${friendItems.length}</span></div><div class="friends-rows">${friendsHTML}</div><button class="friends-panel-link" type="button">View all friends &rarr;</button></section><section class="friends-panel find-classmates-panel"><div class="friends-panel-head"><h3>Find Classmates</h3></div><div class="friend-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4 4"></path></svg><span><input id="friendSearchInput" type="search" aria-label="Search classmates" placeholder="Search by username or full name" value="${escapeHTML(state.friendsSearchQuery)}"></span><kbd>/</kbd></div><p class="friends-search-helper">Type at least 2 characters to search.</p><div class="friends-rows">${searchHTML}</div></section><div class="friends-stack"><section class="friends-panel"><div class="friends-panel-head"><h3>Incoming Requests</h3><span>${friendState.incoming.length}</span></div><div class="friends-rows">${incomingHTML}</div><button class="friends-panel-link" type="button">View all incoming &rarr;</button></section><section class="friends-panel"><div class="friends-panel-head"><h3>Sent Requests</h3><span>${friendState.sent.length}</span></div><div class="friends-rows">${sentHTML}</div><button class="friends-panel-link" type="button">View all sent &rarr;</button></section></div></div></div>${detailHTML}</section>`;
  setupFriendSearch();
  animateSurface();
}
