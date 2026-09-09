import { UniverseLabApp } from './app/app.js';

const root = document.querySelector('#app');
const app = new UniverseLabApp(root);
app.init().catch((error) => {
  console.error(error);
  const message = document.querySelector('#message');
  if (message) message.textContent = `Startup failed: ${error.message}`;
});
