window.PenguinUI = (function () {
    'use strict';

    const Config = {
        get(key, defaultVal) {
            const val = window.localStorage.getItem(`_MM_${key}`);
            return val !== null ? JSON.parse(val) : defaultVal;
        },
        set(key, val) {
            window.localStorage.setItem(`_MM_${key}`, JSON.stringify(val));
        }
    };

    const AudioFX = {
        ctx: null,
        init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
        playClick() {
            this.init(); const ctx = this.ctx; const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(600, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.15, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
            osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.08);
        },
        playToggle(isOn) {
            this.init(); const ctx = this.ctx; const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.type = 'triangle'; osc.frequency.setValueAtTime(isOn ? 400 : 300, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(isOn ? 800 : 150, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.1, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
            osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.12);
        }
    };

    const style = `
        :root { 
            --mm-theme: ${Config.get('theme_color', '#bf0000')};
            --mm-title: ${Config.get('title_color', '#ffffff')};
            --mm-bg: #141414; --mm-bg-sec: #1c1c1c; --mm-border: #2d2d2d;
            --mm-border-light: #3a3a3a; --mm-text: #cccccc; --mm-text-mut: #888888;
        }
        .mm-menu-locked { pointer-events: none !important; opacity: 0.35 !important; filter: grayscale(70%) brightness(0.7) !important; cursor: not-allowed !important; transition: all 0.3s !important; }
        .mm-box { position: fixed; user-select: none; background: var(--mm-bg) !important; border: 1px solid var(--mm-border) !important; box-shadow: 0 0 10px rgba(0,0,0,0.8), inset 0 0 0 1px #222 !important; border-radius: 4px; min-width: 300px; z-index: 999999; font-family: "Segoe UI", Tahoma, sans-serif !important; transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1); max-height: 800px; overflow: hidden; }
        .mm-header { background: var(--mm-bg-sec) !important; border-bottom: 1px solid var(--mm-border); border-top: 2px solid var(--mm-theme); padding: 0 10px; height: 28px; display: flex; align-items: center; cursor: move; gap: 6px; }
        .mm-title { flex: 1; color: var(--mm-title); font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
        .mm-btn-close, .mm-btn-min { width: 14px; height: 14px; border-radius: 2px; border: none; cursor: pointer; font-size: 9px; display: flex; align-items: center; justify-content: center; color: #fff; background: var(--mm-border-light); transition: background 0.15s ease; }
        .mm-btn-close:hover { background: #ff4444; } .mm-btn-min:hover { background: #ffcc00; }
        .mm-tabs { display: flex; border-bottom: 1px solid var(--mm-border); background: var(--mm-bg); padding: 0 6px; }
        .mm-tab { padding: 6px 12px; font-size: 10px; color: var(--mm-text-mut); cursor: pointer; border: 1px solid transparent; border-bottom: none; margin-bottom: -1px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; transition: color 0.15s ease; }
        .mm-tab:hover { color: #fff; } .mm-tab.active { color: var(--mm-theme); background: var(--mm-bg-sec); border-color: var(--mm-border); border-top: 2px solid var(--mm-theme); }
        .mm-body { padding: 16px 12px 12px 12px; opacity: 0; transform: translateY(4px); transition: opacity 0.25s ease, transform 0.25s ease; display: none; }
        .mm-body.active { display: block; opacity: 1; transform: translateY(0); }
        .mm-section { margin-bottom: 16px; padding: 12px 10px 6px 10px; border: 1px solid var(--mm-border); border-radius: 2px; background: transparent; position: relative; }
        .mm-section-title { font-size: 10px; font-weight: bold; color: var(--mm-text); text-transform: uppercase; letter-spacing: 0.5px; position: absolute; top: -7px; left: 8px; background: var(--mm-bg); padding: 0 4px; }
        .mm-subtitle { font-size: 9px; color: var(--mm-text-mut); margin-bottom: 10px; margin-top: -2px; }
        .mm-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; gap: 8px; }
        .mm-label { font-size: 11px; color: var(--mm-text); flex: 1; }
        .mm-btn-el { padding: 6px 10px; background: #1e1e1e; border: 1px solid var(--mm-border-light); color: var(--mm-text); font-size: 10px; cursor: pointer; border-radius: 2px; width: 100%; text-align: center; text-transform: uppercase; margin-bottom: 6px; display: block; box-shadow: 0 1px 2px rgba(0,0,0,0.2); transition: all 0.1s ease; text-shadow: none !important; }
        .mm-btn-el:hover { background: #252526; border-color: var(--mm-text-mut); color: #fff; }
        .mm-btn-el:active { background: #171717; transform: translateY(1px); }
        .mm-btn-el.green { color: #00ff88; border-color: rgba(0,255,136,0.3); } .mm-btn-el.blue { color: #33b5e5; border-color: rgba(51,181,229,0.3); } .mm-btn-el.red { color: #ff4444; border-color: rgba(255,68,68,0.3); } .mm-btn-el.yellow { color: #ffcc00; border-color: rgba(255,204,0,0.3); }
        .mm-input-el { background: #111 !important; border: 1px solid var(--mm-border-light) !important; color: #fff !important; font-size: 11px !important; border-radius: 2px !important; outline: none !important; font-family: "Segoe UI", Tahoma, sans-serif !important; text-align: center !important; padding: 4px 6px !important; transition: border 0.2s ease !important; }
        .mm-input-el:focus { border-color: var(--mm-theme) !important; background: #141414 !important; }
        .mm-cb-wrap { display: flex; align-items: center; gap: 8px; cursor: pointer; margin-bottom: 8px; } .mm-cb-wrap input { display: none; }
        .mm-cb-box { width: 12px; height: 12px; background: #111; border: 1px solid var(--mm-border-light); border-radius: 2px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.1s; position: relative; }
        .mm-cb-wrap:hover .mm-cb-box { border-color: var(--mm-text-mut); } .mm-cb-wrap input:checked + .mm-cb-box { border-color: var(--mm-theme); }
        .mm-cb-box::after { content: ''; display: none; width: 6px; height: 6px; background: var(--mm-theme); border-radius: 1px; } .mm-cb-wrap input:checked + .mm-cb-box::after { display: block; }
        .mm-footer { background: var(--mm-bg-sec) !important; border-top: 1px solid var(--mm-border); padding: 5px 10px; display: flex; justify-content: space-between; align-items: center; }
        .mm-status-label { font-size: 9px; color: var(--mm-text-mut); text-transform: uppercase; font-weight: bold; } .mm-status-text { font-size: 9px; font-weight: bold; text-transform: uppercase; } .mm-status-text.connected { color: #00ff88; } .mm-status-text.disconnected { color: #ff4444; }
        .mm-status-dot { width: 5px; height: 5px; border-radius: 50%; display: inline-block; } .mm-status-dot.connected { background: #00ff88; box-shadow: 0 0 4px #00ff88; } .mm-status-dot.disconnected { background: #ff4444; box-shadow: 0 0 4px #ff4444; }
        .mm-dropdown-container { margin-bottom: 10px; position: relative; }
        .mm-dropdown-trigger { background: #1e1e1e; border: 1px solid var(--mm-border-light); color: var(--mm-text); padding: 5px 10px; border-radius: 2px; font-size: 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; width: 100%; transition: all 0.15s ease; text-shadow: none !important; }
        .mm-dropdown-trigger:hover { border-color: var(--mm-text-mut); color: #fff; background: #252526; }
        .mm-dropdown-menu { position: absolute; top: calc(100% + 2px); left: 0; width: 100%; background: var(--mm-bg-sec); border: 1px solid var(--mm-border); border-radius: 2px; max-height: 200px; overflow-y: auto; z-index: 10000; display: none; box-shadow: 0 4px 12px rgba(0,0,0,0.8); }
        .mm-box:has(.mm-dropdown-menu.open) { overflow: visible !important; max-height: none !important; } .mm-dropdown-menu.open { display: block; animation: dd-slide 0.1s ease-out; }
        .mm-dropdown-item { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; border-bottom: 1px solid var(--mm-border); gap: 10px; font-size: 11px; } .mm-dropdown-item:hover { background: #252526; } .mm-dropdown-item:last-child { border-bottom: none; }
        .mm-dd-title { color: var(--mm-theme); font-weight: bold; font-size: 10px; flex: 2; text-transform: uppercase; } .mm-dd-id { font-size: 9px; color: var(--mm-text-mut); font-family: Consolas, monospace; background: #111; padding: 1px 4px; border: 1px solid #222; border-radius: 2px; }
        .mm-dd-join-btn { padding: 3px 6px; background: #1e1e1e; border: 1px solid var(--mm-border-light); color: var(--mm-title); font-size: 9px; font-weight: bold; border-radius: 2px; cursor: pointer; text-transform: uppercase; text-shadow: none !important; } .mm-dd-join-btn:hover { border-color: var(--mm-theme); color: var(--mm-theme); background: #111; }
        .mm-dropdown-menu::-webkit-scrollbar { width: 4px; } .mm-dropdown-menu::-webkit-scrollbar-track { background: var(--mm-bg); } .mm-dropdown-menu::-webkit-scrollbar-thumb { background: var(--mm-theme); border-radius: 2px; }
        @keyframes dd-slide { 0% { opacity: 0; transform: translateY(-2px); } 100% { opacity: 1; transform: translateY(0); } }
        .mm-player-id { font-size: 9px; color: var(--mm-text-mut); margin-right: 10px; font-family: Consolas, monospace; border: 1px solid var(--mm-border); padding: 1px 4px; background: #111; }
        .mm-box { transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease, box-shadow 0.3s ease !important; }
        
        /* Box image CSS unchanged from last fix */
        .mm-box.mm-minimized { 
            min-width: 10px !important; width: 50px !important; 
            height: 40px !important; max-height: 40px !important; 
            border-radius: 4px !important; overflow: hidden !important; 
            background: var(--mm-bg) !important; 
            background-image: var(--mm-min-img) !important; 
            background-size: contain !important; 
            background-repeat: no-repeat !important; 
            background-position: center !important;
            border: solid 2px var(--mm-theme);
            box-shadow: 0 0 20px var(--mm-theme) !important; cursor: pointer !important; 
        }
        .mm-box.mm-minimized .mm-header, .mm-box.mm-minimized .mm-tabs, .mm-box.mm-minimized #mm-functional-panel, .mm-box.mm-minimized .mm-footer { display: none !important; }

        .mm-toast-container { position: fixed; bottom: 20px; right: 20px; z-index: 1000000; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
        .mm-toast { background: rgba(20, 20, 20, 0.85); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border-left: 4px solid var(--mm-theme); border-top: 1px solid rgba(255,255,255,0.05); color: #fff; padding: 12px 18px; font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; border-radius: 4px; box-shadow: 0 8px 24px rgba(0,0,0,0.5); transform: translateX(125%); transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease; opacity: 0; display: flex; align-items: center; gap: 8px; }
        .mm-toast.show { transform: translateX(0); opacity: 1; }
        .mm-timer-wrap { max-height: 0; opacity: 0; overflow: hidden; transition: max-height 0.4s ease, opacity 0.4s ease, padding 0.4s ease; background: #111; border-radius: 0 0 2px 2px; border: 1px solid transparent; border-top: none; border-radius: 3px; text-align: center; position: relative; z-index: 1; }
        .mm-timer-wrap.active { max-height: 40px; opacity: 1; padding: 6px; border-color: var(--mm-theme); } .mm-timer-text { font-family: Consolas, monospace; font-size: 11px; color: #ffcc00; font-weight: bold; text-transform: uppercase; }
        .mm-listview { background: #111 !important; border: 1px solid var(--mm-border) !important; border-radius: 2px; max-height: 180px; overflow-y: auto; margin-top: 5px; margin-bottom: 10px; }
        .mm-listview::-webkit-scrollbar-track{ background: rgb(37, 38, 39) !important;}
        .mm-list-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-bottom: 1px solid #1c1c1c; font-size: 11px; color: var(--mm-text); } .mm-list-item:last-child { border-bottom: none; }
        .mm-list-name { font-weight: bold; color: #fff; } .mm-list-id { font-family: Consolas, monospace; color: var(--mm-text-mut); font-size: 9px; }
        
        .mm-sniffer-ui { position: fixed; top: 50px; left: 50px; width: 450px; height: 500px; background: var(--mm-bg); border: 1px solid var(--mm-border); z-index: 9999999; display: none; flex-direction: column; box-shadow: 0 0 20px rgba(0,0,0,0.9); border-radius: 4px; overflow: hidden; }
        .mm-sniffer-ui.open { display: flex; }
        .mm-sniffer-head { background: var(--mm-bg-sec); border-bottom: 1px solid var(--mm-border); padding: 8px 10px; color: var(--mm-title); font-size: 11px; font-weight: bold; cursor: move; display: flex; justify-content: space-between; border-top: 2px solid #8a2be2; }
        .mm-sniffer-close { cursor: pointer; color: #ff4444; background: none; border: none; font-weight: bold; }
        .mm-sniffer-tools { padding: 6px; background: #111; border-bottom: 1px solid #222; display: flex; gap: 8px; align-items: center; }
        .mm-sniffer-tools button { background: #1e1e1e; color: #ccc; border: 1px solid #333; padding: 4px 10px; font-size: 9px; cursor: pointer; border-radius: 2px; text-transform: uppercase; font-weight: bold; } .mm-sniffer-tools button:hover { background: #333; color: #fff; }
        .mm-sniffer-list { flex: 1; overflow-y: auto; padding: 5px; background: #0a0a0a; }
        .mm-sniffer-item { background: #141414; border: 1px solid #1c1c1c; margin-bottom: 4px; border-radius: 2px; }
        .mm-sniffer-header { padding: 6px 8px; font-size: 10px; font-weight: bold; cursor: pointer; color: #ccc; display: flex; gap: 10px; align-items: center; font-family: Consolas, monospace; } .mm-sniffer-header:hover { background: #1c1c1c; color: #fff; }
        .mm-sniffer-header.IN { border-left: 3px solid #00ff88; } .mm-sniffer-header.OUT { border-left: 3px solid #33b5e5; }
        .mm-sniffer-time { color: var(--mm-text-mut); font-size: 8px; min-width: 50px; }
        .mm-sniffer-body { display: none; padding: 10px; margin: 0; background: #050505; color: #00ff88; font-family: Consolas, monospace; font-size: 10px; overflow-x: auto; max-height: 300px; overflow-y: auto; border-top: 1px solid #1c1c1c; white-space: pre-wrap; }
        .mm-sniffer-body.open { display: block; }
    `;

    function injectStyle() {
        if (!document.getElementById('mm-style')) {
            const s = document.createElement('style');
            s.id = 'mm-style'; s.textContent = style;
            document.head.appendChild(s);
            if (window._MM_MinImage) {
                document.documentElement.style.setProperty('--mm-min-img', `url('${window._MM_MinImage}')`);
            }
        }
    }

    function showNotification(msg) {
        let container = document.getElementById('mm-toast-box');
        if (!container) {
            container = document.createElement('div'); container.id = 'mm-toast-box'; container.className = 'mm-toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div'); toast.className = 'mm-toast'; toast.innerHTML = `<span>⚙️</span> <span>${msg}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 50);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 350); }, 3500);
    }

    function buildWindow(title, opts = {}) {
        injectStyle();
        const box = document.createElement('div'); box.className = 'mm-box';
        const savedX = Config.get('menu_x', null); const savedY = Config.get('menu_y', '20px');
        box.style.cssText = `width: ${opts.width || '440px'}; top: ${savedY}; left: ${savedX ? savedX : (opts.x === 'right' ? 'auto' : (opts.x || '20px'))}; right: ${savedX ? 'auto' : (opts.x === 'right' ? '20px' : 'auto')};`;

        ['mousedown', 'mouseup', 'click', 'pointerdown', 'pointerup', 'dblclick'].forEach(evt => {
            box.addEventListener(evt, e => e.stopPropagation());
        });

        const header = document.createElement('div'); header.className = 'mm-header'; header.innerHTML = `<span class="mm-title">${title}</span>`;
        
        let minimised = false, isRestoring = false, restoreX = 0, restoreY = 0;

        const minBtn = document.createElement('button'); minBtn.className = 'mm-btn-min'; minBtn.textContent = '_';
        
        function toggleMinimize() {
            minimised = !minimised;
            if (minimised) { 
                restoreX = currentX; 
                restoreY = currentY; 
                box.classList.add('mm-minimized'); 
                showNotification("Terminal minimized."); 
            } else { 
                box.classList.remove('mm-minimized'); 
                targetX = restoreX; 
                targetY = restoreY; 
                isRestoring = true; // 🔥 THE SAUCE: Triggers the smooth glide back
                showNotification("Terminal restored."); 
            }
        }
        minBtn.onclick = (e) => { e.stopPropagation(); toggleMinimize(); };
        box.onclick = () => { if (minimised) toggleMinimize(); };

        const closeBtn = document.createElement('button'); closeBtn.className = 'mm-btn-close'; closeBtn.textContent = '✕'; closeBtn.onclick = () => box.remove();
        header.appendChild(minBtn); header.appendChild(closeBtn);

        // 🔥 THE FIX: Only add the locking ID and class if it's the main menu
        const inner = document.createElement('div'); 
        if (!opts.noFooter) {
            inner.id = 'mm-functional-panel'; 
            inner.className = 'mm-menu-locked';
        }

        const tabBar = document.createElement('div'); tabBar.className = 'mm-tabs';
        const tabContent = document.createElement('div');

        inner.appendChild(tabBar); inner.appendChild(tabContent); box.appendChild(header); box.appendChild(inner);

        // 🔥 THE FIX: Only build the footer if noFooter isn't true
        if (!opts.noFooter) {
            const footer = document.createElement('div'); footer.className = 'mm-footer';
            footer.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <span class="mm-status-label" style="margin-right: 5px;">User:</span><span id="mm-player-nick-display" class="mm-player-id">Not logged in.</span>
                    <span class="mm-status-label" style="margin-right: 5px;">ID:</span><span id="mm-player-id-display" class="mm-player-id">0</span>
                </div>
                <div class="mm-status-wrapper" style="display: flex; align-items: center;">
                    <span id="mm-dot" class="mm-status-dot disconnected" style="margin-right: 5px;"></span><span id="mm-status" class="mm-status-text disconnected">Not connected</span>
                </div>`;
            box.appendChild(footer); 
        }
        
        document.body.appendChild(box);

        let drag = false, ox = 0, oy = 0, mouseX = 0, mouseY = 0, currentX = box.getBoundingClientRect().left, currentY = box.getBoundingClientRect().top;
        let targetX = currentX, targetY = currentY, vx = 0, vy = 0, lastMouseX = 0, lastMouseY = 0, currentTilt = 0;
        
        header.addEventListener('mousedown', e => {
            if (minimised) return;
            drag = true; ox = e.clientX - box.getBoundingClientRect().left; oy = e.clientY - box.getBoundingClientRect().top;
            mouseX = lastMouseX = e.clientX; mouseY = lastMouseY = e.clientY;
            targetX = mouseX - ox; targetY = mouseY - oy; vx = 0; vy = 0; box.style.right = 'auto'; e.preventDefault();
        });
        document.addEventListener('mousemove', e => { if (!drag) return; mouseX = e.clientX; mouseY = e.clientY; targetX = mouseX - ox; targetY = mouseY - oy; });
        window.addEventListener('mouseup', () => drag = false, true);

        function updatePhysicsLoop() {
            let targetTilt = 0; const boxRect = box.getBoundingClientRect();
            
            if (minimised) {
                targetX = 20; targetY = window.innerHeight - 60; 
                currentX += (targetX - currentX) * 0.12; 
                currentY += (targetY - currentY) * 0.12; 
                vx = 0; vy = 0; targetTilt = 0;
            } else if (drag) {
                isRestoring = false; // Kill the glide if you grab it mid-air
                vx = mouseX - lastMouseX; vy = mouseY - lastMouseY; lastMouseX = mouseX; lastMouseY = mouseY;
                currentX += (targetX - currentX) * 0.15; currentY += (targetY - currentY) * 0.15; targetTilt = Math.max(-12, Math.min(12, vx * 0.4));
                Config.set('menu_x', currentX + 'px'); Config.set('menu_y', currentY + 'px');
            } else if (isRestoring) {
                // 🔥 THE SAUCE IN ACTION: Smoothly lerps back to restoreX/Y
                currentX += (targetX - currentX) * 0.12; 
                currentY += (targetY - currentY) * 0.12; 
                vx = 0; vy = 0; targetTilt = 0;
                
                // Snap when it gets insanely close to kill the math loop
                if (Math.abs(targetX - currentX) < 1 && Math.abs(targetY - currentY) < 1) {
                    currentX = targetX; currentY = targetY;
                    isRestoring = false;
                }
            } else {
                vx *= 0.92; vy *= 0.92; if (Math.abs(vx) < 0.05) vx = 0; if (Math.abs(vy) < 0.05) vy = 0;
                currentX += vx; currentY += vy; targetTilt = Math.max(-12, Math.min(12, vx * 0.4));
            }
            
            // Only do wall collision checks if we aren't mid-transition
            if (!minimised && !isRestoring) {
                if (currentX < 0) { currentX = 0; vx = -vx * 0.6; } else if (currentX + boxRect.width > window.innerWidth) { currentX = window.innerWidth - boxRect.width; vx = -vx * 0.6; }
                if (currentY < 0) { currentY = 0; vy = -vy * 0.6; } else if (currentY + boxRect.height > window.innerHeight) { currentY = window.innerHeight - boxRect.height; vy = -vy * 0.6; }
            }
            
            currentTilt += (targetTilt - currentTilt) * 0.10;
            box.style.left = currentX + 'px'; box.style.top = currentY + 'px'; 
            box.style.transform = `rotate(${currentTilt}deg)`;
            
            requestAnimationFrame(updatePhysicsLoop);
        }
        requestAnimationFrame(updatePhysicsLoop);

        const tabs = [];
        function addTab(name) {
            const tabEl = document.createElement('div'); tabEl.className = 'mm-tab'; tabEl.textContent = name;
            const bodyEl = document.createElement('div'); bodyEl.className = 'mm-body';
            
            tabEl.onclick = () => {
                const oldHeight = box.getBoundingClientRect().height; box.style.maxHeight = oldHeight + 'px';
                tabs.forEach(t => t.el.classList.remove('active')); tabEl.classList.add('active');
                bodyEl.style.display = 'block'; bodyEl.style.position = 'absolute'; bodyEl.style.visibility = 'hidden';
                box.style.maxHeight = 'none';
                const targetHeight = header.getBoundingClientRect().height + tabBar.getBoundingClientRect().height + bodyEl.scrollHeight + 28;
                bodyEl.style.display = ''; bodyEl.style.position = ''; bodyEl.style.visibility = '';
                tabs.forEach(t => t.body.classList.remove('active')); bodyEl.classList.add('active');
                box.style.maxHeight = oldHeight + 'px'; void box.offsetHeight; box.style.maxHeight = targetHeight + 'px';
                setTimeout(() => box.style.maxHeight = '', 300);
            };

            tabBar.appendChild(tabEl); tabContent.appendChild(bodyEl); tabs.push({ el: tabEl, body: bodyEl });
            if (tabs.length === 1) { tabEl.classList.add('active'); bodyEl.classList.add('active'); }
            return { section: (title, subtitle) => buildSection(bodyEl, title, subtitle) };
        }
        return { addTab };
    }

    function buildSection(container, title, subtitle) {
        const sec = document.createElement('div'); sec.className = 'mm-section';
        sec.innerHTML = `<div class="mm-section-title">${title}</div>${subtitle ? `<div class="mm-subtitle">${subtitle}</div>` : ''}`;
        container.appendChild(sec);

        const controls = {
            listview(id) { const lv = document.createElement('div'); lv.id = id; lv.className = 'mm-listview'; sec.appendChild(lv); return controls; },
            button(label, color, onClick) {
                const btn = document.createElement('button'); btn.className = `mm-btn-el${color ? ' ' + color : ''}`; btn.textContent = label;
                btn.onclick = (e) => { AudioFX.playClick(); if (onClick) onClick(e); };
                sec.appendChild(btn); return controls;
            },
            multiButton(labels, color, onClicks) {
                const parent = document.createElement('div');
                // Cleaned up the styles so it fits the menu drip perfectly
                parent.style.cssText = 'display: flex; gap: 8px; margin-bottom: 6px;';
                
                // Loop through the labels array automatically
                labels.forEach((label, i) => {
                    const btn = document.createElement('button'); 
                    btn.className = `mm-btn-el${color ? ' ' + color : ''}`; 
                    btn.textContent = label;
                    
                    // Attach the specific function for THIS button
                    btn.onclick = (e) => { 
                        if (typeof AudioFX !== 'undefined') AudioFX.playClick(); 
                        if (onClicks && onClicks[i]) onClicks[i](e); 
                    };
                    
                    // 🔥 THE SAUCE: Actually putting the button inside the flexbox
                    parent.appendChild(btn); 
                });
                
                // Slap the whole row into the section
                sec.appendChild(parent); 
                return controls;
            },
            checkbox(label, configKey, defaultVal, onChange) {
                const wrap = document.createElement('label'); wrap.className = 'mm-cb-wrap';
                const inp = document.createElement('input'); inp.type = 'checkbox'; inp.checked = Config.get(configKey, defaultVal);
                wrap.innerHTML = `<span class="mm-cb-box"></span><span class="mm-label">${label}</span>`;
                wrap.prepend(inp);
                inp.onchange = () => { Config.set(configKey, inp.checked); AudioFX.playToggle(inp.checked); if (onChange) onChange(inp.checked); };
                if (inp.checked && onChange) onChange(inp.checked);
                sec.appendChild(wrap); return controls;
            },
            input(label, configKey, defaultVal, placeholder, onChange, inputType = 'text') {
                const row = document.createElement('div'); row.className = 'mm-row'; row.innerHTML = `<span class="mm-label">${label}</span>`;
                const inp = document.createElement('input'); inp.className = 'mm-input-el'; inp.type = inputType; inp.placeholder = placeholder || '';
                if (inputType === 'color') inp.style.cssText = 'width: 40px; height: 26px; border: 1px solid #333; background: none; cursor: pointer; padding: 0;';
                else inp.style.width = '120px';
                inp.value = Config.get(configKey, defaultVal);
                inp.oninput = () => { Config.set(configKey, inp.value); if (onChange) onChange(inp.value); };
                inp.addEventListener('keydown', e => e.stopPropagation());
                inp.addEventListener('keyup', e => e.stopPropagation());
                inp.addEventListener('keypress', e => e.stopPropagation());
                row.appendChild(inp); sec.appendChild(row); return controls;
            },
            dropdown(label, dataArray, actionBtnLabel, secLabel, onSelect) {
                const container = document.createElement('div'); container.className = 'mm-dropdown-container';
                const trigger = document.createElement('button'); trigger.className = 'mm-dropdown-trigger'; trigger.innerHTML = `<span>${label}</span> <span class="mm-dd-arrow">▼</span>`;
                const menu = document.createElement('div'); menu.className = 'mm-dropdown-menu';
                const timerWrap = document.createElement('div'); timerWrap.className = 'mm-timer-wrap'; timerWrap.innerHTML = `<span class="mm-timer-text">WAITING...</span>`;

                const closeOnOutsideClick = (e) => { if (!container.contains(e.target)) { menu.classList.remove('open'); document.removeEventListener('click', closeOnOutsideClick); } };
                trigger.onclick = (e) => { e.stopPropagation(); const isOpen = menu.classList.contains('open'); document.querySelectorAll('.mm-dropdown-menu').forEach(m => m.classList.remove('open')); if (!isOpen) { menu.classList.add('open'); document.addEventListener('click', closeOnOutsideClick); } };

                dataArray.forEach(itemData => {
                    const item = document.createElement('div'); item.className = 'mm-dropdown-item';
                    item.innerHTML = `<span class="mm-dd-title">${itemData.data1}</span><span class="mm-dd-id">${secLabel}: ${itemData.data2}</span>`;
                    const actionBtn = document.createElement('button'); actionBtn.className = 'mm-dd-join-btn'; actionBtn.textContent = actionBtnLabel;
                    actionBtn.onclick = (e) => { e.stopPropagation(); AudioFX.playClick(); if (onSelect) onSelect(itemData.data1, itemData.data2, timerWrap); menu.classList.remove('open'); };
                    item.appendChild(actionBtn); menu.appendChild(item);
                });

                container.appendChild(trigger); container.appendChild(menu); container.appendChild(timerWrap); sec.appendChild(container);
                return controls;
            }
        };
        return controls;
    }

    const Sniffer = {
        build(onToggleClick, onClearClick, onTestClick) {
            if (document.getElementById('mm-sniffer-container')) return;
            const wrap = document.createElement('div'); wrap.id = 'mm-sniffer-container'; wrap.className = 'mm-sniffer-ui';
            wrap.innerHTML = `<div class="mm-sniffer-head" id="mm-sniffer-drag"><span>📡 LIVE PACKET SNIFFER</span><button class="mm-sniffer-close" onclick="document.getElementById('mm-sniffer-container').classList.remove('open')">✕</button></div><div class="mm-sniffer-tools"><button id="mm-sniff-toggle" style="color:#ff4444; border-color:#ff4444;">⏺ OFF</button><button id="mm-sniff-clear">🗑️ CLEAR</button><button id="mm-sniff-test">🧪 TEST UI</button></div><div class="mm-sniffer-list" id="mm-sniffer-content"></div>`;
            document.body.appendChild(wrap);

            document.getElementById('mm-sniff-toggle').onclick = function() { const isRecording = onToggleClick(); this.textContent = isRecording ? '⏸ RECORDING...' : '⏺ OFF'; this.style.color = isRecording ? '#00ff88' : '#ff4444'; this.style.borderColor = isRecording ? '#00ff88' : '#ff4444'; };
            document.getElementById('mm-sniff-clear').onclick = onClearClick; document.getElementById('mm-sniff-test').onclick = onTestClick;

            let isDragging = false, ox, oy; const head = document.getElementById('mm-sniffer-drag');
            head.onmousedown = (e) => { isDragging = true; ox = e.clientX - wrap.getBoundingClientRect().left; oy = e.clientY - wrap.getBoundingClientRect().top; };
            document.addEventListener('mousemove', (e) => { if (!isDragging) return; wrap.style.left = (e.clientX - ox) + 'px'; wrap.style.top = (e.clientY - oy) + 'px'; });
            document.addEventListener('mouseup', () => isDragging = false);
        },
        renderPacket(pData) {
            const list = document.getElementById('mm-sniffer-content'); if (!list) return;
            const item = document.createElement('div'); item.className = 'mm-sniffer-item';
            const header = document.createElement('div'); header.className = `mm-sniffer-header ${pData.dir}`;
            header.innerHTML = `<span class="mm-sniffer-time">${pData.time}</span><span>${pData.dir === 'IN' ? '📥' : '📤'} ${pData.cmd} ➔ <span style="color:#fff">${pData.subCmd}</span></span>`;
            const body = document.createElement('pre'); body.className = 'mm-sniffer-body';
            try { body.textContent = JSON.stringify(pData.raw.data || pData.raw, null, 2); } catch (err) { body.textContent = "💀 [CIRCULAR REF]\n" + err.message; }
            header.onclick = () => body.classList.toggle('open');
            item.appendChild(header); item.appendChild(body); list.prepend(item);
        },
        clear() { const list = document.getElementById('mm-sniffer-content'); if (list) list.innerHTML = ''; }
    };

    return { Config, Window: buildWindow, Sniffer, showNotification };
})();