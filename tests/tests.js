// In-browser tests — open tests/test.html and check the page.

import { convert } from '../js/converters.js';
import {
  convertMudWeight, hydrostaticPsi, hydrostaticKpa,
  pipeCapacityBblFt, annularCapacityBblFt, ecdPpg,
} from '../js/drilling.js';
import {
  apiToSg, sgToApi, gorScfStbToSm3Sm3, oilFvfStanding, gasFvf, fahrenheitToRankine,
} from '../js/production.js';
import {
  convertGasVolume, gasSgToMw, mwToGasSg,
  pseudoCriticals, zFactorBrillBeggs, zFromConditions, gasDensityLbFt3,
} from '../js/gas.js';

const results = [];
let passed = 0, failed = 0;

function approx(actual, expected, tol = 1e-3, label = '') {
  const ok = Math.abs(actual - expected) <= tol * Math.max(1, Math.abs(expected));
  results.push({ ok, label, actual, expected });
  ok ? passed++ : failed++;
}

// ----- Core unit conversions -----

approx(convert('volume', 1, 'bbl', 'galUS'), 42, 1e-6, '1 bbl → 42 US gal');
approx(convert('volume', 1, 'bbl', 'L'), 158.987294928, 1e-6, '1 bbl → 158.987 L');
approx(convert('volume', 1, 'bbl', 'm3'), 0.158987294928, 1e-9, '1 bbl → 0.158987 m³');
approx(convert('volume', 1, 'ft3', 'm3'), 0.028316846592, 1e-9, '1 ft³ → 0.0283 m³');

approx(convert('pressure', 14.696, 'psi', 'kPa'), 101.325, 1e-3, '14.696 psi → 101.325 kPa');
approx(convert('pressure', 1, 'atm', 'psi'), 14.6959488, 1e-4, '1 atm → 14.696 psi');
approx(convert('pressure', 1, 'bar', 'kPa'), 100, 1e-9, '1 bar → 100 kPa');

approx(convert('temperature', 100, 'C', 'F'), 212, 1e-9, '100 °C → 212 °F');
approx(convert('temperature', 100, 'C', 'K'), 373.15, 1e-9, '100 °C → 373.15 K');
approx(convert('temperature', 32, 'F', 'C'), 0, 1e-9, '32 °F → 0 °C');
approx(convert('temperature', 491.67, 'R', 'F'), 32, 1e-3, '491.67 °R → 32 °F');

approx(convert('length', 1, 'mi', 'km'), 1.609344, 1e-9, '1 mi → 1.609344 km');
approx(convert('length', 1, 'ft', 'm'), 0.3048, 1e-9, '1 ft → 0.3048 m');
approx(convert('mass', 1, 'lb', 'kg'), 0.45359237, 1e-9, '1 lb → 0.4536 kg');

approx(convert('flowRate', 1, 'bbld', 'm3d'), 0.158987294928, 1e-6, '1 bbl/d → 0.159 m³/d');
approx(convert('flowRate', 1, 'MMscfd', 'Mscfd'), 1000, 1e-6, '1 MMscf/d → 1000 Mscf/d');

// ----- Drilling -----

approx(convertMudWeight(8.345404452, 'ppg', 'sg'), 1, 1e-6, '8.3454 ppg ≈ 1 SG');
approx(convertMudWeight(1, 'sg', 'psi/ft'), 0.4335, 5e-4, '1 SG ≈ 0.4335 psi/ft');
approx(convertMudWeight(8.345404452, 'ppg', 'psi/ft'), 0.4339, 5e-4, '8.3454 ppg ≈ 0.4339 psi/ft');

approx(hydrostaticPsi(12, 10000), 6240, 1e-9, 'MW 12 ppg @ 10000 ft → 6240 psi');
approx(hydrostaticKpa(1198.26427, 100), 1175.06, 1e-2, 'MW 1198.3 kg/m³ @ 100 m hydrostatic');

approx(pipeCapacityBblFt(4.276), 0.01776, 1e-3, 'ID 4.276" → 0.01776 bbl/ft');
approx(annularCapacityBblFt(8.5, 5), (8.5*8.5 - 5*5)/1029.4, 1e-9, 'annular cap formula');

approx(ecdPpg(12, 200, 10000), 12 + 200/(0.052*10000), 1e-9, 'ECD formula');

// ----- Production -----

approx(apiToSg(30), 0.876161, 1e-4, 'API 30 → SG 0.8762');
approx(sgToApi(apiToSg(30)), 30, 1e-9, 'API <-> SG roundtrip');
approx(gorScfStbToSm3Sm3(1000), 178.1076, 1e-3, '1000 scf/STB → 178.1 Sm³/Sm³');
approx(oilFvfStanding(500, 0.65, 0.85, 180), 1.2754, 5e-3, "Standing Bo example ~1.275");
approx(gasFvf(0.9, fahrenheitToRankine(180), 2000), 0.0283 * 0.9 * (180+459.67) / 2000, 1e-9, 'Bg formula');

// ----- Gas -----

approx(convertGasVolume(1000, 'Mscf', 'MMscf'), 1, 1e-9, '1000 Mscf → 1 MMscf');
approx(convertGasVolume(1, 'MMscf', 'Sm3'), 1e6 / 35.3146667214886, 1e-3, '1 MMscf → ~28316.85 Sm³');
approx(gasSgToMw(0.65), 18.827, 1e-3, 'γg=0.65 → MW≈18.83');
approx(mwToGasSg(28.9647), 1, 1e-9, 'MW 28.9647 → SG 1');

const pc = pseudoCriticals(0.65);
approx(pc.tpc, 365.10, 0.5, 'Sutton Tpc(0.65) ~ 365 °R');
approx(pc.ppc, 670.13, 0.5, 'Sutton Ppc(0.65) ~ 670 psia');

// Z-factor sanity: at low Ppr, Z should be near 1; at moderate Tpr~1.7, Ppr~3 ~0.85-0.95
approx(zFactorBrillBeggs(1.5, 0.1), 1, 0.05, 'Z near 1 at low Ppr');
const zMid = zFactorBrillBeggs(1.7, 3.0);
approx(zMid > 0.7 && zMid < 1.0 ? 1 : 0, 1, 1e-9, 'Z(Tpr=1.7,Ppr=3) in 0.7..1.0');

const z = zFromConditions(0.65, fahrenheitToRankine(150), 2000);
approx(z > 0.6 && z < 1.05 ? 1 : 0, 1, 1e-9, 'Z(0.65, 150°F, 2000 psia) in 0.6..1.05');

const rho = gasDensityLbFt3(2000, 0.65, z, fahrenheitToRankine(150));
approx(rho > 0 && rho < 20 ? 1 : 0, 1, 1e-9, 'gas density positive & finite');

// ----- Render -----

const root = document.getElementById('results');
const summary = document.getElementById('summary');
summary.textContent = `${passed} passed, ${failed} failed (${results.length} total)`;
summary.className = failed === 0 ? 'pass' : 'fail';

for (const r of results) {
  const li = document.createElement('li');
  li.className = r.ok ? 'pass' : 'fail';
  li.textContent = `${r.ok ? '✓' : '✗'} ${r.label}  — got ${r.actual}, expected ${r.expected}`;
  root.appendChild(li);
}
