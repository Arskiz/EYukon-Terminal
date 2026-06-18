const { app, Menu, BrowserWindow, ipcMain, crashReporter } = require('electron');
const path = require('path');


// BOOT UP THE FED TRACKER 🚓
crashReporter.start({
  submitURL: '', // Leave empty, we ain't sending this to a server
  uploadToServer: false,
  compress: false
});

console.log("Crash dumps will be saved here: ", app.getPath('crashDumps'));

// LIVE SERVER / HOT RELOAD SAUCE 🚀
// This monitors the whole directory and refreshes the app on save
require('electron-reload')(__dirname, {
  electron: path.join(__dirname, 'node_modules', '.bin', 'electron')
});

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
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
    }
  });

  win.webContents.on('render-process-gone', (event, details) => 
    {
      console.log("Reason:", details.reason);
      console.log("Exit Code:", details.exitCode);

      const { dialog } = require('electron');
      
      dialog.showMessageBox({
          type: 'error',
          title: 'X-Yukon Client Crashed',
          message: 'The renderer process crashed.',
          detail: `Reason: ${details.reason}\nExit Code: ${details.exitCode}\n\nThis is a known problem mostly occurring with the yukon and Ruffle interacting with each other and loading .wasm files and has nothing to do with X-Yukon itself. Most likely you got here from clicking the newspaper ingame. Report it to the CPLegacy devs to address this.`,
          buttons: ['Reload X-Yukon', 'Quit the app'],
          defaultId: 0,
      }).then(result => {
          if (result.response === 0) {
              win.reload();
          } else {
              app.quit();
          }
      });
  });

  win.on('unresponsive', () => {
      const { dialog } = require('electron');
      dialog.showMessageBox({
          type: 'error',
          title: 'X-Yukon Client Crashed',
          message: 'The renderer process crashed.',
          detail: `Reason: ${details.reason}\nExit Code: ${details.exitCode}\n\nThis is a known problem mostly occurring with the yukon and Ruffle interacting with each other and loading .wasm files and has nothing to do with X-Yukon itself. Most likely you got here from clicking the newspaper ingame. Report it to the CPLegacy devs to address this.`,
          buttons: ['Reload X-Yukon', 'Quit the app'],
          defaultId: 0,
      }).then(result => {
          if (result.response === 0) {
              win.reload();
          } else {
              app.quit();
          }
      });
  });

  win.loadURL('https://play.cplegacy.com'); 

  var splash = new BrowserWindow({
     width: 600, 
     height: 350, 
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
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('no-sandbox');