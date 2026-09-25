# Giyera at Bansa

A 2D squad-based tactical RTS inspired by **Company of Heroes 2**, set during the 1941–42 defence of Luzon.
Design goals: CoH mechanics, simple 2D presentation, small scale.

It runs in the browser (TypeScript + HTML5 Canvas, no engine), so it can be run, tested and shared with one command.

## Play

```bash
npm install
npm run dev
```

Open the printed URL (default `http://localhost:5173`), pick a faction, a map and the AI difficulty, then **Deploy**.

**Goal:** each side starts with 500 tickets. Holding more victory points (V) than the enemy drains their tickets.
Reach 0 tickets — or lose your HQ — and you lose.

### Controls

| Input | Action |
| --- | --- |
| Left-click / drag | Select (Shift adds, double-click selects the same unit type on screen) |
| Right-click | Move, or attack the enemy under the cursor (Shift queues waypoints) |
| A | Attack-move |
| S | Stop |
| R | Retreat to HQ |
| E | Reinforce (near HQ or a supplied friendly point) |
| D | Set up / tear down HMG and mortar teams (click to choose facing) |
| G / B | Grenade / mortar barrage |
| H | Select HQ · right-click with HQ selected sets the rally point |
| Ctrl+1–9 / 1–9 | Assign / recall control groups (double-tap to jump there) |
| Space | Centre on selection |
| Arrows, screen edge, middle-drag, wheel | Camera pan and zoom |
| Esc / P / F1 | Pause / pause / controls |

## The CoH mechanics that are in

- **Squads** — the squad is the gameplay entity; each soldier has their own health and weapon, so casualties matter and squads can be reinforced.
- **Directional cover** — heavy (sandbags, stone walls, buildings), light (hedgerows, craters, jungle) and **negative** (rice paddies). Cover only counts against fire from the far side. Stopped squads spread out into nearby cover, and the cursor shows the preview dots (green heavy, yellow light, red exposed).
- **Suppression** — MG fire suppresses (slower, less accurate) and then **pins** squads. Retreating squads can't be pinned.
- **Crew weapons** — HMGs and mortars must set up and tear down, and HMGs have a 70° firing arc that pivots slowly.
- **Line of sight and fog of war** — buildings block sight, and dense jungle hides units after a few tiles.
- **Armour** — front and rear armour, penetration chance = pen ÷ armour, "Deflected" feedback, turrets that rotate on their own, tanks that reverse to keep their front armour facing the enemy, and tanks crushing hedgerows and sandbags.
- **Explosives** — mortars, grenades and HE shells scatter, have friendly fire and leave craters that become new cover.
- **Territory and supply** — points pay out only while connected to your HQ through owned sectors. Cut the enemy's line and their income stops.
- **Economy** — manpower, munitions and fuel. Manpower upkeep grows with army size.
- **Retreat and reinforce** — retreat fast to the HQ, heal there, and pay manpower to replace casualties.
- **Veterancy** — XP from damage dealt and kills raises accuracy and toughness.
- **AI** — builds a counter composition, captures and defends points, retreats, reinforces, uses grenades and barrages, and pushes your HQ when it's winning. It sees only what its units see and uses the same commands as the player.

## Content

| | USAFFE | Imperial Army |
| --- | --- | --- |
| Line infantry | Rifle Squad (5× M1 Garand) | Hohei Rifle Squad (6× Arisaka) |
| Machine gun | M1917 HMG Team | Type 92 HMG Team |
| Indirect fire | 60mm Mortar Team | Type 97 81mm Mortar Team |
| Anti-tank | Bazooka Squad | AT Rifle Team |
| Armour | M3 Stuart | Type 97 Chi-Ha |

Maps: **Bataan Crossroads** and **Barrio San Roque**, both point-symmetric so the starting positions are equal.

## Project layout

```
src/
  core/      vector math, seeded RNG
  data/      ALL stats: terrain, weapons, units, abilities, factions, maps, balance
  sim/       deterministic simulation — no DOM, no rendering
    systems/ movement, combat, cover, suppression, vision, territory,
             economy, production, logistics, abilities, victory
    commands.ts  the only way to give orders (used by input AND the AI)
    world.ts     owns state, runs systems in a fixed order at 30 Hz
  ai/        skirmish commander
  render/    canvas renderer, terrain layer, effects, camera
  input/     mouse/keyboard → commands
  ui/        DOM HUD, minimap, menus, overlays
tests/       simulation tests + full AI-vs-AI matches
```

Architecture rules:

- **Data-driven** — no unit stats are hardcoded in the systems. Change `src/data/*.ts` to rebalance.
- **Rendering separate from gameplay** — `sim/` never imports from `render/`, `ui/` or `input/`.
- **Each system is independently testable** — `npm test` runs them headless.
- **Don't rewrite working systems** — inspect the current behaviour and keep it, unless a change explicitly needs to break it.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm test` | Run simulation tests, including AI-vs-AI matches on both maps |
| `npm run typecheck` | Strict TypeScript check |
| `npm run build` | Production build into `dist/` (static files, host anywhere) |

## Roadmap status

- [x] Milestone 0 — project foundation, camera, input
- [x] Milestone 1 — select, move, attack, health and death
- [x] Milestone 2 — squads, formations, casualties
- [x] Milestone 3 — cover, suppression, line of sight, fog of war
- [x] Milestone 4 — capture points, resources, reinforcements, base, production
- [x] Milestone 5 — tank, armour, penetration, turret, vehicle movement
- [x] Milestone 6 — AI: attack, defend, capture, retreat, reinforce
- [~] Milestone 7 — content: 2 factions, 10 unit types, 2 maps (a third map still to do)
- [ ] Milestone 8 — polish: sounds, sprites/animation, balancing
