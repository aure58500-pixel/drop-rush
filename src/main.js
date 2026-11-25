import './styles/main.css';
import { isWebGL2Available, showFatalScreen, showWebGLUnsupported } from './core/webglSupport.js';

const loader = document.getElementById('boot-loader');
const bar = loader?.querySelector('.boot-progress i');
const label = loader?.querySelector('.boot-label');

function setProgress(value, text) {
  if (bar) bar.style.width = `${Math.round(value * 100)}%`;
  if (label && text) label.textContent = text;
}

async function boot() {
  if (new URLSearchParams(window.location.search).has('debug')) {
    const { mountDebugOverlay } = await import('./ui/DebugOverlay.js');
    mountDebugOverlay();
  }
  if (!isWebGL2Available()) {
    showWebGLUnsupported();
    return;
  }
  try {
    setProgress(0.02, 'Chargement du moteur…');
    const { Game } = await import('./core/Game.js');
    const game = new Game({
      canvas: document.getElementById('game-canvas'),
      uiRoot: document.getElementById('ui-root'),
    });
    await game.init(setProgress);
    loader?.classList.add('done');
    setTimeout(() => loader?.remove(), 600);
    if (import.meta.env.DEV) window.__dropRush = game;
  } catch (error) {
    console.error(error);
    showFatalScreen('Erreur de chargement', 'Le jeu n’a pas pu démarrer. Rechargez la page ; si le problème persiste, essayez un autre navigateur.', error?.message || String(error));
  }
}

boot();
