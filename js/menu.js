const menuButton = document.getElementById('menuButton');
const menu = document.getElementById('menu');
const restartButton = document.getElementById('restartButton');

document.addEventListener('DOMContentLoaded', () => {
  // Load saved settings so sliders start with correct values
  loadSettings();

  // Screen size chooser
  const screenSelect = document.getElementById('screenSizeSelect');
  if (screenSelect) {
    screenSelect.value = screenSize;
    screenSelect.addEventListener('change', (e) => {
      screenSize = e.target.value;
      if (typeof applyScreenSize === 'function') applyScreenSize();
      saveSettings();
    });
  }
  if (typeof applyScreenSize === 'function') applyScreenSize();

  menuButton.addEventListener('click', () => {
    menu.style.display = (menu.style.display === 'none') ? 'block' : 'none';
  });

  restartButton.addEventListener('click', () => {
    location.reload();
  });

  function connectSlider(id, variableName, format = (v) => v) {
    const slider = document.getElementById(id);
    const valueDisplay = document.getElementById(id.replace('Slider', 'Value'));
    slider.addEventListener('input', (e) => {
      window[variableName] = parseFloat(e.target.value);
      valueDisplay.innerText = format(window[variableName]);
      saveSettings();
    });
  }

  function connectSliderInt(id, variableName) {
    const slider = document.getElementById(id);
    const valueDisplay = document.getElementById(id.replace('Slider', 'Value'));
    slider.addEventListener('input', (e) => {
      const newVal = parseInt(e.target.value);
      const oldVal = window[variableName];
      window[variableName] = newVal;
      valueDisplay.innerText = newVal;

      if (variableName === 'heliStartHP' && heli) {
        heli.hitPoints = heliStartHP;
      }
      if (variableName === 'initialFuel' && heli) {
        // Preserve current fuel ratio when max fuel changes
        const frac = heli.fuel / oldVal;
        heli.fuel = frac * newVal;
      }
      saveSettings();
    });
  }

  // Connexions sliders simples
  connectSlider('scrollSpeedSlider', 'scrollSpeed', v => v.toFixed(1));
  connectSlider('gravitySlider', 'gravity', v => v.toFixed(2));
  connectSlider('laserSpeedSlider', 'laserSpeed', v => v.toFixed(1));
  connectSlider('bombSpeedSlider', 'bombForwardSpeed', v => v.toFixed(1));
  connectSlider('inertiaSlider', 'inertia', v => v.toFixed(2));

  // Connexions sliders int
  connectSliderInt('hpStartSlider', 'heliStartHP');

  // Terrain sliders
  connectSlider('terrainSpikeChanceSlider', 'terrainSpikeChance', v => v.toFixed(3));
  connectSliderInt('terrainSpikeHeightSlider', 'terrainSpikeHeight');

  // Grotte sliders
  connectSliderInt('caveAmplitudeSlider', 'caveAmplitude');
  connectSlider('caveFrequencySlider', 'caveFrequency', v => v.toFixed(3));
  connectSliderInt('cavePassageMinSlider', 'cavePassageMin');
  connectSliderInt('cavePassageMaxSlider', 'cavePassageMax');
  connectSliderInt('caveOffsetAmplitudeSlider', 'caveOffsetAmplitude');
  connectSliderInt('caveSpikeAmplitudeSlider', 'caveSpikeAmplitude');
  connectSlider('caveSpikeFrequencySlider', 'caveSpikeFrequency', v => v.toFixed(2));
  // Fuel Consumption Rate and Quantity sliders
  connectSlider('fuelConsumptionRateSlider', 'fuelConsumptionRate', v => v.toFixed(2));
  // Inverted fuel quantity slider: left is max, right is min
  const fqSlider = document.getElementById('fuelQuantitySlider');
  const fqValueDisplay = document.getElementById('fuelQuantityValue');
  fqSlider.addEventListener('input', (e) => {
    const slider = e.target;
    const min = parseInt(slider.min, 10);
    const max = parseInt(slider.max, 10);
    const raw = parseInt(slider.value, 10);
    // Inverted: left is max, right is min
    const inverted = max - (raw - min);
    window.fuelQuantity = inverted;
    fqValueDisplay.innerText = inverted;
    if (window.heli) {
      // Preserve current fuel ratio when max fuel changes
      const frac = window.heli.fuel / window.heli.fuelQuantity;
      window.heli.fuel = frac * inverted;
      window.heli.fuelQuantity = inverted;
    }
    saveSettings();
  });
  connectSliderInt('fuelTankBonusSlider', 'fuelTankBonus');
  connectSliderInt('heartBonusSlider',    'heartBonus');
  connectSliderInt('fuelScoreBonusSlider',  'fuelScoreBonus');
  connectSliderInt('heartScoreBonusSlider', 'heartScoreBonus');
  // Add Cooldown Missiles slider connection
  connectSlider('turretMissileCooldownSlider', 'turretMissileCooldown', v => v.toFixed(1));

  // Toggle collision box display
  const scb = document.getElementById('showCollisionCheckbox');
  scb.checked = window.showCollisionBoxes;
  scb.addEventListener('change', (e) => {
    window.showCollisionBoxes = e.target.checked;
    saveSettings();
  });

  // Show damage text checkbox
  const showDamageCheckbox = document.createElement('label');
  showDamageCheckbox.innerHTML = `
    <input type="checkbox" id="showDamageCheckbox"> Afficher les dégâts (texte)
  `;
  document.getElementById('menu').appendChild(showDamageCheckbox);
  const showDamageInput = document.getElementById('showDamageCheckbox');
  showDamageInput.checked = window.showDamageText;
  showDamageInput.addEventListener('change', (e) => {
    window.showDamageText = e.target.checked;
    saveSettings();
  });

  // Re-generate terrain when cave or terrain parameters change
  [
    'terrainSpikeChanceSlider',
    'terrainSpikeHeightSlider',
    'caveAmplitudeSlider',
    'caveFrequencySlider',
    'cavePassageMinSlider',
    'cavePassageMaxSlider',
    'caveOffsetAmplitudeSlider',
    'caveSpikeAmplitudeSlider',
    'caveSpikeFrequencySlider'
  ].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      generateTerrain();
    });
  });

  // Bouton Defaults Settings
  document.getElementById('defaultSettingsButton').addEventListener('click', () => {
    localStorage.removeItem('gameSettings');
    location.reload();
  });

  // Initialize sliders and display values from current settings
  [
    ['scrollSpeedSlider','scrollSpeed', v => v.toFixed(1)],
    ['gravitySlider','gravity', v => v.toFixed(2)],
    ['laserSpeedSlider','laserSpeed', v => v.toFixed(1)],
    ['bombSpeedSlider','bombForwardSpeed', v => v.toFixed(1)],
    ['inertiaSlider','inertia', v => v.toFixed(2)],
    ['hpStartSlider','heliStartHP', v => String(v)],
    ['terrainSpikeChanceSlider','terrainSpikeChance', v => v.toFixed(3)],
    ['terrainSpikeHeightSlider','terrainSpikeHeight', v => String(v)],
    ['caveAmplitudeSlider','caveAmplitude', v => String(v)],
    ['caveFrequencySlider','caveFrequency', v => v.toFixed(3)],
    ['cavePassageMinSlider','cavePassageMin', v => String(v)],
    ['cavePassageMaxSlider','cavePassageMax', v => String(v)],
    ['caveOffsetAmplitudeSlider','caveOffsetAmplitude', v => String(v)],
    ['caveSpikeAmplitudeSlider','caveSpikeAmplitude', v => String(v)],
    ['caveSpikeFrequencySlider','caveSpikeFrequency', v => v.toFixed(2)],
    ['fuelConsumptionRateSlider','fuelConsumptionRate', v => v.toFixed(2)],
    // ['fuelQuantitySlider',       'fuelQuantity',        v => String(v)], // REMOVED
    ['fuelTankBonusSlider', 'fuelTankBonus', v => String(v)],
    ['heartBonusSlider',    'heartBonus',    v => String(v)],
    ['fuelScoreBonusSlider',  'fuelScoreBonus',  v => String(v)],
    ['heartScoreBonusSlider', 'heartScoreBonus', v => String(v)],
    ['turretMissileCooldownSlider','turretMissileCooldown', v => v.toFixed(1)],
  ].forEach(([id, varName, fmt]) => {
    const slider = document.getElementById(id);
    const display = document.getElementById(id.replace('Slider', 'Value'));
    const val = window[varName];
    slider.value = val;
    display.innerText = fmt(val);
  });
  // Initialize inverted fuel quantity slider position and display
  {
    const slider = document.getElementById('fuelQuantitySlider');
    const min = parseInt(slider.min, 10);
    const max = parseInt(slider.max, 10);
    // Set slider value to inverted position
    slider.value = max - (window.fuelQuantity - min);
    document.getElementById('fuelQuantityValue').innerText = String(window.fuelQuantity);
  }
}); // end DOMContentLoaded