// === Paramètres initiaux ===
var scrollSpeed = 0.3;
var gravity = 0.04;
var laserSpeed = 3;
var bombForwardSpeed = 0.3;
var heliStartHP = 10;
var inertia = 0.13;

var bombStock = 10;
var maxBombStock = 30;
var bombCollectibleBonus = 5;

var screenSize = 'medium';
var fuelQuantity        = 1000;
var fuelConsumptionRate = 0.1;  // units of fuel per frame
var fuelTankBonus  = 250;
var heartBonus     = 5;
var fuelScoreBonus = 50;
var heartScoreBonus = 50;
var showCollisionBoxes = false;

var showDamageText = true;

// Terrain extérieur
var terrainSpikeChance = 0;
var terrainSpikeHeight = 5;

// Grotte
var caveAmplitude = 50;
var caveFrequency = 0.042;
var cavePassageMin = 90;
var cavePassageMax = 95;
var caveOffsetAmplitude = 20;
var caveSpikeAmplitude = 4;
var caveSpikeFrequency = 0.35;


var turretMissileCooldown = 3.0;

// === Fonctions de sauvegarde et chargement ===
function saveSettings() {
  const settings = {
    scrollSpeed,
    gravity,
    laserSpeed,
    bombForwardSpeed,
    heliStartHP,
    inertia,
    terrainSpikeChance,
    terrainSpikeHeight,
    caveAmplitude,
    caveFrequency,
    cavePassageMin,
    cavePassageMax,
    caveOffsetAmplitude,
    caveSpikeAmplitude,
    caveSpikeFrequency,
    screenSize,
    fuelQuantity,
    fuelConsumptionRate,
    fuelTankBonus,
    heartBonus,
    fuelScoreBonus,
    heartScoreBonus,
    showCollisionBoxes,
    bombStock,
    maxBombStock,
    bombCollectibleBonus,
    showDamageText,
    turretMissileCooldown,
  };
  localStorage.setItem('gameSettings', JSON.stringify(settings));
}

function loadSettings() {
  const saved = localStorage.getItem('gameSettings');
  if (saved) {
    const s = JSON.parse(saved);
    scrollSpeed = s.scrollSpeed ?? scrollSpeed;
    gravity = s.gravity ?? gravity;
    laserSpeed = s.laserSpeed ?? laserSpeed;
    bombForwardSpeed = s.bombForwardSpeed ?? bombForwardSpeed;
    heliStartHP = s.heliStartHP ?? heliStartHP;
    inertia = s.inertia ?? inertia;
    terrainSpikeChance = s.terrainSpikeChance ?? terrainSpikeChance;
    terrainSpikeHeight = s.terrainSpikeHeight ?? terrainSpikeHeight;
    caveAmplitude = s.caveAmplitude ?? caveAmplitude;
    caveFrequency = s.caveFrequency ?? caveFrequency;
    cavePassageMin = s.cavePassageMin ?? cavePassageMin;
    cavePassageMax = s.cavePassageMax ?? cavePassageMax;
    caveOffsetAmplitude = s.caveOffsetAmplitude ?? caveOffsetAmplitude;
    caveSpikeAmplitude = s.caveSpikeAmplitude ?? caveSpikeAmplitude;
    caveSpikeFrequency = s.caveSpikeFrequency ?? caveSpikeFrequency;
    screenSize = s.screenSize ?? screenSize;
    fuelQuantity        = s.fuelQuantity        ?? fuelQuantity;
    fuelConsumptionRate = s.fuelConsumptionRate ?? fuelConsumptionRate;
    fuelTankBonus  = s.fuelTankBonus  ?? fuelTankBonus;
    heartBonus     = s.heartBonus     ?? heartBonus;
    fuelScoreBonus  = s.fuelScoreBonus  ?? fuelScoreBonus;
    heartScoreBonus = s.heartScoreBonus ?? heartScoreBonus;
    showCollisionBoxes = s.showCollisionBoxes ?? showCollisionBoxes;
    bombStock = s.bombStock ?? bombStock;
    maxBombStock = s.maxBombStock ?? maxBombStock;
    bombCollectibleBonus = s.bombCollectibleBonus ?? bombCollectibleBonus;
    showDamageText = s.showDamageText ?? showDamageText;
    turretMissileCooldown = s.turretMissileCooldown ?? turretMissileCooldown;
  }
  }
  window.bombCollectibleBonus = bombCollectibleBonus;
  window.showDamageText = showDamageText;
  window.turretMissileCooldown = turretMissileCooldown;