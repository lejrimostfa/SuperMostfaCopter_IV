const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Disable smoothing on all browsers
ctx.imageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;
ctx.msImageSmoothingEnabled = false;
// Title screen logic removed
let paused = true;
// Bomb cooldown timer (seconds)

let bombCooldown = 0;

// Homing reactivity of turret missiles: 0 = pas de correction, 1 = visée instantanée
const homingWeight = 0.01;

const input = { up: false, down: false, left: false, right: false };
const bullets = [];
const bombs = [];

const explosions = [];
let shakeTimer = 0;
const hitFlashes = [];

// Damage text floating numbers
const damageTexts = [];

// Turrets and their missiles

// Initialize bomb stock from settings
bombStock = window.bombStock;
// maxBombStock is a global var defined in settings.js


let lastTs = 0;
let score = 0;
let highScores = JSON.parse(localStorage.getItem('highScores') || '[]');
let gameOverHandled = false;
let gameOverOpacity = 0;
// Accumulate score based on time survived
let timeScoreAccumulator = 0;

const pauseBtn = document.getElementById('pauseRestartButton');
if (restartButton) restartButton.addEventListener('click', () => restartGame(true));
if (pauseBtn) pauseBtn.addEventListener('click', () => restartGame(true));

window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowUp' || e.code === 'KeyW') input.up = true;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') input.down = true;
  if (e.code === 'ArrowLeft') input.left = true;
  if (e.code === 'ArrowRight') input.right = true;
  if (e.code === 'Space' || e.code === 'KeyZ') fireBullet();
  if (e.code === 'KeyX') dropBomb();
  if (e.code === 'Enter' && !heli.alive) location.reload();
  if (e.code === 'KeyP') {
    paused = !paused;
    const pm = document.getElementById('pauseMenu');
    pm.style.display = paused ? 'flex' : 'none';
  }
  // Keyboard shortcut: R to reset game settings
  if (e.code === 'KeyR') {
    console.log('🧹 Resetting localStorage and reloading...');
    localStorage.removeItem('gameSettings');
    location.reload();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowUp' || e.code === 'KeyW') input.up = false;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') input.down = false;
  if (e.code === 'ArrowLeft') input.left = false;
  if (e.code === 'ArrowRight') input.right = false;
});

function fireBullet() {
  playSound('laser');
  if (!heli.alive) return;
  const displayW = 16;
  let displayH;
  if (assets.heli) {
    const origW = assets.heli.naturalWidth || assets.heli.width;
    const origH = assets.heli.naturalHeight || assets.heli.height;
    displayH = displayW * (origH / origW) * 2;
  } else {
    displayH = displayW * 2;
  }
  // Adjust bullet spawn position and direction based on heli.facing
  const offsetX = heli.facing < 0 ? -2 : displayW;
  bullets.push({
    x: heli.x + offsetX,
    y: heli.y + displayH / 2 - 10,
    vx: laserSpeed * heli.facing
  });
}

function dropBomb() {
    if (!heli.alive || bombStock <= 0 || bombCooldown > 0) return;
    playSound('bomb_drop'); 
    bombStock--;
    window.bombStock = bombStock;
    const displayW = 16;
    const offsetX = heli.facing < 0 ? -2 : displayW - 2;
    bombs.push({
    x: heli.x + offsetX,
    y: heli.y + 12,
    vx: bombForwardSpeed * heli.facing,
    vy: 0
  });
  bombCooldown = 1.0; // 1 second cooldown
}

function restartGame(skipTitle = true) {
    localStorage.setItem('skipTitleScreen', skipTitle ? 'true' : 'false');
    location.reload();
  }

function drawHUD() {
  // Display current score
  ctx.fillStyle = '#FFF';
  ctx.font = '8px monospace';
  ctx.textAlign = 'start';
  ctx.fillText('Score: ' + score, 4, 16);
  const barW = 152;
  const x0 = (canvas.width - barW) / 2;
  ctx.fillStyle = '#333';
  ctx.fillRect(x0, 4, barW, 24);
  // Fuel bar (green)
  ctx.fillStyle = '#0F0';
  const fuelWidth = (heli.fuel / fuelQuantity) * barW;
  ctx.fillRect(x0, 4, fuelWidth, 4);
  // HP bar (red), below fuel
  ctx.fillStyle = '#F00';
  const maxHP = 30;
  const clampedHP = Math.min(heli.hitPoints, maxHP);
  const hpWidth = (clampedHP / maxHP) * barW;
  ctx.fillRect(x0, 10, hpWidth, 4);  // Bomb stock icons, stacked left-to-right and fitted to barW
  if (bombStock > 0) {
    const iconSize = 14;  // fixed height
    const yIcon = 4 + (24 - iconSize);
    // Compute horizontal spacing based on maxBombStock to prevent overflow
    const spacing = barW / maxBombStock;
    for (let i = 0; i < bombStock; i++) {
      const bx = x0 + i * spacing;
      if (assets.bomb) {
        ctx.drawImage(assets.bomb, bx, yIcon, iconSize, iconSize);
      } else {
        ctx.fillStyle = '#00F';
        ctx.fillRect(bx, yIcon, iconSize, iconSize);
      }
    }
  }
  ctx.textAlign = 'start';
}

function loop(ts) {
  console.log('loop running, scrollX=', scrollX);

  if (paused) {
      requestAnimationFrame(loop);
      return;
    }
  // Time-based scoring with position-based multiplier
  if (lastTs > 0 && heli && heli.alive) {
    timeScoreAccumulator += (ts - lastTs);
    const zoneSize = canvas.width / 5;
    const zoneIndex = Math.min(4, Math.floor(heli.x / zoneSize));
    const multiplier = zoneIndex + 1;
    while (timeScoreAccumulator >= 1000) {
      score += multiplier;
      timeScoreAccumulator -= 1000;
    }
  }
  const deltaReal = lastTs > 0 ? (ts - lastTs) / 1000 : 0;
  const dt = (ts - lastTs) / 16.6667;
  // Decrement bomb cooldown timer
  if (bombCooldown > 0) bombCooldown -= dt / 60;
  lastTs = ts;

  if (shakeTimer > 0) {
    shakeTimer -= deltaReal;
    const shakeX = (Math.random() - 0.5) * 10;
    const shakeY = (Math.random() - 0.5) * 10;
    ctx.save();
    ctx.translate(shakeX, shakeY);
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  scrollX += scrollSpeed * dt;

  // Turret firing logic (spawn missiles)
  const worldHeliX = scrollX + heli.x;
  const worldHeliY = heli.y;
  turrets.forEach(t => {
    if (t.cooldown === undefined) t.cooldown = 1; // initialiser si absent
    t.cooldown -= deltaReal;

    const sx = t.x - scrollX;
    if (sx < -64 || sx > canvasElement.width + 64) {
      // tourelle hors écran, ne tire pas
      return;
    }

    if (t.cooldown <= 0) {
      const angle = Math.atan2(worldHeliY - t.y, worldHeliX - t.x);
      turretMissiles.push({
        x: t.x,
        y: t.y - 32,
        angle: angle,
        speed: 0.01
      });
      playSound('missile_launch');
      t.cooldown = window.turretMissileCooldown;
    }
  });

  // === ENEMY UPDATE ===
  for (const e of enemies) {
    e.update(dt);
  }
  for (const b of enemyBullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  // Remove enemy bullets that hit the terrain
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    const tx = ((Math.floor(b.x) % TERRAIN_WIDTH) + TERRAIN_WIDTH) % TERRAIN_WIDTH;
    if (b.y <= terrainTop[tx] || b.y >= terrainBottom[tx]) {
      enemyBullets.splice(i, 1);
    }
  }
  // Collision enemy bullets vs helicopter (using screen coordinates)
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    const bx = b.x - scrollX; // world to screen
    if (Math.abs(bx - heli.x) < 8 && Math.abs(b.y - heli.y) < 8) {
        playSound('hit_enemy');

        heli.hitPoints--;
        hitFlashes.push({
            x: heli.x + 8,
            y: heli.y + 4,
            startTime: performance.now(),
            duration: 100,
            radius: 20,
            color: 'red'
        });

      if (window.showDamageText) {
          damageTexts.push({
              x: heli.x + 8,
              y: heli.y + 4,
              text: `-1`,
              startTime: performance.now(),
              duration: 1000
            });
      }
      
      shakeTimer = 0.05;
      if (heli.hitPoints <= 0) {
          heli.alive = false;
        }
      enemyBullets.splice(i, 1);
    }
  }

  // Collision player bullets vs enemies
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (Math.abs(b.x - e.x + scrollX) < 12 && Math.abs(b.y - e.y) < 12) {
        bullets.splice(i, 1);
        playSound('hit_enemy');

        hitFlashes.push({
          x: b.x,
          y: b.y,
          startTime: performance.now(),
          duration: 100,
          radius: 20,
        });

        if (window.showDamageText) {
          damageTexts.push({
            x: e.x - scrollX,
            y: e.y,
            text: `-1`,
            startTime: performance.now(),
            duration: 1000
          });
        }
        if (e.takeDamage()) {
          enemies.splice(j, 1);
        }
        break;
      }
    }
    // Collision player bullets vs turrets
    for (let j = turrets.length - 1; j >= 0; j--) {
      const t = turrets[j];
      const tx = t.x - scrollX;
      const turretTop = t.y - 64 + 10;
      const turretBottom = t.y + 10;
      if (b.x >= tx - 16 && b.x <= tx + 16 && b.y >= turretTop && b.y <= turretBottom) {
        t.hitPoints--;
        playSound('bomb_explode');
        if (window.showDamageText) {
          damageTexts.push({
            x: t.x - scrollX,
            y: t.y,
            text: `-1`,
            startTime: performance.now(),
            duration: 1000
          });
        }
        if (t.hitPoints <= 0) turrets.splice(j, 1);
        bullets.splice(i, 1);
        // Visual feedback
        hitFlashes.push({ x: b.x, y: b.y, startTime: performance.now(), duration: 100, radius: 20, color: 'red' });
        shakeTimer = 0.05;
        break;
      }
    }
  }

  heli.update(dt);

  // Draw and handle bomb collectibles
  for (let i = bombCollectibles.length - 1; i >= 0; i--) {
    const bc = bombCollectibles[i];
    const sx = bc.x - scrollX;
    if (sx >= -16 && sx <= canvas.width + 16) { // visible or slightly off-screen
      if (assets.bomb) {
        const size = 16;
        ctx.save();
        ctx.translate(sx, bc.y);
        ctx.rotate(Math.PI / 2); // 90°
        ctx.drawImage(assets.bomb, -size / 2, -size / 2, size, size);
        ctx.restore();
      } else {
        ctx.fillStyle = '#00F';
        ctx.fillRect(sx - 8, bc.y - 8, 16, 16);
      }
      // Collision detection
      const heliWorldX = scrollX + heli.x;
      const heliWorldY = heli.y;
      if (Math.abs(bc.x - heliWorldX) < 12 && Math.abs(bc.y - heliWorldY) < 12) {
        console.log('✅ Collectible ramassé à', bc.x, bc.y);
        playSound('reload');
        bombStock = Math.min(maxBombStock, bombStock + window.bombCollectibleBonus);
        window.bombStock = bombStock;
        bombCollectibles.splice(i, 1);
      }
    }
  }

  // Dessin du terrain, colonne par colonne (évite les gaps)
  ctx.fillStyle = '#555';
  for (let x = 0; x < canvas.width; x++) {
    const tx = Math.floor(scrollX + x) % TERRAIN_WIDTH;
    const topY = terrainTop[tx];
    const bottomY = terrainBottom[tx];
    // plafond
    if (topY > 0) {
      ctx.fillRect(x, 0, 1, Math.floor(topY));
    }
    // sol
    ctx.fillRect(x, Math.floor(bottomY), 1, canvas.height - Math.floor(bottomY));
  }

  // Draw fuel tanks with sprite fallback
  for (const f of fuelTanks) {
    const sx = f.x - scrollX;
    if (sx >= 0 && sx < canvas.width) {
      if (assets.fuel) {
        // Fuel sprite moved up by 15px
        ctx.drawImage(assets.fuel, sx, f.y - 15, 16, 48);
      } else {
        ctx.fillStyle = '#F00';
        ctx.fillRect(sx, f.y - 15, 16, 48);
      }
    }
  }

  // Draw hearts with sprite fallback
  for (const h of hearts) {
    const sx = h.x - scrollX;
    if (sx >= 0 && sx < canvas.width) {
      if (assets.heart) {
        // Heart sprite moved up by 15px
        ctx.drawImage(assets.heart, sx, h.y - 15, 16, 32);
      } else {
        ctx.fillStyle = '#F99';
        ctx.fillRect(sx, h.y - 15, 16, 32);
      }
    }
  }

  // Draw turrets (sprite fallback)
  const turretWidth = 32;
  const turretHeight = 64;
  for (const t of turrets) {
    const sx = t.x - scrollX;
    if (sx >= -turretWidth && sx <= canvas.width + turretWidth) {
      if (assets.turret) {
        // Draw turret at integer pixel coordinates
        const drawTx = Math.round(sx - turretWidth / 2);
        const drawTy = Math.round(t.y - turretHeight + 10);
        ctx.drawImage(
          assets.turret,
          drawTx,
          drawTy,
          turretWidth,
          turretHeight
        );
      } else {
        if (t.armored) {
          ctx.fillStyle = '#F90'; // orange for armored
        } else {
          ctx.fillStyle = '#0F0'; // green for normal
        }
        ctx.fillRect(sx - turretWidth / 2, t.y - turretHeight + 10, turretWidth, turretHeight);
      }
    }
  }

  // Update and draw turret missiles (bright green squares or sprite)
  ctx.fillStyle = '#0F0';
  const missileSize = 6;
  for (let i = turretMissiles.length - 1; i >= 0; i--) {
    const m = turretMissiles[i];
    const worldHeliX = scrollX + heli.x;
    const worldHeliY = heli.y;
    // Weighted homing: gradually correct missile orientation toward player
    const targetAngle = Math.atan2(worldHeliY - m.y, worldHeliX - m.x);
    let deltaAngle = targetAngle - m.angle;
    // Normalise delta à [-PI, PI]
    deltaAngle = Math.atan2(Math.sin(deltaAngle), Math.cos(deltaAngle));
    m.angle += deltaAngle * homingWeight;
    // Exponential acceleration with cap at 5
    const growthRate = 10.0;  // par seconde
    m.speed = Math.min(150, m.speed * Math.exp(growthRate * deltaReal));
    // Move based on current speed
    m.x += Math.cos(m.angle) * m.speed * deltaReal;
    m.y += Math.sin(m.angle) * m.speed * deltaReal;

    // === Collision detection with terrain (ceiling and ground) BEFORE drawing ===
    const mapX = ((Math.floor(m.x) % TERRAIN_WIDTH) + TERRAIN_WIDTH) % TERRAIN_WIDTH;
    if (m.y <= terrainTop[mapX] || m.y >= terrainBottom[mapX]) {
        
      explosions.push({
          x: m.x,
          y: m.y,
          startTime: performance.now(),
          durationGrow: 200,
          durationFade: 200,
          scale: 0.05,
          opacity: 1,
          damaging: false,
          damagedEnemies: new Set(),
          damagedTurrets: new Set(),
          damagedObjects: new Set(),
          scrollAtSpawn: scrollX, // important pour afficher à la bonne position
        });
      playSound('bomb_explode');
      turretMissiles.splice(i, 1);
      shakeTimer = 0.05;
      continue;
    }

    // Draw missile at correct origin, rotated to align with its angle
    const mx = m.x - scrollX;
    if (mx >= -missileSize && mx <= canvas.width + missileSize) {
      ctx.save();
      ctx.translate(mx, m.y);
      ctx.rotate(m.angle + Math.PI);   // align and flip sprite so nose points toward travel
      if (assets.homingMissile) {
        ctx.drawImage(assets.homingMissile, -12, -8, 24, 16);  // centered draw
      } else {
        ctx.fillRect(-missileSize/2, -missileSize/2, missileSize, missileSize);
      }
      ctx.restore();
    }
    // Remove off-screen or below ground
    if (mx < -missileSize || mx > canvas.width + missileSize || m.y > canvas.height) {
      turretMissiles.splice(i, 1);
    }
  }

  // Collision turret missiles vs helicopter
  for (let i = turretMissiles.length - 1; i >= 0; i--) {
    const m = turretMissiles[i];
    const mx = m.x - scrollX;
    if (Math.abs(mx - heli.x) < 8 && Math.abs(m.y - heli.y) < 8) {
        playSound('bomb_explode');

      // Remove one HP from helicopter
      heli.hitPoints--;
      // Red flash around helicopter
      hitFlashes.push({
        x: heli.x + 8,
        y: heli.y + 4,
        startTime: performance.now(),
        duration: 100,
        radius: 20,
        color: 'red'
      });
      if (window.showDamageText) {
        damageTexts.push({
          x: heli.x + 8,
          y: heli.y + 4,
          text: `-1`,
          startTime: performance.now(),
          duration: 1000
        });
      }
      // Screen shake effect
      shakeTimer = 0.05;
      // Remove the missile
      turretMissiles.splice(i, 1);
    }
  }

  // Draw enemies with limited visible rotation and horizontal flip
  for (const e of enemies) {
    const cx = e.x - scrollX;
    const cy = e.y;
    // Compute full aiming angle
    const angleFull = e.aimAngle;
    // Determine horizontal facing: 1 = right, -1 = left
    const facing = (Math.cos(angleFull) >= 0) ? 1 : -1;
    // Derive local tilt angle relative to horizontal
    // For left-facing, subtract PI to get relative angle
    let localAngle = angleFull - (facing === -1 ? Math.PI : 0);
    // Normalize to [-PI, PI]
    localAngle = Math.atan2(Math.sin(localAngle), Math.cos(localAngle));
    // Clamp to ±30°
    const maxTilt = 30 * Math.PI / 180;
    const displayAngle = Math.max(-maxTilt, Math.min(maxTilt, localAngle));
    ctx.save();
    // Snap translation to integer pixels
    ctx.translate(Math.round(cx), Math.round(cy));
    ctx.scale(facing, 1);        // horizontal flip if needed
    ctx.rotate(displayAngle);    // limited tilt
    if (assets.enemy) {
      // Compute integer draw size for crisp rendering
      const w = Math.round(48 * 0.7);  // integer width
      const h = Math.round(32 * 0.7);  // integer height
      // Snap to nearest 2px grid or integer for crisp edges
      const exInt = -Math.floor(w / 2);
      const eyInt = -Math.floor(h / 2);
      ctx.drawImage(assets.enemy, exInt, eyInt, w, h);
    } else {
      ctx.fillStyle = '#F00';
      const w = 48 * 0.7;
      const h = 32 * 0.7;
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }
    ctx.restore();
  }

  // Draw helicopter with tilt and horizontal flip based on facing
  // Compute display size preserving sprite aspect ratio, then double height, then scale up
  const scaleFactor = 1.3; // increase helicopter size by 30%
  const baseW = 16;
  const displayW = baseW * scaleFactor;
  let displayH;
  if (assets.heli) {
    const origW = assets.heli.naturalWidth || assets.heli.width;
    const origH = assets.heli.naturalHeight || assets.heli.height;
    // Base height preserving ratio, then double, then apply scale
    displayH = (baseW * (origH / origW) * 2) * scaleFactor;
  } else {
    displayH = (baseW * 2) * scaleFactor;
  }
  ctx.save();
  ctx.translate(heli.x + displayW / 2, heli.y + displayH / 2 - 15);
  const tiltRad = heli.tilt * Math.PI / 180;
  ctx.rotate(tiltRad);
  // Compute horizontal stretch factor to compensate width shrink: 1/cos(tilt)
  const stretchX = 1 / Math.cos(tiltRad);
  // Apply facing and stretch
  if (assets.heli) {
    if (heli.facing < 0) {
      ctx.scale(-stretchX, 1);
    } else {
      ctx.scale(stretchX, 1);
    }
    ctx.drawImage(assets.heli, -displayW / 2, -displayH / 2, displayW, displayH);
  } else {
    ctx.fillStyle = '#0FF';
    if (heli.facing < 0) {
      ctx.scale(-stretchX, 1);
    } else {
      ctx.scale(stretchX, 1);
    }
    ctx.fillRect(-displayW / 2, -displayH / 2, displayW, displayH);
  }
  ctx.restore();
  // Draw all collision boxes if enabled
  if (window.showCollisionBoxes) {
    // 1. Helicopter collision box (red)
    ctx.strokeStyle = '#F00';
    ctx.lineWidth = 1;
    ctx.strokeRect(heli.x, heli.y, 16, 8);

    // 2. Fuel tanks (green)
    ctx.strokeStyle = '#0F0';
    for (const f of fuelTanks) {
      const sx = f.x - scrollX;
      if (sx >= 0 && sx < canvas.width) {
        ctx.strokeRect(sx, f.y, 16, 16);
      }
    }

    // 3. Hearts (pink)
    ctx.strokeStyle = '#F99';
    for (const h of hearts) {
      const sx = h.x - scrollX;
      if (sx >= 0 && sx < canvas.width) {
        ctx.strokeRect(sx, h.y, 16, 16);
      }
    }

    // 4. Bomb collectibles (blue)
    ctx.strokeStyle = '#00F';
    for (const bc of bombCollectibles) {
      const sx = bc.x - scrollX;
      ctx.strokeRect(sx - 8, bc.y - 8, 16, 16);
    }

    // 5. Player bullets (orange)
    ctx.strokeStyle = '#F90';
    for (const b of bullets) {
      ctx.strokeRect(b.x, b.y, 2, 2);
    }

    // 6. Bombs (orange-brown)
    ctx.strokeStyle = '#FA0';
    for (const b of bombs) {
      ctx.strokeRect(b.x, b.y, 3, 3);
    }

    // 7. Enemies (bright green)
    ctx.strokeStyle = '#0F0';
    for (const e of enemies) {
      const cx = e.x - scrollX;
      ctx.strokeRect(cx - 24, e.y - 16, 48, 32);
    }

    // 8. Terrain (magenta)
    ctx.strokeStyle = '#F0F';
    for (let x = 0; x < canvas.width; x++) {
      const tx = ((Math.floor(scrollX + x) % TERRAIN_WIDTH) + TERRAIN_WIDTH) % TERRAIN_WIDTH;
      const topY = terrainTop[tx];
      const bottomY = terrainBottom[tx];
      // Ceiling line
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, topY);
      ctx.stroke();
      // Floor line
      ctx.beginPath();
      ctx.moveTo(x, bottomY);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // 9. Turrets (yellow)
    ctx.strokeStyle = '#FF0';
    for (const t of turrets) {
      const sx = t.x - scrollX;
      ctx.strokeRect(sx - 16, t.y - 64 + 10, 32, 64);
    }

    // 10. Turret missiles (cyan)
    ctx.strokeStyle = '#0FF';
    for (const m of turretMissiles) {
      const mx = m.x - scrollX;
      ctx.strokeRect(mx - 12, m.y - 8, 24, 16);
    }
  }

  // Bullets with collision
  ctx.fillStyle = '#F00';
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * dt;
    const mapX = Math.floor(scrollX + b.x) % TERRAIN_WIDTH;
    const topY = terrainTop[mapX], bottomY = terrainBottom[mapX];
    if (b.y <= topY || b.y >= bottomY) { bullets.splice(i, 1); continue; }
    // object collisions...
    for (let j = fuelTanks.length - 1; j >= 0; j--) {
        const f = fuelTanks[j];
        const fx = f.x - scrollX;
        const fy = f.y - 15; // sprite is drawn 15px above f.y
        const fw = 16;
        const fh = 48;
        if (b.x >= fx && b.x <= fx + fw && b.y >= fy && b.y <= fy + fh) {
                playSound('pickup');
                fuelTanks.splice(j, 1);
                heli.fuel = Math.min(heli.fuel + fuelTankBonus, fuelQuantity);
                score += window.fuelScoreBonus;
                bullets.splice(i, 1);
                hitFlashes.push({
                x: b.x,
                y: b.y,
                startTime: performance.now(),
                duration: 100,
                radius: 20,
                });
            break;
        }
    }
    for (let j = hearts.length - 1; j >= 0; j--) {
      const h = hearts[j];
      const hx = h.x - scrollX;
      const hy = h.y - 15;
      const hw = 16;
      const hh = 32;
      if (b.x >= hx && b.x <= hx + hw && b.y >= hy && b.y <= hy + hh) {
        playSound('bomb_explode')
        hearts.splice(j, 1);
        heli.hitPoints = Math.min(heli.hitPoints + heartBonus, 100);
        score += window.heartScoreBonus;
        bullets.splice(i, 1);
        hitFlashes.push({
          x: b.x,
          y: b.y,
          startTime: performance.now(),
          duration: 100,
          radius: 20,
        });
        break;
      }
    }
    // Collision player bullets vs turrets
    for (let j = turrets.length - 1; j >= 0; j--) {
      const t = turrets[j];
      const tx = t.x - scrollX;
      if (Math.abs(b.x - t.x) < 8 && Math.abs(b.y - t.y) < 16) {
          playSound('hit_turret');
          t.hitPoints--;

          if (t.hitPoints <= 0) turrets.splice(j, 1);
          bullets.splice(i, 1);
          // Visual feedback
          hitFlashes.push({ x: b.x, y: b.y, startTime: performance.now(), duration: 100, radius: 20, color: 'red' });
          shakeTimer = 0.05;
          break;
      }
    }
    ctx.fillRect(b.x, b.y, 2, 2);
  }

  // Bombs with collision against terrain and objects
  ctx.fillStyle = '#F90';
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i];
    // Update position
    b.x += b.vx * dt;
    b.vy += gravity * dt;
    b.y += b.vy * dt;

    const mapX = Math.floor(scrollX + b.x) % TERRAIN_WIDTH;
    const bottomY = terrainBottom[mapX];

    // Collision with ground
    if (b.y >= bottomY) {
      bombs.splice(i, 1);
      explosions.push({
        x: b.x + scrollX, // <<< corrigé
        y: b.y,
        startTime: performance.now(),
        durationGrow: 200,
        durationFade: 200,
        scale: 0.05,
        opacity: 1,
        damaging: true,
        damagedEnemies: new Set(),
        damagedTurrets: new Set(),
        damagedObjects: new Set(),
        scrollAtSpawn: scrollX,
      });
      playSound('bomb_explode');
      shakeTimer = 0.05;
      continue;
    }

    // Collision bombs vs turrets (stricte boîte de collision)
    for (let j = turrets.length - 1; j >= 0; j--) {
      const t = turrets[j];
      const tx = t.x - scrollX;
      const turretTop = t.y - 64 + 10;
      const turretBottom = t.y + 10;
      const turretLeft = tx - 16;
      const turretRight = tx + 16;
      if (b.x >= turretLeft && b.x <= turretRight && b.y >= turretTop && b.y <= turretBottom) {
        // Capture la référence à la tourelle touchée
        const targetTurret = t;
        bombs.splice(i, 1);
        explosions.push({
          x: b.x + scrollX,
          y: b.y,
          startTime: performance.now(),
          durationGrow: 200,
          durationFade: 200,
          scale: 0.05,
          opacity: 1,
          damaging: true,
          damagedEnemies: new Set(),
          damagedTurrets: new Set(),
          damagedObjects: new Set(),
          scrollAtSpawn: scrollX,
        });
        playSound('bomb_explode');
        shakeTimer = 0.05;
        break;
      }
    }
    // Collision with fuel tanks
    let removed = false;
    for (let j = fuelTanks.length - 1; j >= 0; j--) {
      const f = fuelTanks[j];
      const fx = f.x - scrollX;
      if (Math.abs(fx - b.x) < 6 && Math.abs(f.y - b.y) < 6) {
        fuelTanks.splice(j, 1);
        heli.fuel = Math.min(heli.fuel + fuelTankBonus, fuelQuantity);
        score += window.fuelScoreBonus;
        bombs.splice(i, 1);
        explosions.push({
          x: b.x + scrollX,
          y: b.y,
          startTime: performance.now(),
          durationGrow: 200,
          durationFade: 200,
          scale: 0.05,
          opacity: 1,
          damaging: true,
          damagedEnemies: new Set(),
          damagedTurrets: new Set(),
          damagedObjects: new Set(),
          scrollAtSpawn: scrollX,
        });
        playSound('bomb_explode');
        shakeTimer = 0.05;
        removed = true;
        break;
      }
    }
    if (removed) continue;

    // Collision with hearts
    for (let j = hearts.length - 1; j >= 0; j--) {
      const h = hearts[j];
      const hx = h.x - scrollX;
      if (Math.abs(hx - b.x) < 6 && Math.abs(h.y - b.y) < 6) {
        hearts.splice(j, 1);
        heli.hitPoints = Math.min(heli.hitPoints + heartBonus, 100);
        score += window.heartScoreBonus;
        bombs.splice(i, 1);
        explosions.push({
          x: b.x + scrollX,
          y: b.y,
          startTime: performance.now(),
          durationGrow: 200,
          durationFade: 200,
          scale: 0.05,
          opacity: 1,
          damaging: true,
          damagedEnemies: new Set(),
          damagedTurrets: new Set(),
          damagedObjects: new Set(),
          scrollAtSpawn: scrollX,
        });
        playSound('bomb_explode');
        shakeTimer = 0.05;
        removed = true;
        break;
      }
    }
    if (removed) continue;

    // Collision with enemies
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      const ex = e.x - scrollX;
      if (Math.abs(b.x - ex) < 12 && Math.abs(b.y - e.y) < 12) {
        bombs.splice(i, 1);
        explosions.push({
          x: b.x + scrollX,
          y: b.y,
          startTime: performance.now(),
          durationGrow: 200,
          durationFade: 200,
          scale: 0.05,
          opacity: 1,
          damaging: true,
          damagedEnemies: new Set(),
          damagedTurrets: new Set(),
          damagedObjects: new Set(),
          scrollAtSpawn: scrollX,
        });
        playSound('bomb_explode');
        // Inflige 5 points de dégâts, comme une explosion normale
        for (let hit = 0; hit < 5; hit++) {
          if (window.showDamageText) {
            damageTexts.push({
              x: e.x - scrollX,
              y: e.y,
              text: `-1`,
              startTime: performance.now(),
              duration: 1000
            });
          }
          if (e.takeDamage()) {
            enemies.splice(j, 1);
            break;
          }
        }
        shakeTimer = 0.05;
        removed = true;
        break;
      }
    }
    if (removed) continue;

    // Draw bomb with sprite fallback
    if (assets.bomb) {
      const size = 16;
      ctx.drawImage(assets.bomb, b.x - size / 2, b.y - size / 2, size, size);
    } else {
      ctx.fillRect(b.x, b.y, 3, 3);
    }
  }

  // Draw enemy bullets
  ctx.fillStyle = '#0FF';
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    const tx = ((Math.floor(b.x) % TERRAIN_WIDTH) + TERRAIN_WIDTH) % TERRAIN_WIDTH;
    if (b.y <= terrainTop[tx] || b.y >= terrainBottom[tx]) {
      enemyBullets.splice(i, 1);
      continue;
    }
    ctx.fillRect(b.x - scrollX, b.y, 3, 3);
  }

  // Collisions hélico
  if (heli.alive) {
    checkHelicopterCollision();
  }

  // Draw explosions
  const now = performance.now();
  for (let i = explosions.length - 1; i >= 0; i--) {
    const e = explosions[i];
    const elapsed = now - e.startTime;
    // === New: Explosion deals damage to enemies in radius, once per enemy ===
    if (e.damaging) {
      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];
        if (e.damagedEnemies.has(enemy)) continue;
        const ex = enemy.x - scrollX;
        const dist = Math.hypot(ex - e.x, enemy.y - e.y);
        const explosionRadius = 40 * e.scale;
        if (dist < explosionRadius) {
          for (let hit = 0; hit < 5; hit++) {
            if (window.showDamageText) {
              damageTexts.push({
                x: enemy.x - scrollX,
                y: enemy.y,
                text: `-1`,
                startTime: performance.now(),
                duration: 1000
              });
            }
            if (enemy.takeDamage()) {
              enemies.splice(j, 1);
              break;
            }
          }
          e.damagedEnemies.add(enemy);
        }
      }
    }
    if (e.damaging) {
      // dégâts aux tourelles
      for (let j = turrets.length - 1; j >= 0; j--) {
        const turret = turrets[j];
        if (e.damagedTurrets.has(turret)) continue;
        // Correction : comparer les coordonnées monde de la tourelle et de l'explosion
        const turretCenterY = turret.y - 32; // centre visuel (64 px de haut → moitié)
        const dist = Math.hypot(turret.x - e.x, turretCenterY - e.y);
        const explosionRadius = 50; // rayon légèrement élargi pour englober la tourelle
        if (dist < explosionRadius) {
          console.log('💥 Explosion touche une tourelle à', turret.x, turret.y, 'avec distance', dist);
          turret.hitPoints -= 3; // <<< -3 HP d'un coup
          if (window.showDamageText) {
            damageTexts.push({
              x: turret.x - scrollX,
              y: turret.y,
              text: `-3`,
              startTime: performance.now(),
              duration: 1000
            });
          }
          if (window.showDamageText) {
            damageTexts.push({
              x: turret.x - scrollX,
              y: turret.y,
              text: `-3`,
              startTime: performance.now(),
              duration: 1000
            });
          }
          if (turret.hitPoints <= 0) {
            turrets.splice(j, 1);
          }
          e.damagedTurrets.add(turret);
        }
      }
    }
    if (e.damaging) {
      // dégâts aux fuelTanks
      for (let j = fuelTanks.length - 1; j >= 0; j--) {
        const f = fuelTanks[j];
        if (e.damagedObjects.has(f)) continue;
        const fx = f.x - scrollX;
        const dist = Math.hypot(fx - e.x, f.y - e.y);
        const explosionRadius = 50;   // fixed radius to reliably hit fuel tanks
        if (dist < explosionRadius) {
          fuelTanks.splice(j, 1);
          e.damagedObjects.add(f);
        }
      }

      // dégâts aux hearts
      for (let j = hearts.length - 1; j >= 0; j--) {
        const h = hearts[j];
        if (e.damagedObjects.has(h)) continue;
        const hx = h.x - scrollX;
        const dist = Math.hypot(hx - e.x, h.y - e.y);
        const explosionRadius = 50;   // fixed radius to reliably hit hearts
        if (dist < explosionRadius) {
          hearts.splice(j, 1);
          e.damagedObjects.add(h);
        }
      }
    }
    if (elapsed < e.durationGrow) {
      const t = elapsed / e.durationGrow;
      e.scale = 0.05 + (0.5 - 0.05) * t;
      e.opacity = 1;
    } else if (elapsed < e.durationGrow + e.durationFade) {
      e.scale = 0.5;
      const t = (elapsed - e.durationGrow) / e.durationFade;
      e.opacity = 1 - t;
    } else {
      explosions.splice(i, 1);
      continue;
    }
    ctx.save();
    ctx.globalAlpha = e.opacity;
    if (assets.explosion) {
      const totalDuration = e.durationGrow + e.durationFade;
      const frameIndex = Math.min(
        assets.explosionFrameCount - 1,
        Math.floor((elapsed / totalDuration) * assets.explosionFrameCount)
      );
      const sx = frameIndex * assets.explosionFrameWidth;
      const sw = assets.explosionFrameWidth;
      const sh = assets.explosionFrameHeight;
      const dw = sw * e.scale * 0.15;
      const dh = sh * e.scale * 0.15;
      ctx.drawImage(
        assets.explosion,
        sx, 0, sw, sh,
        e.x - e.scrollAtSpawn - dw/2,
        e.y - dh/2,
        dw, dh
      );
    } else {
      ctx.fillStyle = '#FFA500';
      ctx.beginPath();
      ctx.arc(e.x - scrollX, e.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Draw hit flashes for laser impacts
  const flashNow = performance.now();
  for (let i = hitFlashes.length - 1; i >= 0; i--) {
    const f = hitFlashes[i];
    const elapsed = flashNow - f.startTime;
    if (elapsed >= f.duration) {
      hitFlashes.splice(i, 1);
      continue;
    }
    const alpha = 1 - (elapsed / f.duration);
    const radius = f.radius * (1 + (elapsed / f.duration) * 0.5);
    ctx.save();
    ctx.globalAlpha = alpha * 0.6;
    ctx.beginPath();
    ctx.arc(f.x, f.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = f.color || '#FFF';
    ctx.fill();
    ctx.restore();
  }

  // Draw damage texts (floating numbers)
  {
    const now = performance.now();
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    for (let i = damageTexts.length - 1; i >= 0; i--) {
      const d = damageTexts[i];
      const elapsed = now - d.startTime;
      if (elapsed >= d.duration) {
        damageTexts.splice(i, 1);
        continue;
      }
      const alpha = 1 - elapsed / d.duration;
      const rise = -elapsed / 100; // float-in-up
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#FFF';
      ctx.fillText(d.text, d.x, d.y + rise);
      ctx.globalAlpha = 1.0;
    }
  }

  drawHUD();

  if (shakeTimer <= 0) {
    ctx.restore();
  }

  if (!heli.alive) {
    // Semi-transparent full-screen overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!gameOverHandled) {
      highScores.push(score);
      highScores.sort((a, b) => b - a);
      highScores = highScores.slice(0, 5);
      localStorage.setItem('highScores', JSON.stringify(highScores));
      gameOverHandled = true;
    }
    // Show Game Over flex container and update scores
    const gameOverContainer = document.getElementById('gameOverContainer');
    const yourScore = document.getElementById('yourScore');
    const highScoresList = document.getElementById('highScoresList');
    gameOverContainer.style.display = 'flex';
    yourScore.innerText = 'Your Score: ' + score;
    let html = '<strong>High Scores:</strong><br>';
    for (let i = 0; i < highScores.length; i++) {
      html += (i + 1) + '. ' + highScores[i] + '<br>';
    }
    highScoresList.innerHTML = html;
    // Show restart button when game is over
    restartButton.style.display = 'block';
  }

  // Hide restart button and game over container if game is running
  if (heli.alive) {
    restartButton.style.display = 'none';
    // Reset fade effect if restarting
    gameOverOpacity = 0;
    // Hide Game Over flex container
    const gameOverContainer = document.getElementById('gameOverContainer');
    if (gameOverContainer) {
      gameOverContainer.style.display = 'none';
    }
  }

  requestAnimationFrame(loop);
}

loadAssets().then(() => {
  // --- Title screen logic ---
  const titleScreen = document.getElementById('titleScreen');
  const startButton = document.getElementById('startButton');
  const tooltip = document.getElementById('tooltip');

  if (localStorage.getItem('skipTitleScreen') !== 'true') {
    paused = true;
    if (titleScreen) titleScreen.style.display = 'flex';
  } else {
    paused = false;
    if (titleScreen) titleScreen.style.display = 'none';
    localStorage.removeItem('skipTitleScreen');
  }

  if (startButton) {
    startButton.addEventListener('click', () => {
      playSound('menu_click');
      if (titleScreen) titleScreen.style.display = 'none';
      paused = false;
      localStorage.setItem('skipTitleScreen', 'true');
    });
    startButton.addEventListener('mouseover', () => {
      if (tooltip) tooltip.style.display = 'block';
    });
    startButton.addEventListener('mouseout', () => {
      if (tooltip) tooltip.style.display = 'none';
    });
  }

  loadSettings();
  heli = new Helicopter();
  generateTerrain();
  generateObjects();
  // Always start the game loop (it will early-return if paused)
  requestAnimationFrame(loop);
}).catch(() => {
  loadSettings();
  heli = new Helicopter();
  generateTerrain();
  generateObjects();
  requestAnimationFrame(loop);
});