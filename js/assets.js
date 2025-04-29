const assets = {};

function loadAssets() {
  return new Promise((resolve) => {
  // Extrait à remplacer DANS LES DEUX FICHIERS
  const audioClips = {
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
    let needed = 10 + Object.keys(audioClips).length; // total assets to load
    let loaded = 0;                 // counter for loaded assets

    assets.gameOver = new Image();
    assets.gameOver.src = 'assets/gameover.png';
    assets.gameOver.onload = () => { if (++loaded >= needed) resolve(); };
    assets.gameOver.onerror = () => { assets.gameOver = null; if (++loaded >= needed) resolve(); };

    assets.heli = new Image();
    assets.heli.src = 'assets/heli.png';
    assets.heli.onload = () => { if (++loaded >= needed) resolve(); };
    assets.heli.onerror = () => { assets.heli = null; if (++loaded >= needed) resolve(); };

    // Load fuel sprite
    assets.fuel = new Image();
    assets.fuel.src = 'assets/fuel.png';
    assets.fuel.onload = () => { if (++loaded >= needed) resolve(); };
    assets.fuel.onerror = () => { assets.fuel = null; if (++loaded >= needed) resolve(); };

    // Load heart sprite
    assets.heart = new Image();
    assets.heart.src = 'assets/heart.png';
    assets.heart.onload = () => { if (++loaded >= needed) resolve(); };
    assets.heart.onerror = () => { assets.heart = null; if (++loaded >= needed) resolve(); };

    // Load enemy sprite
    assets.enemy = new Image();
    assets.enemy.src = 'assets/enemy.png';
    assets.enemy.onload = () => { if (++loaded >= needed) resolve(); };
    assets.enemy.onerror = () => { assets.enemy = null; if (++loaded >= needed) resolve(); };

    // Load bomb sprite
    assets.bomb = new Image();
    assets.bomb.src = 'assets/bomb.png';
    assets.bomb.onload = () => { if (++loaded >= needed) resolve(); };
    assets.bomb.onerror = () => { assets.bomb = null; if (++loaded >= needed) resolve(); };

    // Load bomb collectible icon
    assets.bombCollectibleIcon = new Image();
    assets.bombCollectibleIcon.src = 'assets/bomb_collectible.png';
    assets.bombCollectibleIcon.onload = () => { if (++loaded >= needed) resolve(); };
    assets.bombCollectibleIcon.onerror = () => { assets.bombCollectibleIcon = null; if (++loaded >= needed) resolve(); };

    assets.explosion = new Image();
    assets.explosion.src = 'assets/explosion.png';
    assets.explosion.onload = () => {
      // Assuming explosion.png is a horizontal sprite sheet of 5 frames
      assets.explosionFrameCount = 5;
      assets.explosionFrameWidth = assets.explosion.naturalWidth / assets.explosionFrameCount;
      assets.explosionFrameHeight = assets.explosion.naturalHeight;
      if (++loaded >= needed) resolve();
    };
    assets.explosion.onerror = () => { assets.explosion = null; if (++loaded >= needed) resolve(); };

    // Load homing missile sprite
    assets.homingMissile = new Image();
    assets.homingMissile.src = 'assets/homing_missile.png';
    assets.homingMissile.onload = () => { if (++loaded >= needed) resolve(); };
    assets.homingMissile.onerror = () => { assets.homingMissile = null; if (++loaded >= needed) resolve(); };

    // Load turret sprite
    assets.turret = new Image();
    assets.turret.src = 'assets/turret.png';
    assets.turret.onload = () => { if (++loaded >= needed) resolve(); };
    assets.turret.onerror = () => { assets.turret = null; if (++loaded >= needed) resolve(); };
    // --- Pre-load audio with mp3→wav fallback to suppress 404 errors ---
    assets.sounds = {};
    for (const key in audioClips) {
      const baseName = audioClips[key].replace(/\.(mp3|wav)$/, '');
      let triedWav = false;
      const a = new Audio();
      a.preload = 'auto';

      function finalizeLoad() {
        if (++loaded >= needed) resolve();
      }

      a.oncanplaythrough = () => {
        assets.sounds[key] = a;
        finalizeLoad();
      };

      a.onerror = () => {
        if (!triedWav) {
          triedWav = true;
          a.src = 'assets/audio/' + baseName + '.wav';
        } else {
          console.warn(`[audio] failed to load: ${baseName}.mp3 and .wav`);
          assets.sounds[key] = null;
          finalizeLoad();
        }
      };

      // start loading .mp3 first
      a.src = 'assets/audio/' + baseName + '.mp3';
      assets.sounds[key] = a;
    }
  });
}