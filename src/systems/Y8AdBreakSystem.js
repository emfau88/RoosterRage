/** Scene-scoped pause ownership; the portal owns the session-wide ad interval. */
export class Y8AdBreakSystem {
  constructor(scene, portal) {
    this.scene = scene;
    this.portal = portal;
    this.pending = false;
    this.playing = false;
    this.destroyed = false;
  }

  async run(type, name) {
    if (this.pending || this.destroyed) return;
    this.pending = true;
    // Lock only our controls, never the separate SDK advertisement UI.
    const controls = [this.scene.hud.root, this.scene.hud.overlay, this.scene.hud.joystick];
    const previousInert = controls.map(element => element?.inert);
    controls.forEach(element => { if (element) element.inert = true; });
    try {
      await this.portal.requestAd({ type, name,
        beforeAd: () => {
          if (this.destroyed) return;
          this.playing = true;
          this.scene.gamePause.request('y8-ad');
          this.previousInputEnabled = this.scene.input.enabled;
          this.scene.input.enabled = false;
          this.previousMute = this.scene.sound.mute;
          this.audioContextWasRunning = this.scene.sound.context?.state === 'running';
          this.scene.sound.setMute(true);
          this.pausedSounds = this.scene.sound.sounds.filter(sound => sound.isPlaying);
          this.pausedSounds.forEach(sound => sound.pause());
        },
        afterAd: () => this.resume()
      });
    } finally {
      this.resume();
      controls.forEach((element, index) => { if (element) element.inert = previousInert[index]; });
      this.pending = false;
      if (!this.destroyed && globalThis.document?.hidden) this.scene.handleFocusLost(true);
    }
  }

  resume() {
    if (!this.playing) return;
    this.playing = false;
    this.scene.input.enabled = this.previousInputEnabled;
    this.scene.sound.setMute(this.previousMute);
    const context = this.scene.sound.context;
    if (this.audioContextWasRunning && !globalThis.document?.hidden
      && context && ['suspended', 'interrupted'].includes(context.state)) {
      Promise.resolve(context.resume()).catch(() => {});
    }
    this.pausedSounds.forEach(sound => {
      if (sound.manager && sound.isPaused) sound.resume();
    });
    this.scene.gamePause.release('y8-ad');
  }

  destroy() {
    this.destroyed = true;
    if (this.pending) this.portal.pendingAd?.cancel();
    this.resume();
  }
}
