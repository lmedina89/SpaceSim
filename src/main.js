import { UniverseLabApp } from './app/app.js?v=148';

function syncVisualViewportHeight() {
  const vv = window.visualViewport;
  const height = Math.max(240, Math.floor(vv?.height ?? window.innerHeight));
  document.documentElement.style.setProperty('--app-height', `${height}px`);
}

syncVisualViewportHeight();
window.visualViewport?.addEventListener('resize', syncVisualViewportHeight);
window.visualViewport?.addEventListener('scroll', syncVisualViewportHeight);
window.addEventListener('resize', syncVisualViewportHeight);
window.addEventListener('orientationchange', () => setTimeout(syncVisualViewportHeight, 60));

const root = document.querySelector('#app');
const app = new UniverseLabApp(root);
app.init().catch((error) => {
  console.error(error);
  const message = document.querySelector('#message');
  if (message) {
    message.hidden = false;
    message.textContent = `Startup failed: ${error.message}`;
  }
});
