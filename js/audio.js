

/* ===========================================================
   audio.js  – Simple sound manager for Super Cobra Remake
   -----------------------------------------------------------
   • Add your audio files in assets/audio/
   • One entry per gameplay event (see `clips` map below)
   • Use  playSound('eventName')  anywhere in the game code.
   -----------------------------------------------------------
   You can also mute/un‑mute or change volume globally:
     window.muteSound()
     window.unmuteSound()
     window.setSoundVolume(0.5)   // 0 – 1
   =========================================================== */

(function () {
  /* ----------------------------------------------------------------
     1. List of event → filename  (put files in assets/audio/)
     ---------------------------------------------------------------- */
  const audioPath = 'assets/audio/';
  // Extrait à remplacer DANS LES DEUX FICHIERS
  const clips = {
    laser            : 'laser.mp3',
    bomb_drop        : 'bomb_drop.mp3',
    bomb_explode     : 'bomb_explode.mp3',
    missile_explode  : 'missile-explode.mp3',  // note le tiret
    missile_fire     : 'missile_fire.mp3',     // ajoute ce fichier ou laisse le fallback
    missile_launch   : 'missile_launch.mp3',
    hit_enemy        : 'hit_enemy.mp3',
    hit_turret       : 'hit_turret.mp3',
    heli_hit         : 'heli_hit.mp3',
    heli_crash       : 'heli_crash.mp3',
    pickup           : 'pickup.mp3',
    reload           : 'reload.mp3',
    menu_click       : 'menu_click.mp3',
    game_over        : 'game_over.mp3',
  };

  /* ----------------------------------------------------------------
     2. Pre‑load Audio objects
     ---------------------------------------------------------------- */
  const sounds = {};
  for (const key in clips) {
    const a = new Audio(audioPath + clips[key]);
    a.preload = 'auto';
    sounds[key] = a;
  }

  /* ----------------------------------------------------------------
     Fallback tone generator when a clip is missing
     ---------------------------------------------------------------- */
  function beep(type='square', duration=0.15, freq=880) {
    if (muted) return;
    const ctxA = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctxA.createOscillator();
    const gain = ctxA.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctxA.destination);
    const t0 = ctxA.currentTime;
    gain.gain.setValueAtTime(0.25 * masterVolume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  /* ----------------------------------------------------------------
     3. Simple interface
     ---------------------------------------------------------------- */
  let masterVolume = 0.7;
  let muted = false;

  /**
   * Play a sound by event name.
   * @param {string} name - Must be a key of the `clips` map.
   */
  function playSound(name) {
    if (muted) return;
    const base = sounds[name];
    if (!base) {
      console.warn('[audio] missing clip, fallback beep:', name);
      beep('sawtooth');
      return;
    }
    const s = base.cloneNode();
  
    // Applique un volume réduit pour les sons de missile
    if (name === 'missile_launch' || name === 'missile_fire') {
      s.volume = masterVolume * 0.2;
    } else {
      s.volume = masterVolume;
    }
  
    s.play().catch(() => {});
  }

  /* ---- Volume controls ---- */
  function setSoundVolume(v) { masterVolume = Math.max(0, Math.min(1, v)); }
  function muteSound()        { muted = true;  }
  function unmuteSound()      { muted = false; }

  /* ----------------------------------------------------------------
     4. Expose helpers globally
     ---------------------------------------------------------------- */
  window.playSound        = playSound;
  window.setSoundVolume   = setSoundVolume;
  window.muteSound        = muteSound;
  window.unmuteSound      = unmuteSound;
})();