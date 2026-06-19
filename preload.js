const { webFrame, ipcRenderer, contextBridge } = require('electron');
const fs = require('fs');
const path = require('path');

try {
    contextBridge.exposeInMainWorld('PenguinBridge', {
        nukeApp: () => ipcRenderer.send('quit-game'),
        toggleMaximize: () => ipcRenderer.send('toggle-maximize'),
        toggleMinimize: () => ipcRenderer.send('toggle-minimize')

    });
} catch (e) {
    // Just in case contextIsolation is off and it bitches at you
    window.PenguinBridge = { 
        nukeApp: () => ipcRenderer.send('quit-game'),
        toggleMaximize: () => ipcRenderer.send('toggle-maximize'),
        toggleMinimize: () => ipcRenderer.send('toggle-minimize')
    };
}

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

    window.addEventListener('DOMContentLoaded', () => {

        // Inject font
        document.getElementsByTagName('head')[0].innerHTML += \`
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Balsamiq+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
        \`;

        const titleBar = document.createElement('div'); 
        titleBar.id = "titleBar";
        titleBar.style.cssText = \`
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 30px;
            background: #008ce1; 
            color: #ffffff;
            display: flex;
            justify-content: space-between; /* Spreads the items out */
            align-items: center;
            box-sizing: border-box;
            border-top: 2.2px solid #007ad2; 
            border-top-left-radius: 7px;
            border-top-right-radius: 7px;
            font-family: "Balsamiq Sans", sans-serif;
            letter-spacing: 1px;
            z-index: 9999999; 
            -webkit-app-region: drag; 
            user-select: none; 
            padding: 0 10px; /* Adds breathing room on the edges */
        \`;
        
        // 🔥 THE SAUCE: Added the <select> dropdown 🔥
        titleBar.innerHTML = \`
            <span id="penguin-title-text" style="font-size: 13px; font-weight: bold;">X-Yukon Client</span>
            
            <select id="server-selector">
                <option value="https://play.cplegacy.com">CPLegacy</option>
                <option value="https://play.cpjourney.net">CPJourney</option>
            </select>
            <button id="penguin-minimize-btn">—</button>
            <button id="penguin-maximize-btn">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1.5" y="1.5" width="9" height="9" stroke="currentColor" stroke-width="1.0" rx="1"/>
                </svg>
            </button>
            <button id="penguin-quit-btn">✕</button>
        \`;

        // Inject the CSS for the new dropdown and existing buttons
        const styleTag = document.createElement('style');
        styleTag.innerHTML = \`
            #titleBar:hover
            {
                cursor: pointer !important;
            }
            #penguin-maximize-btn,  #penguin-quit-btn, #penguin-minimize-btn{
                font-family: "Balsamiq Sans", sans-serif;
                position: fixed;
                width: 24px;
                height: 24px;
                background: #007ad2; 
                color: #ffffff; 
                text-shadow: none;
                border: 1px solid #0070c0 !important; 
                border-radius: 4px;
                cursor: pointer;
                font-size: 15px;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 0;
                line-height: 0;
                -webkit-app-region: no-drag; 
                transition: all 0.15s ease-in-out; 
            }
            #penguin-minimize-btn{
                right: 56px;
            }
            #penguin-maximize-btn{
                right: 30px;
                font-size: 20px;
            }
            #penguin-quit-btn {
                right: 4px;
            }
            #penguin-quit-btn:hover, #penguin-maximize-btn:hover, #penguin-minimize-btn:hover { background: #0070c0 !important; color: #ffffff !important; }
            
            /* 🔥 DRIP FOR THE SERVER SWITCHER 🔥 */
            #server-selector {
                position: fixed;
                top: 5px;
                left: 50%;
                transform: translateX(-50%);
                background: #007ad2;
                color: #ffffff;
                border: 1px solid #22a4f3;
                border-radius: 4px;
                padding: 2px 6px;
                font-size: 11px;
                font-weight: bold;
                outline: none;
                text-align: center;
                cursor: pointer;
                -webkit-app-region: no-drag; /* 🛑 STOPS IT FROM DRAGGING THE WINDOW */
                transition: border-color 0.2s;
                font-family: Consolas, monospace;
                text-transform: uppercase;
            }
            body::-webkit-scrollbar {
                width: 12px !important;
            }
            body::-webkit-scrollbar-track {
                background: #007ad2 !important;
            }
            body::-webkit-scrollbar-thumb {
                background-color: #008ce1 !important;
                border-radius: 2px !important;
                border: 3px solid transparent !important;
            }

            #server-selector:hover { border-color: #51bcff; }
            #server-selector option { background: #007ad2; color: #fff; }
        \`;
        document.head.appendChild(styleTag);
        document.documentElement.prepend(titleBar);

        // 🔥 LOGIC: Match the dropdown to the server you are currently playing 🔥
        const serverSelector = titleBar.querySelector("#server-selector");
        if (window.location.hostname.includes("cpjourney")) {
            serverSelector.value = "https://play.cpjourney.net";
        } else {
            serverSelector.value = "https://play.cplegacy.com";
        }

        // 🔥 LOGIC: Yeet the user to the new server when they click it 🔥
        serverSelector.addEventListener('change', (e) => {
            const newUrl = e.target.value;
            // Only reload if it's actually a different server
            if (!window.location.href.includes(newUrl)) {
                console.log(\`Swapping servers to \${newUrl}... 🚀\`);
                window.location.href = newUrl;
            }
        });

        // Titlebar buttons
        const quitBtn = titleBar.querySelector("#penguin-quit-btn");
        const maximizeBtn = titleBar.querySelector("#penguin-maximize-btn");
        const minimizeBtn = titleBar.querySelector("#penguin-minimize-btn");
        quitBtn.onclick = () => {
            if (window.PenguinBridge) window.PenguinBridge.nukeApp();
            else window.close(); 
        };
        maximizeBtn.onclick = () => {
            if (window.PenguinBridge) window.PenguinBridge.toggleMaximize();
            else window.close(); 
        };
        minimizeBtn.onclick = () => {
            if (window.PenguinBridge) window.PenguinBridge.toggleMinimize();
            else window.close();
        };


        // Fix the body scrolling logic
        document.documentElement.style.overflow = 'hidden';
        if (document.body) {
            document.body.style.marginTop = '30px';
            document.body.style.height = 'calc(100vh - 30px)'; 
            document.body.style.overflowY = 'auto'; 
            document.body.style.overflowX = 'hidden'; 
            document.body.style.boxSizing = 'border-box';
        }
    });

    window._MM_Log = function(...args) {
        _NativeLog.apply(window.console, ['%c[X-Yukon]%c', "color: #00ff00; font-weight: bold;", "", ...args]);
    };
    window._MM_Error = function(...args) {
        _NativeError.apply(window.console, ['%c[X-Yukon ERROR]%c', "color: #ff4444; font-weight: bold;", "", ...args]);
    };

    window.console.log = function() {};
    window.console.warn = function() {};

    const _NativeWS = window.WebSocket;
    window._MM_SOCKETS = [];

    window.WebSocket = new Proxy(_NativeWS, {
        construct(target, args) {
            const ws = new target(...args);
            const url = args[0] || '';

            const isRuffle = typeof url === 'string' && (
                url.startsWith('ws://localhost') ||
                url.startsWith('wss://localhost') ||
                url.includes('ruffle')
            );
            
            if (!isRuffle) {
                window._MM_SOCKETS.push(ws);
                ws.addEventListener('close', () => {
                    const i = window._MM_SOCKETS.indexOf(ws);
                    if (i !== -1) window._MM_SOCKETS.splice(i, 1);
                });
            }
            
            return ws;
        }
    });


    window._MM_sendRaw = function(bytes) {
        if (!window._MM_SOCKETS.length) {
            window._MM_Error('[Terminal] No active sockets.');
            return false;
        }
        window._MM_SOCKETS.forEach(s => s.send(bytes));
        return true;
    };
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