import './ui/styles.css';
import './ui/frontend.css';
import { audio } from './audio/audio';
import { CAMPAIGN } from './data/scenarios';
import { Game, type MatchSetup } from './game';
import { MenuBattle } from './ui/frontend/background';
import { showBriefing } from './ui/frontend/briefing';
import { showCampaign } from './ui/frontend/campaign';
import { showHowToPlay } from './ui/frontend/howToPlay';
import { playIntro } from './ui/frontend/intro';
import { showMainMenu } from './ui/frontend/mainMenu';
import { completeCampaign, recordTheater } from './ui/frontend/progress';
import { showSkirmish } from './ui/frontend/skirmish';
import { showTheater } from './ui/frontend/theater';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const layer = document.getElementById('ui') as HTMLElement;

/** Where a match was started from, so "Continue" and "Retry" know where to go. */
type Origin = { kind: 'skirmish' } | { kind: 'theater' } | { kind: 'campaign'; index: number };

let background: MenuBattle | null = null;

function cinematic(on: boolean): void {
  document.body.classList.toggle('cinematic', on);
  if (on) audio.playMusic('menu');
  if (on && !background) background = new MenuBattle(canvas);
  if (!on && background) {
    background.dispose();
    background = null;
  }
}

function mainMenu(): void {
  cinematic(true);
  showMainMenu(layer, {
    campaign: () => campaign(),
    theater: () => showTheater(layer, (setup) => briefThenPlay(setup, { kind: 'theater' }, theater), mainMenu),
    skirmish: () => showSkirmish(layer, (setup) => play(setup, { kind: 'skirmish' }), mainMenu),
    howToPlay: () => showHowToPlay(layer, mainMenu),
  });
}

function theater(): void {
  cinematic(true);
  showTheater(layer, (setup) => briefThenPlay(setup, { kind: 'theater' }, theater), mainMenu);
}

function campaign(focus?: number): void {
  cinematic(true);
  showCampaign(layer, (setup, index) => briefThenPlay(setup, { kind: 'campaign', index }, () => campaign(index)), mainMenu, focus);
}

function briefThenPlay(setup: MatchSetup, origin: Origin, back: () => void): void {
  if (!setup.scenario) return play(setup, origin);
  showBriefing(layer, setup.scenario, () => play(setup, origin), back);
}

function continueLabel(origin: Origin): string {
  if (origin.kind === 'campaign') return origin.index + 1 < CAMPAIGN.length ? 'Next mission' : 'Finish campaign';
  return origin.kind === 'theater' ? 'Theater of War' : 'Continue';
}

function play(setup: MatchSetup, origin: Origin): void {
  cinematic(false);
  new Game(canvas, layer, setup, continueLabel(origin), (result) => {
    if (result.won && setup.scenario) {
      if (origin.kind === 'campaign') completeCampaign(setup.scenario.id);
      if (origin.kind === 'theater') recordTheater(setup.scenario.id, setup.difficulty);
    }
    if (result.action === 'retry') return play(setup, origin);
    if (result.action === 'continue') {
      if (origin.kind === 'campaign') return campaign(Math.min(origin.index + 1, CAMPAIGN.length - 1));
      if (origin.kind === 'theater') return theater();
    }
    mainMenu();
  });
}

cinematic(true);
playIntro(layer, mainMenu);
