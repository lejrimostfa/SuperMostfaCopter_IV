const horizontalSpeed = 1;
// Get canvas element globally for terrain scaling and helicopter bounds
const canvasElement = document.getElementById('game');
// === CONSTANTES ===
const TERRAIN_WIDTH = 3000;
const MIN_PASSAGE = 48;
const SECTION_LENGTH = 400;

const terrainTop = [];
const terrainBottom = [];

const fuelTanks = [];
const hearts = [];
const enemies = [];
const enemyBullets = [];
const bombCollectibles = [];
const turrets = [];
const turretMissiles = [];

let heli;
let scrollX = 0;

// === INITIALISATION TERRAIN ===
function generateTerrain() {
  const H = canvasElement.height;
  const scaleY = H / 192;
  const centerY = H / 2;

  terrainTop.length = 0;
  terrainBottom.length = 0;

  for (let i = 0; i < TERRAIN_WIDTH; i++) {
    const section = Math.floor(i / SECTION_LENGTH) % 3;
    const pos = i % SECTION_LENGTH;

    // Smooth transition function
    const transitionSmooth = x => 0.5 * (1 - Math.cos(Math.PI * x));

    // Determine interpolation between plain (0) and cave (1)
    let interp;
    const boundary = 100;
    if (pos < boundary) {
      interp = transitionSmooth(pos / boundary);
    } else if (pos > SECTION_LENGTH - boundary) {
      interp = transitionSmooth((SECTION_LENGTH - pos) / boundary);
    } else {
      interp = (section === 0 ? 0 : 1);
    }

    // Plain values (triangular mountains + random spikes)
    const mountainPeriod = 100;
    const mountainHeight = 12 * scaleY;
    const t2 = (i % mountainPeriod) / mountainPeriod;
    const triOffset = (t2 < 0.5 ? t2 * 2 : (1 - t2) * 2) * mountainHeight;
    const randomSpike = (Math.random() < terrainSpikeChance)
      ? -(Math.random() * terrainSpikeHeight * scaleY)
      : 0;
    const plainTop = triOffset + randomSpike;
    // symmetrical floor mountain for plain sections
    const plainBottom = H - triOffset;

    // Cave values
    const yCenter = centerY + Math.sin(i * caveFrequency) * caveAmplitude * scaleY;
    const offset = Math.cos(i * (caveFrequency * 0.85)) * caveOffsetAmplitude * scaleY;
    const caveSpike = Math.sin(i * caveSpikeFrequency) * caveSpikeAmplitude * scaleY;
    const passageSize = ((Math.random() < 0.5) ? cavePassageMin : cavePassageMax) * scaleY;
    const caveTop = yCenter - passageSize / 2 + offset + caveSpike;
    const caveBottom = yCenter + passageSize / 2 - offset - caveSpike;

    // Interpolate and push
    const topY = (1 - interp) * plainTop + interp * caveTop;
    const bottomY = (1 - interp) * plainBottom + interp * caveBottom;
    // Ensure a minimum ground level only for plain sections, preserve cave shape
    const minGroundY = H - 16;
    const finalBottomY = Math.min(bottomY, minGroundY);
    terrainTop.push(Math.max(0, topY));
    terrainBottom.push(finalBottomY);
  }
}

function generateObjects() {
  fuelTanks.length = 0;
  hearts.length = 0;
  enemies.length = 0;
  bombCollectibles.length = 0;
  for (let n = 200; n < TERRAIN_WIDTH; n += 300) {
    const midY = (terrainTop[n] + terrainBottom[n]) / 2;
    fuelTanks.push({ x: n, y: midY });
  }
  for (let n = 500; n < TERRAIN_WIDTH; n += 800) {
    const midY = (terrainTop[n] + terrainBottom[n]) / 2;
    hearts.push({ x: n, y: midY });
  }
  // Bomb collectibles
  for (let n = 350; n < TERRAIN_WIDTH; n += 600) {
    const midY = (terrainTop[n] + terrainBottom[n]) / 2;
    bombCollectibles.push({ x: n, y: midY });
  }
  // Turrets: upgraded with armored turrets
  for (let n = 200; n < TERRAIN_WIDTH; n += 600) {
    if (terrainBottom.length > n) {
      const isArmored = Math.random() < 0.2;
      turrets.push({
        x: n,
        y: terrainBottom[n],
        hitPoints: isArmored ? 6 : 3,
        armored: isArmored
      });
    }
  }
  for (let n = 700; n < TERRAIN_WIDTH; n += 200 + Math.random() * 100) {
    const ex = Math.floor(n);
    const midY = (terrainTop[ex] + terrainBottom[ex]) / 2;
    enemies.push(new Enemy(ex, midY));
  }
}

// === HELICOPTERE ===
class Helicopter {
  constructor() {
    this.x = 30;
    this.y = 96;
    this.vy = 0;
    this.fuel = fuelQuantity;
    this.alive = true;
    this.hitPoints = heliStartHP;
    this.facing = 1;
    this.tilt = 0;
  }
  update(dt) {
    // Horizontal movement
    if (input.left) {
      this.x = Math.max(0, this.x - horizontalSpeed * dt);
      this.facing = -1;
    } else if (input.right) {
      this.x = Math.min(canvasElement.width - 16, this.x + horizontalSpeed * dt);
      this.facing = 1;
    }
    if (!this.alive) return;
    this.vy += gravity * dt;
    if (input.up) this.vy -= inertia * dt;
    if (input.down) this.vy += (inertia * 0.5) * dt;
    this.vy = Math.max(Math.min(this.vy, 1.5), -1.5);
    this.y += this.vy;
    this.y = Math.max(0, Math.min(this.y, canvasElement.height - 16));
    // Fuel consumption with modifiers: +200% when ascending, +20% when moving horizontally, no consumption in free fall (no user input and descending)
    let consumptionMultiplier;
    if (!input.up && !input.down && !input.left && !input.right && this.vy > 0) {
      // Free fall: no fuel consumption
      consumptionMultiplier = 0;
    } else {
      consumptionMultiplier = 1;
      if (input.up) consumptionMultiplier += 2;
      if (input.left || input.right) consumptionMultiplier += 0.2;
    }
    this.fuel -= fuelConsumptionRate * consumptionMultiplier * dt;
    if (this.fuel <= 0) {
      this.alive = false;
    }
    // Gradual tilt based on input (horizontal and vertical), respecting facing
    let tiltTarget = 0;
    if (input.left) {
      tiltTarget = -30;
    } else if (input.right) {
      tiltTarget = 30;
    }
    if (input.up) {
      // upward input: tilt backward
      tiltTarget += (this.facing === 1 ? -30 : 30);
    } else if (input.down) {
      // downward input: tilt forward
      tiltTarget += (this.facing === 1 ? 30 : -30);
    }
    // Clamp to reasonable range
    tiltTarget = Math.max(-45, Math.min(45, tiltTarget));
    this.tilt += (tiltTarget - this.tilt) * 0.1;
  }
}

function checkHelicopterCollision() {
  const heliFrontX = Math.floor(scrollX + heli.x + 8);
  const topY = terrainTop[heliFrontX % TERRAIN_WIDTH];
  const bottomY = Math.min(terrainBottom[heliFrontX % TERRAIN_WIDTH], canvasElement.height - 1);
  if (heli.y <= topY) {
    heli.y = topY + 1;
    heli.vy = Math.abs(heli.vy) * 0.8;
  } else if (heli.y + 8 >= bottomY) {
    heli.y = bottomY - 9;
    heli.vy = -Math.abs(heli.vy) * 0.8;
    heli.hitPoints--;
  }
  if (heli.hitPoints <= 0) {
    heli.alive = false;
  }
}

class Enemy {
  constructor(x, y) {
    this.baseX = x;
    this.baseY = y;
    this.x = x;
    this.y = y;
    this.oscillationAmplitude = 30;
    this.oscillationSpeed = 2; // radians/sec
    this.aimAngle = 0;
    this.rotationSpeed = 0.02; // radians per frame
    this.shootCooldown = 0;
    this.hitPoints = 2;
  }

  update(dt) {
    const time = performance.now() / 1000;
    this.y = this.baseY + this.oscillationAmplitude * Math.sin(time * this.oscillationSpeed);

    const worldHeliX = scrollX + heli.x;
    const worldHeliY = heli.y;
    const dx = worldHeliX - this.x;
    const dy = worldHeliY - this.y;
    this.aimAngle = Math.atan2(dy, dx);

    const sx = this.x - scrollX;
    if (sx < -64 || sx > canvasElement.width + 64) {
      // Ennemi trop loin, ne tire pas
      return;
    }

    this.shootCooldown -= dt;
    if (this.shootCooldown <= 0) {
      this.shootCooldown = 90;
      playSound('missile_fire');
      playSound('laser');
      enemyBullets.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(this.aimAngle) * laserSpeed,
        vy: Math.sin(this.aimAngle) * laserSpeed
      });
    }
  }

  takeDamage() {
    this.hitPoints--;
    return this.hitPoints <= 0;
  }
}