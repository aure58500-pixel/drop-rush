// Screenshots of the real WebGL rendering, taken by the pull request workflow.
// Usage: node .github/scripts/capture.mjs <output-dir> (dev server on :5173).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = process.argv[2] || 'screenshots';
mkdirSync(out, { recursive: true });
const URL = 'http://localhost:5173/drop-rush/';
const log = [];

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`));
const shot = (name) => page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 82 });
const wait = (ms) => page.waitForTimeout(ms);

const t0 = Date.now();
await page.goto(URL);
await page.waitForFunction(() => window.__dropRush?.state === 'menu', null, { timeout: 90000 });
log.push(`first load (page + default map, software WebGL): ${Date.now() - t0} ms`);
await wait(1000);

// Camera views per map: [name, camera polar (deg, r, y), target polar (deg, r, y)].
const VIEWS = {
  ile: [
    ['vue-ensemble', [180, 560, 430], [0, 0, 0], 50],
    ['couronne-pont-sud', [180, 152, 4], [0, 0, 3], 65],
    ['tour-grue', [40, 186, 7], [44, 245, 12], 65],
    ['burger-heliport', [108, 186, 6], [108, 232, 5], 65],
    ['hangar-conteneurs', [318, 192, 7], [318, 250, 4], 65],
    ['cascades', [180, 395, 14], [180, 345, -4], 60],
  ],
  canaux: [
    ['vue-ensemble', [180, 480, 380], [0, 0, 0], 50],
    ['fontaine-pont', [180, 96, 5], [0, 0, 2], 65],
    ['trampoline-canal', [0, 92, 6], [22, 88, 0], 65],
    ['chateau-eau-horloge', [0, 168, 6], [0, 222, 12], 65],
    ['immeubles-heliport', [45, 175, 8], [45, 228, 9], 65],
  ],
  'cite-ruines': [
    ['vue-ensemble', [180, 560, 430], [0, 0, 0], 50],
    ['porte-sud', [180, 362, 7], [180, 315, 3], 65],
    ['ruines', [262, 118, 7], [270, 160, 3], 65],
    ['heliport-est', [102, 112, 8], [102, 152, 5], 65],
    ['burger-tour', [322, 110, 6], [325, 175, 8], 65],
    ['garage-conteneurs', [8, 140, 6], [10, 190, 4], 65],
  ],
};

const maps = await page.evaluate(() => [...document.querySelectorAll('.map-tile')].map((t) => t.dataset.map));
log.push(`maps in menu: ${maps.join(', ')}`);
for (const id of maps) {
  const s0 = Date.now();
  await page.click(`.map-tile[data-map="${id}"]`);
  await page.waitForFunction((id) => window.__dropRush.mapId === id && !window.__dropRush.mapSwitching, id, { timeout: 60000 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const switchMs = Date.now() - s0;
  await wait(600);
  await shot(`${id}-menu`);
  await page.evaluate(() => window.__dropRush.startTraining());
  await wait(1200);
  await shot(`${id}-jeu`);
  await page.evaluate(() => {
    const g = window.__dropRush;
    g.pause();
    document.getElementById('ui-root').style.display = 'none';
  });
  for (const [name, cam, target, fov] of VIEWS[id] || []) {
    const info = await page.evaluate(({ cam, target, fov }) => {
      const g = window.__dropRush;
      const P = ([a, r, y]) => [Math.sin((a * Math.PI) / 180) * r, y, -Math.cos((a * Math.PI) / 180) * r];
      const c = g.engine.camera;
      const [cx, cy, cz] = P(cam);
      const [tx, ty, tz] = P(target);
      c.fov = fov;
      c.clearViewOffset();
      c.position.set(cx, cy, cz);
      c.lookAt(tx, ty, tz);
      c.updateProjectionMatrix();
      g.engine.render();
      return { calls: g.engine.drawCalls, triangles: g.engine.triangles };
    }, { cam, target, fov });
    await wait(250);
    await shot(`${id}-${name}`);
    log.push(`${id} ${name}: ${info.triangles} triangles, ${info.calls} draw calls`);
  }
  const stats = await page.evaluate(() => {
    const g = window.__dropRush;
    return { buildMs: Math.round(g.map.stats.buildMs), mapTriangles: g.map.stats.triangles, loot: g.map.layout.loot.length, spawns: g.map.layout.spawnPoints.length };
  });
  log.push(`${id}: map switch ${switchMs} ms (generation + meshes ${stats.buildMs} ms), ${stats.mapTriangles} triangles in total, ${stats.loot} loot points, ${stats.spawns} spawn points`);
  await page.evaluate(() => {
    document.getElementById('ui-root').style.display = '';
    window.__dropRush.quitToMenu();
  });
  await wait(300);
}

const gl = await page.evaluate(() => {
  const ctx = window.__dropRush.engine.renderer.getContext();
  return { webgl2: ctx instanceof WebGL2RenderingContext, renderer: ctx.getParameter(ctx.RENDERER) };
});
log.push(`renderer: ${JSON.stringify(gl)}`);
writeFileSync(`${out}/log.txt`, `${log.join('\n')}\n`);
console.log(log.join('\n'));
await browser.close();
