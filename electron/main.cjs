// Desktop shell: runs the game in its own window, offline, with no browser UI.
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('node:path');

const DEV_URL = process.env.GAME_DEV_URL;
// Launches hidden, confirms the game loaded, then quits. Used to verify builds.
const SMOKE = process.argv.includes('--smoke-test');

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1100,
    minHeight: 650,
    show: false,
    backgroundColor: '#11150f',
    title: 'Giyera at Bansa',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });

  if (SMOKE) {
    win.webContents.once('did-finish-load', async () => {
      const ok = await win.webContents.executeJavaScript("!!document.querySelector('.splash, .title-screen, .main-menu')");
      console.log(ok ? 'SMOKE_OK' : 'SMOKE_FAIL');
      app.exit(ok ? 0 : 1);
    });
    win.webContents.once('did-fail-load', (_e, code, desc) => {
      console.log(`SMOKE_FAIL ${code} ${desc}`);
      app.exit(1);
    });
  } else {
    win.once('ready-to-show', () => {
      win.maximize();
      win.show();
    });
  }

  if (DEV_URL) win.loadURL(DEV_URL);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

Menu.setApplicationMenu(null);
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
