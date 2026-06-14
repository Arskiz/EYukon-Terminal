(function () {
    if (window.__EngineHooked) return;
    window.__EngineHooked = true;

    console.log("%c[Engine] %cPlanting Phaser payload... 🥶", "color: #00ff88; font-weight: bold;", "");

    function plantPhaserHook() {
        const proto = window.Phaser?.Scenes?.SceneManager?.prototype;
        if (!proto || !proto.update || window.__PhaserHijacked) return;

        window.__PhaserHijacked = true;
        const originalUpdate = proto.update;

        proto.update = function (...args) {
            window.__SceneManager = this;
            return originalUpdate.apply(this, args);
        };
        console.log("[Engine] Phaser prototype intercepted. W. 🚀");
    }

    const enginePoll = setInterval(() => {
        try { plantPhaserHook(); } catch (e) {}

        const sm = window.__SceneManager;
        if (!sm || !sm.scenes) return;

        const wc = sm.scenes.find(s => s?.sys?.settings?.key === 'WorldController');
        if (!wc || !wc.client || !wc.client.penguin) return;

        clearInterval(enginePoll);

        window.__wc = wc;
        window.__client = wc.client;
        
        console.log("[Engine] WorldController locked. Engine is completely ours now. 💀");
        
        window.PenguinUI.showNotification("Engine hooked");
        buildGodModeAPI();
    }, 500);

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
                try { window.__wc.network.send('server_jump', { server: serverName }); return true; } 
                catch (e) { return false; }
            },
            sendChat: (msg) => {
                try {
                    window.__wc.network.send('send_message', { message: msg, modChat: false });
                    window.__wc.client.network.handler.handle({ 
                        action: 'send_message', 
                        args: { id: window.__client.id, message: msg } 
                    });
                    return true;
                } catch (e) { return false; }
            },
            addItem: (itemId) => {
                try { window.__wc.network.send('add_item', { item: itemId }); return true; } 
                catch (e) { return false; }
            },
            addFurniture: (furniId, qty = 1) => {
                try { window.__wc.network.send('add_furniture', { furniture: furniId, quantity: qty }); return true; } 
                catch (e) { return false; }
            },
            addStamp: (stampId) => {
                try { window.__wc.network.send('stamp_earned', { id: stampId }); return true; } 
                catch (e) { return false; }
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
                        id: p.id, username: p.username || '', x: p.x, y: p.y
                    }));
                } catch (e) { return []; }
            }
        };
        window.dispatchEvent(new Event('CPLEngineReady'));
    }
})();

(function () {
    'use strict';
    window.playerList = [];
    window._self = [];
    
    const sendPacket = (command, data = {}) => {
        if (!window._MM_SOCKETS || window._MM_SOCKETS.length === 0) return;
        const packet = { type: 2, data: ['message', command, data], options: { compress: true }, nsp: '/' };
        const encoded = window.msgpack.encode(packet);
        window._MM_sendRaw(encoded);
    };

    let hasConnectedOnce = false;
    let domCache = {}; // Cache DOM elements to prevent lagging the main thread

    function runStatusCheckLoop() {
        if (!domCache.statusText) {
            domCache.statusText = document.getElementById('mm-status');
            domCache.statusDot = document.getElementById('mm-dot');
            domCache.nickDisplay = document.getElementById("mm-player-nick-display");
            domCache.idDisplay = document.getElementById('mm-player-id-display');
            domCache.functionalPanel = document.getElementById('mm-functional-panel');
        }

        const { statusText, statusDot, nickDisplay, idDisplay, functionalPanel } = domCache;
        const isSocketActive = !!(window._MM_SOCKETS && window._MM_SOCKETS.length > 0);

        if (statusText && statusDot && idDisplay) {
            if (isSocketActive) {
                hasConnectedOnce = true;
                if(!window.__client) {
                    statusText.className = 'mm-status-text connected';  
                    statusText.textContent = 'Connected - Awaiting engine...';
                } else {
                    statusText.className = 'mm-status-text connected';
                    statusText.textContent = `Connected - ${window.__client.network.worldName}`;
                }
                statusDot.className = 'mm-status-dot connected';
                if (functionalPanel) functionalPanel.classList.remove('mm-menu-locked');
                
                try {
                    // Optimized to directly grab user reference instead of looping every frame
                    if (window.__client && window.__client.penguin) {
                        window._self = window.__client.penguin;
                        idDisplay.textContent = parseInt(window._self.id || 0);
                        nickDisplay.textContent = window._self.username || window.__client.network.PenguinLogin?.penguin?.username || "Not logged in.";
                    }
                } catch (e) { }
            } else {
                if(hasConnectedOnce){
                    let reason = "Unknown reason";
                    try { reason = window.__client.network.kickMessage || reason; } catch(e){} 

                    if(reason.toLowerCase().includes("banned")){
                        window.PenguinUI.showNotification(`Ban detected`, "❌");
                    } else if(reason.toLowerCase().includes("idle")){
                        window.PenguinUI.showNotification(`Kicked for being idle`, "⚠️");
                    } else {
                        window.PenguinUI.showNotification(`Disconnected from the server.`, "⚠️");
                    }
                    hasConnectedOnce = false;
                }
                statusText.className = 'mm-status-text disconnected'; 
                statusText.textContent = 'Not connected';
                statusDot.className = 'mm-status-dot disconnected';
                if (functionalPanel) functionalPanel.classList.add('mm-menu-locked');
                idDisplay.textContent = "0"; 
                nickDisplay.textContent = "Not logged in.";
            }
        }
        setTimeout(runStatusCheckLoop, 1000);
    }

    const parsedRoomsArray = [];
    const parsedItemsArray = [];
    let lastRoom = 0;

    const TeleportController = {
        timeoutId: null,
        initiate(state, ms) {
            if (!state) { this.stop(); return; }
            this.stop(); 
            const loop = () => {
                if (parsedRoomsArray.length === 0) return;
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
        if (state && !antiAFKInterval) antiAFKInterval = setInterval(() => sendPacket('like_igloo', {id: 31974}), 300000); 
        else if (!state && antiAFKInterval) { clearInterval(antiAFKInterval); antiAFKInterval = null; }
    }

    function sendCoinHack(coinAmount, delayMs, timerWrap) {
        sendPacket('join_room', { room: 901, x: 100, y: 100 });
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

    let packetLog = []; let snifferRecording = false; const MAX_PACKETS = 200; 

    function logPacket(direction, rawPayload) {
        if (!snifferRecording) return;
        let cmd = "UNKNOWN", subCmd = "UNKNOWN";
        try { const args = rawPayload.data || []; cmd = args[0] || "N/A"; subCmd = args[1] || "N/A"; } catch(e) {}
        const d = new Date(); const pData = { time: `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}.${d.getMilliseconds()}`, dir: direction, cmd, subCmd, raw: rawPayload };
        packetLog.push(pData); if (packetLog.length > MAX_PACKETS) packetLog.shift();
        window.PenguinUI.Sniffer.renderPacket(pData);
    }

    function runPlayerTrackerLoop() {
        if(window.__client && window.__client?.world?.room?.penguins){
            window.playerList = window.__client.world.room.penguins;
        }
        setTimeout(runPlayerTrackerLoop, 1000);
    }

    function hookSocketIncoming() {
        if (!window._MM_SOCKETS || window._MM_SOCKETS.length === 0) return setTimeout(hookSocketIncoming, 1000);
        
        if (!window._MM_sendRawHooked) {
            window._MM_sendRawHooked = true;
            const original_MM_sendRaw = window._MM_sendRaw;
            window._MM_sendRaw = function(bytes) {
                try { if (snifferRecording) logPacket('OUT', window.msgpack.decode(bytes)); } catch(e) {}
                return original_MM_sendRaw(bytes);
            };
        }

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
        const ranks = ["Not ranked", "White", "Yellow", "Orange", "Green", "Blue", "Red", "Purple", "Brown", "Black", "Ninja Master"];
        return ranks[_rankID] || "Unknown";
    }

    function convertIdToSlot(id){
        const slots = {1:"color", 2:"head", 3:"face", 4:"neck", 5:"body", 6:"hand", 7:"feet", 8:"flag", 9:"photo"};
        return slots[id] || null;
    }

    function openPlayerProfile(p) {
        const profileWin = window.PenguinUI.Window(`Info: ${p.username || p.realUsername}`, { width: '280px', x: 'center', noFooter: true });
        
        const infoTab = profileWin.addTab("Stats");
        const joinDate = p.joinTime ? new Date(p.joinTime).toLocaleDateString() : 'Unknown';

        infoTab.section("Identity & Economy", "Core Database Records")
            .input("Player ID", `prof_id_${p.id}`, p.id || 0)
            .input("Coins", `prof_coins_${p.id}`, p.coins || 0)
            .input("Login Streak", `prof_streak_${p.id}`, p.loginStreak || 0)
            .input("Join Date", `prof_join_${p.id}`, joinDate)
            .button("Open Profile", null, () => sendPacket("get_player", {id: parseInt(p.id)}));

        const ninjaTab = profileWin.addTab("Ninja");
        ninjaTab.section("Card Jitsu History", "Rage quits, etc..")
            .input("Rank", `prof_rank_${p.id}`, (p.highestNinjaRank || 0) + " - " + ninjaRankToString(p.highestNinjaRank))
            .input("Matches Played", `prof_matches_${p.id}`, p.ninjaMatchesPlayed || 0)
            .input("Rage Quits", `prof_rq_${p.id}`, p.cardJitsuDisconnects || 0);

        const dripTab = profileWin.addTab("Drip");
        const slots = ["color", "head", "neck", "face", "body", "hand", "feet", "flag", "photo"];

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
                () => {
                    const confirmModal = window.PenguinUI.Window("Confirm Window", { width: '320px', noFooter: true, noTabs: true });
                    confirmModal.section("WARNING", "You are about to add Operator's worn items. This might get you banned.")
                        .multiButton(["YES", "NO"], null, [
                            () => confirmModal.close(),
                            () => confirmModal.close()
                        ]);
                },
                () => {
                    for(let i = 0; i < slots.length; i++){
                        let itemId = window.PenguinUI.Config.get(`drip_${slots[i]}_${p.id}`, p[slots[i]] || 0);
                        window.__wc.client.network.handler.handle({ 
                            action: 'update_player', 
                            args: { id: window.__client.id, item: parseInt(itemId), slot: slots[i] }
                        });
                    }
                    window.PenguinUI.showNotification(`Spoofed inventory from: ${p.username}.`);
                }
            ]);

        infoTab.section("Controls", "Actions")
            .button("Waddle to Coordinates", "blue", () => {
                if(window.CPLEngine && window.CPLEngine.sendPosition) {
                    window.CPLEngine.sendPosition(p.x, p.y);
                    window.PenguinUI.showNotification(`Warped to ${p.username}`);
                }
            })
            .button("📡 Dump Raw Data to Console", "yellow", () => {
                console.log(`%c[Terminal] %cRaw data for ${p.username}:`, "color:#ff0055;font-weight:bold;", "", p);
                window.PenguinUI.showNotification(`Check devtools for raw JSON.`);
            })
            .checkbox("Copy player movement", "copy_mov", false, () => {});
    }

    function initMenu() {
        window.PenguinUI.Sniffer.build(
            () => { snifferRecording = !snifferRecording; return snifferRecording; },
            () => { packetLog = []; window.PenguinUI.Sniffer.clear(); },
            () => { logPacket('IN', {data: ['message', 'UI_TEST', {msg: 'LIBRARY TEST W'}]}); }
        );

        const win = window.PenguinUI.Window(`${window.PenguinUI.trainerName} trainer`, { x: 'right', y: '20px', width: '390px', minimized: true });

        const general = win.addTab("General");
        win.addTab("Players").section("Active Session", "Players in current room")
        .filteredList("Username", "ID", () => Object.values(window.playerList || {}), (playerObject) => { openPlayerProfile(playerObject); }, true);

        const coinOptions = []; for(let i = 1; i< 100; i++) coinOptions.push({ data1: i * 50, data2: 2000 * i});
        let p_profile_id = window.PenguinUI.Config.get("penguinP_ID");
        let p_spoof_name = "";
        let tp_ms = window.PenguinUI.Config.get("tp-ms");

        general.section("Player", "Player options")
            .checkbox("Anti Afk Kick", "anti-afk_enabled", false, val => initiateAntiAFKKick(val))
            .input("Penguin profile ID", "penguinP_ID", "", "ID...", val => { p_profile_id = val; })
            .button("Open Penguin Profile", "p_profile_open", () => sendPacket("get_player", {id: parseInt(p_profile_id)}))
            .input("Spoof your name", "penguinS_Name", "", "Name...", val => { p_spoof_name = val; })
            .button("Spoof name", "spoof-name", val => {
                if (window.__client?.penguin?.nameTag) window.__client.penguin.nameTag.setText(window.PenguinUI.Config.get("penguinS_Name"));
            });

        general.section("Fun", "Such as fast tp etc..")
            .slider("Teleport Delay (ms)", "tp_delay", 0, 1000, 450, val => { tp_ms = val; })
            .checkbox("Activate teleporting", null, false, val => TeleportController.initiate(val, tp_ms));

        general.section("Economy")
            .dropdown("Select Coin Amount", coinOptions, "Get Coins", "Wait time", (data1, data2, timerUI) => sendCoinHack(data1, data2, timerUI));

        const roomsSection = win.addTab("Rooms").section("Room Stuff", "Room joiner, etc");
        const inventory = win.addTab("Inventory").section("Inventory Stuff", "Inventory adder, item spoofer, etc...");
        
        let savedBots = window.PenguinUI.Config.get("bot-list") || [];
        let newBotUsername = window.PenguinUI.Config.get("bot-username");
        let newBotPassword = window.PenguinUI.Config.get("bot-password");

        const bots = win.addTab("Bots");
        bots.section("Bot list", "List of bot usernames and passwords")
        .filteredList("Username", "Password", () => savedBots, (bot) => { console.log(bot.username); }, true);
        bots.section("Add bots", "Add new bots here")
        .input("Username", "bot-username", "", "...", val => newBotUsername = val)
        .input("Password", "bot-password", "", "...", val => newBotPassword = val)
        .button("Add Bot", "green", () => {
            savedBots.push({ username: newBotUsername, password: newBotPassword });
            window.PenguinUI.Config.set("bot-list", savedBots);
        });

        const misc = win.addTab("Settings");
        misc.section("Customization", "Make it look different")
            .input("Theme Color", "theme_color", "#bf0000", "", val => document.documentElement.style.setProperty('--mm-theme', val), "color")
            .input("Title Color", "title_color", "#ffffff", "", val => document.documentElement.style.setProperty('--mm-title', val), "color");
        misc.section("Developer Tools")
            .button("Open Packet Sniffer", "blue", () => { const s = document.getElementById('mm-sniffer-container'); if (s) s.classList.toggle('open'); });
        misc.section("Debug")
            .button("Dump State", "yellow", () => console.log('Sockets:', window._MM_SOCKETS ? window._MM_SOCKETS.length : 0))
            .button("Reset Position", "red", () => { window.PenguinUI.Config.set('menu_x', null); window.PenguinUI.Config.set('menu_y', '20px'); alert("Refresh page!"); });

        const dataRipLoop = setInterval(() => {
            if (!window.__wc || !window.__wc.crumbs) return;
            clearInterval(dataRipLoop);

            try {
                const rawRooms = window.__wc.crumbs.rooms;
                const rawItems = window.__wc.crumbs.items;

                for (const roomId in rawRooms) {
                    const key = rawRooms[roomId].key || "Unknown";
                    parsedRoomsArray.push({ name: key.charAt(0).toUpperCase() + key.slice(1), id: roomId });
                }

                for (const itemId in rawItems) {
                    parsedItemsArray.push({ name: rawItems[itemId].name || "Unknown", id: itemId });
                }

                roomsSection.filteredList("Name", "ID", () => parsedRoomsArray, (room) => { window.CPLEngine.joinRoom(parseInt(room.id), 100, 100); });
                inventory.filteredList("Name", "ID", () => parsedItemsArray, (item) => { window.CPLEngine.addItem(parseInt(item.id)); });
                inventory.label("Item spoofer:");
                inventory.filteredList("Name", "ID", () => parsedItemsArray, (item) => { 
                    const itemCrumb = window.__wc.crumbs.items[item.id];
                    if (!itemCrumb) return window.PenguinUI.showNotification("Item not found 💀");

                    const _slot = convertIdToSlot(itemCrumb.type);
                    window.__wc.client.network.handler.handle({ 
                        action: 'update_player', 
                        args: { id: window.__client.id, item: parseInt(item.id), slot: _slot }
                    });
                    
                    window.PenguinUI.showNotification(`Spoofed ${item.name} 🥶`);
                 });

            } catch (err) {
                console.error("Failed to parse game crumbs natively.", err);
            }
        }, 1000); 
    }

    runStatusCheckLoop();
    hookSocketIncoming();
    runPlayerTrackerLoop(); 
    if (document.body) initMenu(); else document.addEventListener('DOMContentLoaded', initMenu);
})();