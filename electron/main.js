import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEV_URL = process.env.VITE_DEV_SERVER_URL;

const saveDir = () => path.join(app.getPath('userData'), 'saves');
const savePath = () => path.join(saveDir(), 'autosave.json');

let quitting = false;

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 680,
    backgroundColor: '#070b14',
    title: 'Vigilant City',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);
  if (DEV_URL) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
  return win;
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  quitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' || quitting) app.quit();
});

ipcMain.handle('save:write', async (_event, data) => {
  await mkdir(saveDir(), { recursive: true });
  await writeFile(savePath(), data, 'utf8');
  return true;
});

ipcMain.handle('save:read', async () => {
  try {
    return await readFile(savePath(), 'utf8');
  } catch {
    return null;
  }
});
