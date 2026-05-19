import { state } from './state.js';
import { streakValueHTML } from './utils.js';

export const view = document.getElementById('view');
export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let _navigate = () => {};
let _toast = () => {};
export function setNavigate(fn) { _navigate = fn; }
export function setToast(fn) { _toast = fn; }
export function navigate(page) { _navigate(page); }
export function toast(message) { _toast(message); }

export function activePage() {
  return document.querySelector('.nav-btn.active')?.dataset.page || '';
}

export function startPageRender(page) {
  return { page, token: ++state.appRenderToken };
}

export function isCurrentRender(render) {
  return Boolean(render && render.token === state.appRenderToken && activePage() === render.page);
}

export function animateSurface(root = view) {
  if (reducedMotion.matches) return;
  if (state.surfaceAnimationFrame) cancelAnimationFrame(state.surfaceAnimationFrame);
  if (root === view) {
    view.classList.remove('motion-swap');
    view.classList.add('motion-swap');
  }
  state.surfaceAnimationFrame = requestAnimationFrame(() => {
    const targets = [...root.querySelectorAll('.hero-card,.placeholder,.test-card,.quiz-resume,.dashboard-right,.friends-shell,.friend-card,.panel,.reader,.quiz-side,.quiz-main,.question,.setup-modal,.score-modal,.profile-onboarding-card,.daily-dash-shell,.daily-challenge-hero,.daily-stat-grid article,.daily-preview-card,.daily-leader-preview,.daily-streak-card,.daily-complete-card,.daily-complete-stat,.leader-card,.leader-table-card,.leader-table-row')];
    const questionTargets = targets.filter(el => el.classList.contains('question'));
    const surfaceTargets = targets.filter(el => !el.classList.contains('question'));
    const animationTargets = [...surfaceTargets, ...questionTargets.slice(0, 6)].slice(0, 16);
    animationTargets.forEach((el, i) => {
      el.getAnimations().forEach(animation => animation.cancel());
      el.animate(
        [{ opacity: 0, transform: 'translate3d(0,8px,0) scale(.997)' }, { opacity: 1, transform: 'translate3d(0,0,0) scale(1)' }],
        { duration: 200, delay: Math.min(i * 14, 84), easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' }
      );
    });
    state.surfaceAnimationFrame = 0;
  });
}

export function setMotionText(el, value) {
  if (!el || el.textContent === String(value)) return;
  el.textContent = value;
  if (reducedMotion.matches) return;
  el.classList.remove('motion-number');
  void el.offsetWidth;
  el.classList.add('motion-number');
}

export function setStreakCardValue(el, days = 0) {
  if (!el) return;
  const count = Number(days) || 0;
  if (el.dataset.streakDays === String(count)) return;
  el.dataset.streakDays = String(count);
  el.innerHTML = streakValueHTML(count);
  if (reducedMotion.matches) return;
  el.classList.remove('motion-number');
  void el.offsetWidth;
  el.classList.add('motion-number');
}

export function popElement(el) {
  if (!el || reducedMotion.matches) return;
  el.animate([{ transform: 'scale(.985)' }, { transform: 'scale(1)' }], { duration: 180, easing: 'cubic-bezier(.25,1,.5,1)' });
}
