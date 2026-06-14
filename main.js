const { app, Menu, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// LIVE SERVER / HOT RELOAD SAUCE 🚀
// This monitors the whole directory and refreshes the app on save
require('electron-reload')(__dirname, {
  electron: path.join(__dirname, 'node_modules', '.bin', 'electron')
});

const menu_template = [
  {
    label: 'Application',
    submenu: [
      { label: 'Exit',
        role: 'quit'
       }
    ]
  },
  {
    label: 'Window',
    submenu: [
      { label: 'Hard Reload App',
        click: (item, win) => win && win.reload()
      
      },
      {
        label: 'Toggle audio',
        click: (item, win) => {
          if(win.webContents.audioMuted) win.webContents.setAudioMuted(false); else win.webContents.setAudioMuted(true);
        }
      },
      {
        label: 'Toggle FullScreen',
        click: (item, win) => {
          if (win) {
              win.isMaximized() ? win.unmaximize() : win.maximize();
          }
        }
      }
    ]
  }
]

ipcMain.on('quit-game', () => {
    //console.log("Kill signal received from UI. Yeeting the app 💀");
    app.quit();
});

ipcMain.on('toggle-maximize', (event) => {
    const webContents = event.sender;
    const win = BrowserWindow.fromWebContents(webContents);
    win.isMaximized() ? win.unmaximize() : win.maximize();
});

ipcMain.on('toggle-minimize', () => {
    BrowserWindow.getFocusedWindow().minimize();
});


function createWindow() {
  const win = new BrowserWindow({
    titleBarStyle: 'hidden',
    width: 1480,
    height: 920,
    minWidth: 700,  
    minHeight: 500,
    show: false,
    icon: path.join(__dirname, 'images', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadURL('https://play.cplegacy.com'); 

  var splash = new BrowserWindow({
     width: 500, 
     height: 300, 
     transparent: true, 
     frame: false, 
     alwaysOnTop: true 
  });
  splash.loadFile('splash.html');
  splash.center();

  setTimeout(function () {
  splash.close();
  win.show();
  }, 3000);

  

  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
    else if(input.key === 'F5'){
      win.reload();
    }
    else if(input.key === 'F11'){
      win.isMaximized() ? win.unmaximize() : win.maximize();
    }
    else if(input.key === 'M'){
      if(win.webContents.audioMuted) win.webContents.setAudioMuted(false); else win.webContents.setAudioMuted(true);
    }
  });
}

app.whenReady().then(() => {
  const menu = Menu.buildFromTemplate(menu_template);
  Menu.setApplicationMenu(menu);
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});