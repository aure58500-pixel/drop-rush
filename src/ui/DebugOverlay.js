// Screen diagnostics, enabled with ?debug=1. Shows how the browser reports the
// viewport, the safe areas and the canvas, and paints the page background
// magenta so any uncovered strip of the screen is obvious.
export function mountDebugOverlay() {
  document.documentElement.style.background = '#ff00ff';

  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;'
    + 'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);';
  document.body.appendChild(probe);

  const panel = document.createElement('pre');
  panel.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9999;margin:0;padding:8px 10px;'
    + 'font:11px/1.35 ui-monospace,Menlo,monospace;color:#7CFC00;background:rgba(0,0,0,.82);'
    + 'border-radius:8px;pointer-events:none;white-space:pre;max-width:96vw;';
  document.body.appendChild(panel);

  const frame = document.createElement('div');
  frame.style.cssText = 'position:fixed;inset:0;z-index:9998;border:3px solid #00e5ff;pointer-events:none;box-sizing:border-box;';
  document.body.appendChild(frame);

  const px = (v) => `${Math.round(v * 10) / 10}`;
  const rect = (el) => {
    if (!el) return 'absent';
    const r = el.getBoundingClientRect();
    return `x${px(r.left)} y${px(r.top)} ${px(r.width)}x${px(r.height)}`;
  };

  function update() {
    const cs = getComputedStyle(probe);
    const vv = window.visualViewport;
    const canvas = document.getElementById('game-canvas');
    const meta = document.querySelector('meta[name="viewport"]')?.content || '';
    panel.textContent = [
      `fenetre   ${window.innerWidth}x${window.innerHeight}  client ${document.documentElement.clientWidth}x${document.documentElement.clientHeight}`,
      `ecran     ${screen.width}x${screen.height}  dpr ${window.devicePixelRatio}`,
      `visual    ${vv ? `${px(vv.width)}x${px(vv.height)} off ${px(vv.offsetLeft)},${px(vv.offsetTop)} scale ${vv.scale}` : 'n/a'}`,
      `securite  H${cs.paddingTop} D${cs.paddingRight} B${cs.paddingBottom} G${cs.paddingLeft}`,
      `canvas    ${rect(canvas)} buf ${canvas?.width}x${canvas?.height}`,
      `body      ${rect(document.body)}`,
      `ui-root   ${rect(document.getElementById('ui-root'))}`,
      `scroll    ${window.scrollX},${window.scrollY}`,
      `standalone ${window.matchMedia('(display-mode: standalone)').matches}`,
      `env()     ${CSS.supports('padding: env(safe-area-inset-left)')}`,
      `meta      ${meta}`,
      `UA        ${navigator.userAgent}`,
    ].join('\n');
  }

  update();
  setInterval(update, 500);
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', () => setTimeout(update, 300));
}
