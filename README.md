# Taga Komando

Squad-based real-time tactics game for Windows. Luzon, 1941–45.

*Factions are dramatized. The battles and places are inspired by real events on Luzon, 1941–45.*

Version 0.3.4 · Campaign, Theater of War and Skirmish vs. AI · Offline

---

## Where to get things

- **The game (Windows):** [Releases page](https://github.com/og-cz/giyera-at-bansa/releases)
  - `TagaKomando-Setup-<version>.exe`: installer (Start menu shortcut, uninstaller)
  - `TagaKomando-Portable-<version>.exe`: single file, no install, runs from anywhere
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

**Installer:** run `TagaKomando-Setup-<version>.exe`, choose a folder, finish. Start from the Start menu.

**Portable:** put `TagaKomando-Portable-<version>.exe` anywhere and double-click it.

**"Windows protected your PC" warning:** the app isn't code-signed yet. Click **More info → Run anyway**.

**Uninstall:** Settings → Apps → Taga Komando → Uninstall. The portable version: delete the file.

## Game modes

Pick a mode from the main menu.

**Campaign**: the defence and liberation of Luzon, played in order. Each mission unlocks the next.

| # | Mission | Date | Type |
| --- | --- | --- | --- |
| 1 | Withdrawal to Bataan | December 1941 | Annihilation: destroy the enemy vanguard |
| 2 | Layac Junction | 6 January 1942 | Defense: hold the stone bridge against 6 waves |
| 3 | Mount Samat | April 1942 | Defense: hold the summit against 10 waves |
| 4 | The Road to Manila | January 1945 | Offensive: take Route 3 town by town to the Calumpit bridge |

**Theater of War**: four operations you can replay on any difficulty. Win on Easy, Normal and Hard for Bronze, Silver and Gold medals.

- **Defend the City** (City Defense): hold the Plaza de Roma inside the walls of Intramuros against 8 waves coming through three gates.
- **Hold the Summit** (Hill Defense): defend a hilltop against 8 waves.
- **Highway 3 Assault** (Highway Assault): break 4 fortified positions along a highway before time runs out.
- **Battle for Luzon** (Historical Skirmish): a full battle on historical ground with the victory condition of your choice.

**Skirmish**: a match against the AI on a map of your choice, with a victory condition of your choice:

- **Capture Points:** holding more victory points drains the enemy's 500 tickets.
- **Annihilation:** destroy every enemy unit and their headquarters.
- **None:** no victory condition; fight as long as you like.

How the mission types work:

- **Defense:** keep the marked **HOLD** point. Waves come on a timer and get stronger. You lose if the point falls.
- **Offensive:** capture the marked **OBJECTIVE** sectors in order. Each one adds 3 minutes and moves your reinforcement point forward. The enemy counterattacks.
- **Battle / Skirmish:** won by the chosen victory condition (Capture Points, Annihilation or None).

## How to play

1. Choose a mode, then a mission or map and the difficulty, then press **Deploy**.
2. Capture points with infantry. Vehicles can't capture.
3. Complete the mission objective shown at the top of the screen.
4. Destroying the enemy HQ always wins; losing yours always loses.

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
| Right-click + drag | Move there and face the drag direction. Machine gun and mortar teams set up aimed that way; the firing cone shows while you drag |
| A | Attack-move |
| S | Stop |
| R | Retreat to HQ |
| E | Reinforce |
| D | Set up / tear down machine gun and mortar teams (shows the firing cone; click to aim) |
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

| Role | Hukbong Maharlika | Imperial Army |
| --- | --- | --- |
| Rifle squad | Rifle Squad: 5 men, grenades | Hohei Rifle Squad: 6 men, grenades |
| Machine gun | M1917 HMG Team | Type 92 HMG Team |
| Mortar | 60mm Mortar Team | Type 97 81mm Mortar Team |
| Anti-tank | Bazooka Squad | AT Rifle Team |
| Tank | M3 Stuart | Type 97 Chi-Ha |

**Maps:** Bataan Crossroads, Barrio San Roque (skirmish), Mount Samat, Route 3, Intramuros (missions).

## Changelog

**0.3.4**
- The Filipino faction is now called **Hukbong Maharlika** (Maharlika Army).
- New victory conditions: **Capture Points**, **Annihilation** and **None**, chosen in Skirmish and in the Battle for Luzon operation.
- Campaign mission 1, *Withdrawal to Bataan*, is now an annihilation battle.
- **Right-click drag** to move and face: machine gun and mortar teams set up aimed that way, and their firing cone shows while you drag. **Set Up (D)** shows the live cone too.
- New in-game HUD: objective and timer top centre, unit roster top right, minimap, unit portrait card and command card along the bottom, with rich tooltips.
- Theater of War redesigned as four operation cards: City Defense, Hill Defense, Highway Assault and Historical Skirmish.
- New map: **Intramuros**, the walled city of Manila, for the new **Defend the City** operation (replaces Defend the Barrio).
- New terrain: fortress walls that cannot be climbed or seen through.

**0.3.0**
- The game is now called **Taga Komando**. Saved campaign progress and medals carry over.
- The splash screen now reads **OGCZ presents**.
- A crash in one frame no longer freezes the match; the game keeps running and shows the error.
- Desktop app: **F12** opens the developer console for bug reports.

**0.2.0**
- New main menu with a cinematic startup: studio card, title screen and a live battle in the background.
- Three modes: **Campaign** (4 historical missions), **Theater of War** (3 replayable operations with medals) and **Skirmish**.
- New mission types: **Defense** (survive waves) and **Offensive** (capture sectors in order against the clock).
- New maps: Mount Samat and Route 3.
- Mission briefings before every campaign and Theater of War mission.
- New result screens: Victory in gold on white, Defeat in red on black. Retry or continue straight from the result.

**0.1.0**
- First playable release: skirmish vs. AI, 2 factions, 10 unit types, 2 maps.

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

