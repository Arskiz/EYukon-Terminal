(function () {
    if (window.__EngineHooked) return;
    window.__EngineHooked = true;

    console.log("%c[Engine] %cPlanting Phaser payload... 🥶", "color: #00ff88; font-weight: bold;", "");

    // 1. Hijack the SceneManager to steal the game instance
    function plantPhaserHook() {
        const proto = window.Phaser?.Scenes?.SceneManager?.prototype;
        if (!proto || !proto.update || window.__PhaserHijacked) return;

        window.__PhaserHijacked = true;
        const originalUpdate = proto.update;

        // Force the engine to hand us the SceneManager every frame
        proto.update = function (...args) {
            window.__SceneManager = this;
            return originalUpdate.apply(this, args);
        };
        console.log("[Engine] Phaser prototype intercepted. W. 🚀");
    }

    // 2. Poll until the WorldController is fully loaded
    const enginePoll = setInterval(() => {
        try { plantPhaserHook(); } catch (e) {}

        const sm = window.__SceneManager;
        if (!sm || !sm.scenes) return;

        // Find the active game world
        const wc = sm.scenes.find(s => s?.sys?.settings?.key === 'WorldController');
        if (!wc || !wc.client || !wc.client.penguin) return;

        clearInterval(enginePoll);

        // Cache the raw objects globally so your UI can abuse them
        window.__wc = wc;
        window.__client = wc.client;
        
        console.log("[Engine] WorldController locked. Engine is completely ours now. 💀");
        
        window.PenguinUI.showNotification("Engine hooked");
        // Build the native API
        buildGodModeAPI();
    }, 500);

    // 3. The Engine API for your UI to call
    function buildGodModeAPI() {
        window.CPLEngine = {
            joinRoom: (roomId, x = 0, y = 0) => {
                try {
                    const roomKey = window.__wc.crumbs.rooms[roomId]?.key || 'town';
                    Object.getPrototypeOf(window.__client).sendJoinRoom.call(window.__client, roomId, roomKey, x, y, 40);
                    return true;
                } catch (e) { console.error("Warp failed:", e); return false; }
            },
            switchWorld: (serverName) => {
                try { 
                    window.__wc.network.send('server_jump', { server: serverName }); 
                    return true;
                } catch (e) { return false; }
            },
            sendChat: (msg) => {
                try {
                    window.__wc.network.send('send_message', { message: msg, modChat: false });
                    // Fake the client-side render so you see your own chat
                    window.__wc.client.network.handler.handle({ 
                        action: 'send_message', 
                        args: { id: window.__client.id, message: msg } 
                    });
                    return true;
                } catch (e) { return false; }
            },
            addItem: (itemId) => {
                try { window.__wc.network.send('add_item', { item: itemId }); return true; } catch (e) { return false; }
            },
            addFurniture: (furniId, qty = 1) => {
                try { window.__wc.network.send('add_furniture', { furniture: furniId, quantity: qty }); return true; } catch (e) { return false; }
            },
            addStamp: (stampId) => {
                try { window.__wc.network.send('stamp_earned', { id: stampId }); return true; } catch (e) { return false; }
            },
            sendPosition: (x, y) => {
                try {
                    window.__wc.network.send('send_position', { x, y });
                    window.__wc.client.network.handler.handle({ 
                        action: 'send_position', 
                        args: { id: window.__client.id, x, y } 
                    });
                    return true;
                } catch (e) { return false; }
            },
            getPenguins: () => {
                try {
                    const room = window.__wc.room;
                    if (!room || !room.penguins) return [];
                    return Object.values(room.penguins).map(p => ({
                        id: p.id,
                        username: p.username || '',
                        x: p.x, 
                        y: p.y
                    }));
                } catch (e) { return []; }
            }
        };
        
        // Dispatch an event so your cheat script knows it's safe to load the UI
        window.dispatchEvent(new Event('CPLEngineReady'));
    }
})();

(function () {
    'use strict';
    
    // Core game packet sender
    const sendPacket = (command, data = {}) => {
        if (!window._MM_SOCKETS || window._MM_SOCKETS.length === 0) return;
        const packet = { type: 2, data: ['message', command, data], options: { compress: true }, nsp: '/' };
        const encoded = window.msgpack.encode(packet);
        window._MM_sendRaw(encoded);
    };

    function getServerString(serverUrl) { return (serverUrl && serverUrl.includes("blizzard")) ? "Blizzard" : "Unknown"; }

    function runStatusCheckLoop() {
        const statusText = document.getElementById('mm-status'); const statusDot = document.getElementById('mm-dot');
        const nickDisplay = document.getElementById("mm-player-nick-display"); const idDisplay = document.getElementById('mm-player-id-display');
        const functionalPanel = document.getElementById('mm-functional-panel');
        const isSocketActive = !!(window._MM_SOCKETS && window._MM_SOCKETS.length > 0);

        if (statusText && statusDot && idDisplay) {
            if (isSocketActive) {
                statusText.className = 'mm-status-text connected'; statusText.textContent = 'Connected - ' + getServerString(window._MM_SOCKETS[0].url);
                statusDot.className = 'mm-status-dot connected';
                if (functionalPanel) functionalPanel.classList.remove('mm-menu-locked');
                try {
                    if (window.FlashBridge && window.FlashBridge.shell) {
                        idDisplay.textContent = window.FlashBridge.shell.getMyPlayerId() || "0";
                        nickDisplay.textContent = window.FlashBridge.shell.getMyPlayerNickname() || "Not logged in.";
                    }
                } catch (e) { }
            } else {
                statusText.className = 'mm-status-text disconnected'; statusText.textContent = 'Not connected';
                statusDot.className = 'mm-status-dot disconnected';
                if (functionalPanel) functionalPanel.classList.add('mm-menu-locked');
                idDisplay.textContent = "0"; nickDisplay.textContent = "Not logged in.";
            }
        }
        setTimeout(runStatusCheckLoop, 1000);
    }

    // --- GAME DATA ARRAYS ---
    const parsedRoomsArray = [];
    const parsedItemsArray = [];
    let lastRoom = 0;

    // --- AUTOMATION CONTROLLERS ---
    const TeleportController = {
        timeoutId: null,
        initiate(state, ms) {
            if (!state) { this.stop(); return; }
            this.stop(); 
            const loop = () => {
                let joinableRooms = parsedRoomsArray.filter(mf => mf.data1 !== "Staff");
                joinableRooms.splice(lastRoom, 1);
                const randomRoom = joinableRooms[Math.floor(Math.random() * joinableRooms.length)];
                lastRoom = joinableRooms.findIndex(mf => mf.data1 === randomRoom.data1);
                sendPacket('join_room', { room: parseInt(randomRoom.data2), x: 100, y: 100 });
                this.timeoutId = setTimeout(loop, ms);
            };
            this.timeoutId = setTimeout(loop, ms);
        },
        stop() { if (this.timeoutId) { clearTimeout(this.timeoutId); this.timeoutId = null; } }
    };

    let antiAFKInterval = null;
    function initiateAntiAFKKick(state) {
        if (state && !antiAFKInterval) antiAFKInterval = setInterval(() => sendPacket('stamp_earned', {id: 9999}), 300000); 
        else if (!state && antiAFKInterval) { clearInterval(antiAFKInterval); antiAFKInterval = null; }
    }

    function sendCoinHack(coinAmount, delayMs, timerWrap) {
        window._MM_Log("Sent to hack coins"); sendPacket('join_room', { room: 901, x: 100, y: 100 });
        if (timerWrap) {
            timerWrap.classList.add('active');
            const textEl = timerWrap.querySelector('.mm-timer-text'); textEl.style.color = '#ffcc00'; 
            let timeLeft = delayMs;
            const formatTime = (ms) => `${Math.floor((ms / 1000) / 60)}m ${((ms / 1000) % 60) < 10 ? '0' : ''}${(ms / 1000) % 60}s`;
            
            const interval = setInterval(() => {
                timeLeft -= 1000;
                if (timeLeft <= 0) {
                    clearInterval(interval); sendPacket('game_over', { coins: coinAmount });
                    textEl.style.color = "var(--mm-theme)"; textEl.textContent = "Coins generated. Press X Ingame to collect.";
                    setTimeout(() => timerWrap.classList.remove('active'), 3500);
                } else { textEl.textContent = `WAIT: ${formatTime(timeLeft)}`; }
            }, 1000);
        }
    }

    // --- SNIFFER LOGIC ---
    let packetLog = []; let snifferRecording = false; const MAX_PACKETS = 200; 

    function logPacket(direction, rawPayload) {
        if (!snifferRecording) return;
        let cmd = "UNKNOWN", subCmd = "UNKNOWN";
        try { const args = rawPayload.data || []; cmd = args[0] || "N/A"; subCmd = args[1] || "N/A"; } catch(e) {}
        const d = new Date(); const pData = { time: `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}.${d.getMilliseconds()}`, dir: direction, cmd, subCmd, raw: rawPayload };
        packetLog.push(pData); if (packetLog.length > MAX_PACKETS) packetLog.shift();
        window.PenguinUI.Sniffer.renderPacket(pData);
    }

    // --- NATIVE PLAYER RADAR ---
    // --- NATIVE PLAYER RADAR ---
    function runPlayerTrackerLoop() {
        const lvContainer = document.getElementById('mm-player-listview');
        if (!lvContainer) return setTimeout(runPlayerTrackerLoop, 1000);

        try {
            const penguins = window.__client?.world?.room?.penguins;
            
            if (!penguins) {
                lvContainer.innerHTML = '<div class="mm-list-item" style="color:var(--mm-text-mut)">Waiting for engine...</div>';
            } else {
                const penguinArray = Array.isArray(penguins) ? penguins : Object.values(penguins);

                if (penguinArray.length === 0) {
                    lvContainer.innerHTML = '<div class="mm-list-item" style="color:var(--mm-text-mut)">Room is empty...</div>';
                } else {
                    lvContainer.innerHTML = ''; 

                    penguinArray.forEach(p => {
                        const item = document.createElement('div');
                        item.className = 'mm-list-item';
                        
                        // Make it look like a clickable button
                        item.style.cursor = 'pointer';
                        item.title = "Click to open full database profile";
                        
                        // 🔥 THE SAUCE: Spawn the profile window when clicked 🔥
                        item.onclick = () => {
                            if (typeof window.PenguinUI !== 'undefined' && typeof window.PenguinUI.AudioFX !== 'undefined') {
                                window.PenguinUI.AudioFX.playClick();
                            }
                            openPlayerProfile(p);
                        };

                        // Add hover effect dynamically
                        item.onmouseenter = () => item.style.backgroundColor = '#1c1c1c';
                        item.onmouseleave = () => item.style.backgroundColor = 'transparent';

                        item.innerHTML = `
                            <span class="mm-list-name">${p.username || p.realUsername || 'Unknown'}</span>
                            <span class="mm-list-id">ID: ${p.id}</span>
                        `;
                        lvContainer.appendChild(item);
                    });
                }
            }
        } catch (err) { }

        setTimeout(runPlayerTrackerLoop, 1000);
    }

    function hookSocketIncoming() {
        if (!window._MM_SOCKETS || window._MM_SOCKETS.length === 0) return setTimeout(hookSocketIncoming, 1000);
        const original_MM_sendRaw = window._MM_sendRaw;
        window._MM_sendRaw = function(bytes) {
            try { if (snifferRecording) logPacket('OUT', window.msgpack.decode(bytes)); } catch(e) {}
            return original_MM_sendRaw(bytes);
        };

        window._MM_SOCKETS.forEach(socket => {
            if (socket.isFullyHooked) return;
            socket.isFullyHooked = true;
            
            socket.addEventListener('message', function(e) {
                try {
                    if (!snifferRecording || !(e.data instanceof ArrayBuffer)) return;
                    const decoded = window.msgpack.decode(new Uint8Array(e.data));
                    logPacket('IN', decoded);
                } catch(err) { }
            });
        });
        
        setTimeout(hookSocketIncoming, 2000);
    }

    function ninjaRankToString(_rankID){
        switch(_rankID){
            case 0: return "Not ranked";
            case 1: return "White"
            case 2: return "Yellow"
            case 3: return "Orange"
            case 4: return "Green"
            case 5: return "Blue"
            case 6: return "Red"
            case 7: return "Purple"
            case 8: return "Brown"
            case 9: return "Black"
            case 10: return "Ninja Master"
        }
    }

    function convertIdToSlot(id){
        switch(id){
            case 1: return "color"
            case 2: return "head"
            case 3: return "face"
            case 4: return "neck"
            case 5: return "body"
            case 6: return "hand"
            case 7: return "feet"
            case 8: return "flag"
            case 9: return "photo"
        }
    }

    // --- PLAYER INSPECTOR TERMINAL ---
    function openPlayerProfile(p) {
        // Spawn a new independent UI window for this specific player
        const profileWin = window.PenguinUI.Window(`🎯 Target: ${p.username || p.realUsername}`, { width: '280px', x: 'center', noFooter: true });
        
        // --- TAB 1: CORE STATS ---
        const infoTab = profileWin.addTab("Stats");
        
        // Format the join date so it doesn't look like an unreadable block of shit
        const joinDate = p.joinTime ? new Date(p.joinTime).toLocaleDateString() : 'Unknown';

        infoTab.section("Identity & Economy", "Core Database Records")
            .input("Player ID", `prof_id_${p.id}`, p.id || 0)
            .input("Coins", `prof_coins_${p.id}`, p.coins || 0)
            .input("Login Streak", `prof_streak_${p.id}`, p.loginStreak || 0)
            .input("Join Date", `prof_join_${p.id}`, joinDate)
            .button("Open Profile", null, () => sendPacket("get_player", {id: parseInt(p.id)}));

        // --- TAB 2: SWEAT CHECK ---
        const ninjaTab = profileWin.addTab("Ninja");
        ninjaTab.section("Card Jitsu History", "Rage quits, etc..")
            .input("Rank", `prof_rank_${p.id}`, (p.highestNinjaRank || 0) + " " + ninjaRankToString(p.highestNinjaRank))
            .input("Matches Played", `prof_matches_${p.id}`, p.ninjaMatchesPlayed || 0)
            .input("Rage Quits", `prof_rq_${p.id}`, p.cardJitsuDisconnects || 0);

        // --- TAB 3: THE DRIP ---
        const dripTab = profileWin.addTab("Drip");
        const slots = [
            "color",
            "head",
            "neck",
            "face",
            "body",
            "hand",
            "feet",
            "flag",
            "photo"
        ]

        dripTab.section("Worn Item IDs", "Steal their look")
            .input("Color", `drip_color_${p.id}`, p.color || 0)
            .input("Head", `drip_head_${p.id}`, p.head || 0)
            .input("Neck", `drip_neck_${p.id}`, p.neck || 0)
            .input("Face", `drip_face_${p.id}`, p.face || 0)
            .input("Body", `drip_body_${p.id}`, p.body || 0)
            .input("Hand", `drip_hand_${p.id}`, p.hand || 0)
            .input("Feet", `drip_feet_${p.id}`, p.feet || 0)
            .input("Pin",  `drip_flag_${p.id}`, p.flag || 0)
            .input("Background", `drip_photo_${p.id}`, p.photo || 0)
            .multiButton(["Steal Items", "Spoof steal items"], "green", [
                // Steal (Send packets to server to actually buy/wear them)
                () => {
                    for(let i = 0; i < slots.length; i++){
                        let itemId = window.PenguinUI.Config.get(`drip_${slots[i]}_${p.id}`, p[slots[i]] || 0);
                        window.CPLEngine.addItem(p[slots[i]] || 0);
                    }
                    window.PenguinUI.showNotification(`Tried adding inventory items from: ${p.username}.`);
                },

                // Spoof (Client-side illusion)
                () => {
                    for(let i = 0; i < slots.length; i++){
                        // 1. Grab from config, but FALLBACK to the target's actual item if the text box is untouched
                        let itemId = window.PenguinUI.Config.get(`drip_${slots[i]}_${p.id}`, p[slots[i]] || 0);
                        
                        // 2. Rawdog the engine directly with the native client ID
                        window.__wc.client.network.handler.handle({ 
                            action: 'update_player', 
                            args: { 
                                id: window.__client.id, 
                                item: parseInt(itemId), 
                                slot: slots[i] 
                            }
                        });
                    }
                    window.PenguinUI.showNotification(`Spoofed inventory from: ${p.username}.`);
                }
            ]);

        // --- TAB 4: ACTIONS ---
        infoTab.section("Troll Controls", "Actions")
            .button("Waddle to Coordinates", "blue", () => {
                if(window.CPLEngine && window.CPLEngine.sendPosition) {
                    // Force your penguin to walk directly on top of them
                    window.CPLEngine.sendPosition(p.x, p.y);
                    window.PenguinUI.showNotification(`Warped to ${p.username}`);
                }
            })
            .button("📡 Dump Raw Data to Console", "yellow", () => {
                console.log(`%c[Terminal] %cRaw data for ${p.username}:`, "color:#ff0055;font-weight:bold;", "", p);
                window.PenguinUI.showNotification(`Check devtools for ${p.username}'s raw JSON.`);
            });
    }

    // --- MAIN INITIALIZATION ---
    function initMenu() {
        // Build Sniffer UI (Passes logic callbacks to library)
        window.PenguinUI.Sniffer.build(
            () => { snifferRecording = !snifferRecording; return snifferRecording; },
            () => { packetLog = []; window.PenguinUI.Sniffer.clear(); },
            () => { logPacket('IN', {data: ['message', 'UI_TEST', {msg: 'LIBRARY TEST W'}]}); }
        );

        ///////////// Build Terminal Window
        const win = window.PenguinUI.Window("CPL Terminal by Arskiz", { x: 'right', y: '20px', width: '340px' });

        ///////////// Build Tabs & Sections


        // General tab
        const general = win.addTab("General");
        const playersTab = win.addTab("Players").section("Active Session", "Players in current room");
        playersTab.listview("mm-player-listview");

        const coinOptions = []; for(let i = 1; i< 100; i++) coinOptions.push({ data1: i * 50, data2: 2000 * i});
        let p_profile_id = window.PenguinUI.Config.get("penguinP_ID");
        let tp_ms = window.PenguinUI.Config.get("tp-ms");

        general.section("Player", "Player options")
            .checkbox("Anti Afk Kick", "anti-afk_enabled", false, val => initiateAntiAFKKick(val))
            .input("Penguin profile ID", "penguinP_ID", "", "ID...", val => { p_profile_id = val; })
            .button("Open Penguin Profile", "p_profile_open", () => sendPacket("get_player", {id: parseInt(p_profile_id)}))
            .input("Spoof your name", "penguinS_Name", "", "Name...", val => { p_spoof_name = val; })
            .button("Spoof name", "spoof-name", val => {
                window.__client.penguin.nameTag.setText(window.PenguinUI.Config.get("penguinS_Name"));
            });

        general.section("Fun", "Such as fast tp etc..")
            .input("Teleport Delay (ms)", "tp-ms", "", "Input delay...", val => { tp_ms = val; })
            .checkbox("Activate teleporting", null, false, val => TeleportController.initiate(val, tp_ms));

        general.section("Economy")
            .dropdown("Select Coin Amount", coinOptions, "Get Coins", "Wait time", (data1, data2, timerUI) => sendCoinHack(data1, data2, timerUI));


        // Room tab
        const roomsSection = win.addTab("Rooms").section("Room Stuff", "Room joiner, etc");

        // Misc tab
        const inventory = win.addTab("Inventory").section("Inventory Stuff", "Inventory adder, item spoofer, etc...");

        // Settings tab
        const misc = win.addTab("Settings");
        misc.section("Customization", "Make it look different")
            .input("Theme Color", "theme_color", "#bf0000", "", val => document.documentElement.style.setProperty('--mm-theme', val), "color")
            .input("Title Color", "title_color", "#ffffff", "", val => document.documentElement.style.setProperty('--mm-title', val), "color");
        misc.section("Developer Tools")
            .button("📡 Open Packet Sniffer", "blue", () => { const s = document.getElementById('mm-sniffer-container'); if (s) s.classList.toggle('open'); });
        misc.section("Debug")
            .button("🔍 Dump State", "yellow", () => window._MM_Log('Sockets:', window._MM_SOCKETS ? window._MM_SOCKETS.length : 0))
            .button("🗑️ Reset Position", "red", () => { window.PenguinUI.Config.set('menu_x', null); window.PenguinUI.Config.set('menu_y', '20px'); alert("Refresh page!"); });

        // --- NATIVE ENGINE DATA RIP (AWAITING ENGINE LOAD) 🥶 ---
        const dataRipLoop = setInterval(() => {
            // If the engine isn't fully injected yet, skip this tick and wait
            if (!window.__wc || !window.__wc.crumbs) return;

            // WE GOT THE SAUCE! Kill the waiting loop immediately so it only runs once.
            clearInterval(dataRipLoop);

            try {
                const rawRooms = window.__wc.crumbs.rooms;
                const rawItems = window.__wc.crumbs.items;

                // 1. Populate Rooms Array
                for (const id in rawRooms) {
                    const key = rawRooms[id].key || "Unknown";
                    parsedRoomsArray.push({ 
                        data1: key.charAt(0).toUpperCase() + key.slice(1), 
                        data2: id 
                    });
                }

                // 2. Populate Items Array
                for (const id in rawItems) {
                    parsedItemsArray.push({ 
                        data1: rawItems[id].name || "Unknown", 
                        data2: id 
                    });
                }

                // 3. Build the Dropdowns using our CPLEngine God-Hooks 🚀
                roomsSection.dropdown("Select Warp Target...", parsedRoomsArray, "Join", "ID", (data1, data2) => {
                    window.CPLEngine.joinRoom(parseInt(data2), 100, 100);
                });

                inventory.dropdown("Select item to add", parsedItemsArray, "Add", "ID", (data1, data2) => {
                    window.CPLEngine.addItem(parseInt(data2));
                    window.PenguinUI.showNotification(`Added ${data1} to inventory 🎒`);
                });

                inventory.dropdown("Select item to spoof", parsedItemsArray, "Wear", "ID", (data1, data2) => {
                    // Look up the exact item type dynamically straight from the engine
                    const itemCrumb = window.__wc.crumbs.items[data2];
                    if (!itemCrumb) return window.PenguinUI.showNotification("Item not found 💀");

                    const _slot = convertIdToSlot(itemCrumb.type);

                    window.__wc.client.network.handler.handle({ 
                        action: 'update_player', 
                        args: { 
                            id: window.__client.id, 
                            item: parseInt(data2), 
                            slot: _slot
                        }
                    });
                    
                    window.PenguinUI.showNotification(`Spoofed ${data1} 🥶`);
                });

                window._MM_Log(`Loaded ${parsedRoomsArray.length} rooms, ${parsedItemsArray.length} items straight from engine RAM. 🔥`);
            } catch (err) {
                window._MM_Error("Failed to parse game crumbs natively.", err);
            }
        }, 1000); // Checks every 1 second until you log in
        
    }

    runStatusCheckLoop();
    hookSocketIncoming();
    runPlayerTrackerLoop(); // 🔥 NEW SAUCE 🔥
    if (document.body) initMenu(); else document.addEventListener('DOMContentLoaded', initMenu);
})();