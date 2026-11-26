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

await page.goto(URL);
await page.waitForFunction(() => window.__dropRush?.state === 'menu', null, { timeout: 90000 });
await wait(1500);
const skins = await page.evaluate(() => [...document.querySelectorAll('.skin-chip')].map((b) => b.dataset.skin));
log.push(`skins in menu: ${skins.join(', ')}`);

// 1) Menu preview: front, side and back of every character.
for (const id of skins) {
  await page.click(`.skin-chip[data-skin="${id}"]`);
  for (const [label, angle] of [['face', 0], ['profil', Math.PI / 2], ['dos', Math.PI]]) {
    await page.evaluate((a) => {
      const g = window.__dropRush;
      g.menuSpin = a;
      g.menuSpinPause = 1e9;
    }, angle);
    await wait(500);
    await shot(`menu-${id}-${label}`);
  }
}

// 2) The five characters seen from 15 m in the training map (front and back).
await page.evaluate(() => window.__dropRush.startTraining());
await wait(1500);
await page.evaluate(() => {
  const g = window.__dropRush;
  g.pause();
  document.getElementById('ui-root').style.display = 'none';
});
for (const id of skins) {
  for (const [label, turn] of [['face', 0], ['dos', Math.PI]]) {
    await page.evaluate(({ id, turn }) => {
      const g = window.__dropRush;
      g.player.setSkin(id);
      const p = g.player.position;
      const yaw = g.player.facingYaw;
      g.player.model.root.rotation.y = yaw + turn;
      const cam = g.engine.camera;
      cam.fov = 75;
      cam.clearViewOffset();
      cam.position.set(p.x + Math.sin(yaw) * 15, p.y + 1.6, p.z + Math.cos(yaw) * 15);
      cam.lookAt(p.x, p.y + 1.0, p.z);
      cam.updateProjectionMatrix();
    }, { id, turn });
    await wait(400);
    await shot(`15m-${id}-${label}`);
  }
}

// 3) Third-person view with a weapon in hand.
await page.evaluate(() => {
  const g = window.__dropRush;
  document.getElementById('ui-root').style.display = '';
  g.player.setSkin('ninja_bleu');
  g.player.loadout.pickWeapon({ uid: 'capture', id: 'assaultRifle', mag: 30, reserve: 120 });
  g.resume();
});
await wait(1500);
await shot('jeu-vue-epaule');

// 4) Side view of the character holding the rifle (idle and after a shot).
for (const [label, stance] of [['repos', false], ['tir', true]]) {
  if (stance) {
    await page.evaluate(() => window.__dropRush.player.onShot());
    await wait(250); // let the animator reach the shooting pose
  }
  await page.evaluate(() => {
    const g = window.__dropRush;
    g.pause();
    document.getElementById('ui-root').style.display = 'none';
    const p = g.player.position;
    const yaw = g.player.facingYaw + Math.PI / 2;
    const cam = g.engine.camera;
    cam.fov = 50;
    cam.position.set(p.x + Math.sin(yaw) * 3.2, p.y + 1.1, p.z + Math.cos(yaw) * 3.2);
    cam.lookAt(p.x, p.y + 0.9, p.z);
    cam.updateProjectionMatrix();
  });
  await wait(300);
  await shot(`arme-profil-${label}`);
  await page.evaluate(() => {
    document.getElementById('ui-root').style.display = '';
    window.__dropRush.resume();
  });
  await wait(200);
}

const info = await page.evaluate(() => {
  const g = window.__dropRush;
  const gl = g.engine.renderer.getContext();
  return {
    webgl2: gl instanceof WebGL2RenderingContext,
    renderer: gl.getParameter(gl.RENDERER),
    drawCalls: g.engine.drawCalls,
    triangles: g.engine.triangles,
    characterTriangles: g.player.model.triangles,
  };
});
log.push(`render: ${JSON.stringify(info)}`);
writeFileSync(`${out}/log.txt`, `${log.join('\n')}\n`);
console.log(log.join('\n'));
await browser.close();
