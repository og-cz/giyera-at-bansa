import { describe, expect, it } from 'vitest';
import { SIM_DT, TILE } from '../src/data/balance';
import { CAMPAIGN, SCENARIOS, THEATER } from '../src/data/scenarios';
import { ALL_MAPS } from '../src/data/theaterMaps';
import { dist } from '../src/core/vec';
import { issueAttackMove } from '../src/sim/commands';
import { findPath } from '../src/sim/pathfinding';
import { scaleWave } from '../src/sim/systems/objectives';
import { World } from '../src/sim/world';

const worldFor = (id: string, difficulty: 'easy' | 'normal' | 'hard' = 'normal') => {
  const s = SCENARIOS[id];
  return new World({ map: ALL_MAPS[s.map], factions: [s.factions[0], s.factions[1]], scenario: s, difficulty, seed: 5 });
};

function run(world: World, seconds: number): void {
  for (let t = 0; t < seconds && world.winner === -1; t += SIM_DT) {
    world.step(SIM_DT);
    world.events.length = 0;
  }
}

function killTeam(world: World, team: 0 | 1): void {
  for (const sq of world.squads) {
    if (sq.team !== team || sq.def.kind === 'structure') continue;
    for (const m of sq.models) m.alive = false;
    sq.dead = true;
  }
}

describe('scenario data', () => {
  it('references valid maps and points', () => {
    for (const s of [...THEATER, ...CAMPAIGN]) {
      const map = ALL_MAPS[s.map];
      expect(map, s.id).toBeDefined();
      for (const i of s.defense?.hold ?? []) expect(map.points[i], s.id).toBeDefined();
      for (const i of s.offensive?.sectors ?? []) expect(map.points[i], s.id).toBeDefined();
    }
  });

  it.each(Object.keys(ALL_MAPS))('every point on %s is reachable from both bases', (id) => {
    const world = new World({ map: ALL_MAPS[id], factions: ['usaffe', 'ija'] });
    for (const team of world.teams) {
      for (const p of world.points) {
        for (const mover of ['infantry', 'vehicle'] as const) {
          const goal = world.map.nearestPassable(p.pos, mover);
          const end = findPath(world.map, team.spawn, goal, mover).at(-1) ?? team.spawn;
          expect(Math.hypot(end.x - goal.x, end.y - goal.y), `${mover} team ${team.id} → ${p.name}`).toBeLessThan(TILE * 2);
        }
      }
    }
  });

  it.each([...THEATER, ...CAMPAIGN].map((s) => s.id))('%s: the enemy HQ can be reached and destroying it wins', (id) => {
    const world = worldFor(id);
    const hq = world.hqOf(1)!;
    expect(hq, 'enemy HQ').toBeDefined();
    for (const mover of ['infantry', 'vehicle'] as const) {
      const goal = world.map.nearestPassable(hq.pos, mover);
      const end = findPath(world.map, world.teams[0].spawn, goal, mover).at(-1) ?? world.teams[0].spawn;
      // Close enough to shoot at it.
      expect(Math.hypot(end.x - hq.pos.x, end.y - hq.pos.y), mover).toBeLessThan(hq.def.radius + TILE * 6);
    }
    for (const m of hq.models) m.alive = false;
    hq.dead = true;
    run(world, 0.1);
    expect(world.winner).toBe(0);
  });

  it('wave spawns can reach the hold point', () => {
    for (const s of [...THEATER, ...CAMPAIGN]) {
      if (!s.defense) continue;
      const world = worldFor(s.id);
      const hold = world.points[s.defense.hold[0]].pos;
      for (const sp of s.defense.spawns) {
        const from = world.map.nearestPassable({ x: sp.x * TILE, y: sp.y * TILE }, 'infantry');
        const end = findPath(world.map, from, hold, 'infantry').at(-1)!;
        expect(Math.hypot(end.x - hold.x, end.y - hold.y), `${s.id} spawn ${sp.x},${sp.y}`).toBeLessThan(TILE * 2);
      }
    }
  });
});

describe('defense mode', () => {
  it('scales waves by difficulty', () => {
    expect(scaleWave(['r', 'r', 'mg'], 'easy', 'r')).toEqual(['r', 'mg']);
    expect(scaleWave(['r', 'r'], 'easy', 'r')).toEqual(['r', 'r']);
    expect(scaleWave(['r', 'mg'], 'hard', 'r')).toEqual(['r', 'mg', 'r']);
  });

  it('places defenders and starts with the hold point owned', () => {
    const world = worldFor('tow-summit');
    expect(world.points[0].owner).toBe(0);
    const hmg = world.squads.find((s) => s.team === 0 && s.def.id === 'us_hmg')!;
    expect(hmg.setup).toBe('deployed');
    expect(world.squads.filter((s) => s.team === 1 && s.def.kind !== 'structure')).toHaveLength(0);
  });

  it('sends the first wave after the prep time', () => {
    const world = worldFor('tow-summit');
    run(world, 59);
    expect(world.objective.wave).toBe(0);
    run(world, 2);
    expect(world.objective.wave).toBe(1);
    expect(world.objective.waveSquads.length).toBe(2);
  });

  it('is lost when the hold point falls', () => {
    const world = worldFor('tow-summit');
    world.points[0].owner = 1;
    world.points[0].control = -1;
    run(world, 1);
    expect(world.winner).toBe(1);
  });

  it('attackers push forward instead of trading fire from maximum range', () => {
    const world = worldFor('tow-city');
    world.objective.nextWaveIn = Infinity;
    killTeam(world, 0);
    const plaza = world.points[0].pos;
    const defender = world.spawn(0, 'us_riflemen', plaza, 0);
    for (const m of defender.models) m.hp = m.maxHp = 1e6;
    const attacker = world.spawn(1, 'ija_riflemen', { x: plaza.x, y: plaza.y + 20 * TILE }, -Math.PI / 2);
    for (const m of attacker.models) m.hp = m.maxHp = 1e6;
    world.objective.waveSquads.push(attacker.id);
    issueAttackMove(world, attacker, plaza);
    let closest = Infinity;
    for (let t = 0; t < 60; t += SIM_DT) {
      world.step(SIM_DT);
      world.events.length = 0;
      closest = Math.min(closest, dist(attacker.pos, defender.pos));
    }
    // Rifles open fire at 180; without pushing the attacker would stay out there.
    expect(closest).toBeLessThan(120);
  });

  it('is won when every wave is destroyed', () => {
    const world = worldFor('tow-city', 'easy');
    while (world.objective.wave < world.objective.totalWaves) {
      run(world, 1);
      killTeam(world, 1);
      world.objective.nextWaveIn = Math.min(world.objective.nextWaveIn, 0.5);
    }
    run(world, 1);
    expect(world.winner).toBe(0);
  });
});

describe('offensive mode', () => {
  it('only the current sector can be captured', () => {
    const world = worldFor('tow-highway');
    expect(world.points.map((p) => p.locked)).toEqual([false, true, true, true]);
    expect(world.points.every((p) => p.owner === 1)).toBe(true);
    expect(world.squads.filter((s) => s.team === 1 && s.def.kind !== 'structure').length).toBeGreaterThan(10);
  });

  it('capturing a sector advances the front and adds time', () => {
    const world = worldFor('tow-highway');
    const before = world.objective.timeLeft;
    const spawnBefore = world.teams[0].spawn.x;
    world.points[0].owner = 0;
    world.points[0].control = 1;
    run(world, SIM_DT);
    expect(world.objective.sector).toBe(1);
    expect(world.points[0].locked).toBe(true);
    expect(world.points[1].locked).toBe(false);
    expect(world.objective.timeLeft).toBeGreaterThan(before + 170);
    expect(world.teams[0].spawn.x).toBeGreaterThan(spawnBefore + 200);
  });

  it('launches counterattacks once the push has started', () => {
    const world = worldFor('tow-highway');
    world.points[0].owner = 0;
    world.points[0].control = 1;
    const before = world.squads.length;
    world.objective.counterIn = 0.1;
    run(world, 0.5);
    expect(world.squads.length).toBeGreaterThan(before);
  });

  it('is lost when time runs out', () => {
    const world = worldFor('tow-highway');
    world.objective.timeLeft = 0.05;
    run(world, 0.5);
    expect(world.winner).toBe(1);
  });

  it('is won after the last sector', () => {
    const world = worldFor('c4-return');
    for (const i of [0, 1, 2, 3]) {
      world.points[i].locked = false;
      world.points[i].owner = 0;
      world.points[i].control = 1;
      run(world, SIM_DT);
    }
    expect(world.winner).toBe(0);
  });
});

describe('every scenario runs', () => {
  it.each(Object.keys(SCENARIOS))('%s simulates two minutes without errors', (id) => {
    const world = worldFor(id);
    run(world, 120);
    expect(world.time).toBeGreaterThan(0);
  });
});
