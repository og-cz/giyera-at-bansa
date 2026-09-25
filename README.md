# Giyera at Bansa

Squad-based real-time tactics game for Windows. Luzon, 1941–42. Inspired by Company of Heroes 2.

Version 0.1.0 · Single-player skirmish vs. AI · Offline

---

## Where to get things

- **The game (Windows):** [Releases page](https://github.com/og-cz/giyera-at-bansa/releases)
  - `GiyeraAtBansa-Setup-<version>.exe`: installer (Start menu shortcut, uninstaller)
  - `GiyeraAtBansa-Portable-<version>.exe`: single file, no install, runs from anywhere
- **Source code:** https://github.com/og-cz/giyera-at-bansa
- **Node.js 22 or newer** (only needed to build from source): https://nodejs.org (choose "LTS")
- **Git** (only needed to build from source): https://git-scm.com/downloads
- **Bug reports / suggestions:** https://github.com/og-cz/giyera-at-bansa/issues

## System requirements

- Windows 10 or 11, 64-bit
- 4 GB RAM
- 400 MB disk space
- Screen 1280×720 or larger
- Mouse with right button (middle button optional)

## Install

**Installer:** run `GiyeraAtBansa-Setup-<version>.exe`, choose a folder, finish. Start from the Start menu.

**Portable:** put `GiyeraAtBansa-Portable-<version>.exe` anywhere and double-click it.

**"Windows protected your PC" warning:** the app isn't code-signed yet. Click **More info → Run anyway**.

**Uninstall:** Settings → Apps → Giyera at Bansa → Uninstall. The portable version: delete the file.

## How to play

1. Choose a faction, a map and the AI difficulty, then press **Deploy**.
2. Capture points with infantry. Vehicles can't capture.
3. Each side has **500 tickets**. Holding more victory points (**V**) than the enemy drains their tickets.
4. You win when the enemy reaches 0 tickets or loses their HQ.

**Resources**

- **Manpower (MP):** builds and reinforces units. Comes from the base; upkeep grows with army size.
- **Munitions (MU):** grenades and barrages. From munitions points (**M**).
- **Fuel (FU):** tanks. From fuel points (**F**).
- A point only pays out while it is connected to your HQ through territory you own. A struck-through point is cut off.

**Cover** (the dots under the cursor show where soldiers will stand):

- Green = heavy cover (sandbags, stone walls, buildings)
- Yellow = light cover (hedgerows, craters, jungle)
- Red = exposed (rice paddies make soldiers easier to hit)
- Cover only protects against fire from the far side of it.

**Tips**

- Machine guns pin infantry inside their firing cone. Flank them or throw a grenade.
- Mortars need a friendly unit to see the target.
- Tanks have thin rear armour. Hit them from behind.
- Retreat (**R**) damaged squads before they're wiped out, then reinforce (**E**) at the HQ.

## Controls

| Key / mouse | Action |
| --- | --- |
| Left-click / drag | Select units (Shift adds; double-click selects the same unit type) |
| Right-click | Move, or attack the enemy under the cursor (Shift queues) |
| A | Attack-move |
| S | Stop |
| R | Retreat to HQ |
| E | Reinforce |
| D | Set up / tear down machine gun and mortar teams |
| G | Grenade |
| B | Mortar barrage |
| H | Select HQ (right-click then sets the rally point) |
| Ctrl + 1–9 / 1–9 | Assign / select control group (double-tap to jump) |
| Space | Centre on selection |
| Arrow keys, screen edge, middle-drag | Scroll |
| Mouse wheel | Zoom |
| F11 or Alt+Enter | Fullscreen |
| Esc or P | Pause menu |
| F1 | Controls |

## Units

| Role | USAFFE | Imperial Army |
| --- | --- | --- |
| Rifle squad | Rifle Squad: 5 men, grenades | Hohei Rifle Squad: 6 men, grenades |
| Machine gun | M1917 HMG Team | Type 92 HMG Team |
| Mortar | 60mm Mortar Team | Type 97 81mm Mortar Team |
| Anti-tank | Bazooka Squad | AT Rifle Team |
| Tank | M3 Stuart | Type 97 Chi-Ha |

**Maps:** Bataan Crossroads, Barrio San Roque.

## Troubleshooting

- **Window opens blank:** update your graphics driver, then restart the game.
- **Game runs slowly:** close other heavy programs and update your graphics driver.
- **Keyboard doesn't respond:** click inside the game window once to focus it.
- **Menu choices reset:** the last faction, map and difficulty are saved automatically; this is normal after a reinstall.

---

## Build from source

Needs Node.js and Git (see [Where to get things](#where-to-get-things)).

```bash
git clone https://github.com/og-cz/giyera-at-bansa.git
cd giyera-at-bansa
npm install
```

If npm skipped Electron's download step, fetch the runtime once:

```bash
node node_modules/electron/install.js
```

| Command | Result |
| --- | --- |
| `npm run app` | Build and open the game in a desktop window |
| `npm run dist` | Create the installer and portable `.exe` in `release/` |
| `npm run dev` | Development server with live reload (opens in a browser) |
| `npm test` | Run the game-logic tests, including full AI-vs-AI matches |
| `npm run typecheck` | Type-check the code |

**Project layout**

```
electron/   desktop window
src/data/   all unit, weapon, map and balance numbers (edit these to rebalance)
src/sim/    game rules: movement, combat, cover, suppression, vision, territory, economy
src/ai/     computer opponent
src/render/ drawing
src/ui/     menus and HUD
src/input/  mouse and keyboard
tests/      automated tests
```

