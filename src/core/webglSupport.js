// WebGL 2 detection and full-screen error messages (French UI).
export function isWebGL2Available() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    const ok = Boolean(gl);
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return ok;
  } catch {
    return false;
  }
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function showFatalScreen(title, message, details = '') {
  document.getElementById('boot-loader')?.remove();
  const el = document.createElement('div');
  el.className = 'fatal-screen';
  el.innerHTML = `
    <div class="fatal-card">
      <div class="logo logo-small"><span>DROP</span><span>RUSH</span></div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
      ${details ? `<pre>${escapeHtml(details)}</pre>` : ''}
      <button class="btn btn-primary" onclick="location.reload()">Recharger</button>
    </div>`;
  document.body.appendChild(el);
}

export function showWebGLUnsupported() {
  showFatalScreen(
    'WebGL 2 non disponible',
    "Votre navigateur ou votre carte graphique ne prend pas en charge WebGL 2, indispensable pour Drop Rush. "
    + 'Mettez à jour Chrome, Firefox, Edge ou Safari, activez l’accélération matérielle dans les paramètres du navigateur, puis réessayez.',
  );
}
