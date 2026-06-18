window.PenguinUI = (function () {
    'use strict';

    const trainerName = "X-Yukon";
    const trainerVersion = "0.0.1-alpha";

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
        /* (Styles omitted for brevity, keep the exact same style payload you originally provided) */
        :root { 
            --mm-theme: ${Config.get('theme_color', '#bf0000')};
            --mm-title: ${Config.get('title_color', '#ffffff')};
            --mm-bg: #141414; --mm-bg-sec: #1c1c1c; --mm-border: #2d2d2d;
            --mm-border-light: #3a3a3a; --mm-text: #cccccc; --mm-text-mut: #888888;
        }
        .mm-filter-wrap { border: 1px solid var(--mm-border); border-radius: 2px; background: #111; overflow: hidden; margin-bottom: 12px; }
        .mm-filter-input { width: 100%; background: #0a0a0a; border: none; border-bottom: 1px solid var(--mm-border); color: #fff; padding: 6px 10px; font-size: 10px; outline: none; box-sizing: border-box; font-family: "Segoe UI", Tahoma, sans-serif; transition: border-color 0.2s; }
        .mm-filter-input:focus { border-bottom-color: var(--mm-theme); }
        .mm-filter-input::placeholder { color: #555; }
        .mm-list-header { display: flex; background: #171717; padding: 4px 10px; font-size: 9px; font-weight: bold; color: var(--mm-text-mut); text-transform: uppercase; border-bottom: 1px solid var(--mm-border); }
        .mm-list-col { flex: 1; }
        .mm-list-col.right { text-align: right; }
        .mm-list-items { max-height: 160px; overflow-y: auto; }
        .mm-list-items::-webkit-scrollbar { width: 4px; }
        .mm-list-items::-webkit-scrollbar-thumb { background: var(--mm-theme); border-radius: 2px; }
        .mm-list-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-bottom: 1px solid #1c1c1c; font-size: 10px; color: var(--mm-text); transition: background 0.1s; }
        .mm-list-item:last-child { border-bottom: none; }
        .mm-list-item:hover { background: #1c1c1c; }
        .mm-list-name { font-weight: bold; color: #fff; } 
        .mm-list-id { font-family: Consolas, monospace; color: var(--mm-theme); font-size: 10px; }
        .mm-menu-locked { pointer-events: none !important; opacity: 0.35 !important; filter: grayscale(70%) brightness(0.7) !important; cursor: not-allowed !important; transition: all 0.3s !important; }
        .mm-box { position: fixed; user-select: none; background: var(--mm-bg) !important; border: 1px solid var(--mm-border) !important; box-shadow: 0 0 10px rgba(0,0,0,0.8), inset 0 0 0 1px #222 !important; border-radius: 4px; min-width: 300px; z-index: 999999; font-family: "Segoe UI", Tahoma, sans-serif !important; transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1); max-height: 800px; overflow: hidden; }
        .mm-header { background: var(--mm-bg-sec) !important; border-bottom: 1px solid var(--mm-border); border-top: 2px solid var(--mm-theme); padding: 0 10px; height: 28px; display: flex; align-items: center; cursor: move; gap: 6px; }
        .mm-title { flex: 1; color: var(--mm-title); font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
        .mm-btn-close, .mm-btn-min { width: 14px; height: 14px; border-radius: 2px; border: none; cursor: pointer; font-size: 9px; display: flex; align-items: center; justify-content: center; color: #fff; background: var(--mm-border-light); transition: background 0.15s ease; }
        .mm-btn-close:hover { background: #ff4444; } .mm-btn-min:hover { background: #ffcc00; }
        .mm-tabs { display: grid; border-bottom: 1px solid var(--mm-border); background: var(--mm-bg); }
        .mm-tab { padding: 6px 4px; text-align: center; font-size: 10px; color: var(--mm-text-mut); cursor: pointer; border: 1px solid transparent; border-bottom: none; margin-bottom: -1px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; transition: all 0.15s ease; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mm-tab:hover { color: #fff; } .mm-tab.active { color: var(--mm-theme); background: var(--mm-bg-sec); border-color: var(--mm-border); border-top: 2px solid var(--mm-theme); }
        .mm-body { padding: 16px 12px 12px 12px; opacity: 0; transform: translateY(4px); transition: opacity 0.25s ease, transform 0.25s ease; display: none; max-height: 502px; overflow-y: auto; }
        .mm-body::-webkit-scrollbar { width: 4px; } 
        .mm-body::-webkit-scrollbar-track { background: var(--mm-bg); } 
        .mm-body::-webkit-scrollbar-thumb { background: var(--mm-theme); border-radius: 2px; }
        .mm-body.active { display: block; opacity: 1; transform: translateY(0); }
        .mm-section { margin-top: 14px; margin-bottom: 16px; padding: 12px 10px 6px 10px; border: 1px solid var(--mm-border); border-radius: 2px; background: transparent; position: relative; transition: padding 0.3s; overflow: visible !important; }
        .mm-section.collapsed { padding-bottom: 4px; }
        .mm-section-title { font-size: 10px; font-weight: bold; color: var(--mm-text); text-transform: uppercase; letter-spacing: 0.5px; position: absolute; top: -7px; left: 8px; right: 8px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; transition: color 0.2s; z-index: 10; background: transparent; }
        .mm-section-title > span { background: var(--mm-bg); padding: 0 6px; }
        .mm-section-title:hover { color: var(--mm-theme); }
        .mm-section-arrow { font-size: 8px; color: var(--mm-text-mut); transition: transform 0.3s; margin-left: 6px; }
        .mm-section.collapsed .mm-section-arrow { transform: rotate(-90deg); }
        .mm-section-content { overflow: hidden; max-height: 2000px; transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s; opacity: 1; }
        .mm-section.collapsed .mm-section-content { max-height: 0 !important; opacity: 0; }
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
        .mm-box.mm-minimized { 
            display: flex !important; 
            align-items: center !important; 
            justify-content: center !important;
            min-width: 10px !important;
            width: 70px !important; 
            height: 50px !important; 
            max-height: 100px !important; 
            border-radius: 4px !important; 
            overflow: hidden !important; 
            background: #008ce1 !important;
            border: 1px solid #007ad2 !important; 
            image-rendering: crisp-edges !important;
            box-shadow: 0 0 10px #008ce1 !important; 
            cursor: pointer !important;
        }
        .mm-box.mm-minimized:hover{
            background: #007ad2 !important;
            border: 1px solid #008ce1 !important; 
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
        .mm-box.mm-closing { transform: scale(0.85) translateY(15px) !important; opacity: 0 !important; pointer-events: none !important; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important; }
        .mm-slider-el { -webkit-appearance: none; width: 100%; height: 4px; background: #222; border-radius: 2px; outline: none; margin-bottom: 12px; }
        .mm-slider-el::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 12px; height: 12px; border-radius: 50%; background: var(--mm-theme); cursor: pointer; box-shadow: 0 0 8px var(--mm-theme); transition: transform 0.1s; }
        .mm-slider-el::-webkit-slider-thumb:hover { transform: scale(1.3); }
        .mm-section { transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden; max-height: 2000px; }
        .mm-section.collapsed { max-height: 14px !important; border-color: transparent; padding-bottom: 0; margin-bottom: 8px; }
        .mm-section-title { cursor: pointer; user-select: none; transition: color 0.2s; display: flex; justify-content: space-between; align-items: center; width: calc(100% - 12px); }
        .mm-section-title:hover { color: var(--mm-theme); }
        .mm-section-arrow { font-size: 8px; color: var(--mm-text-mut); transition: transform 0.3s; }
        .mm-section.collapsed .mm-section-arrow { transform: rotate(-90deg); }
        .mm-section.collapsed { margin-top: 8px !important; margin-bottom: 8px !important; padding: 0 !important; height: 28px !important; min-height: 28px !important; background: #171717 !important; border: 1px solid #2d2d2d !important; border-radius: 3px !important; overflow: hidden !important; }
        .mm-section.collapsed .mm-section-title { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; padding: 0 12px !important; background: transparent !important; box-sizing: border-box !important; margin: 0 !important; }
        .mm-section.collapsed .mm-section-title > span { background: transparent !important; padding: 0 !important; }
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

    function showNotification(msg, symbol="⚙️") {
        let container = document.getElementById('mm-toast-box');
        if (!container) {
            container = document.createElement('div'); container.id = 'mm-toast-box'; container.className = 'mm-toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div'); toast.className = 'mm-toast'; toast.innerHTML = `<span>${symbol}</span> <span>${msg}</span>`;
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
        
        let minimised = opts.minimized, isRestoring = false, restoreX = 0, restoreY = 0;

        // Optimized state flags for requestAnimationFrame sleep
        let isPhysicsActive = true; 
            const minBtn = document.createElement('button'); 
            if(!opts.minDisabled){
                            minBtn.className = 'mm-btn-min';
                minBtn.textContent = '_';
            }

        
        
        function wakePhysics() {
            if (!isPhysicsActive) {
                isPhysicsActive = true;
                requestAnimationFrame(updatePhysicsLoop);
            }
        }

        function toggleMinimize() {
            minimised = !minimised;
            if (minimised) { 
                restoreX = currentX; 
                restoreY = currentY; 
                
                // 🔥 THE SAUCE: This appends the text WITHOUT nuking your event listeners 🔥
                // Slappaa tää sinne toggleMinimize funktioon
                box.insertAdjacentHTML('beforeend', '<span id="minimized-text" style="color: #fff; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; z-index: 10;">X-YUKON</span>');                
                box.classList.add('mm-minimized'); 
            } else {
                // Safe check so it doesn't throw a bitch fit if the element is missing
                const minText = box.querySelector("#minimized-text");
                if (minText) minText.remove();

                box.classList.remove('mm-minimized'); 
                targetX = restoreX; 
                targetY = restoreY; 
                isRestoring = true; 
            }
            wakePhysics();
        }
        if(!opts.minDisabled) minBtn.onclick = (e) => { e.stopPropagation(); toggleMinimize(); };
        box.onclick = () => { if (minimised) toggleMinimize(); };

        const closeBtn = document.createElement('button'); 
        closeBtn.className = 'mm-btn-close'; 
        closeBtn.textContent = '✕'; 
        closeBtn.onclick = (e) => { 
            e.stopPropagation(); 
            if (typeof AudioFX !== 'undefined') AudioFX.playClick(); 
            box.classList.add('mm-closing');
            setTimeout(() => box.remove(), 250); 
        };

        if(!opts.minDisabled) header.appendChild(minBtn);
        header.appendChild(closeBtn);

        const inner = document.createElement('div'); 
        if (!opts.noFooter) {
            inner.id = 'mm-functional-panel'; 
            inner.className = 'mm-menu-locked';
        }

        const tabBar = document.createElement('div'); tabBar.className = 'mm-tabs';
        const tabContent = document.createElement('div');

        inner.appendChild(tabBar); inner.appendChild(tabContent); box.appendChild(header); box.appendChild(inner);

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
        
        if (minimised) {
            restoreX = currentX; 
            restoreY = currentY; 
            
            box.classList.add('mm-minimized'); 
            box.insertAdjacentHTML('beforeend', '<span id="minimized-text" style="color: #fff; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; z-index: 10;">X-YUKON</span>');                
            
        }
        if(!window.welcomeShown){
            window.PenguinUI.showNotification(`Welcome to ${trainerName} ${trainerVersion}!`);
            window.welcomeShown = true;
        }
            


        header.addEventListener('mousedown', e => {
            if (minimised) return;
            drag = true; ox = e.clientX - box.getBoundingClientRect().left; oy = e.clientY - box.getBoundingClientRect().top;
            mouseX = lastMouseX = e.clientX; mouseY = lastMouseY = e.clientY;
            targetX = mouseX - ox; targetY = mouseY - oy; vx = 0; vy = 0; box.style.right = 'auto'; e.preventDefault();
            wakePhysics();
        });
        
        document.addEventListener('mousemove', e => { 
            if (!drag) return; 
            mouseX = e.clientX; 
            mouseY = e.clientY; 
            targetX = mouseX - ox; 
            targetY = mouseY - oy; 
            wakePhysics();
        });
        
        window.addEventListener('mouseup', () => drag = false, true);

        function updatePhysicsLoop() {
            let targetTilt = 0; const boxRect = box.getBoundingClientRect();
            
            if (minimised) {
                targetX = 20; targetY = window.innerHeight - 70; 
                currentX += (targetX - currentX) * 0.12; 
                currentY += (targetY - currentY) * 0.12; 
                vx = 0; vy = 0; targetTilt = 0;
            } else if (drag) {
                isRestoring = false; 
                vx = mouseX - lastMouseX; vy = mouseY - lastMouseY; lastMouseX = mouseX; lastMouseY = mouseY;
                currentX += (targetX - currentX) * 0.15; currentY += (targetY - currentY) * 0.15; targetTilt = Math.max(-12, Math.min(12, vx * 0.4));
                Config.set('menu_x', currentX + 'px'); Config.set('menu_y', currentY + 'px');
            } else if (isRestoring) {
                currentX += (targetX - currentX) * 0.12; 
                currentY += (targetY - currentY) * 0.12; 
                vx = 0; vy = 0; targetTilt = 0;
                
                if (Math.abs(targetX - currentX) < 1 && Math.abs(targetY - currentY) < 1) {
                    currentX = targetX; currentY = targetY;
                    isRestoring = false;
                }
            } else {
                vx *= 0.92; vy *= 0.92; if (Math.abs(vx) < 0.05) vx = 0; if (Math.abs(vy) < 0.05) vy = 0;
                currentX += vx; currentY += vy; targetTilt = Math.max(-12, Math.min(12, vx * 0.4));
            }
            
            if (!minimised && !isRestoring) {
                if (currentX < 0) { currentX = 0; vx = -vx * 0.6; } else if (currentX + boxRect.width > window.innerWidth) { currentX = window.innerWidth - boxRect.width; vx = -vx * 0.6; }
                if (currentY < 30) { currentY = 30; vy = -vy * 0.6; } else if (currentY + boxRect.height > window.innerHeight) { currentY = window.innerHeight - boxRect.height; vy = -vy * 0.6; }
            }
            
            currentTilt += (targetTilt - currentTilt) * 0.10;
            box.style.left = currentX + 'px'; box.style.top = currentY + 'px'; 
            box.style.transform = `rotate(${currentTilt}deg)`;
            
            // Loop sleep condition: Stop requesting frames if window isn't moving
            if (!drag && !isRestoring && !minimised && Math.abs(vx) < 0.1 && Math.abs(vy) < 0.1 && Math.abs(targetX - currentX) < 0.5 && Math.abs(targetY - currentY) < 0.5 && Math.abs(targetTilt - currentTilt) < 0.1) {
                isPhysicsActive = false;
                return;
            }

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
            
            const colCount = Math.min(tabs.length, 5); 
            tabBar.style.gridTemplateColumns = `repeat(${colCount}, 1fr)`;
            const targetWidth = Math.max(300, colCount * 85); 
            box.style.width = opts.width ? opts.width : `${targetWidth}px`;

            if (tabs.length === 1) { tabEl.classList.add('active'); bodyEl.classList.add('active'); }
            return { section: (title, subtitle) => buildSection(bodyEl, title, subtitle) };
        }

        if (opts.noTabs) {
            tabBar.style.display = 'none';
            const defaultBody = document.createElement('div'); 
            defaultBody.className = 'mm-body active';
            defaultBody.style.display = 'block';
            tabContent.appendChild(defaultBody);
            
            return { 
                section: (title, subtitle) => buildSection(defaultBody, title, subtitle),
                close: () => { box.classList.add('mm-closing'); setTimeout(() => box.remove(), 250); } 
            };
        }

        return { addTab, close: () => { box.classList.add('mm-closing'); setTimeout(() => box.remove(), 250); } };
    }

    function buildSection(container, title, subtitle) {
        const sec = document.createElement('div'); sec.className = 'mm-section';
        const titleDiv = document.createElement('div'); titleDiv.className = 'mm-section-title'; 
        titleDiv.innerHTML = `<span>${title}</span> <span class="mm-section-arrow">▼</span>`;
        const contentWrap = document.createElement('div'); 
        contentWrap.className = 'mm-section-content';

        let isCollapsed = false;
        titleDiv.onclick = () => {
            if (typeof AudioFX !== 'undefined') AudioFX.playClick();
            isCollapsed = !isCollapsed;
            if (isCollapsed) sec.classList.add('collapsed');
            else sec.classList.remove('collapsed');
        };

        sec.appendChild(titleDiv);

        if (subtitle) {
            const sub = document.createElement('div'); sub.className = 'mm-subtitle'; 
            sub.innerHTML = subtitle;
            contentWrap.appendChild(sub);
        }
        
        sec.appendChild(contentWrap);
        container.appendChild(sec);

        const controls = {
            filteredList(col1Name, col2Name, dataFunc, onRowClick, isLive = false) {
                const wrap = document.createElement('div'); wrap.className = 'mm-filter-wrap';
                
                const searchBox = document.createElement('input'); 
                searchBox.className = 'mm-filter-input'; 
                searchBox.placeholder = 'Search...'; 
                searchBox.addEventListener('keydown', e => e.stopPropagation()); 
                searchBox.addEventListener('keyup', e => e.stopPropagation());
                searchBox.addEventListener('keypress', e => e.stopPropagation());
                
                const header = document.createElement('div'); header.className = 'mm-list-header';
                header.innerHTML = `<div class="mm-list-col">${col1Name}</div><div class="mm-list-col right">${col2Name}</div>`;
                
                const listWrap = document.createElement('div'); listWrap.className = 'mm-list-items';
                
                let lastDataHash = "";

                const renderItems = (filterText = '') => {
                    const lowerFilter = filterText.toLowerCase();
                    const rawData = typeof dataFunc === 'function' ? dataFunc() : dataFunc;
                    const safeData = rawData || []; 

                    // Primitive diff checker to avoid DOM thrashing
                    const currentHash = filterText + "|" + (Array.isArray(safeData) ? safeData.length : Object.keys(safeData).length);
                    if (isLive && currentHash === lastDataHash && listWrap.children.length > 0) return;
                    lastDataHash = currentHash;

                    // DocumentFragment allows memory batched DOM appends (HUGE performance boost)
                    const fragment = document.createDocumentFragment();
                    const rawCol1 = col1Name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                    const rawCol2 = col2Name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                    
                    let resultCount = 0;

                    Object.values(safeData).forEach(item => {
                        const key1 = Object.keys(item).find(k => k.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === rawCol1);
                        const key2 = Object.keys(item).find(k => k.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === rawCol2);
                        
                        const val1 = key1 ? String(item[key1]) : '???';
                        const val2 = key2 ? String(item[key2]) : '???';

                        if (val1.toLowerCase().includes(lowerFilter) || val2.toLowerCase().includes(lowerFilter)) {
                            const row = document.createElement('div'); row.className = 'mm-list-item';
                            row.innerHTML = `<span class="mm-list-name">${val1}</span><span class="mm-list-id">${val2}</span>`;
                            
                            if (onRowClick) {
                                row.style.cursor = 'pointer';
                                row.onclick = () => { 
                                    if (typeof AudioFX !== 'undefined') AudioFX.playClick();
                                    onRowClick(item); 
                                };
                            }
                            fragment.appendChild(row);
                            resultCount++;
                        }
                    });
                    
                    if (resultCount === 0) {
                        const empty = document.createElement('div');
                        empty.style.cssText = 'padding: 10px; text-align: center; color: #555; font-size: 9px; font-weight: bold; text-transform: uppercase;';
                        empty.textContent = 'No results bro 💀';
                        fragment.appendChild(empty);
                    }

                    listWrap.innerHTML = '';
                    listWrap.appendChild(fragment);
                };
                
                searchBox.oninput = (e) => {
                    lastDataHash = ""; // Force rebuild on manual input
                    renderItems(e.target.value);
                }
                
                renderItems(); 
                
                if (isLive) {
                    const liveUpdater = setInterval(() => {
                        if (!wrap.isConnected) {
                            clearInterval(liveUpdater);
                            return;
                        }
                        renderItems(searchBox.value);
                    }, 1000); // Throttled from 500ms to 1000ms
                }
                
                wrap.appendChild(searchBox); wrap.appendChild(header); wrap.appendChild(listWrap);
                contentWrap.appendChild(wrap); 
                return controls;
            },
            button(label, color, onClick) {
                const btn = document.createElement('button'); btn.className = `mm-btn-el${color ? ' ' + color : ''}`; btn.textContent = label;
                btn.onclick = (e) => { AudioFX.playClick(); if (onClick) onClick(e); };
                contentWrap.appendChild(btn); return controls;
            },
            label(text){
                const lbl = document.createElement('h1'); lbl.className = `mm-label`; lbl.textContent = text;
                contentWrap.appendChild(lbl); return controls;
            },
            multiButton(labels, color, onClicks) {
                const parent = document.createElement('div');
                parent.style.cssText = 'display: flex; gap: 8px; margin-bottom: 6px;';
                labels.forEach((label, i) => {
                    const btn = document.createElement('button'); btn.className = `mm-btn-el${color ? ' ' + color : ''}`; btn.textContent = label;
                    btn.onclick = (e) => { if (typeof AudioFX !== 'undefined') AudioFX.playClick(); if (onClicks && onClicks[i]) onClicks[i](e); };
                    parent.appendChild(btn); 
                });
                contentWrap.appendChild(parent); return controls;
            },
            checkbox(label, configKey, defaultVal, onChange) {
                const wrap = document.createElement('label'); wrap.className = 'mm-cb-wrap';
                const inp = document.createElement('input'); inp.type = 'checkbox'; inp.checked = Config.get(configKey, defaultVal);
                wrap.innerHTML = `<span class="mm-cb-box"></span><span class="mm-label">${label}</span>`;
                wrap.prepend(inp);
                inp.onchange = () => { Config.set(configKey, inp.checked); AudioFX.playToggle(inp.checked); if (onChange) onChange(inp.checked); };
                if (inp.checked && onChange) onChange(inp.checked);
                contentWrap.appendChild(wrap); return controls;
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
                row.appendChild(inp); contentWrap.appendChild(row); return controls;
            },
            dropdown(label, dataArray, actionBtnLabel, secLabel, onSelect) {
                const dropdownContainer = document.createElement('div'); dropdownContainer.className = 'mm-dropdown-container';
                const trigger = document.createElement('button'); trigger.className = 'mm-dropdown-trigger'; trigger.innerHTML = `<span>${label}</span> <span class="mm-dd-arrow">▼</span>`;
                const menu = document.createElement('div'); menu.className = 'mm-dropdown-menu';
                const timerWrap = document.createElement('div'); timerWrap.className = 'mm-timer-wrap'; timerWrap.innerHTML = `<span class="mm-timer-text">WAITING...</span>`;

                const closeOnOutsideClick = (e) => { if (!dropdownContainer.contains(e.target)) { menu.classList.remove('open'); document.removeEventListener('click', closeOnOutsideClick); } };
                trigger.onclick = (e) => { e.stopPropagation(); const isOpen = menu.classList.contains('open'); document.querySelectorAll('.mm-dropdown-menu').forEach(m => m.classList.remove('open')); if (!isOpen) { menu.classList.add('open'); document.addEventListener('click', closeOnOutsideClick); } };

                dataArray.forEach(itemData => {
                    const item = document.createElement('div'); item.className = 'mm-dropdown-item';
                    item.innerHTML = `<span class="mm-dd-title">${itemData.data1}</span><span class="mm-dd-id">${secLabel}: ${itemData.data2}</span>`;
                    const actionBtn = document.createElement('button'); actionBtn.className = 'mm-dd-join-btn'; actionBtn.textContent = actionBtnLabel;
                    actionBtn.onclick = (e) => { e.stopPropagation(); AudioFX.playClick(); if (onSelect) onSelect(itemData.data1, itemData.data2, timerWrap); menu.classList.remove('open'); };
                    item.appendChild(actionBtn); menu.appendChild(item);
                });

                dropdownContainer.appendChild(trigger); dropdownContainer.appendChild(menu); dropdownContainer.appendChild(timerWrap); contentWrap.appendChild(dropdownContainer);
                return controls;
            },
            slider(label, configKey, min, max, defaultVal, onChange) {
                const wrap = document.createElement('div'); wrap.style.marginBottom = '6px';
                const row = document.createElement('div'); row.className = 'mm-row'; row.style.marginBottom = '6px';
                
                const valDisplay = document.createElement('span'); 
                valDisplay.style.cssText = 'color: var(--mm-theme); font-family: Consolas, monospace; font-size: 11px; font-weight: bold; text-shadow: 0 0 5px rgba(255,0,0,0.3);'; 
                valDisplay.textContent = Config.get(configKey, defaultVal);
                
                row.innerHTML = `<span class="mm-label">${label}</span>`;
                row.appendChild(valDisplay);
                
                const inp = document.createElement('input'); inp.type = 'range'; inp.className = 'mm-slider-el';
                inp.min = min; inp.max = max; inp.value = Config.get(configKey, defaultVal);
                
                inp.oninput = (e) => { 
                    e.stopPropagation(); 
                    valDisplay.textContent = inp.value; 
                    Config.set(configKey, inp.value); 
                    if (onChange) onChange(inp.value); 
                };
                
                wrap.appendChild(row); wrap.appendChild(inp); contentWrap.appendChild(wrap); 
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

    return { Config, Window: buildWindow, Sniffer, showNotification, trainerVersion, trainerName };
})();