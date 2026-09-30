import './ui/styles.css';
import './ui/frontend.css';
import { audio } from './audio/audio';
import { installUiSounds } from './audio/uiSounds';
import { CAMPAIGN } from './data/campaign';
import { Game, type MatchSetup } from './game';
import { MenuBattle } from './ui/frontend/background';
import { showBriefing } from './ui/frontend/briefing';
import { showCampaign, type CampaignSpot } from './ui/frontend/campaign';
import { showHowToPlay } from './ui/frontend/howToPlay';
import { playIntro } from './ui/frontend/intro';
import { showMainMenu } from './ui/frontend/mainMenu';
import { completeCampaign, recordTheater } from './ui/frontend/progress';
import { showSkirmish } from './ui/frontend/skirmish';
import { showStory } from './ui/frontend/story';
import { setupFor, showTheater } from './ui/frontend/theater';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const layer = document.getElementById('ui') as HTMLElement;

/** Where a match was started from, so "Continue" and "Retry" know where to go. */
type Origin = { kind: 'skirmish' } | { kind: 'theater' } | ({ kind: 'campaign' } & CampaignSpot);

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
  showCampaign(layer, (setup, spot) => campaignPart(setup, spot), mainMenu, focus);
}

/** A campaign part: its story scenes, then the briefing, then the battle. */
function campaignPart(setup: MatchSetup, spot: CampaignSpot): void {
  cinematic(true);
  const mission = CAMPAIGN[spot.mission];
  const s = setup.scenario!;
  showStory(layer, `${mission.name} · Part ${spot.part + 1}`, s.name, s.story ?? [], () =>
    briefThenPlay(setup, { kind: 'campaign', ...spot }, () => campaign(spot.mission)),
  );
}

/** After a won campaign part: on to the next part, or the mission's ending and the next mission. */
function campaignNext(setup: MatchSetup, spot: CampaignSpot): void {
  const mission = CAMPAIGN[spot.mission];
  if (spot.part + 1 < mission.parts.length) {
    return campaignPart(setupFor(mission.parts[spot.part + 1], setup.difficulty), { mission: spot.mission, part: spot.part + 1 });
  }
  cinematic(true);
  const next = Math.min(spot.mission + 1, CAMPAIGN.length - 1);
  showStory(layer, `${mission.name} · Aftermath`, mission.name, setup.scenario?.aftermath ?? [], () => campaign(next));
}

function briefThenPlay(setup: MatchSetup, origin: Origin, back: () => void): void {
  if (!setup.scenario) return play(setup, origin);
  showBriefing(layer, setup.scenario, () => play(setup, origin), back);
}

function continueLabel(origin: Origin): string {
  if (origin.kind === 'campaign') {
    if (origin.part + 1 < CAMPAIGN[origin.mission].parts.length) return 'Next part';
    return origin.mission + 1 < CAMPAIGN.length ? 'Next mission' : 'Finish campaign';
  }
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
      if (origin.kind === 'campaign') return result.won ? campaignNext(setup, origin) : campaign(origin.mission);
      if (origin.kind === 'theater') return theater();
    }
    mainMenu();
  });
}

installUiSounds();
cinematic(true);
playIntro(layer, mainMenu);
