import type { Squad } from '../entities';

/** Crew weapons (HMGs, mortars) must be set up to fire and torn down to move. */
export function startSetup(sq: Squad, facing: number): void {
  if (sq.def.kind !== 'team') return;
  sq.setupFacing = facing;
  if (sq.setup === 'packed') {
    sq.setup = 'settingUp';
    sq.setupTimer = sq.def.setupTime;
  }
}

export function startTeardown(sq: Squad): void {
  if (sq.setup === 'deployed' || sq.setup === 'settingUp') {
    sq.setup = 'tearingDown';
    sq.setupTimer = sq.def.teardownTime;
  }
}

export function updateSetupTimer(sq: Squad, dt: number): void {
  if (sq.setup !== 'settingUp' && sq.setup !== 'tearingDown') return;
  sq.setupTimer -= dt;
  if (sq.setupTimer <= 0) sq.setup = sq.setup === 'settingUp' ? 'deployed' : 'packed';
}
