# OG-tools

Free, offline-capable oil &amp; gas converter and field calculator.
Built as a static web app — no install, no signup, no backend.

## Features

- **Unit converter** — volume, pressure, temperature, length, mass, flow rate
  (bbl, gal, m³, psi, kPa, bar, atm, °F/°C/K/°R, ft/m, lb/kg, bbl/d, scf/d,
  Mscf/d, MMscf/d, …)
- **Drilling** — mud-weight conversion (ppg ↔ SG ↔ lb/ft³ ↔ kg/m³ ↔ psi/ft),
  hydrostatic pressure, pipe &amp; annular capacity / volume, ECD
- **Production / reservoir** — API ↔ specific gravity, gas-oil ratio,
  Standing oil FVF (Bo), gas FVF (Bg)
- **Gas** — scf/Mscf/MMscf/Bcf/Sm³ conversion, Brill–Beggs Z-factor with
  Sutton pseudo-criticals, real-gas density, gas SG ↔ MW
- **Settings** — default unit system, significant figures, light/dark theme,
  persisted in `localStorage`

## Run locally

The app is plain HTML/CSS/ES modules. Modules require a real HTTP origin
(browsers block `file://` ES module imports), so serve the folder:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Tests

Open `http://localhost:8000/tests/test.html` — assertions run in the page
and a green/red summary is shown at the top.

## Deploy to GitHub Pages

In repo Settings → Pages, set the source to `main` branch / root. The site
is fully static and works as-is.

## Disclaimer

Field correlations (Standing Bo, Brill–Beggs Z, etc.) are approximations.
For safety-critical work, verify against authoritative sources and your
own measured data.

## License

MIT — see `LICENSE`.
