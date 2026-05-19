import { moduleStyles } from './data/lessons.js';

export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function formatTime(seconds) {
  return new Date(seconds * 1000).toISOString().slice(14, 19);
}

export function answerLetter(index) {
  return index === undefined || index === null ? null : String.fromCharCode(65 + Number(index));
}

export function ordinalRank(value) {
  const n = Number(value) || 0, v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
}

export function localDateString(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, '0'), d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date, days) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function difficultyValue(q) {
  const value = Number(String(q.difficulty ?? 1).match(/\d+/)?.[0] || 1);
  return clamp(value, 1, 3);
}

export function topicKey(q) {
  return [q.topic || 'General', q.subtopic || 'General'].join('||');
}

export function groupByTopic(rows) {
  const groups = new Map();
  rows.forEach(row => {
    const key = topicKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  return groups;
}

export function normalizeQuestion(q) {
  const answerMap = { a: 0, b: 1, c: 2, d: 3, option_a: 0, option_b: 1, option_c: 2, option_d: 3, '0': 0, '1': 1, '2': 2, '3': 3 };
  const correctKey = String(q.correct_option ?? '').trim().toLowerCase();
  const normalized = [q.question || '', [q.option_a || '', q.option_b || '', q.option_c || '', q.option_d || ''], answerMap[correctKey] ?? 0, q.discussion || ''];
  normalized.id = q.id;
  normalized.module = q.module;
  normalized.topic = q.topic;
  normalized.subtopic = q.subtopic;
  normalized.correct_option = q.correct_option;
  normalized.difficulty = q.difficulty;
  normalized.diagram_needed = q.diagram_needed;
  normalized.diagram_ref = q.diagram_ref;
  return normalized;
}

export function moduleStyleVars(title) {
  const style = moduleStyles[title];
  if (!style) return '';
  return `--module-icon-bg:${style.iconBg};--module-active-bg:${style.activeBg};--module-icon-color:${style.iconColor};--module-accent:${style.accent};--module-accent-dark:${style.accentDark};--module-soft:${style.soft};--module-border:${style.border};--module-shadow:${style.shadow};`;
}

export function distribution(rows, mapper) {
  return rows.reduce((map, row) => {
    const key = mapper(row) || 'General';
    map[key] = (map[key] || 0) + 1;
    return map;
  }, {});
}

export function topDistributionItems(items, limit = 3) {
  return Object.entries(items || {}).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

export function sessionAccuracy(row) {
  const score = Number(row.score) || 0, total = Number(row.total_questions) || 0;
  return clamp(total && score <= total ? Math.round(score / total * 100) : Math.round(score), 0, 100);
}

export function combinedQuizAccuracy(rows = []) {
  let correct = 0, totalQuestions = 0;
  const percentOnly = [];
  rows.forEach(row => {
    const score = Number(row?.score);
    const total = Number(row?.total_questions);
    if (Number.isFinite(score) && Number.isFinite(total) && total > 0) {
      correct += score <= total ? clamp(score, 0, total) : (clamp(score, 0, 100) / 100) * total;
      totalQuestions += total;
    } else if (Number.isFinite(score)) {
      percentOnly.push(clamp(Math.round(score), 0, 100));
    }
  });
  if (totalQuestions > 0) return Math.round((correct / totalQuestions) * 100);
  return percentOnly.length ? averageValues(percentOnly) : null;
}

export function averageValues(values) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

export function lastAccuracyTrendDays() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const start = new Date(today);
    start.setDate(today.getDate() - 6 + index);
    return { start, key: accuracyTrendDateKey(start) };
  });
}

export function accuracyTrendDateKey(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatAccuracyTrendDate(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Recent';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function streakValueHTML(days = 0) {
  const count = Number(days) || 0;
  return `<span class="streak-value-number">${count}</span><span class="streak-value-label">${count === 1 ? 'Day' : 'Days'}</span>`;
}

export function accuracyTrendDeltaHTML(delta = null) {
  if (delta === null || delta === undefined) return '<span class="accuracy-delta neutral">No trend yet</span>';
  const value = Math.round(delta);
  const state = value > 0 ? 'up' : value < 0 ? 'down' : 'neutral';
  const arrow = value > 0 ? '↑' : value < 0 ? '↓' : '–';
  const label = value > 0 ? `+${value}%` : value < 0 ? `${value}%` : '0%';
  return `<span class="accuracy-delta ${state}"><b>${arrow}</b> ${label} vs last 7 days</span>`;
}

export function accuracySparklineHTML(values = [], syncedAccuracy = null) {
  const slots = (values.length ? values : lastAccuracyTrendDays().map(day => ({ date: formatAccuracyTrendDate(day.start), value: null, hasData: false }))).map((item, index) => {
    const value = typeof item === 'number' ? item : item?.value;
    const date = typeof item === 'number' ? `Quiz ${index + 1}` : (item?.date || `Quiz ${index + 1}`);
    const hasData = typeof item === 'number' ? Number.isFinite(value) : item?.hasData !== false && value !== null && value !== undefined && Number.isFinite(Number(value));
    return { date, value: hasData ? clamp(Number(value), 0, 100) : null, hasData };
  });
  const data = slots.filter(item => item.hasData);
  const width = 320, height = 142;
  const chart = { left: 38, right: 12, top: 22, bottom: 28 };
  const chartWidth = width - chart.left - chart.right;
  const chartHeight = height - chart.top - chart.bottom;
  const xFor = index => chart.left + (index * (chartWidth / Math.max(1, slots.length - 1)));
  const yFor = value => chart.top + ((100 - clamp(value, 0, 100)) / 100) * chartHeight;
  const grid = [0, 25, 50, 75, 100].map(value => {
    const y = yFor(value).toFixed(1);
    return `<g><line class="grid-line" x1="${chart.left}" y1="${y}" x2="${width - chart.right}" y2="${y}"></line><text class="axis-label" x="${chart.left - 8}" y="${Number(y) + 3}" text-anchor="end">${value}%</text></g>`;
  }).join('');
  const dateLabels = slots.map((point, index) => `<text class="axis-label" x="${xFor(index).toFixed(1)}" y="${height - 8}" text-anchor="middle">${escapeHTML(point.date)}</text>`).join('');
  if (data.length < 2) {
    const value = Number(syncedAccuracy);
    if (Number.isFinite(value)) {
      const y = yFor(value);
      const point = data[0] ? `<circle class="accuracy-point" cx="${xFor(slots.indexOf(data[0])).toFixed(1)}" cy="${yFor(data[0].value).toFixed(1)}" r="3.5"></circle><text class="point-label" x="${xFor(slots.indexOf(data[0])).toFixed(1)}" y="${Math.max(10, yFor(data[0].value) - 8).toFixed(1)}" text-anchor="middle">${data[0].value}%</text>` : '';
      return `<svg class="accuracy-sparkline" viewBox="0 0 ${width} ${height}" role="img" aria-label="Today combined quiz accuracy is ${Math.round(value)} percent.">${grid}<line class="axis-line" x1="${chart.left}" y1="${height - chart.bottom}" x2="${width - chart.right}" y2="${height - chart.bottom}"></line><path class="accuracy-area" d="M${chart.left} ${height - chart.bottom} L${chart.left} ${y.toFixed(1)} L${width - chart.right} ${y.toFixed(1)} L${width - chart.right} ${height - chart.bottom} Z"></path><line class="accuracy-line" x1="${chart.left}" y1="${y.toFixed(1)}" x2="${width - chart.right}" y2="${y.toFixed(1)}"></line>${point}<text class="baseline-label" x="${width - chart.right - 2}" y="${Math.max(12, y - 8).toFixed(1)}" text-anchor="end">${Math.round(value)}% today</text>${dateLabels}</svg>`;
    }
    return `<svg class="accuracy-sparkline" viewBox="0 0 ${width} ${height}" role="img" aria-label="No accuracy data for the past 7 days.">${grid}<line class="axis-line" x1="${chart.left}" y1="${height - chart.bottom}" x2="${width - chart.right}" y2="${height - chart.bottom}"></line>${dateLabels}<text class="baseline-label" x="${(width / 2).toFixed(1)}" y="${(height / 2).toFixed(1)}" text-anchor="middle">No 7-day data yet</text></svg>`;
  }
  const points = slots.map((item, index) => item.hasData ? { x: xFor(index), y: yFor(item.value), ...item } : null).filter(Boolean);
  const linePath = points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const areaPath = `M${points[0].x.toFixed(1)} ${height - chart.bottom} L${points.map(point => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' L')} L${points[points.length - 1].x.toFixed(1)} ${height - chart.bottom} Z`;
  const labels = points.map(point => `<text class="point-label" x="${point.x.toFixed(1)}" y="${Math.max(10, point.y - 8).toFixed(1)}" text-anchor="middle">${point.value}%</text>`).join('');
  const circles = points.map(point => `<circle class="accuracy-point" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="3.5"></circle>`).join('');
  return `<svg class="accuracy-sparkline" viewBox="0 0 ${width} ${height}" role="img" aria-label="Daily combined quiz accuracy trend for the past 7 days."><path class="accuracy-area" d="${areaPath}"></path>${grid}<line class="axis-line" x1="${chart.left}" y1="${height - chart.bottom}" x2="${width - chart.right}" y2="${height - chart.bottom}"></line><path class="accuracy-line" d="${linePath}"></path>${circles}${labels}${dateLabels}</svg>`;
}

export function streakActivityBarsHTML(dayCounts = {}, days = []) {
  days = days.length ? days.slice(-7) : Array.from({ length: 7 }, (_, i) => localDateString(addDays(new Date(), i - 6)));
  const todayKey = localDateString(new Date());
  const latestActive = [...days].reverse().find(day => Number(dayCounts?.[day]) > 0);
  const counts = days.map(day => Number(dayCounts?.[day]) || 0);
  const maxCount = Math.max(1, ...counts);
  return days.map((day, index) => {
    const count = Number(dayCounts?.[day]) || 0;
    const activeClass = count ? (day === todayKey || day === latestActive ? 'today' : 'active') : '';
    const height = Math.round(28 + (count ? count / maxCount : 0) * (index === days.length - 1 ? 67 : 56));
    const label = new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `<span class="${activeClass}" style="height:${height}px" title="${label}: ${count} completed quiz${count === 1 ? '' : 'zes'}"></span>`;
  }).join('');
}

export function streakMiniTrendHTML(dayCounts = {}, days = []) {
  days = days.length ? days.slice(-7) : Array.from({ length: 7 }, (_, i) => localDateString(addDays(new Date(), i - 6)));
  const counts = days.map(day => Number(dayCounts?.[day]) || 0);
  const maxCount = Math.max(1, ...counts);
  const width = 128, height = 66, pad = 9, base = height - 10;
  const points = counts.map((count, index) => {
    const x = pad + (index * ((width - pad * 2) / (Math.max(1, counts.length - 1))));
    const y = count ? base - (count / maxCount) * 34 : base - 6;
    return { x, y, count, index };
  });
  const path = points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const area = `M${points[0].x.toFixed(1)} ${base} L${points.map(point => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' L')} L${points[points.length - 1].x.toFixed(1)} ${base} Z`;
  const circles = points.map((point, index) => point.count ? `<circle class="streak-point ${index < points.length - 1 ? 'muted' : ''}" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${index === points.length - 1 ? 3.4 : 2.8}"></circle>` : '').join('');
  return `<svg class="streak-mini-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Recent streak activity trend"><defs><linearGradient id="streakTrendGradient" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(143,207,255,.74)"></stop><stop offset="72%" stop-color="rgba(143,207,255,.58)"></stop><stop offset="100%" stop-color="rgba(242,142,84,.94)"></stop></linearGradient></defs><path class="streak-area" d="${area}"></path><path class="streak-line" d="${path}"></path>${circles}</svg>`;
}

export function progressiveDifficultyRatios(accuracy) {
  if (accuracy < 50) return { 1: .70, 2: .25, 3: .05 };
  if (accuracy <= 75) return { 1: .40, 2: .45, 3: .15 };
  if (accuracy <= 90) return { 1: .20, 2: .50, 3: .30 };
  return { 1: .10, 2: .40, 3: .50 };
}

export function ratioTargets(count, ratios) {
  const levels = [1, 2, 3];
  const raw = levels.map(level => ({ level, value: count * (ratios[level] || 0) }));
  const targets = Object.fromEntries(raw.map(item => [item.level, Math.floor(item.value)]));
  let remaining = count - Object.values(targets).reduce((sum, value) => sum + value, 0);
  raw.sort((a, b) => (b.value - Math.floor(b.value)) - (a.value - Math.floor(a.value))).forEach(item => {
    if (remaining > 0) { targets[item.level] += 1; remaining -= 1; }
  });
  return targets;
}

export function preferredDifficultyList(count, ratios) {
  const targets = ratioTargets(count, ratios);
  return shuffle([1, 2, 3].flatMap(level => Array(targets[level] || 0).fill(level)));
}

export function difficultyFallbackOrder(level) {
  if (level === 3) return [3, 2, 1];
  if (level === 2) return [2, 1, 3];
  return [1, 2, 3];
}

export function buildTopicSlots(keys, count) {
  if (!keys.length) return [];
  const slots = [];
  while (slots.length < count) {
    for (const key of keys) {
      if (slots.length >= count) break;
      slots.push(key);
    }
  }
  return slots;
}

export function selectDiagnostic(questionRows, count) {
  const diagnostic = questionRows.filter(q => String(q.question_type || '').toLowerCase() === 'diagnostic');
  const source = diagnostic.length >= count ? diagnostic : questionRows;
  return shuffle(source).slice(0, count);
}

export function pickQuestionForTopic(rows, preferredLevel, recentQuestionIds, selectedIds, allowDuplicate = false) {
  const order = difficultyFallbackOrder(preferredLevel);
  for (const freshOnly of [true, false]) {
    for (const level of order) {
      const candidates = shuffle(rows).filter(row =>
        difficultyValue(row) === level &&
        (allowDuplicate || !selectedIds.has(row.id)) &&
        (!freshOnly || !row.id || !recentQuestionIds.has(row.id))
      );
      if (candidates.length) return candidates[0];
    }
    const anyCandidates = shuffle(rows).filter(row =>
      (allowDuplicate || !selectedIds.has(row.id)) &&
      (!freshOnly || !row.id || !recentQuestionIds.has(row.id))
    );
    if (anyCandidates.length) return anyCandidates[0];
  }
  return null;
}

export function selectProgressiveQuestions(questionRows, count, ratios, weakTopics = [], recentQuestionIds = new Set()) {
  const diagnostic = questionRows.filter(q => String(q.question_type || '').toLowerCase() === 'diagnostic');
  const source = diagnostic.length >= count && groupByTopic(diagnostic).size === groupByTopic(questionRows).size ? diagnostic : questionRows;
  const groups = groupByTopic(source);
  const allKeys = shuffle([...groups.keys()]);
  const weakKeys = weakTopics.map(topic => [topic.topic || 'General', topic.subtopic || 'General'].join('||')).filter(key => groups.has(key));
  const selected = [], selectedIds = new Set(), preferredLevels = preferredDifficultyList(count, ratios);
  const weakCount = weakKeys.length ? Math.round(count * .35) : 0;
  const mixedSlots = buildTopicSlots(allKeys, count - weakCount);
  const weakSlots = buildTopicSlots(weakKeys, weakCount);
  const slots = [...mixedSlots, ...weakSlots];
  slots.forEach((key, index) => {
    const row = pickQuestionForTopic(groups.get(key) || [], preferredLevels[index] || 1, recentQuestionIds, selectedIds, false);
    if (row) { selected.push(row); if (row.id) selectedIds.add(row.id); }
  });
  if (selected.length < count) {
    const fillSlots = buildTopicSlots(allKeys, count - selected.length);
    fillSlots.forEach((key, index) => {
      if (selected.length >= count) return;
      const row = pickQuestionForTopic(groups.get(key) || [], preferredLevels[selected.length + index] || 1, recentQuestionIds, selectedIds, false);
      if (row) { selected.push(row); if (row.id) selectedIds.add(row.id); }
    });
  }
  if (selected.length < count) {
    const fillSlots = buildTopicSlots(allKeys, count - selected.length);
    fillSlots.forEach((key, index) => {
      if (selected.length >= count) return;
      const row = pickQuestionForTopic(groups.get(key) || [], preferredLevels[selected.length + index] || 1, recentQuestionIds, selectedIds, true);
      if (row) selected.push(row);
    });
  }
  return selected.slice(0, count);
}

export function selectWeakTopicReview(questionRows, count, weakest, recentQuestionIds = new Set()) {
  const diagnostic = questionRows.filter(q => String(q.question_type || '').toLowerCase() === 'diagnostic');
  const source = diagnostic.length >= count ? diagnostic : questionRows;
  const targetWeakCount = Math.round(count * .35);
  const selected = [], selectedIds = new Set();
  const sameWeakTopic = q => weakest && q.topic === weakest.topic && (!weakest.subtopic || q.subtopic === weakest.subtopic);
  const addRows = (rows, limit) => {
    for (const row of shuffle(rows)) {
      if (selected.length >= count || selected.filter(sameWeakTopic).length >= targetWeakCount && sameWeakTopic(row) && limit === targetWeakCount) continue;
      if (row.id && selectedIds.has(row.id)) continue;
      selected.push(row);
      if (row.id) selectedIds.add(row.id);
      if (limit && selected.length >= limit) break;
    }
  };
  const weakRows = source.filter(sameWeakTopic);
  addRows(weakRows.filter(q => !recentQuestionIds.has(q.id)), targetWeakCount);
  if (selected.filter(sameWeakTopic).length < targetWeakCount) addRows(weakRows, targetWeakCount);
  const mixedNeeded = count - selected.length;
  const otherRows = source.filter(q => !sameWeakTopic(q) && (!q.id || !selectedIds.has(q.id)));
  addRows(otherRows.filter(q => !recentQuestionIds.has(q.id)), selected.length + mixedNeeded);
  if (selected.length < count) addRows(source.filter(q => !recentQuestionIds.has(q.id)), count);
  if (selected.length < count) addRows(source, count);
  return selected.slice(0, count);
}
