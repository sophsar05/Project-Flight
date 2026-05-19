import { supabase } from '../lib/supabase.js';
import { state } from '../state.js';

export const PROFILE_SELECT_COLUMNS = 'id,full_name,username,email,avatar_url,license_track,flight_school,birth_date,created_at';

export function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

export function normalizeLicenseTrack(value) {
  const text = String(value || '').trim();
  const map = { 'Private Pilot License': 'PPL', 'Commercial Pilot License': 'CPL', 'Instrument Rating': 'IR', 'Airline Transport Pilot License': 'ATPL' };
  return map[text] || (['PPL', 'CPL', 'IR', 'ATPL'].includes(text) ? text : 'PPL');
}

export function validateUsername(username) {
  if (!username) return 'Username is required.';
  if (username.length < 3 || username.length > 24) return 'Username must be 3 to 24 characters.';
  if (!/^[a-z0-9._]+$/.test(username)) return 'Use lowercase letters, numbers, underscore, and dot only.';
  return '';
}

export function isProfileComplete(profile = {}) {
  return ['full_name', 'username', 'flight_school', 'license_track'].every(key => String(profile?.[key] || '').trim());
}

export function googleProfileMetadata() {
  const meta = state.currentUser?.user_metadata || {};
  return { name: meta.full_name || meta.name || meta.display_name || '', avatar: meta.avatar_url || meta.picture || '', email: state.currentUser?.email || '' };
}

export async function getCurrentProfile() {
  if (!state.currentUser) return null;
  let result = await supabase.from('profiles').select(PROFILE_SELECT_COLUMNS).eq('id', state.currentUser.id).limit(1);
  if (result.error) result = await supabase.from('profiles').select('*').eq('id', state.currentUser.id).limit(1);
  if (result.error) throw result.error;
  return result.data?.[0] || null;
}

export async function ensureUserProfile() {
  if (!state.currentUser) return null;
  const existing = await getCurrentProfile();
  if (existing) return existing;
  const google = googleProfileMetadata();
  const payload = { id: state.currentUser.id, email: state.currentUser.email || google.email, full_name: google.name, avatar_url: google.avatar };
  const insert = await supabase.from('profiles').insert(payload).select(PROFILE_SELECT_COLUMNS).single();
  if (insert.error) {
    const fallback = await supabase.from('profiles').select('*').eq('id', state.currentUser.id).limit(1);
    if (fallback.error) throw insert.error;
    return fallback.data?.[0] || payload;
  }
  return insert.data;
}

export async function getOrCreateUserProfile() { return ensureUserProfile(); }

export async function checkUsernameAvailable(username) {
  if (!state.currentUser) return false;
  const { data, error } = await supabase.from('profiles').select('id').eq('username', username).neq('id', state.currentUser.id).limit(1);
  if (error) throw error;
  return !data?.length;
}

export async function isUsernameTaken(username) {
  return !(await checkUsernameAvailable(username));
}
