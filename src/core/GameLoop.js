// requestAnimationFrame loop with a capped delta time.
export class GameLoop {
  constructor({ update, render, maxDeltaTime }) {
    this.update = update;
    this.render = render;
    this.maxDeltaTime = maxDeltaTime;
    this.running = false;
    this.lastTime = 0;
    this.elapsed = 0;
    this._frame = this._frame.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.handle = requestAnimationFrame(this._frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.handle);
  }

  _frame(now) {
    if (!this.running) return;
    const dt = Math.min(Math.max((now - this.lastTime) / 1000, 0), this.maxDeltaTime);
    this.lastTime = now;
    this.elapsed += dt;
    // Schedule first: a bug in one frame must not freeze the whole game.
    this.handle = requestAnimationFrame(this._frame);
    try {
      this.update(dt, this.elapsed);
      this.render(dt);
    } catch (error) {
      if (now - (this.lastErrorTime || 0) > 2000) {
        this.lastErrorTime = now;
        console.error('Erreur dans la boucle de jeu :', error);
      }
      this.onError?.(error);
    }
  }
}
