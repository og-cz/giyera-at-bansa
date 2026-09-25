import './ui/styles.css';
import { Game } from './game';
import { showMainMenu } from './ui/menu';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const layer = document.getElementById('ui') as HTMLElement;

function menu(): void {
  showMainMenu(layer, (setup) => new Game(canvas, layer, setup, menu));
}

menu();
