(function () {
    if (window.__EngineHooked) return;
    window.__EngineHooked = true;

    // console.log("%c[Engine] %cPlanting Phaser payload... 🥶", "color: #00ff88; font-weight: bold;", "");

    function plantPhaserHook() {
        const proto = window.Phaser?.Scenes?.SceneManager?.prototype;
        if (!proto || !proto.update || window.__PhaserHijacked) return;

        window.__PhaserHijacked = true;
        const originalUpdate = proto.update;

        proto.update = function (...args) {
            try {
                window.__SceneManager = this;
            } catch (e) { }
            return originalUpdate.apply(this, args);
        };
        // console.log("[Engine] Phaser prototype intercepted. W. 🚀");
    }

    const enginePoll = setInterval(() => {
        try { plantPhaserHook(); } catch (e) { }

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

    const getPacket = (command, data = {}) => {
        if (!window._MM_SOCKETS || window._MM_SOCKETS.length === 0) return;
        const packet = { type: 2, data: ['message', command, data], options: { compress: true }, nsp: '/' };
        const encoded = window.msgpack.encode(packet);
        window._MM_sendRaw(encoded);
    }

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
                if (!window.__client) {
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
                if (hasConnectedOnce) {
                    let reason = "Unknown reason";
                    try { reason = window.__client.network.kickMessage || reason; } catch (e) { }

                    if (reason.toLowerCase().includes("banned")) {
                        window.PenguinUI.showNotification(`Ban detected`, "❌");
                    } else if (reason.toLowerCase().includes("idle")) {
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
    const parsedInterArray = [{ id: 1, inter: "map" }, { id: 2, inter: "news" }, { id: 3, inter: "igloo" }];
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
        if (state && !antiAFKInterval) antiAFKInterval = setInterval(() => sendPacket('like_igloo', { id: 31974 }), 300000);
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
        try { const args = rawPayload.data || []; cmd = args[0] || "N/A"; subCmd = args[1] || "N/A"; } catch (e) { }
        const d = new Date(); const pData = { time: `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}.${d.getMilliseconds()}`, dir: direction, cmd, subCmd, raw: rawPayload };
        packetLog.push(pData); if (packetLog.length > MAX_PACKETS) packetLog.shift();
        window.PenguinUI.Sniffer.renderPacket(pData);
    }

    function runPlayerTrackerLoop() {
        if (window.__client && window.__client?.world?.room?.penguins) {
            let ogPenguins = window.__client.world.room.penguins;

            // Shallow clone the main list (handles both arrays and objects)
            let pList = Array.isArray(ogPenguins) ? [...ogPenguins] : { ...ogPenguins };

            let myId = __client.penguin.id;

            // Only clone YOUR penguin so we can safely fuck with it
            if (pList[myId]) {
                pList[myId] = { ...pList[myId] }; // 🧠 big brain shallow clone

                if (!pList[myId].username.includes("(self)")) {
                    pList[myId].username += " (self)";
                }
            }

            window.playerList = pList;
        }
        setTimeout(runPlayerTrackerLoop, 1000);
    }

    function runPlayerCustomizationLoop() {
        if (window.playerCustomization && Object.keys(window.playerCustomization).length > 0) {
            if (window.__client && window.__client?.world?.room?.penguins) {
                // Pull the weird object and turn it into a clean array 💯
                let rawPenguins = window.__client.world.room.penguins;
                let pList = Array.isArray(rawPenguins) ? [...rawPenguins] : Object.values({ ...rawPenguins });

                let myId = __client.penguin.id; // Still got this if u need it later

                pList.forEach(penguin => {
                    // Make sure the case matches your actual array (playerCustomization)
                    let customIndex = window.playerCustomization.findIndex(custom => custom.id === penguin.id);

                    // If customIndex ain't -1, that means we found the motherfucker
                    if (customIndex !== -1) {
                        customizePenguin(penguin, customIndex);
                    }
                });
            }
        }

        setTimeout(runPlayerCustomizationLoop, 500);
    }

    function customizePenguin(playerObj, index) {

        // 🧠 9000 IQ play: Just grab the player directly using the index you passed
        let customPlayer = window.playerCustomization[index];

        // If they ain't got mods or don't exist, get the fuck out
        if (!customPlayer || !customPlayer.mods) return;

        // Now we loop through their actual MODS, not the lobby index 💀
        customPlayer.mods.forEach(mod => {
            switch (mod.name) {
                // --- Name Spoofing ---
                case "name-spoof":
                    // Make sure window.__wc ain't a typo for window.__client bro
                    let spoofedName = mod.action;

                    if (window.__wc?.world?.room?.penguins[customPlayer.id]) {
                        window.__wc.world.room.penguins[customPlayer.id].nameTag.setText(spoofedName);
                        window.__wc.world.room.penguins[customPlayer.id].username = spoofedName;
                        _MM_Log(`Set playerID ${customPlayer.id}'s name to "${spoofedName}".`);
                    }
                    else {
                        _MM_Error(`Error: player ${playerObj.username} is not on the room!`);
                    }

                    break;
                // --- Player Scaling
                case "scale-spoof":
                    let targetSize = mod.action;
                    if (window.__wc?.world?.room?.penguins[customPlayer.id]) {
                        window.__wc.world.room.penguins[customPlayer.id].setScale(targetSize, targetSize, targetSize);
                        _MM_Log(`Set playerID ${customPlayer.id}'s scale to "${targetSize}".`);
                    }
                    else {
                        _MM_Error(`Error: player ${playerObj.username} is not on the room!`);
                    }

                    break;

                // --- Player NameTag Stroke
                case "nt-stroke-spoof":
                    let targetStrokeColor = mod.action[0];
                    let targetStroke = mod.action[1];
                    if (window.__wc?.world?.room?.penguins[customPlayer.id]) {
                        window.__wc.world.room.penguins[customPlayer.id].nameTag.setStroke(targetStrokeColor, parseInt(targetStroke));
                        _MM_Log(`Set playerID ${customPlayer.id}'s nametag stroke to "${targetStroke}".`);
                    }
                    else {
                        _MM_Error(`Error: player ${playerObj.username} is not on the room!`);
                    }

                    break;

                // --- Player NameTag Color
                case "nt-color-spoof":
                    let targetNametagColor = mod.action;
                    if (window.__wc?.world?.room?.penguins[customPlayer.id]) {
                        window.__wc.world.room.penguins[customPlayer.id].nameTag.setColor(targetNametagColor);
                        _MM_Log(`Set playerID ${customPlayer.id}'s nametag color to "${targetNametagColor}".`);
                    }
                    else {
                        _MM_Error(`Error: player ${playerObj.username} is not on the room!`);
                    }

                    break;

                // --- Player NameTag Size
                case "spoof-nametag-scale":
                    let targetNametagScale = mod.action;
                    if (window.__wc?.world?.room?.penguins[customPlayer.id]) {
                        window.__wc.world.room.penguins[customPlayer.id].nameTag.setFontSize(parseInt(targetNametagScale));
                        _MM_Log(`Set playerID ${customPlayer.id}'s nametag scale to "${targetNametagScale}".`);
                    }
                    else {
                        _MM_Error(`Error: player ${playerObj.username} is not on the room!`);
                    }

                    break;

            }
        });
    }

    function hookSocketIncoming() {
        if (!window._MM_SOCKETS || window._MM_SOCKETS.length === 0) return setTimeout(hookSocketIncoming, 1000);

        // 🛑 NUKE the old _MM_sendRaw hook. We are hijacking the raw WebSocket prototype now. 🧠
        if (!window.__WSSendHooked) {
            window.__WSSendHooked = true;
            const originalWSSend = WebSocket.prototype.send;

            WebSocket.prototype.send = function (data) {
                // ⚠️ CRITICAL: If a BOT is sending this packet, just send it normally!
                // If we don't ignore bot sockets here, they will echo themselves into an infinite crash loop.
                if (this.botUser) {
                    return originalWSSend.call(this, data);
                }

                try {
                    if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
                        const u8 = new Uint8Array(data);
                        const decoded = window.msgpack.decode(u8);

                        // Sniffer catches literally EVERYTHING now. Massive W.
                        if (snifferRecording) logPacket('OUT', decoded);

                        // 👇 THE REAL HIVEMIND LOGIC 👇
                        if (decoded && decoded.type === 2 && decoded.data && decoded.data[0] === 'message') {
                            const cmd = decoded.data[1];
                            const payload = decoded.data[2];

                            // Notice we added (ws, idx) so we can count the bots 🧠
                            if (cmd === 'join_room' && window.global_copying_rooms) {
                                window.myActiveBots.forEach((ws, idx) => {
                                    if (ws.readyState === 1) {
                                        setTimeout(() => {
                                            ws.send(window.msgpack.encode({ type: 2, data: ['message', 'join_room', payload], options: { compress: true }, nsp: '/' }));
                                        }, idx * 50); // 50ms delay multiplied by bot number so they stagger in like a real squad
                                    }
                                });
                            }
                            
                            if (cmd === 'join_igloo' && window.global_copying_igloos) {
                                window.myActiveBots.forEach((ws, idx) => {
                                    if (ws.readyState === 1) {
                                        setTimeout(() => {
                                            ws.send(window.msgpack.encode({ type: 2, data: ['message', 'join_igloo', payload], options: { compress: true }, nsp: '/' }));
                                        }, idx * 50);
                                    }
                                });
                            }

                            if (cmd === 'like_igloo' && window.global_copying_igloos) {
                                window.myActiveBots.forEach((ws, idx) => {
                                    if (ws.readyState === 1) {
                                        setTimeout(() => {
                                            ws.send(window.msgpack.encode({ type: 2, data: ['message', 'like_igloo', payload], options: { compress: true }, nsp: '/' }));
                                        }, idx * 50);
                                    }
                                });
                            }
                        }
                    } else if (typeof data === 'string') {
                        // Log string heartbeats without bricking the decoder
                        if (snifferRecording) logPacket('OUT', { data: data });
                    }
                } catch (e) { 
                    // console.error("WS Hook error:", e); 
                }

                return originalWSSend.call(this, data);
            };
        }

        // Hook incoming data for the sniffer
        window._MM_SOCKETS.forEach(socket => {
            if (socket.isFullyHooked) return;
            socket.isFullyHooked = true;
            socket.addEventListener('message', function (e) {
                try {
                    // Ignore incoming bot packets for the sniffer so it doesn't get cluttered with bot spam
                    if (this.botUser) return; 

                    if (!snifferRecording || !(e.data instanceof ArrayBuffer)) return;
                    const decoded = window.msgpack.decode(new Uint8Array(e.data));
                    logPacket('IN', decoded);
                } catch (err) { }
            });
        });

        setTimeout(hookSocketIncoming, 2000);
    }

    function ninjaRankToString(_rankID) {
        const ranks = ["Not ranked", "White", "Yellow", "Orange", "Green", "Blue", "Red", "Purple", "Brown", "Black", "Ninja Master"];
        return ranks[_rankID] || "Unknown";
    }

    function convertIdToSlot(id) {
        const slots = { 1: "color", 2: "head", 3: "face", 4: "neck", 5: "body", 6: "hand", 7: "feet", 8: "flag", 9: "photo" };
        return slots[id] || null;
    }

    class PlayerCustomization {
        constructor(id, spoofing = false, mods = []) {
            this.id = id;
            this.spoofing = spoofing;
            this.mods = mods;
        }
    }

    class CustomizationMod {
        constructor(name, enabled = false, action) {
            this.name = name;
            this.enabled = enabled;
            this.action = action;
        }
    }

    window.playerCustomization = [];

    function openPlayerProfile(p) {
        const profileWin = window.PenguinUI.Window(`Info: ${p.username || p.realUsername}`, { width: '280px', x: 'center', noFooter: true });

        const infoTab = profileWin.addTab("Stats");
        const joinDate = p.joinTime ? new Date(p.joinTime).toLocaleDateString() : 'Unknown';
        let penguinObj = `penguinS_Name_${p.id}`;
        const restriction = p.safeChat === 0 ? "None" : "Safe Chat Enabled";
        const iggyLikes = window.PenguinUI.Config.get(`prof_iggylikes_${p.id}`) || "0";

        infoTab.section("Identity", "Core Database Records")
            .input("Player ID", `prof_id_${p.id}`, p.id || 0)
            .input("Registered Username", `prof_rname_${p.id}`, p.realUsername || "Unknown")
            .input("Coins", `prof_coins_${p.id}`, p.coins || 0)
            .input("Login Streak", `prof_streak_${p.id}`, p.loginStreak || 0)
            .input("Join Date", `prof_join_${p.id}`, joinDate)
            .input("Restrictions", `prof_restr_${p.id}`, restriction)
            .input("Igloo likes", `prof_iggylikes_${p.id}`, iggyLikes);

        const ninjaTab = profileWin.addTab("Ninja");
        ninjaTab.section("Card Jitsu History", "Rage quits, etc..")
            .input("Rank", `prof_rank_${p.id}`, (p.highestNinjaRank || 0) + " | " + ninjaRankToString(p.highestNinjaRank))
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
            .input("Pin", `drip_flag_${p.id}`, p.flag || 0)
            .input("Background", `drip_photo_${p.id}`, p.photo || 0)
            .multiButton(["Steal Items", "Spoof steal items"], "green", [
                () => {
                    const confirmModal = window.PenguinUI.Window("Confirm Window", { width: '320px', noFooter: true, noTabs: true });
                    confirmModal.section("WARNING", `You are about to add ${p.username}'s worn items. This might get you banned.`)
                        .multiButton(["YES", "NO"], null, [
                            () => confirmModal.close(),
                            () => confirmModal.close()
                        ]);
                },
                () => {
                    for (let i = 0; i < slots.length; i++) {
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
                if (window.CPLEngine && window.CPLEngine.sendPosition) {
                    window.CPLEngine.sendPosition(p.x, p.y);
                    window.PenguinUI.showNotification(`Warped to ${p.username}`);
                }
            })
            .button("Open Profile", null, () => {
                sendPacket("get_player", { id: parseInt(p.id) });
            })

            .button("Join Igloo", null, () => {
                sendPacket("join_igloo", { igloo: parseInt(p.id) });
                window.PenguinUI.showNotification(`Joined igloo ${p.id} owned by ${p.realUsername}.`);
            });
        /*
        .button("Dump Raw Data to Console", "yellow", () => {
            console.log(`%c[Terminal] %cRaw data for ${p.username}:`, "color:#ff0055;font-weight:bold;", "", p);
            window.PenguinUI.showNotification(`Check devtools for raw JSON.`);
        });
        */

        //.checkbox("Copy player movement", "copy_mov", false, () => {});

        const customizationTab = profileWin.addTab("Customization");
        let p_spoof_name = window.PenguinUI.Config.get(`penguinS_Name_${p.id}`);
        let p_spoof_name_scale = window.PenguinUI.Config.get(`penguinS_Name_Scale${p.id}`);
        let p_spoof_scale = window.PenguinUI.Config.get(`penguinS_Scale_${p.id}`);
        let p_spoof_stroke = window.PenguinUI.Config.get(`penguinS_Stroke_${p.id}`);
        let p_spoof_stroke_color = window.PenguinUI.Config.get(`penguinS_NStroke_${p.id}`);
        let P_spoof_nametag_color = window.PenguinUI.Config.get(`penguinS_NColor_${p.id}`);

        customizationTab.section("Customize da penguin")
            .input("Player Scale", `penguinS_Scale_${p.id}`, 1, "ex: 5 | 1 ... etc", val => { p_spoof_scale = val; })
            .button("Spoof scale", "spoof-scale", () => applyCustomMod(p, "scale-spoof", p_spoof_scale));
            
        customizationTab.section("Nametag n stuff")
            .input("Nametag Text", `penguinS_Name_${p.id}`, "", "ex: Rockhopper | Rookie ... etc", val => { p_spoof_name = val; })
            .button("Update Name", "spoof-name", () => applyCustomMod(p, "name-spoof", p_spoof_name))
            
            .input("Nametag Color", `penguinS_NColor_${p.id}`, "#000000", "", val => { P_spoof_nametag_color = val; })
            .button("Update Color", "nt-color-spoof", () => applyCustomMod(p, "nt-color-spoof", P_spoof_nametag_color))
            
            .input("Nametag Size", `penguinS_Name_Scale${p.id}`, 1, "ex: 1 | 5 ... etc", val => { p_spoof_name_scale = val; })
            .button("Update Size", "spoof-nametag-scale", () => applyCustomMod(p, "spoof-nametag-scale", p_spoof_name_scale))

            .input("Stroke", `penguinS_Stroke_${p.id}`, 1, "ex: 1 | 5 ... etc", val => { p_spoof_stroke = val; })
            .input("Stroke Color", `penguinS_NStroke_${p.id}`, "#000000", "", val => { p_spoof_stroke_color = val; })
            .button("Update stroke", "spoof-scale", () => applyCustomMod(p, "nt-stroke-spoof", [p_spoof_stroke_color, p_spoof_stroke]));

        function applyCustomMod(player, modName, modValue) {
            // Guard clause: no player? get the fuck out
            if (!player) return;

            let myId = player.id;

            // Find out if bro is already in the array
            let existingPlayer = window.playerCustomization.find(pe => pe.id === myId);

            if (existingPlayer) {
                existingPlayer.spoofing = true; // Flag him as a spoofed opp

                // Look for the specific mod (like "name-spoof" or "scale-hack")
                let existingMod = existingPlayer.mods.find(m => m.name === modName);

                if (existingMod) {
                    // Just update the value if he already has this specific hack active
                    existingMod.action = modValue;
                    existingMod.enabled = true;
                } else {
                    // Bro doesn't have this hack yet, shove it in his mods array
                    existingPlayer.mods.push(new CustomizationMod(modName, true, modValue));
                }
            } else {
                // First time ever fucking with this penguin. Create a fresh blueprint.
                window.playerCustomization.push(
                    new PlayerCustomization(myId, true, [
                        new CustomizationMod(modName, true, modValue)
                    ])
                );
            }
        }
    }

    function initMenu() {
        window.PenguinUI.Sniffer.build(
            () => { snifferRecording = !snifferRecording; return snifferRecording; },
            () => { packetLog = []; window.PenguinUI.Sniffer.clear(); },
            () => { logPacket('IN', { data: ['message', 'UI_TEST', { msg: 'LIBRARY TEST W' }] }); }
        );

        const win = window.PenguinUI.Window(`${window.PenguinUI.trainerName} trainer`, { x: 'right', y: '20px', width: '390px', minimized: true });

        const general = win.addTab("General");
        win.addTab("Players").section("Active Session", "Players in current room")
            .filteredList("Username", "ID", () => Object.values(window.playerList || {}), (playerObject) => { openPlayerProfile(playerObject); }, true);

        const coinOptions = []; for (let i = 1; i < 100; i++) coinOptions.push({ data1: i * 50, data2: 2000 * i });
        let tp_ms = window.PenguinUI.Config.get("tp-ms");

        general.section("Player", "Player options")
            .checkbox("Anti Afk Kick", "anti-afk_enabled", false, val => initiateAntiAFKKick(val))
            .input("Penguin profile ID", "penguinP_ID", "", "ID...", val => { p_profile_id = val; })
            .button("Open Penguin Profile", "p_profile_open", () => sendPacket("get_player", { id: parseInt(p_profile_id) }));

        general.section("Fun", "Such as fast tp etc..")
            .slider("Teleport Delay (ms)", "tp_delay", 0, 1000, 450, val => { tp_ms = val; })
            .checkbox("Activate teleporting", null, false, val => TeleportController.initiate(val, tp_ms));

        general.section("Economy")
            .dropdown("Select Coin Amount", coinOptions, "Get Coins", "Wait time", (data1, data2, timerUI) => sendCoinHack(data1, data2, timerUI));

        const roomsSection = win.addTab("Rooms").section("Room Stuff", "Room joiner, etc");
        const inventory = win.addTab("Inventory").section("Inventory Stuff", "Inventory adder, item spoofer, etc...");

        ////////////// BOT LOGIC ////////////////

        window.myActiveBots = window.myActiveBots || [];

        // Fix the empty input bug by caching them safely
        let newBotUsername = window.PenguinUI.Config.get("bot-username") || "";
        let newBotPassword = window.PenguinUI.Config.get("bot-password") || "";

        async function spawnBot(username, password) {
            _MM_Log(`Spawning bot: ${username}...`);

            const loginEndpoint = "https://api.cplegacy.com/login";
            const wsServerUrl = "wss://blizzard.server.cplegacy.com/socket.io/?EIO=4&transport=websocket";

            try {
                const res = await fetch(loginEndpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password, version: "3.0.73-rainbow" })
                });

                const authData = await res.json();
                if (!authData.success) {
                    window.PenguinUI.showNotification(`Login failed for ${username}.`);
                    return;
                }

                const ws = new WebSocket(wsServerUrl);
                ws.botUser = username;
                ws.currentRoomId = null;

                // Restore follow state from config if they reconnect
                ws.isFollowingMe = window.PenguinUI.Config.get(`${username}_follow`) || false;
                ws.isCopyingActions = window.PenguinUI.Config.get(`${username}_copying_actions`) || false;
                ws.isCopyingEmotes = window.PenguinUI.Config.get(`${username}_copying_emotes`) || false;
                ws.isCopyingMessages = window.PenguinUI.Config.get(`${username}_copying_messages`) || false;
                ws.isCopyingSnowballs = window.PenguinUI.Config.get(`${username}_copying_snowballs`) || false;

                ws.binaryType = "arraybuffer";
                window.myActiveBots.push(ws);

                const sendBotPacket = (cmd, data = {}) => {
                    const p = { type: 2, data: ['message', cmd, data], options: { compress: true }, nsp: '/' };
                    ws.send(window.msgpack.encode(p));
                };

                ws.onmessage = (e) => {
                    if (typeof e.data === 'string') {
                        if (e.data.startsWith('0')) ws.send(window.msgpack.encode({ type: 0, nsp: '/' }));
                        else if (e.data === '2') ws.send('3');
                    } else if (e.data instanceof ArrayBuffer) {
                        try {
                            const decoded = window.msgpack.decode(new Uint8Array(e.data));

                            if (decoded.type === 0) {
                                sendBotPacket('game_auth', { username: authData.username, key: authData.key, createToken: false });
                            } else if (decoded.type === 2) {
                                const cmd = decoded.data[1];
                                const payload = decoded.data[2];

                                if (cmd === "join_room") {
                                    ws.currentRoomId = payload.room !== undefined ? payload.room : payload;
                                }

                                if (cmd === "game_auth" && payload.success) {
                                    sendBotPacket("load_player", {});
                                    sendBotPacket("join_server", {});
                                    sendBotPacket("gre", {});
                                }

                                if (cmd === "load_player") {
                                    setTimeout(() => {
                                        sendBotPacket("client_ready", {});
                                        sendBotPacket("join_room", { room: 113, x: 100, y: 100 });
                                        window.PenguinUI.showNotification(`Bot ${username} connected.`);
                                    }, 800);
                                }

                                if (cmd === "send_position" && ws.isFollowingMe) {
                                    const myId = window.__client?.penguin?.id;

                                    // If the incoming packet matches YOUR main account's ID, copy that shit!
                                    if (myId && parseInt(payload.id) === parseInt(myId)) {
                                        const rawOffsetX = window.PenguinUI.Config.get(`${username}_offsetX`);
                                        const rawOffsetY = window.PenguinUI.Config.get(`${username}_offsetY`);

                                        // Prevent that NaN bullshit with a hard fallback
                                        const offsetX = parseInt(rawOffsetX || 0) || 0;
                                        const offsetY = parseInt(rawOffsetY || 0) || 0;

                                        sendBotPacket('send_position', {
                                            x: parseInt(payload.x) + offsetX,
                                            y: parseInt(payload.y) + offsetY
                                        });
                                    }
                                }

                                if (cmd === "send_frame" && ws.isCopyingActions) {
                                    const myId = window.__client?.penguin?.id;

                                    // If the incoming packet matches YOUR main account's ID, copy that shit!
                                    if (myId && parseInt(payload.id) === parseInt(myId)) {
                                        sendBotPacket('send_frame', { set: payload.set, frame: payload.frame });
                                    }
                                }

                                if (cmd === "send_emote" && ws.isCopyingEmotes) {
                                    const myId = window.__client?.penguin?.id;

                                    // If the incoming packet matches YOUR main account's ID, copy that shit!
                                    if (myId && parseInt(payload.id) === parseInt(myId)) {
                                        sendBotPacket('send_emote', { emote: payload.emote });
                                    }
                                }
                                if (cmd === "send_message" && ws.isCopyingMessages) {
                                    const myId = window.__client?.penguin?.id;

                                    // If the incoming packet matches YOUR main account's ID, copy that shit!
                                    if (myId && parseInt(payload.id) === parseInt(myId)) {
                                        sendBotPacket('send_message', { message: payload.message });
                                    }
                                }
                                if (cmd === "snowball" && ws.isCopyingSnowballs) {
                                    const myId = window.__client?.penguin?.id;

                                    // If the incoming packet matches YOUR main account's ID, copy that shit!
                                    if (myId && parseInt(payload.id) === parseInt(myId)) {
                                        sendBotPacket('snowball', { x: payload.x, y: payload.y });
                                    }
                                }
                            }
                        } catch (err) { }
                    }
                };

                ws.onerror = () => _MM_Error(`${username} socket errored. 💀`);
                ws.onclose = () => {
                    const idx = window.myActiveBots.findIndex(b => b.botUser === username);
                    if (idx !== -1) window.myActiveBots.splice(idx, 1);
                };
            } catch (err) { window.PenguinUI.showNotification("Fetch completely bricked. 🧱"); }
        }

        function openBotManagement(bot) {
            const win = window.PenguinUI.Window(`Managing: (BOT) ${bot.username}`, { width: '280px', x: 'center', noFooter: true, minDisable: true });
            const statusTab = win.addTab("Bot Status");
            const controlTab = win.addTab("Control");

            let msgToSend = window.PenguinUI.Config.get(`${bot.username}_msg`) || "";
            let botOffsetX = parseInt(window.PenguinUI.Config.get(`${bot.username}_offsetX`)) || "0";
            let botOffsetY =  parseInt(window.PenguinUI.Config.get(`${bot.username}_offsetY`)) || "0";

            statusTab.section("Status", "Bot connection status")
                .label("Status: LOADING...")
                .label("Room: LOADING...")
                .button("CONNECT / DISCONNECT", "gray", () => {
                    const isActive = window.myActiveBots.some(ws => ws.botUser === bot.username);
                    if (isActive) {
                        const ws = window.myActiveBots.find(ws => ws.botUser === bot.username);
                        if (ws) ws.close();
                    } else {
                        spawnBot(bot.username, bot.password);
                    }
                });

            statusTab.section("Danger Zone", "Wipe this mf off the map")
                .button("Delete Bot from List", "red", () => {
                    // Filter the opp out of our saved array
                    savedBots = savedBots.filter(b => b.username !== bot.username);
                    window.PenguinUI.Config.set("bot-list", savedBots);
                    
                    // Disconnect if bro is currently online
                    const ws = window.myActiveBots.find(s => s.botUser === bot.username);
                    if (ws) ws.close();
                    
                    window.PenguinUI.showNotification(`Bot ${bot.username} sent to the shadow realm 💀`);
                    win.close(); // Nuke the window fr
                });

            controlTab.section("Navigation", "Room controls")
                .filteredList("Name", "ID", () => parsedRoomsArray, (room) => {
                    const ws = window.myActiveBots.find(s => s.botUser === bot.username);
                    if (ws) ws.send(window.msgpack.encode({ type: 2, data: ['message', 'join_room', { room: parseInt(room.id), x: 100, y: 100 }], options: { compress: true }, nsp: '/' }));
                })
                .button("Warp to me", "yellow", () => {
                    const ws = window.myActiveBots.find(s => s.botUser === bot.username);
                    const myRoom = window.__wc?.room?.key ? window.__wc.room.id : 100;
                    if (ws) ws.send(window.msgpack.encode({ type: 2, data: ['message', 'join_room', { room: myRoom, x: 100, y: 100 }], options: { compress: true }, nsp: '/' }));
                })
                .button("Join my igloo", "blue", () => {
                    const ws = window.myActiveBots.find(s => s.botUser === bot.username);
                    const myId = window.__client?.penguin?.id;
                    if (ws && myId) ws.send(window.msgpack.encode({ type: 2, data: ['message', 'join_igloo', { igloo: myId, x: 100, y: 100 }], options: { compress: true }, nsp: '/' }));
                });

            controlTab.section("Copying & Suff", "Copy the main client")
                .button("Waddle to me", "green", () => {
                    const ws = window.myActiveBots.find(s => s.botUser === bot.username);
                    // 🛑 FIXED: Back to your correct Engine properties
                    const myX = window.__client?.penguin?.pos?.x || 100;
                    const myY = window.__client?.penguin?.pos?.y || 100;
                    if (ws) ws.send(window.msgpack.encode({ type: 2, data: ['message', 'send_position', { x: parseInt(myX), y: parseInt(myY) }], options: { compress: true }, nsp: '/' }));
                })
                .checkbox("Copy my movement", `${bot.username}_follow`, false, val => {
                    const ws = window.myActiveBots.find(s => s.botUser === bot.username);
                    if (ws) ws.isFollowingMe = val;
                })
                .input("Movement Offset X", `${bot.username}_offsetX`, botOffsetX, "leave empty for no offset", (val) => {
                    window.PenguinUI.Config.set(`${bot.username}_offsetX`, val); // <-- Fixed this bitch
                })
                .input("Movement Offset Y", `${bot.username}_offsetY`, botOffsetY, "leave empty for no offset", (val) => {
                    window.PenguinUI.Config.set(`${bot.username}_offsetY`, val); // <-- Fixed this bitch too
                })
                .checkbox("Copy my actions", `${bot.username}_copying_actions`, false, val => {
                    const ws = window.myActiveBots.find(s => s.botUser === bot.username);
                    if (ws) ws.isCopyingActions = val;
                })
                .checkbox("Copy my emotes", `${bot.username}_copying_emotes`, false, val => {
                    const ws = window.myActiveBots.find(s => s.botUser === bot.username);
                    if (ws) ws.isCopyingEmotes = val;
                })
                .checkbox("Copy my messages", `${bot.username}_copying_messages`, false, val => {
                    const ws = window.myActiveBots.find(s => s.botUser === bot.username);
                    if (ws) ws.isCopyingMessages = val;
                })
                .checkbox("Copy my snowballs", `${bot.username}_copying_snowballs`, false, val => {
                    const ws = window.myActiveBots.find(s => s.botUser === bot.username);
                    if (ws) ws.isCopyingSnowballs = val;
                });
            controlTab.section("Open book", "Show to others as if you are looking at map, newspaper or building...")
                .filteredList("Inter", "ID", () => parsedInterArray, (interObj) => {
                    const myId = window.__client?.penguin?.id;
                    const ws = window.myActiveBots.find(s => s.botUser === bot.username);
                    if (ws) ws.send(window.msgpack.encode({ type: 2, data: ['message', 'open_book', { id: parseInt(myId), inter: parseInt(interObj.inter) }], options: { compress: true }, nsp: '/' }));
                })

            controlTab.section("Messages", "Send messages")
                .input("Input message", `${bot.username}_msg`, msgToSend, "Enter message...", (val) => {
                    msgToSend = val;
                    window.PenguinUI.Config.set(`${bot.username}_msg`, val);
                })
                .button("Send Message", "green", () => {
                    const ws = window.myActiveBots.find(s => s.botUser === bot.username);
                    if (ws) ws.send(window.msgpack.encode({ type: 2, data: ['message', 'send_message', { message: msgToSend }], options: { compress: true }, nsp: '/' }));
                });

            setTimeout(() => {
                const boxes = Array.from(document.querySelectorAll('.mm-box'));

                const myBox = boxes.find(b => b.querySelector('.mm-title')?.textContent === `Managing: BOT ${bot.username}`);

                if (!myBox) {
                    console.error(`[Sniper] Couldn't find window for ${bot.username}! 💀`);
                    return;
                }

                const labels = Array.from(myBox.querySelectorAll('.mm-label'));
                const statusLabel = labels.find(l => l.textContent.includes('Status:'));
                const roomLabel = labels.find(l => l.textContent.includes('Room:'));

                const buttons = Array.from(myBox.querySelectorAll('.mm-btn-el'));
                const connectBtn = buttons.find(b => b.textContent.includes('CONNECT') || b.textContent.includes('Connect') || b.textContent.includes('Disconnect'));

                const pollInterval = setInterval(() => {
                    if (!document.body.contains(myBox)) return clearInterval(pollInterval);

                    const activeWs = window.myActiveBots.find(ws => ws.botUser === bot.username);
                    const isActive = !!activeWs;

                    if (statusLabel) statusLabel.textContent = isActive ? "Status: CONNECTED 🟢" : "Status: DISCONNECTED 🔴";

                    if (connectBtn) {
                        connectBtn.textContent = isActive ? "Disconnect" : "Connect";
                        connectBtn.className = isActive ? "mm-btn-el red" : "mm-btn-el green";
                    }

                    if (roomLabel) {
                        if (isActive && activeWs.currentRoomId) {
                            let rId = activeWs.currentRoomId;
                            let rName = "Unknown";
                            try {
                                const rawKey = window.__wc?.crumbs?.rooms[rId]?.key;
                                if (rawKey) rName = rawKey.charAt(0).toUpperCase() + rawKey.slice(1);
                            } catch (e) { }
                            roomLabel.textContent = `Room: ${rName} (${rId})`;
                        } else {
                            roomLabel.textContent = "Room: N/A";
                        }
                    }
                }, 300);
            }, 100);
        }

        function openGlobalBotManagement() {
            const win = window.PenguinUI.Window(`Global Commander 🌐`, { width: '280px', x: 'center', noFooter: true, minDisable: true });
            const statusTab = win.addTab("Bot Status");
            const controlTab = win.addTab("Control");

            statusTab.section("Mass Deployment", "Send the whole squad in")
                .button("CONNECT ALL", "green", () => {
                    let savedBots = window.PenguinUI.Config.get("bot-list") || [];
                    savedBots.forEach(b => {
                        if (!window.myActiveBots.some(ws => ws.botUser === b.username)) {
                            spawnBot(b.username, b.password);
                        }
                    });
                    window.PenguinUI.showNotification("Deploying the whole damn army 😈🚀");
                })
                .button("DISCONNECT ALL", "red", () => {
                    window.myActiveBots.forEach(s => s.close());
                    window.myActiveBots = [];
                    window.PenguinUI.showNotification("Whole squad disconnected 🛑");
                });

            // Global variables for the hivemind inputs
            let globalMsgToSend = window.PenguinUI.Config.get(`global_bot_msg`) || "";
            let globalOffsetX = window.PenguinUI.Config.get(`global_bot_offsetX`) || "0";
            let globalOffsetY = window.PenguinUI.Config.get(`global_bot_offsetY`) || "0";

            controlTab.section("Navigation", "Move all bots at once")
                .filteredList("Name", "ID", () => parsedRoomsArray, (room) => {
                    window.myActiveBots.forEach(ws => {
                        ws.send(window.msgpack.encode({ type: 2, data: ['message', 'join_room', { room: parseInt(room.id), x: 100, y: 100 }], options: { compress: true }, nsp: '/' }));
                    });
                })
                .button("Warp all to me", "yellow", () => {
                    const myRoom = window.__wc?.room?.key ? window.__wc.room.id : 100;
                    window.myActiveBots.forEach(ws => {
                        ws.send(window.msgpack.encode({ type: 2, data: ['message', 'join_room', { room: myRoom, x: 100, y: 100 }], options: { compress: true }, nsp: '/' }));
                    });
                })
                .button("All join my igloo", "blue", () => {
                    const myId = window.__client?.penguin?.id;
                    if (myId) {
                        window.myActiveBots.forEach(ws => {
                            ws.send(window.msgpack.encode({ type: 2, data: ['message', 'join_igloo', { igloo: myId, x: 100, y: 100 }], options: { compress: true }, nsp: '/' }));
                        });
                    }
                });

            controlTab.section("Copying & Stuff", "Hivemind the main client")
                .button("All waddle to me", "green", () => {
                    const myX = window.__client?.penguin?.pos?.x || 100;
                    const myY = window.__client?.penguin?.pos?.y || 100;
                    window.myActiveBots.forEach(ws => {
                        ws.send(window.msgpack.encode({ type: 2, data: ['message', 'send_position', { x: parseInt(myX), y: parseInt(myY) }], options: { compress: true }, nsp: '/' }));
                    });
                })
                .checkbox("All copy my movement", `global_follow`, false, val => {
                    window.myActiveBots.forEach(ws => ws.isFollowingMe = val);
                })
                // 👇 Rip out the two .input lines and slap this in 👇
                .fileUpload("Upload Formation JSON 🗺️", ".json", (content) => {
                    try {
                        let formation = JSON.parse(content);
                        // Handles both array format and your weird object format just in case 🧠
                        let offsets = Array.isArray(formation) ? formation : Object.values(formation);
                        
                        if (offsets.length === 0) return window.PenguinUI.showNotification("Provide a valid JSON.", "⚠️");
                        
                        let activeSquad = window.myActiveBots || [];
                        if (activeSquad.length === 0) return window.PenguinUI.showNotification("Bots offline, connect them first.", "⚠️");
                        
                        let applied = 0;
                        activeSquad.forEach((ws, idx) => {
                            // Modulo operator so it wraps around if you got more bots than formation slots
                            let pos = offsets[idx % offsets.length]; 
                            let ox = pos.x || 0;
                            let oy = pos.y || 0;
                            
                            // Directly slam these into the config so the WS listener catches them
                            window.PenguinUI.Config.set(`${ws.botUser}_offsetX`, ox);
                            window.PenguinUI.Config.set(`${ws.botUser}_offsetY`, oy);
                            applied++;
                        });
                        
                        window.PenguinUI.showNotification(`Formation applied for ${applied} bots.`);
                    } catch (err) {
                        window.PenguinUI.showNotification("Invalid JSON syntax", "⚠️");
                        console.error("Formation parse error:", err);
                    }
                })
                .checkbox("All copy my actions", `global_copying_actions`, false, val => {
                    window.myActiveBots.forEach(ws => ws.isCopyingActions = val);
                })
                .checkbox("All copy my emotes", `global_copying_emotes`, false, val => {
                    window.myActiveBots.forEach(ws => ws.isCopyingEmotes = val);
                })
                .checkbox("All copy my messages", `global_copying_messages`, false, val => {
                    window.myActiveBots.forEach(ws => ws.isCopyingMessages = val);
                })
                .checkbox("All copy my snowballs", `global_copying_snowballs`, false, val => {
                    window.myActiveBots.forEach(ws => ws.isCopyingSnowballs = val);
                })
                .checkbox("Echo my room joins", `global_copying_rooms`, false, val => {
                    window.global_copying_rooms = val;
                })
                .checkbox("Echo my igloo joins", `global_copying_igloos`, false, val => {
                    window.global_copying_igloos = val;
                });

            controlTab.section("Open book", "Everyone open maps/news")
                .filteredList("Inter", "ID", () => parsedInterArray, (interObj) => {
                    const myId = window.__client?.penguin?.id;
                    if (myId) {
                        window.myActiveBots.forEach(ws => {
                            ws.send(window.msgpack.encode({ type: 2, data: ['message', 'open_book', { id: parseInt(myId), inter: parseInt(interObj.inter) }], options: { compress: true }, nsp: '/' }));
                        });
                    }
                });

            controlTab.section("Messages", "Hivemind chat")
                .input("Input message", `global_msg`, globalMsgToSend, "Enter message...", (val) => {
                    globalMsgToSend = val;
                    window.PenguinUI.Config.set(`global_msg`, val);
                })
                .button("Send Message (ALL)", "green", () => {
                    window.myActiveBots.forEach(ws => {
                        ws.send(window.msgpack.encode({ type: 2, data: ['message', 'send_message', { message: globalMsgToSend }], options: { compress: true }, nsp: '/' }));
                    });
                });
        }

        const bots = win.addTab("Bots");
        let savedBots = window.PenguinUI.Config.get("bot-list") || [];

        bots.section("Bot list", "Click to manage")
            .filteredList("Username", "Status", () => savedBots.map(b => ({
                ...b,
                Status: window.myActiveBots.some(ws => ws.botUser === b.username) ? "🟢" : "🔴"
            })), (bot) => { openBotManagement(bot); }, true);

        bots.section("Add bots", "Add to list")
            .input("Username", "bot-username", newBotUsername, "Enter username...", val => newBotUsername = val)
            .input("Password", "bot-password", newBotPassword, "Enter password...", val => newBotPassword = val)
            .button("Add Bot", "green", () => {
                if (!newBotUsername || !newBotPassword) return window.PenguinUI.showNotification("Enter credentials first 💀");
                savedBots.push({ username: newBotUsername, password: newBotPassword });
                window.PenguinUI.Config.set("bot-list", savedBots);
                window.PenguinUI.showNotification("Bot added to list! 📦");
            });

        bots.section("Global Commands", "Command the whole squad at once")
            .button("Open Global Management 🌐", "blue", () => {
                openGlobalBotManagement();
            });

        bots.section("Mass Import", "Load txt/json with user:pass format")
            .fileUpload("Upload Bot File", ".txt,.json", (content) => {
                let newBots = [];
                try {
                    // First try parsing as JSON array just in case you feed it pure JSON
                    let parsed = JSON.parse(content);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(item => {
                            if (typeof item === 'string' && item.includes(':')) {
                                const splitIdx = item.indexOf(':');
                                const u = item.slice(0, splitIdx);
                                const p = item.slice(splitIdx + 1);
                                newBots.push({username: u.trim(), password: p.trim()});
                            } else if (item.username && item.password) {
                                newBots.push({username: item.username, password: item.password});
                            }
                        });
                    }
                } catch(e) {
                    // Fallback: It's raw text. Let's slice that shit line by line.
                    const lines = content.split('\n');
                    lines.forEach(line => {
                        if (line.includes(':')) {
                            // Safe split in case password literally has a colon in it
                            const splitIdx = line.indexOf(':');
                            const u = line.slice(0, splitIdx).trim();
                            const p = line.slice(splitIdx + 1).trim();
                            if (u && p) newBots.push({username: u, password: p});
                        }
                    });
                }
                
                // Save the haul
                if (newBots.length > 0) {
                    const existingNames = new Set(savedBots.map(b => b.username));
                    let added = 0;
                    newBots.forEach(b => {
                        if (!existingNames.has(b.username)) {
                            savedBots.push(b);
                            added++;
                        }
                    });
                    window.PenguinUI.Config.set("bot-list", savedBots);
                    window.PenguinUI.showNotification(`Imported ${added} new bots! Absolute W 🥵🔥`);
                } else {
                    window.PenguinUI.showNotification(`No valid user:pass combos found bro 😭 L`);
                }
            });

        bots.section("Bot removal", "Emergency stop")
            .button("Nuke All bots", "red", () => {
                savedBots = [];
                window.PenguinUI.Config.set("bot-list", []);
                window.myActiveBots.forEach(s => s.close());
                window.myActiveBots = [];
                window.PenguinUI.showNotification("All bots wiped from existence ☢️");
            });

        bots.section("Bot removal", "Emergency stop")
            .button("Remove All bots", "red", () => {
                savedBots = [];
                window.PenguinUI.Config.set("bot-list", []);
                window.myActiveBots.forEach(s => s.close());
                window.myActiveBots = [];
                window.PenguinUI.showNotification("All bots nuked ☢️");
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
    runPlayerCustomizationLoop();
    if (document.body) initMenu(); else document.addEventListener('DOMContentLoaded', initMenu);
})();