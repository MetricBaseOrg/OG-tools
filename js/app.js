// UI wiring. Connects forms to calculation modules and applies preferences.

import { convert, listCategories, listUnits } from './converters.js';
import {
  MUD_UNITS, convertMudWeight,
  hydrostaticPsi, hydrostaticKpa,
  pipeCapacityBblFt, annularCapacityBblFt,
  pipeVolumeBbl, annularVolumeBbl, ecdPpg,
} from './drilling.js';
import {
  apiToSg, sgToApi,
  gorScfStbToSm3Sm3, gorSm3Sm3ToScfStb,
  oilFvfStanding, gasFvf, fahrenheitToRankine,
} from './production.js';
import {
  GAS_VOL_UNITS, convertGasVolume,
  gasSgToMw, mwToGasSg,
  pseudoCriticals, zFromConditions, gasDensityLbFt3,
} from './gas.js';
import { getPrefs, setPrefs, resetPrefs, formatNumber, applyTheme } from './preferences.js';

const $  = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function fmt(value) {
  return formatNumber(value, getPrefs().sigFigs);
}

function parseNum(el) {
  const n = parseFloat(el.value);
  return Number.isFinite(n) ? n : NaN;
}

// ---------- Tabs ----------

function initTabs() {
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      const target = btn.dataset.tab;
      $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === target));
    });
  });
}

// ---------- Unit converter ----------

function initUnitConverter() {
  const cat   = $('#uc-category');
  const from  = $('#uc-from-unit');
  const to    = $('#uc-to-unit');
  const fromV = $('#uc-from-value');
  const toV   = $('#uc-to-value');

  listCategories().forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = c.label;
    cat.appendChild(opt);
  });

  // Field-default starting units per category
  const FIELD_DEFAULTS = {
    volume: ['bbl', 'm3'],
    pressure: ['psi', 'kPa'],
    temperature: ['F', 'C'],
    length: ['ft', 'm'],
    mass: ['lb', 'kg'],
    flowRate: ['bbld', 'm3d'],
  };
  const SI_DEFAULTS = {
    volume: ['m3', 'bbl'],
    pressure: ['kPa', 'psi'],
    temperature: ['C', 'F'],
    length: ['m', 'ft'],
    mass: ['kg', 'lb'],
    flowRate: ['m3d', 'bbld'],
  };

  function refillUnits() {
    const opts = listUnits(cat.value);
    [from, to].forEach(sel => {
      sel.innerHTML = '';
      opts.forEach(u => {
        const o = document.createElement('option');
        o.value = u.id; o.textContent = u.name;
        sel.appendChild(o);
      });
    });
    const defaults = (getPrefs().unitSystem === 'si' ? SI_DEFAULTS : FIELD_DEFAULTS)[cat.value];
    if (defaults) { from.value = defaults[0]; to.value = defaults[1]; }
    recompute('from');
  }

  function recompute(side) {
    if (side === 'from') {
      const v = parseNum(fromV);
      if (Number.isNaN(v)) { toV.value = ''; return; }
      toV.value = fmt(convert(cat.value, v, from.value, to.value));
    } else {
      const v = parseNum(toV);
      if (Number.isNaN(v)) { fromV.value = ''; return; }
      fromV.value = fmt(convert(cat.value, v, to.value, from.value));
    }
  }

  cat.addEventListener('change', refillUnits);
  from.addEventListener('change', () => recompute('from'));
  to.addEventListener('change',   () => recompute('from'));
  fromV.addEventListener('input', () => recompute('from'));
  toV.addEventListener('input',   () => recompute('to'));

  cat.value = 'volume';
  fromV.value = '1';
  refillUnits();
}

// ---------- Drilling ----------

function initDrilling() {
  // Mud weight
  const mwFromV = $('#mw-from-value');
  const mwFromU = $('#mw-from-unit');
  const mwToU   = $('#mw-to-unit');
  const mwToV   = $('#mw-to-value');

  MUD_UNITS.forEach(u => {
    [mwFromU, mwToU].forEach(sel => {
      const o = document.createElement('option'); o.value = u; o.textContent = u;
      sel.appendChild(o);
    });
  });
  mwFromU.value = 'ppg'; mwToU.value = 'sg';

  function recomputeMud() {
    const v = parseNum(mwFromV);
    if (Number.isNaN(v)) { mwToV.value = ''; return; }
    mwToV.value = fmt(convertMudWeight(v, mwFromU.value, mwToU.value));
  }
  [mwFromV, mwFromU, mwToU].forEach(el => el.addEventListener('input', recomputeMud));
  mwFromU.addEventListener('change', recomputeMud);
  mwToU.addEventListener('change', recomputeMud);
  mwFromV.value = '8.3454';
  recomputeMud();

  // Hydrostatic pressure
  function recomputeHydro() {
    const mw = parseNum($('#hp-mw'));
    const tvd = parseNum($('#hp-tvd'));
    const sys = $('#hp-system').value;
    if (Number.isNaN(mw) || Number.isNaN(tvd)) { $('#hp-result').textContent = ''; return; }
    if (sys === 'field') {
      $('#hp-result').textContent = `${fmt(hydrostaticPsi(mw, tvd))} psi`;
    } else {
      $('#hp-result').textContent = `${fmt(hydrostaticKpa(mw, tvd))} kPa`;
    }
  }
  ['#hp-mw', '#hp-tvd', '#hp-system'].forEach(s => $(s).addEventListener('input', recomputeHydro));
  $('#hp-system').addEventListener('change', recomputeHydro);

  // Pipe / annular volume
  function recomputePipe() {
    const id = parseNum($('#pv-id'));
    const len = parseNum($('#pv-len'));
    if (!Number.isNaN(id)) {
      $('#pv-cap').textContent = `${fmt(pipeCapacityBblFt(id))} bbl/ft`;
      if (!Number.isNaN(len)) {
        $('#pv-vol').textContent = `${fmt(pipeVolumeBbl(id, len))} bbl`;
      } else $('#pv-vol').textContent = '';
    } else { $('#pv-cap').textContent = ''; $('#pv-vol').textContent = ''; }
  }
  ['#pv-id', '#pv-len'].forEach(s => $(s).addEventListener('input', recomputePipe));

  function recomputeAnn() {
    const dh = parseNum($('#av-dh'));
    const dp = parseNum($('#av-dp'));
    const len = parseNum($('#av-len'));
    if (!Number.isNaN(dh) && !Number.isNaN(dp)) {
      $('#av-cap').textContent = `${fmt(annularCapacityBblFt(dh, dp))} bbl/ft`;
      if (!Number.isNaN(len)) {
        $('#av-vol').textContent = `${fmt(annularVolumeBbl(dh, dp, len))} bbl`;
      } else $('#av-vol').textContent = '';
    } else { $('#av-cap').textContent = ''; $('#av-vol').textContent = ''; }
  }
  ['#av-dh', '#av-dp', '#av-len'].forEach(s => $(s).addEventListener('input', recomputeAnn));

  // ECD
  function recomputeEcd() {
    const mw = parseNum($('#ecd-mw'));
    const apl = parseNum($('#ecd-apl'));
    const tvd = parseNum($('#ecd-tvd'));
    if ([mw, apl, tvd].some(Number.isNaN)) { $('#ecd-result').textContent = ''; return; }
    $('#ecd-result').textContent = `${fmt(ecdPpg(mw, apl, tvd))} ppg`;
  }
  ['#ecd-mw', '#ecd-apl', '#ecd-tvd'].forEach(s => $(s).addEventListener('input', recomputeEcd));
}

// ---------- Production ----------

function initProduction() {
  // API <-> SG
  const apiV = $('#api-value');
  const sgV  = $('#api-sg');
  apiV.addEventListener('input', () => {
    const v = parseNum(apiV);
    sgV.value = Number.isNaN(v) ? '' : fmt(apiToSg(v));
  });
  sgV.addEventListener('input', () => {
    const v = parseNum(sgV);
    apiV.value = Number.isNaN(v) ? '' : fmt(sgToApi(v));
  });
  apiV.value = '30';
  sgV.value = fmt(apiToSg(30));

  // GOR
  const gorScf = $('#gor-scfstb');
  const gorSm  = $('#gor-sm3');
  gorScf.addEventListener('input', () => {
    const v = parseNum(gorScf);
    gorSm.value = Number.isNaN(v) ? '' : fmt(gorScfStbToSm3Sm3(v));
  });
  gorSm.addEventListener('input', () => {
    const v = parseNum(gorSm);
    gorScf.value = Number.isNaN(v) ? '' : fmt(gorSm3Sm3ToScfStb(v));
  });

  // Standing's Bo
  function recomputeBo() {
    const rs = parseNum($('#bo-rs'));
    const gg = parseNum($('#bo-gasSg'));
    const go = parseNum($('#bo-oilSg'));
    const tF = parseNum($('#bo-temp'));
    if ([rs, gg, go, tF].some(Number.isNaN) || go <= 0) { $('#bo-result').textContent = ''; return; }
    $('#bo-result').textContent = `Bo = ${fmt(oilFvfStanding(rs, gg, go, tF))} rb/STB`;
  }
  ['#bo-rs', '#bo-gasSg', '#bo-oilSg', '#bo-temp'].forEach(s => $(s).addEventListener('input', recomputeBo));

  // Bg
  function recomputeBg() {
    const z = parseNum($('#bg-z'));
    const tF = parseNum($('#bg-temp'));
    const p = parseNum($('#bg-press'));
    if ([z, tF, p].some(Number.isNaN) || p <= 0) { $('#bg-result').textContent = ''; return; }
    const bg = gasFvf(z, fahrenheitToRankine(tF), p);
    $('#bg-result').textContent = `Bg = ${fmt(bg)} rcf/scf  (${fmt(bg * 1000)} rcf/Mscf)`;
  }
  ['#bg-z', '#bg-temp', '#bg-press'].forEach(s => $(s).addEventListener('input', recomputeBg));
}

// ---------- Gas ----------

function initGas() {
  // Volume conversion
  const fromV = $('#gv-from-value');
  const fromU = $('#gv-from-unit');
  const toU   = $('#gv-to-unit');
  const toV   = $('#gv-to-value');
  GAS_VOL_UNITS.forEach(u => {
    [fromU, toU].forEach(sel => {
      const o = document.createElement('option'); o.value = u; o.textContent = u;
      sel.appendChild(o);
    });
  });
  fromU.value = 'Mscf'; toU.value = 'MMscf';
  function recomputeGv() {
    const v = parseNum(fromV);
    toV.value = Number.isNaN(v) ? '' : fmt(convertGasVolume(v, fromU.value, toU.value));
  }
  [fromV, fromU, toU].forEach(el => el.addEventListener('input', recomputeGv));
  fromU.addEventListener('change', recomputeGv);
  toU.addEventListener('change', recomputeGv);
  fromV.value = '1000';
  recomputeGv();

  // Gas SG <-> MW
  $('#gsg-sg').addEventListener('input', () => {
    const v = parseNum($('#gsg-sg'));
    $('#gsg-mw').value = Number.isNaN(v) ? '' : fmt(gasSgToMw(v));
  });
  $('#gsg-mw').addEventListener('input', () => {
    const v = parseNum($('#gsg-mw'));
    $('#gsg-sg').value = Number.isNaN(v) ? '' : fmt(mwToGasSg(v));
  });

  // Z-factor (Brill-Beggs) from gas SG, T(°F), P(psia)
  function recomputeZ() {
    const sg = parseNum($('#zf-sg'));
    const tF = parseNum($('#zf-temp'));
    const p = parseNum($('#zf-press'));
    if ([sg, tF, p].some(Number.isNaN) || sg <= 0 || p <= 0) {
      $('#zf-result').textContent = '';
      return;
    }
    const tR = fahrenheitToRankine(tF);
    const { tpc, ppc } = pseudoCriticals(sg);
    const z = zFromConditions(sg, tR, p);
    $('#zf-result').textContent =
      `Z = ${fmt(z)}   (Tpr = ${fmt(tR/tpc)}, Ppr = ${fmt(p/ppc)})`;
  }
  ['#zf-sg', '#zf-temp', '#zf-press'].forEach(s => $(s).addEventListener('input', recomputeZ));

  // Gas density
  function recomputeRho() {
    const sg = parseNum($('#gd-sg'));
    const tF = parseNum($('#gd-temp'));
    const p = parseNum($('#gd-press'));
    if ([sg, tF, p].some(Number.isNaN) || sg <= 0 || p <= 0) {
      $('#gd-result').textContent = '';
      return;
    }
    const tR = fahrenheitToRankine(tF);
    const z = zFromConditions(sg, tR, p);
    const rho = gasDensityLbFt3(p, sg, z, tR);
    $('#gd-result').textContent =
      `ρ = ${fmt(rho)} lb/ft³   (Z = ${fmt(z)})`;
  }
  ['#gd-sg', '#gd-temp', '#gd-press'].forEach(s => $(s).addEventListener('input', recomputeRho));
}

// ---------- Settings ----------

function initSettings() {
  const prefs = getPrefs();
  $('#pref-system').value = prefs.unitSystem;
  $('#pref-sigfigs').value = String(prefs.sigFigs);
  $('#pref-theme').value = prefs.theme;

  $('#pref-system').addEventListener('change', e => {
    setPrefs({ unitSystem: e.target.value });
  });
  $('#pref-sigfigs').addEventListener('change', e => {
    setPrefs({ sigFigs: parseInt(e.target.value, 10) });
    // Re-format visible values by re-firing input events on every numeric field
    $$('input[type="number"]').forEach(i => i.dispatchEvent(new Event('input', { bubbles: true })));
  });
  $('#pref-theme').addEventListener('change', e => {
    setPrefs({ theme: e.target.value });
    applyTheme(e.target.value);
  });
  $('#pref-reset').addEventListener('click', () => {
    const p = resetPrefs();
    $('#pref-system').value = p.unitSystem;
    $('#pref-sigfigs').value = String(p.sigFigs);
    $('#pref-theme').value = p.theme;
    applyTheme(p.theme);
  });
}

// ---------- Boot ----------

document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  initTabs();
  initUnitConverter();
  initDrilling();
  initProduction();
  initGas();
  initSettings();
});
