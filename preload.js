const { webFrame } = require('electron');
const fs = require('fs');
const path = require('path');

// Read the scripts
const uiLibCode = fs.readFileSync(path.join(__dirname, 'client', 'penguin-ui.js'), 'utf-8');
const cheatCode = fs.readFileSync(path.join(__dirname, 'client', 'cheat-main.js'), 'utf-8');

// Bypass the fed security by converting your local image to a Base64 string 🥶
let minImageBase64 = '';
try {
    const imgPath = path.join(__dirname, 'src', 'minimized.png');
    minImageBase64 = fs.readFileSync(imgPath, 'base64');
} catch (err) {
    console.error("Fuck, couldn't find the image in src/minimized.png:", err);
}

// Pass the image data to the window
const passImageData = `window._MM_MinImage = "data:image/png;base64,${minImageBase64}";`;

// 2. The core hooks (Console + WebSocket)
const coreHooks = `
    const _NativeLog = window.console.log;
    const _NativeError = window.console.error;

    window._MM_Log = function(...args) {
        _NativeLog.apply(window.console, ['%c[Penguin Terminal]%c', "color: #00ff00; font-weight: bold;", "", ...args]);
    };
    window._MM_Error = function(...args) {
        _NativeError.apply(window.console, ['%c[Penguin Terminal ERROR]%c', "color: #ff4444; font-weight: bold;", "", ...args]);
    };

    window.console.log = function() {};
    window.console.warn = function() {};

    const _NativeWS = window.WebSocket;
    window._MM_SOCKETS = [];

    window.WebSocket = class extends _NativeWS {
        constructor(url, protocols) {
            super(url, protocols);
            window._MM_SOCKETS.push(this);
            this.addEventListener('close', () => {
                const i = window._MM_SOCKETS.indexOf(this);
                if (i !== -1) window._MM_SOCKETS.splice(i, 1);
            });
        }
        send(payload) { super.send(payload); }
    };


    window._MM_sendRaw = function(bytes) {
        if (!window._MM_SOCKETS.length) {
            window._MM_Error('[Terminal] No active sockets.');
            return false;
        }
        window._MM_SOCKETS.forEach(s => s.send(bytes));
        return true;
    };

    

    // Hook the game engine
    
`;

// 3. Dependency Loader (Fetches msgpack)
const loadDependencies = `
    (async function() {
        try {
            const msgRes = await fetch('https://cdnjs.cloudflare.com/ajax/libs/msgpack-lite/0.1.26/msgpack.min.js');
            const msgCode = await msgRes.text();
            window.eval(msgCode);
            window._MM_Log("msgpack loaded natively 📦");
        } catch (err) {
            window._MM_Error("Failed to load msgpack:", err);
        }
    })();
`;

// Inject that shit sequentially into the main world
webFrame.executeJavaScript(coreHooks)
    .then(() => webFrame.executeJavaScript(loadDependencies))
    .then(() => webFrame.executeJavaScript(passImageData)) // INJECTS THE IMAGE SAUCE 🎨
    .then(() => webFrame.executeJavaScript(uiLibCode))
    .then(() => webFrame.executeJavaScript(cheatCode))
    .then(() => console.log("Modular setup injected locally. Massive W. 🚀"))
    .catch((err) => console.error("Fuck, injection failed:", err));