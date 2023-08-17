"use strict";
//#region "Imports"
///<reference types="../FUDGE/Core/Build/FudgeCore.js"/>
///<reference types="../FUDGE/Aid/Build/FudgeAid.js"/>
//#endregion "Imports"
var Game;
//#region "Imports"
///<reference types="../FUDGE/Core/Build/FudgeCore.js"/>
///<reference types="../FUDGE/Aid/Build/FudgeAid.js"/>
//#endregion "Imports"
(function (Game) {
    let GAMESTATES;
    (function (GAMESTATES) {
        GAMESTATES[GAMESTATES["PLAYING"] = 0] = "PLAYING";
        GAMESTATES[GAMESTATES["PAUSE"] = 1] = "PAUSE";
    })(GAMESTATES = Game.GAMESTATES || (Game.GAMESTATES = {}));
    Game.ƒ = FudgeCore;
    Game.ƒAid = FudgeAid;
    //#region "DomElements"
    Game.canvas = document.getElementById("Canvas");
    window.addEventListener("load", start);
    document.getElementById("Option").addEventListener("click", () => {
        document.getElementById("Startscreen").style.visibility = "hidden";
        document.getElementById("Optionscreen").style.visibility = "visible";
    });
    document.getElementById("Credits").addEventListener("click", () => {
        document.getElementById("Startscreen").style.visibility = "hidden";
        document.getElementById("Creditscreen").style.visibility = "visible";
    });
    document.getElementById("Ranged").addEventListener("click", playerChoice);
    document.getElementById("Melee").addEventListener("click", playerChoice);
    document.getElementById("BackHost").addEventListener("click", back);
    document.getElementById("BackOption").addEventListener("click", back);
    document.getElementById("BackCredit").addEventListener("click", back);
    function back(_e) {
        document.getElementById("Creditscreen").style.visibility = "hidden";
        document.getElementById("Optionscreen").style.visibility = "hidden";
        document.getElementById("Hostscreen").style.visibility = "hidden";
        document.getElementById("Startscreen").style.visibility = "visible";
    }
    //#endregion "DomElements"
    //#region "PublicVariables"
    Game.gamestate = GAMESTATES.PAUSE;
    Game.viewport = new Game.ƒ.Viewport();
    Game.cmpCamera = new Game.ƒ.ComponentCamera();
    Game.graph = new Game.ƒ.Node("Graph");
    Game.viewport.initialize("Viewport", Game.graph, Game.cmpCamera, Game.canvas);
    Game.runs = 0;
    Game.newGamePlus = 0;
    Game.currentNetObj = [];
    Game.entities = [];
    Game.enemies = [];
    Game.bullets = [];
    Game.items = [];
    Game.coolDowns = [];
    Game.loaded = false;
    //#endregion "PublicVariables"
    //#region "PrivateVariables"
    const damper = 3.5;
    //#endregion "PrivateVariables"
    //#region "essential"
    async function init() {
        Game.cmpCamera.mtxPivot.translation = Game.ƒ.Vector3.ZERO();
        Game.cmpCamera.mtxPivot.translateZ(25);
        Game.cmpCamera.mtxPivot.rotateY(180);
        if (Networking.client.id == Networking.client.idHost) {
            Items.ItemGenerator.fillPool();
            while (true) {
                Generation.procedualRoomGeneration();
                if (!Generation.generationFailed) {
                    break;
                }
                console.warn("GENERATION FAILED -> RESTART GENERATION");
            }
            Game.serverPredictionAvatar = new Networking.ServerPrediction(null);
        }
    }
    function update() {
        findGameObjects();
        Game.deltaTime = Game.ƒ.Loop.timeFrameGame * 0.001;
        pauseCheck();
        Game.avatar1.predict();
        cameraUpdate();
        if (Networking.client.id == Networking.client.idHost) {
            Networking.updateAvatarPosition(Game.avatar1.mtxLocal.translation, Game.avatar1.mtxLocal.rotation);
            Game.serverPredictionAvatar.update();
        }
        UI.updateUI();
        draw();
    }
    function findGameObjects() {
        Game.items = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.ITEM);
        Game.bullets = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.BULLET);
        Game.entities = Game.graph.getChildren().filter(child => child instanceof Entity.Entity);
        Game.enemies = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.ENEMY);
        Game.currentRoom = Game.graph.getChildren().find(elem => elem.tag == Tag.TAG.ROOM);
        Game.currentNetObj = setNetObj(Game.graph.getChildren().filter(elem => Networking.isNetworkObject(elem)));
    }
    function setNetObj(_netOj) {
        let tempNetObjs = [];
        _netOj.forEach(obj => {
            tempNetObjs.push({ netId: Networking.getNetId(obj), netObjectNode: obj });
        });
        return tempNetObjs;
    }
    function setClient() {
        if (Networking.client.socket.readyState == Networking.client.socket.OPEN && Networking.client.idRoom.toLowerCase() != "lobby") {
            Networking.setClient();
            return;
        }
        else {
            setTimeout(() => { setClient(); }, 100);
        }
    }
    function readySate() {
        if (Networking.clients.length >= 2 && Networking.client.idHost != undefined) {
            Networking.setClientReady();
        }
        else {
            setTimeout(() => { readySate(); }, 100);
        }
    }
    function startLoop() {
        if (Networking.client.id != Networking.client.idHost && Game.avatar2 != undefined && Game.currentRoom != undefined) {
            Networking.loaded();
        }
        if (Game.loaded) {
            Game.ƒ.Loop.start(Game.ƒ.LOOP_MODE.TIME_GAME, Game.deltaTime);
            document.getElementById("UI").style.visibility = "visible";
            Game.graph.appendChild(Game.avatar1);
            Game.graph.appendChild(Game.avatar2);
        }
        else {
            setTimeout(() => {
                startLoop();
            }, 100);
        }
    }
    function start() {
        loadTextures();
        loadJSON();
        Networking.connecting();
        //TODO: add sprite to graphe for startscreen
        document.getElementById("Startscreen").style.visibility = "visible";
        document.getElementById("StartGame").addEventListener("click", () => {
            document.getElementById("Startscreen").style.visibility = "hidden";
            waitOnConnection();
            async function waitOnConnection() {
                setClient();
                if (Networking.client.idRoom.toLowerCase() == "lobby") {
                    if (document.getElementById("Hostscreen").style.visibility.toLowerCase() != "visible") {
                        document.getElementById("Hostscreen").style.visibility = "visible";
                    }
                }
                if (Networking.clients.filter(elem => elem.ready == true).length >= 2 && Networking.client.idHost != undefined) {
                    if (Networking.client.id == Networking.client.idHost) {
                        document.getElementById("IMHOST").style.visibility = "visible";
                    }
                    await init();
                    Game.gamestate = GAMESTATES.PLAYING;
                    Networking.spawnPlayer();
                    startLoop();
                }
                else {
                    setTimeout(waitOnConnection, 300);
                }
            }
            document.getElementById("Host").addEventListener("click", Networking.createRoom);
            document.getElementById("Join").addEventListener("click", () => {
                let roomId = document.getElementById("Room").value;
                Networking.joinRoom(roomId);
            });
            updateRooms();
            waitForLobby();
            function waitForLobby() {
                if (Networking.clients.length > 1 && Networking.client.idRoom.toLocaleLowerCase() != "lobby") {
                    document.getElementById("Hostscreen").style.visibility = "hidden";
                    document.getElementById("RoomId").parentElement.style.visibility = "hidden";
                    document.getElementById("Lobbyscreen").style.visibility = "visible";
                }
                else {
                    setTimeout(() => {
                        waitForLobby();
                    }, 200);
                }
            }
            async function updateRooms() {
                if (Networking.client.socket.readyState == Networking.client.socket.OPEN) {
                    Networking.getRooms();
                    return;
                }
                else {
                    setTimeout(() => {
                        updateRooms();
                    }, 200);
                }
            }
        });
    }
    function setMiniMap() {
        if (Networking.client.id == Networking.client.idHost) {
            Game.graph.removeChild(Game.miniMap);
            let roomInfos = [];
            let coords = Generation.getCoordsFromRooms();
            for (let i = 0; i < coords.length; i++) {
                roomInfos.push({ coords: coords[i], roomType: Generation.rooms.find(room => room.coordinates == coords[i]).roomType });
            }
            Game.miniMap = new UI.Minimap(roomInfos);
            Game.graph.addChild(Game.miniMap);
        }
    }
    Game.setMiniMap = setMiniMap;
    function playerChoice(_e) {
        if (_e.target.id == "Ranged") {
            Game.avatar1 = new Player.Ranged(Entity.ID.RANGED);
        }
        if (_e.target.id == "Melee") {
            Game.avatar1 = new Player.Melee(Entity.ID.MELEE);
        }
        document.getElementById("Lobbyscreen").style.visibility = "hidden";
        readySate();
    }
    function pauseCheck() {
        if ((window.screenX < -window.screen.availWidth) && (window.screenY < -window.screen.availHeight)) {
            pause(true, false);
            setTimeout(() => {
                pauseCheck();
            }, 100);
        }
        else {
            playing(true, false);
        }
    }
    function pause(_sync, _triggerOption) {
        if (Game.gamestate == GAMESTATES.PLAYING) {
            if (_sync) {
                Networking.setGamestate(false);
            }
            if (_triggerOption) {
                document.getElementById("Optionscreen").style.visibility = "visible";
                let back = document.getElementById("BackOption");
                let backClone = back.cloneNode(true);
                back.parentNode.replaceChild(backClone, back);
                document.getElementById("BackOption").addEventListener("click", () => {
                    document.getElementById("Optionscreen").style.visibility = "hidden";
                });
            }
            Game.gamestate = GAMESTATES.PAUSE;
            Game.ƒ.Loop.stop();
        }
    }
    Game.pause = pause;
    function playing(_sync, _triggerOption) {
        if (Game.gamestate == GAMESTATES.PAUSE) {
            if (_sync) {
                Networking.setGamestate(true);
            }
            if (_triggerOption) {
                document.getElementById("Optionscreen").style.visibility = "hidden";
            }
            Game.gamestate = GAMESTATES.PLAYING;
            Game.ƒ.Loop.continue();
        }
    }
    Game.playing = playing;
    async function loadJSON() {
        const loadEnemy = await (await fetch("./Resources/EnemiesStorage.json")).json();
        Game.enemiesJSON = loadEnemy.enemies;
        Game.avatarsJSON = loadEnemy.avatars;
        const loadItem = await (await fetch("./Resources/ItemStorage.json")).json();
        Game.internalItemJSON = loadItem.internalItems;
        Game.buffItemJSON = loadItem.buffItems;
        const loadBullets = await (await fetch("./Resources/BulletStorage.json")).json();
        Game.bulletsJSON = loadBullets.standardBullets;
        const loadBuffs = await (await fetch("./Resources/BuffStorage.json")).json();
        Game.damageBuffJSON = loadBuffs.damageBuff;
        Game.attributeBuffJSON = loadBuffs.attributeBuff;
        console.warn("all JSON loaded");
    }
    async function loadTextures() {
        await Generation.txtStartRoom.load("./Resources/Image/Rooms/swampStandard.png");
        await Generation.txtNormalRoom.load("./Resources/Image/Rooms/swampStandard.png");
        await Generation.txtBossRoom.load("./Resources/Image/Rooms/swampStandard.png");
        await Generation.txtMerchantRoom.load("./Resources/Image/Rooms/swampStandard.png");
        await Generation.txtTreasureRoom.load("./Resources/Image/Rooms/swampStandard.png");
        await Generation.txtChallengeRoom.load("./Resources/Image/Rooms/challengeStandard.png");
        await Generation.txtWallNorth.load("./Resources/Image/Rooms/wallNorth.png");
        await Generation.txtWallSouth.load("./Resources/Image/Rooms/wallSouth.png");
        await Generation.txtWallEast.load("./Resources/Image/Rooms/wallEast.png");
        await Generation.txtWallWest.load("./Resources/Image/Rooms/wallWest.png");
        await Generation.txtDoorNorth.load("./Resources/Image/Rooms/doorNorth.png");
        await Generation.txtDoorSouth.load("./Resources/Image/Rooms/doorSouth.png");
        await Generation.txtDoorEast.load("./Resources/Image/Rooms/doorEast.png");
        await Generation.txtDoorWest.load("./Resources/Image/Rooms/doorWest.png");
        await Generation.txtDoorExit.load("./Resources/Image/Rooms/doorExit.png");
        await Bullets.bulletTxt.load("./Resources/Image/Projectiles/arrow.png");
        await Bullets.waterBallTxt.load("./Resources/Image/Projectiles/waterBall.png");
        await Bullets.thorsHammerTxt.load("./Resources/Image/Projectiles/thorsHammerUp.png");
        //UI
        await UI.txtZero.load("./Resources/Image/white0.png");
        await UI.txtOne.load("./Resources/Image/white1.png");
        await UI.txtTow.load("./Resources/Image/white2.png");
        await UI.txtThree.load("./Resources/Image/white3.png");
        await UI.txtFour.load("./Resources/Image/white4.png");
        await UI.txtFive.load("./Resources/Image/white5.png");
        await UI.txtSix.load("./Resources/Image/white6.png");
        await UI.txtSeven.load("./Resources/Image/white7.png");
        await UI.txtEight.load("./Resources/Image/white8.png");
        await UI.txtNine.load("./Resources/Image/white9.png");
        await UI.txtTen.load("./Resources/Image/white10.png");
        //UI particle
        await UI.healParticle.load("./Resources/Image/Particles/healing.png");
        await UI.poisonParticle.load("./Resources/Image/Particles/poison.png");
        await UI.burnParticle.load("./Resources/Image/Particles/poison.png");
        await UI.bleedingParticle.load("./Resources/Image/Particles/bleeding.png");
        await UI.slowParticle.load("./Resources/Image/Particles/slow.png");
        await UI.immuneParticle.load("./Resources/Image/Particles/immune.png");
        await UI.exhaustedParticle.load("./Resources/Image/Particles/exhausted.png");
        await UI.furiousParticle.load("./Resources/Image/Particles/furious.png");
        await UI.commonParticle.load("./Resources/Image/Particles/Rarity/common.png");
        await UI.rareParticle.load("./Resources/Image/Particles/Rarity/rare.png");
        await UI.epicParticle.load("./Resources/Image/Particles/Rarity/epic.png");
        await UI.legendaryParticle.load("./Resources/Image/Particles/Rarity/legendary.png");
        await Entity.txtShadow.load("./Resources/Image/Particles/shadow.png");
        await Entity.txtShadowRound.load("./Resources/Image/Particles/roundShadow.png");
        //Minimap
        await UI.normalRoom.load("./Resources/Image/Minimap/normal.png");
        await UI.challengeRoom.load("./Resources/Image/Minimap/challenge.png");
        await UI.merchantRoom.load("./Resources/Image/Minimap/merchant.png");
        await UI.treasureRoom.load("./Resources/Image/Minimap/treasure.png");
        await UI.bossRoom.load("./Resources/Image/Minimap/boss.png");
        //AVATAR
        await AnimationGeneration.txtRangedIdle.load("./Resources/Image/Player/rangedIdle.png");
        await AnimationGeneration.txtRangedWalk.load("./Resources/Image/Player/rangedWalk.png");
        await AnimationGeneration.txtRangedIdleLeft.load("./Resources/Image/Player/rangedIdle_left.png");
        await AnimationGeneration.txtRangedWalkLeft.load("./Resources/Image/Player/rangedWalk_left.png");
        //ENEMY
        await AnimationGeneration.txtBatIdle.load("./Resources/Image/Enemies/bat/batIdle.png");
        await AnimationGeneration.txtRedTickIdle.load("./Resources/Image/Enemies/tick/redTickIdle.png");
        await AnimationGeneration.txtRedTickWalk.load("./Resources/Image/Enemies/tick/redTickWalk.png");
        await AnimationGeneration.txtSmallTickIdle.load("./Resources/Image/Enemies/smallTick/smallTickIdle.png");
        await AnimationGeneration.txtSmallTickWalk.load("./Resources/Image/Enemies/smallTick/smallTickWalk.png");
        await AnimationGeneration.txtSkeletonIdle.load("./Resources/Image/Enemies/skeleton/skeletonIdle.png");
        await AnimationGeneration.txtSkeletonWalk.load("./Resources/Image/Enemies/skeleton/skeletonWalk.png");
        await AnimationGeneration.txtOgerIdle.load("./Resources/Image/Enemies/oger/ogerIdle.png");
        await AnimationGeneration.txtOgerWalk.load("./Resources/Image/Enemies/oger/ogerWalk.png");
        await AnimationGeneration.txtOgerAttack.load("./Resources/Image/Enemies/oger/ogerAttack.png");
        await AnimationGeneration.txtSummonerIdle.load("./Resources/Image/Enemies/summoner/summonerIdle.png");
        await AnimationGeneration.txtSummonerSummon.load("./Resources/Image/Enemies/summoner/summonerSmash.png");
        await AnimationGeneration.txtSummonerTeleport.load("./Resources/Image/Enemies/summoner/summonerTeleport.png");
        //Items
        await Items.txtIceBucket.load("./Resources/Image/Items/iceBucket.png");
        await Items.txtDmgUp.load("./Resources/Image/Items/damageUp.png");
        await Items.txtSpeedUp.load("./Resources/Image/Items/speedUp.png");
        await Items.txtProjectilesUp.load("./Resources/Image/Items/projectilesUp.png");
        await Items.txtHealthUp.load("./Resources/Image/Items/healthUp.png");
        await Items.txtScaleUp.load("./Resources/Image/Items/scaleUp.png");
        await Items.txtScaleDown.load("./Resources/Image/Items/scaleDown.png");
        await Items.txtHomeComing.load("./Resources/Image/Items/homecoming.png");
        await Items.txtThorsHammer.load("./Resources/Image/Items/thorsHammer.png");
        await Items.txtToxicRelationship.load("./Resources/Image/Items/toxicRelationship.png");
        await Items.txtGetStronko.load("./Resources/Image/Items/getStronko.png");
        await Items.txtGetWeako.load("./Resources/Image/Items/getWeako.png");
        AnimationGeneration.generateAnimationObjects();
        console.clear();
    }
    Game.loadTextures = loadTextures;
    function draw() {
        Game.viewport.draw();
    }
    function cameraUpdate() {
        let direction = Game.ƒ.Vector2.DIFFERENCE(Game.avatar1.mtxLocal.translation.toVector2(), Game.cmpCamera.mtxPivot.translation.toVector2());
        if (Networking.client.id == Networking.client.idHost) {
            direction.scale(Game.deltaTime * damper);
        }
        else {
            direction.scale(Game.avatar1.client.minTimeBetweenTicks * damper);
        }
        Game.cmpCamera.mtxPivot.translate(new Game.ƒ.Vector3(-direction.x, direction.y, 0), true);
        if (Game.miniMap != undefined) {
            Game.miniMap.mtxLocal.translation = new Game.ƒ.Vector3(Game.cmpCamera.mtxPivot.translation.x + Game.miniMap.offsetX, Game.cmpCamera.mtxPivot.translation.y + Game.miniMap.offsetY, 0);
        }
    }
    Game.cameraUpdate = cameraUpdate;
    Game.ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, update);
    //#endregion "essential"
})(Game || (Game = {}));
var Ability;
(function (Ability_1) {
    class Ability {
        ownerNetId;
        get owner() { return Game.entities.find(elem => elem.netId == this.ownerNetId); }
        ;
        cooldown;
        get getCooldown() { return this.cooldown; }
        ;
        abilityCount;
        currentabilityCount;
        duration;
        doesAbility = false;
        onDoAbility;
        onEndAbility;
        constructor(_ownerNetId, _duration, _abilityCount, _cooldownTime) {
            this.ownerNetId = _ownerNetId;
            this.abilityCount = _abilityCount;
            this.currentabilityCount = this.abilityCount;
            this.duration = new Cooldown(_duration);
            this.cooldown = new Cooldown(_cooldownTime);
        }
        eventUpdate = (_event) => {
            this.updateAbility();
        };
        updateAbility() {
            if (this.doesAbility && !this.duration.hasCooldown) {
                this.deactivateAbility();
                this.doesAbility = false;
            }
            if (this.onDoAbility != undefined) {
                this.onDoAbility();
            }
        }
        doAbility() {
            if (!this.cooldown.hasCooldown && this.currentabilityCount <= 0) {
                this.currentabilityCount = this.abilityCount;
            }
            if (!this.cooldown.hasCooldown && this.currentabilityCount > 0) {
                this.doesAbility = true;
                this.activateAbility();
                this.duration.startCooldown();
                this.currentabilityCount--;
                if (this.currentabilityCount <= 0) {
                    this.cooldown.startCooldown();
                }
            }
        }
        hasCooldown() {
            return this.cooldown.hasCooldown;
        }
        activateAbility() {
            Game.ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, this.eventUpdate);
        }
        deactivateAbility() {
            if (this.onEndAbility != undefined) {
                this.onEndAbility();
            }
            Game.ƒ.Loop.removeEventListener("loopFrame" /* LOOP_FRAME */, this.eventUpdate);
        }
    }
    Ability_1.Ability = Ability;
    class Block extends Ability {
        activateAbility() {
            super.activateAbility();
            this.owner.attributes.hitable = false;
        }
        deactivateAbility() {
            super.deactivateAbility();
            this.owner.attributes.hitable = true;
        }
    }
    Ability_1.Block = Block;
    class Dash extends Ability {
        speed;
        constructor(_ownerNetId, _duration, _abilityCount, _cooldownTime, _speed) {
            super(_ownerNetId, _duration, _abilityCount, _cooldownTime);
            this.speed = _speed;
        }
        activateAbility() {
            super.activateAbility();
            this.owner.attributes.hitable = false;
            this.owner.attributes.speed *= this.speed;
        }
        deactivateAbility() {
            super.deactivateAbility();
            this.owner.attributes.hitable = true;
            this.owner.attributes.speed /= this.speed;
        }
    }
    Ability_1.Dash = Dash;
    class SpawnSummoners extends Ability {
        spawnRadius = 1;
        activateAbility() {
            super.activateAbility();
            if (Networking.client.id == Networking.client.idHost) {
                let position = new ƒ.Vector2(this.owner.mtxLocal.translation.x + Math.random() * this.spawnRadius, this.owner.mtxLocal.translation.y + 5);
                if (Math.round(Math.random()) > 0.5) {
                    EnemySpawner.spawnByID(Enemy.ENEMYCLASS.SUMMONORADDS, position, Game.avatar1, null);
                }
                else {
                    EnemySpawner.spawnByID(Enemy.ENEMYCLASS.SUMMONORADDS, position, Game.avatar2, null);
                }
            }
        }
    }
    Ability_1.SpawnSummoners = SpawnSummoners;
    class circleShoot extends Ability {
        bulletAmount;
        bullets = [];
        activateAbility() {
            super.activateAbility();
            this.bullets = [];
            for (let i = 0; i < this.bulletAmount; i++) {
                this.bullets.push(new Bullets.NormalBullet(Bullets.BULLETTYPE.SUMMONER, this.owner.mtxLocal.translation.toVector2(), Game.ƒ.Vector3.ZERO(), this.ownerNetId));
                this.bullets[i].mtxLocal.rotateZ((360 / this.bulletAmount * i));
            }
            for (let i = 0; i < this.bulletAmount; i++) {
                Game.graph.addChild(this.bullets[i]);
                Networking.spawnBullet(Bullets.BULLETCLASS.NORMAL, this.bullets[i].direction, this.bullets[i].netId, this.ownerNetId);
            }
        }
    }
    Ability_1.circleShoot = circleShoot;
    class Stomp extends Ability {
        bulletAmount = 60;
        bullets = [];
        activateAbility() {
            console.log("stomp");
            let spawnPoints = this.generateSpawnPoints();
            spawnPoints.forEach(spawnpoint => {
                this.bullets.push(new Bullets.FallingBullet(Bullets.BULLETTYPE.STONE, spawnpoint, this.ownerNetId));
            });
            this.bullets.forEach(bullet => {
                bullet.spawn();
                Networking.spawnBullet(Bullets.BULLETCLASS.FALLING, bullet.direction, bullet.netId, this.ownerNetId);
            });
        }
        generateSpawnPoints() {
            let maxSpawnPoints = new ƒ.Vector2(Game.currentRoom.roomSize / 2, Game.currentRoom.roomSize / 2);
            let spawnPoints = [];
            let rotateAmount = 360 / this.bulletAmount;
            let normale = new Game.ƒ.Vector2(0, 1);
            for (let i = 0; i < this.bulletAmount; i++) {
                let distanceFromOrigin = Math.random() * maxSpawnPoints.x;
                let newSpawnPoint = Calculation.getRotatedVectorByAngle2D(normale.clone.toVector3(), rotateAmount * i).toVector2();
                newSpawnPoint.scale(distanceFromOrigin);
                newSpawnPoint.add(Game.currentRoom.mtxLocal.translation.toVector2());
                spawnPoints.push(newSpawnPoint);
            }
            return spawnPoints;
        }
    }
    Ability_1.Stomp = Stomp;
    class Cooldown {
        hasCooldown;
        cooldown;
        get getMaxCoolDown() { return this.cooldown; }
        ;
        set setMaxCoolDown(_param) { this.cooldown = _param; }
        currentCooldown;
        get getCurrentCooldown() { return this.currentCooldown; }
        ;
        onEndCooldown;
        constructor(_number) {
            this.cooldown = _number;
            this.currentCooldown = _number;
            this.hasCooldown = false;
        }
        startCooldown() {
            this.hasCooldown = true;
            Game.ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, this.eventUpdate);
        }
        endCooldown() {
            if (this.onEndCooldown != undefined) {
                this.onEndCooldown();
            }
            this.hasCooldown = false;
            this.currentCooldown = this.cooldown;
            Game.ƒ.Loop.removeEventListener("loopFrame" /* LOOP_FRAME */, this.eventUpdate);
        }
        resetCooldown() {
            this.hasCooldown = false;
            this.currentCooldown = this.cooldown;
            Game.ƒ.Loop.removeEventListener("loopFrame" /* LOOP_FRAME */, this.eventUpdate);
        }
        eventUpdate = (_event) => {
            this.updateCooldown();
        };
        updateCooldown() {
            if (this.hasCooldown && this.currentCooldown > 0) {
                this.currentCooldown--;
            }
            if (this.currentCooldown <= 0 && this.hasCooldown) {
                this.endCooldown();
            }
        }
    }
    Ability_1.Cooldown = Cooldown;
})(Ability || (Ability = {}));
var UI;
(function (UI) {
    //let divUI: HTMLDivElement = <HTMLDivElement>document.getElementById("UI");
    let player1UI = document.getElementById("Player1");
    let player2UI = document.getElementById("Player2");
    let bossUI = document.getElementById("Boss");
    function updateUI() {
        //Avatar1 UI
        player1UI.querySelector("#HP").style.width = (Game.avatar1.attributes.healthPoints / Game.avatar1.attributes.maxHealthPoints * 100) + "%";
        //InventoryUI
        updateInvUI(Game.avatar1.items, player1UI);
        //Door-PopUp
        doorPopUp();
        //Avatar2 UI
        player2UI.querySelector("#HP").style.width = (Game.avatar2.attributes.healthPoints / Game.avatar2.attributes.maxHealthPoints * 100) + "%";
        //InventoryUI
        updateInvUI(Game.avatar2.items, player2UI);
        //BossUI
        if (Game.currentRoom != undefined && Game.currentRoom.roomType == Generation.ROOMTYPE.BOSS && Game.currentRoom.boss != undefined && Game.currentRoom.boss.attributes.healthPoints > 0) {
            let boss = Game.currentRoom.boss;
            bossUI.style.visibility = "visible";
            bossUI.querySelector("#Name").innerHTML = boss.name;
            bossUI.querySelector("#HP").style.width = (boss.attributes.healthPoints / boss.attributes.maxHealthPoints * 100) + "%";
        }
        else {
            bossUI.style.visibility = "hidden";
        }
        //ItemPopUp
        if (itemUICooldown.hasCooldown) {
            fade(itemUI, true);
        }
        else {
            fade(itemUI, false);
            if (+getComputedStyle(itemUI).opacity <= 0) {
                setTimeout(() => {
                    if (itemPopUps.length > 0) {
                        addItemPopUpContent();
                    }
                }, 200);
            }
        }
        function updateInvUI(_inv, _ui) {
            _ui.querySelector("#Inventory").querySelectorAll("img").forEach((imgElement) => {
                let remove = true;
                _inv.forEach((element) => {
                    let imgName = element.imgSrc.split("/");
                    if (imgElement.src.split("/").find(elem => elem == imgName[imgName.length - 1]) != null) {
                        remove = false;
                    }
                });
                if (remove) {
                    imgElement.parentElement.remove();
                }
            });
            _inv.forEach((element) => {
                if (element != undefined) {
                    let exsist = false;
                    if (element.imgSrc == undefined) {
                        exsist = true;
                    }
                    else {
                        //search DOMImg for Item
                        _ui.querySelector("#Inventory").querySelectorAll("img").forEach((imgElement) => {
                            let imgName = element.imgSrc.split("/");
                            if (imgElement.src.split("/").find(elem => elem == imgName[imgName.length - 1]) != null) {
                                exsist = true;
                            }
                        });
                    }
                    //none exsisting DOMImg for Item
                    if (!exsist) {
                        let newDiv = document.createElement("div");
                        newDiv.className = "tooltip";
                        let newItem = document.createElement("img");
                        newItem.src = element.imgSrc;
                        newDiv.appendChild(newItem);
                        let newTooltip = document.createElement("span");
                        newTooltip.textContent = element.description;
                        newTooltip.className = "tooltiptext";
                        newDiv.appendChild(newTooltip);
                        let newTooltipLabel = document.createElement("p");
                        newTooltipLabel.textContent = element.name;
                        newTooltip.insertAdjacentElement("afterbegin", newTooltipLabel);
                        _ui.querySelector("#Inventory").appendChild(newDiv);
                    }
                }
            });
        }
        function doorPopUp() {
            let doorIsNear = false;
            Game.currentRoom.walls.forEach((wall) => {
                if (wall.door != undefined && wall.door.isActive) {
                    if (wall.door.collider != undefined && Game.avatar1.collider.collidesRect(wall.door.collider)) {
                        doorIsNear = true;
                    }
                }
            });
            if (Game.currentRoom.exitDoor != undefined) {
                if (Game.currentRoom.exitDoor.collider != undefined && Game.avatar1.collider.collidesRect(Game.currentRoom.exitDoor.collider)) {
                    doorIsNear = true;
                }
            }
            if (doorIsNear) {
                document.getElementById("Door-PopUp").style.visibility = "visible";
            }
            else {
                document.getElementById("Door-PopUp").style.visibility = "hidden";
            }
        }
    }
    UI.updateUI = updateUI;
    let itemUI = document.getElementById("Item-PopUp");
    let itemUICooldown = new Ability.Cooldown(120);
    let itemPopUps = [];
    function itemPopUp(_item) {
        itemPopUps.push({ name: _item.name, description: _item.description });
        if (itemUI.style.visibility == "hidden") {
            addItemPopUpContent();
        }
    }
    UI.itemPopUp = itemPopUp;
    function addItemPopUpContent() {
        itemUI.querySelector("#Name").innerHTML = itemPopUps[0].name;
        itemUI.querySelector("#Description").innerHTML = itemPopUps[0].description;
        itemPopUps.splice(0, 1);
        itemUICooldown.startCooldown();
    }
    function fade(_element, _in) {
        if (_element) {
            if (_in) {
                if (+_element.style.opacity <= 0) {
                    _element.style.visibility = "visible";
                }
                _element.style.opacity = (+_element.style.opacity + 0.1).toString();
            }
            else {
                if (+_element.style.opacity <= 0) {
                    _element.style.visibility = "hidden";
                    return;
                }
                _element.style.opacity = (+_element.style.opacity - 0.1).toString();
            }
        }
    }
    UI.txtZero = new ƒ.TextureImage();
    UI.txtOne = new ƒ.TextureImage();
    UI.txtTow = new ƒ.TextureImage();
    UI.txtThree = new ƒ.TextureImage();
    UI.txtFour = new ƒ.TextureImage();
    UI.txtFive = new ƒ.TextureImage();
    UI.txtSix = new ƒ.TextureImage();
    UI.txtSeven = new ƒ.TextureImage();
    UI.txtEight = new ƒ.TextureImage();
    UI.txtNine = new ƒ.TextureImage();
    UI.txtTen = new ƒ.TextureImage();
    class DamageUI extends ƒ.Node {
        tag = Tag.TAG.UI;
        up = 0.15;
        lifetime = 0.5 * 60;
        randomX = Math.random() * 0.05 - Math.random() * 0.05;
        async lifespan() {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    Game.graph.removeChild(this);
                }
            }
        }
        constructor(_position, _damage) {
            super("damageUI");
            this.addComponent(new ƒ.ComponentTransform());
            this.cmpTransform.mtxLocal.scale(new ƒ.Vector3(0.33, 0.33, 0.33));
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0.25);
            let mesh = new ƒ.MeshQuad();
            let cmpMesh = new ƒ.ComponentMesh(mesh);
            this.addComponent(cmpMesh);
            let mtrSolidWhite = new ƒ.Material("SolidWhite", ƒ.ShaderLit, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            let cmpMaterial = new ƒ.ComponentMaterial(mtrSolidWhite);
            this.addComponent(cmpMaterial);
            this.loadTexture(_damage);
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.update);
        }
        update = (_event) => {
            this.move();
            this.lifespan();
        };
        async move() {
            this.cmpTransform.mtxLocal.translate(new ƒ.Vector3(this.randomX, this.up, 0));
            this.cmpTransform.mtxLocal.scale(ƒ.Vector3.ONE(1.01));
        }
        loadTexture(_damage) {
            let newTxt = new ƒ.TextureImage();
            let newCoat = new ƒ.CoatRemissiveTextured();
            let newMtr = new ƒ.Material("mtr", ƒ.ShaderLitTextured, newCoat);
            let oldComCoat = new ƒ.ComponentMaterial();
            oldComCoat = this.getComponent(ƒ.ComponentMaterial);
            switch (Math.abs(_damage)) {
                case 0:
                    newTxt = UI.txtZero;
                    break;
                case 1:
                    newTxt = UI.txtOne;
                    break;
                case 2:
                    newTxt = UI.txtTow;
                    break;
                case 3:
                    newTxt = UI.txtThree;
                    break;
                case 4:
                    newTxt = UI.txtFour;
                    break;
                case 5:
                    newTxt = UI.txtFive;
                    break;
                case 6:
                    newTxt = UI.txtSeven;
                    break;
                case 7:
                    newTxt = UI.txtEight;
                    break;
                case 8:
                    newTxt = UI.txtEight;
                    break;
                case 9:
                    newTxt = UI.txtNine;
                    break;
                case 10:
                    newTxt = UI.txtTen;
                    break;
                default:
                    newTxt = UI.txtTen;
                    break;
            }
            if (_damage >= 0) {
                newCoat.color = ƒ.Color.CSS("red");
            }
            else {
                newCoat.color = ƒ.Color.CSS("green");
                this.up = 0.1;
            }
            newCoat.texture = newTxt;
            oldComCoat.material = newMtr;
        }
    }
    UI.DamageUI = DamageUI;
    UI.healParticle = new ƒ.TextureImage();
    UI.poisonParticle = new ƒ.TextureImage();
    UI.burnParticle = new ƒ.TextureImage();
    UI.bleedingParticle = new ƒ.TextureImage();
    UI.slowParticle = new ƒ.TextureImage();
    UI.immuneParticle = new ƒ.TextureImage();
    UI.furiousParticle = new ƒ.TextureImage();
    UI.exhaustedParticle = new ƒ.TextureImage();
    UI.commonParticle = new ƒ.TextureImage();
    UI.rareParticle = new ƒ.TextureImage();
    UI.epicParticle = new ƒ.TextureImage();
    UI.legendaryParticle = new ƒ.TextureImage();
    class Particles extends Game.ƒAid.NodeSprite {
        id;
        animationParticles;
        particleframeNumber;
        particleframeRate;
        width;
        height;
        constructor(_id, _texture, _frameCount, _frameRate) {
            super(Buff.BUFFID[_id].toLowerCase());
            this.id = _id;
            this.particleframeNumber = _frameCount;
            this.particleframeRate = _frameRate;
            this.animationParticles = new Game.ƒAid.SpriteSheetAnimation(Buff.BUFFID[_id].toLowerCase(), new ƒ.CoatTextured(ƒ.Color.CSS("white"), _texture));
            this.height = _texture.image.height;
            this.width = _texture.image.width / this.particleframeNumber;
            this.animationParticles.generateByGrid(ƒ.Rectangle.GET(0, 0, this.width, this.height), this.particleframeNumber, 32, ƒ.ORIGIN2D.CENTER, ƒ.Vector2.X(this.width));
            this.setAnimation(this.animationParticles);
            this.framerate = _frameRate;
            this.addComponent(new Game.ƒ.ComponentTransform());
            this.mtxLocal.translateZ(0.001);
            this.getComponent(ƒ.ComponentMaterial).sortForAlpha = true;
        }
    }
    UI.Particles = Particles;
})(UI || (UI = {}));
var Tag;
(function (Tag) {
    let TAG;
    (function (TAG) {
        TAG[TAG["PLAYER"] = 0] = "PLAYER";
        TAG[TAG["ENEMY"] = 1] = "ENEMY";
        TAG[TAG["BULLET"] = 2] = "BULLET";
        TAG[TAG["ITEM"] = 3] = "ITEM";
        TAG[TAG["ROOM"] = 4] = "ROOM";
        TAG[TAG["WALL"] = 5] = "WALL";
        TAG[TAG["DOOR"] = 6] = "DOOR";
        TAG[TAG["OBSTICAL"] = 7] = "OBSTICAL";
        TAG[TAG["UI"] = 8] = "UI";
    })(TAG = Tag.TAG || (Tag.TAG = {}));
})(Tag || (Tag = {}));
var Entity;
(function (Entity_1) {
    class Entity extends Game.ƒAid.NodeSprite {
        currentAnimationState;
        performKnockback = false;
        tag;
        netId;
        netObjectNode = this;
        id;
        attributes;
        collider;
        items = [];
        buffs = [];
        offsetColliderX;
        offsetColliderY;
        colliderScaleFaktor;
        weapon;
        canMoveX = true;
        canMoveY = true;
        moveDirection = Game.ƒ.Vector3.ZERO();
        animationContainer;
        idleScale;
        currentKnockback = ƒ.Vector3.ZERO();
        shadow;
        spriteScaleFactor = 1;
        shadowOffsetY = 0;
        shadowOffsetX = 0;
        constructor(_id, _netId) {
            super(getNameById(_id));
            this.netId = Networking.IdManager(_netId);
            this.id = _id;
            this.attributes = new Entity_1.Attributes(1, 1, 1, 1, 1, 1, 1, 1);
            if (AnimationGeneration.getAnimationById(this.id) != null) {
                let ani = AnimationGeneration.getAnimationById(this.id);
                this.animationContainer = ani;
                this.idleScale = ani.scale.find(animation => animation[0] == "idle")[1];
            }
            this.addComponent(new ƒ.ComponentTransform());
            this.offsetColliderX = 0;
            this.offsetColliderY = 0;
            this.colliderScaleFaktor = 1;
            this.collider = new Collider.Collider(new ƒ.Vector2(this.mtxLocal.translation.x + (this.offsetColliderX * this.mtxLocal.scaling.x), this.mtxLocal.translation.y + (this.offsetColliderY * this.mtxLocal.scaling.y)), (this.cmpTransform.mtxLocal.scaling.x / 2) * this.colliderScaleFaktor, this.netId);
            if (AnimationGeneration.getAnimationById(this.id) != null) {
                let ani = AnimationGeneration.getAnimationById(this.id);
                this.animationContainer = ani;
                this.idleScale = ani.scale.find(animation => animation[0] == "idle")[1];
            }
            this.shadow = new Entity_1.Shadow(this);
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.eventUpdate);
        }
        eventUpdate = (_event) => {
            this.update();
        };
        update() {
            this.updateBuffs();
            this.shadow.updateShadowPos();
            if (Networking.client.idHost == Networking.client.id) {
                this.setCollider();
            }
        }
        updateScale(_newScale, _updateScaleDependencies) {
            if (_updateScaleDependencies) {
                this.attributes.updateScaleDependencies(_newScale);
            }
            this.mtxLocal.scaling = new ƒ.Vector3(_newScale * this.spriteScaleFactor, _newScale * this.spriteScaleFactor, 1);
            this.collider.setRadius((this.cmpTransform.mtxLocal.scaling.x / 2) * this.colliderScaleFaktor);
            this.attributes.scale = _newScale;
        }
        setCollider() {
            this.collider.setPosition(new ƒ.Vector2(this.mtxLocal.translation.x + (this.offsetColliderX * this.mtxLocal.scaling.x), this.mtxLocal.translation.y + (this.offsetColliderY * this.mtxLocal.scaling.y)));
        }
        updateBuffs() {
            if (this.buffs.length == 0) {
                return;
            }
            for (let i = 0; i < this.buffs.length; i++) {
                this.buffs[i].doBuffStuff(this);
            }
        }
        collide(_direction) {
            this.canMoveX = true;
            this.canMoveY = true;
            let walls = Game.currentRoom.walls;
            let wallColliders = [];
            walls.forEach(elem => {
                wallColliders.push(elem.collider);
            });
            let mewDirection = _direction.clone;
            if (!mewDirection.equals(Game.ƒ.Vector3.ZERO())) {
                mewDirection.normalize();
                mewDirection.scale((Game.deltaTime * this.attributes.speed));
            }
            this.calculateCollision(wallColliders, mewDirection);
        }
        calculateCollision(_collider, _direction) {
            _collider.forEach((element) => {
                if (element instanceof Collider.Collider) {
                    if (this.collider.collides(element)) {
                        let intersection = this.collider.getIntersection(element);
                        let areaBeforeMove = intersection;
                        if (areaBeforeMove < this.collider.getRadius + element.getRadius) {
                            let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                            let newDirection = new Game.ƒ.Vector2(_direction.x, 0);
                            this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));
                            if (this.collider.getIntersection(element) != null) {
                                let newIntersection = this.collider.getIntersection(element);
                                let areaAfterMove = newIntersection;
                                if (areaBeforeMove < areaAfterMove) {
                                    this.canMoveX = false;
                                }
                            }
                            this.collider.position = oldPosition;
                            newDirection = new Game.ƒ.Vector2(0, _direction.y);
                            this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));
                            if (this.collider.getIntersection(element) != null) {
                                let newIntersection = this.collider.getIntersection(element);
                                let areaAfterMove = newIntersection;
                                if (areaBeforeMove < areaAfterMove) {
                                    this.canMoveY = false;
                                }
                            }
                            this.collider.position = oldPosition;
                        }
                        if (Networking.client.id == Networking.client.idHost) {
                            if (element.ownerNetId == Game.avatar1.netId) {
                                Game.avatar1.getKnockback(this.attributes.knockbackForce, this.mtxLocal.translation);
                            }
                            if (element.ownerNetId == Game.avatar2.netId) {
                                Networking.knockbackPush(this.attributes.knockbackForce, this.mtxLocal.translation);
                            }
                        }
                    }
                }
                else if (element instanceof Game.ƒ.Rectangle) {
                    if (this.collider.collidesRect(element)) {
                        let intersection = this.collider.getIntersectionRect(element);
                        let areaBeforeMove = intersection.height * intersection.width;
                        if (areaBeforeMove < this.mtxLocal.scaling.x * this.mtxLocal.scaling.y) {
                            let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                            let newDirection = new Game.ƒ.Vector2(_direction.x, 0);
                            this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));
                            if (this.collider.getIntersectionRect(element) != null) {
                                let newIntersection = this.collider.getIntersectionRect(element);
                                let areaAfterMove = newIntersection.height * newIntersection.width;
                                if (areaBeforeMove < areaAfterMove) {
                                    this.canMoveX = false;
                                }
                            }
                            this.collider.position = oldPosition;
                            newDirection = new Game.ƒ.Vector2(0, _direction.y);
                            this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));
                            if (this.collider.getIntersectionRect(element) != null) {
                                let newIntersection = this.collider.getIntersectionRect(element);
                                let areaAfterMove = newIntersection.height * newIntersection.width;
                                if (areaBeforeMove < areaAfterMove) {
                                    this.canMoveY = false;
                                }
                            }
                            this.collider.position = oldPosition;
                        }
                        else {
                            this.canMoveX = false;
                            this.canMoveY = false;
                        }
                    }
                }
            });
        }
        /**
         * does Damage to the Entity
         * @param _value value how much damage is applied
         */
        getDamage(_value) {
            console.log("get hit");
            if (Networking.client.idHost == Networking.client.id) {
                if (_value != null && this.attributes.hitable) {
                    let hitValue = this.getDamageReduction(_value);
                    this.attributes.healthPoints -= hitValue;
                    Game.graph.addChild(new UI.DamageUI(this.mtxLocal.translation, Math.round(hitValue)));
                    Networking.updateUI(this.mtxLocal.translation.toVector2(), Math.round(hitValue));
                    Networking.updateEntityAttributes({ value: this.attributes }, this.netId);
                }
                if (this.attributes.healthPoints <= 0) {
                    Networking.removeEntity(this.netId);
                    this.die();
                }
            }
        }
        die() {
            Networking.popID(this.netId);
            Game.graph.removeChild(this);
        }
        getDamageReduction(_value) {
            return _value * (1 - Calculation.clampNumber((this.attributes.armor / 100), 0, 1));
        }
        //#region knockback
        getKnockback(_knockbackForce, _position) {
            if (!this.performKnockback) {
                this.performKnockback = true;
                let direction = Game.ƒ.Vector2.DIFFERENCE(this.cmpTransform.mtxLocal.translation.toVector2(), _position.toVector2()).toVector3(0);
                let knockBackScaling = Game.deltaTime * this.attributes.getScale;
                direction.normalize();
                direction.scale(_knockbackForce * knockBackScaling);
                this.currentKnockback.add(direction);
            }
        }
        reduceKnockback() {
            this.currentKnockback.scale(0.5);
            if (this.currentKnockback.magnitude < 0.0001) {
                this.currentKnockback = Game.ƒ.Vector3.ZERO();
                this.performKnockback = false;
            }
        }
        //#endregion
        switchAnimation(_name) {
            let name = ANIMATIONSTATES[_name].toLowerCase();
            if (this.animationContainer != null && this.animationContainer.animations[name] != null) {
                if (this.currentAnimationState != _name) {
                    switch (_name) {
                        case ANIMATIONSTATES.IDLE:
                            this.setAnimation(this.animationContainer.animations[name]);
                            this.currentAnimationState = ANIMATIONSTATES.IDLE;
                            break;
                        case ANIMATIONSTATES.WALK:
                            this.setAnimation(this.animationContainer.animations[name]);
                            this.currentAnimationState = ANIMATIONSTATES.WALK;
                            break;
                        case ANIMATIONSTATES.IDLELEFT:
                            this.setAnimation(this.animationContainer.animations[name]);
                            this.currentAnimationState = ANIMATIONSTATES.IDLELEFT;
                            break;
                        case ANIMATIONSTATES.WALKLEFT:
                            this.setAnimation(this.animationContainer.animations[name]);
                            this.currentAnimationState = ANIMATIONSTATES.WALKLEFT;
                            break;
                        case ANIMATIONSTATES.SUMMON:
                            this.setAnimation(this.animationContainer.animations[name]);
                            this.currentAnimationState = ANIMATIONSTATES.SUMMON;
                            break;
                        case ANIMATIONSTATES.ATTACK:
                            this.setAnimation(this.animationContainer.animations[name]);
                            this.currentAnimationState = ANIMATIONSTATES.ATTACK;
                            break;
                        case ANIMATIONSTATES.TELEPORT:
                            this.setAnimation(this.animationContainer.animations[name]);
                            this.currentAnimationState = ANIMATIONSTATES.TELEPORT;
                            break;
                    }
                    this.framerate = this.animationContainer.frameRate.find(obj => obj[0] == name)[1];
                    this.setFrameDirection(1);
                    Networking.updateEntityAnimationState(this.currentAnimationState, this.netId);
                }
            }
            else {
                console.warn("no animationContainer or animation with name: " + name + " at Entity: " + this.name);
            }
        }
    }
    Entity_1.Entity = Entity;
    let ANIMATIONSTATES;
    (function (ANIMATIONSTATES) {
        ANIMATIONSTATES[ANIMATIONSTATES["IDLE"] = 0] = "IDLE";
        ANIMATIONSTATES[ANIMATIONSTATES["IDLELEFT"] = 1] = "IDLELEFT";
        ANIMATIONSTATES[ANIMATIONSTATES["WALK"] = 2] = "WALK";
        ANIMATIONSTATES[ANIMATIONSTATES["WALKLEFT"] = 3] = "WALKLEFT";
        ANIMATIONSTATES[ANIMATIONSTATES["SUMMON"] = 4] = "SUMMON";
        ANIMATIONSTATES[ANIMATIONSTATES["ATTACK"] = 5] = "ATTACK";
        ANIMATIONSTATES[ANIMATIONSTATES["TELEPORT"] = 6] = "TELEPORT";
    })(ANIMATIONSTATES = Entity_1.ANIMATIONSTATES || (Entity_1.ANIMATIONSTATES = {}));
    let BEHAVIOUR;
    (function (BEHAVIOUR) {
        BEHAVIOUR[BEHAVIOUR["IDLE"] = 0] = "IDLE";
        BEHAVIOUR[BEHAVIOUR["FOLLOW"] = 1] = "FOLLOW";
        BEHAVIOUR[BEHAVIOUR["FLEE"] = 2] = "FLEE";
        BEHAVIOUR[BEHAVIOUR["SUMMON"] = 3] = "SUMMON";
        BEHAVIOUR[BEHAVIOUR["ATTACK"] = 4] = "ATTACK";
        BEHAVIOUR[BEHAVIOUR["TELEPORT"] = 5] = "TELEPORT";
    })(BEHAVIOUR = Entity_1.BEHAVIOUR || (Entity_1.BEHAVIOUR = {}));
    let ID;
    (function (ID) {
        ID[ID["RANGED"] = 0] = "RANGED";
        ID[ID["MELEE"] = 1] = "MELEE";
        ID[ID["MERCHANT"] = 2] = "MERCHANT";
        ID[ID["BAT"] = 3] = "BAT";
        ID[ID["REDTICK"] = 4] = "REDTICK";
        ID[ID["SMALLTICK"] = 5] = "SMALLTICK";
        ID[ID["SKELETON"] = 6] = "SKELETON";
        ID[ID["OGER"] = 7] = "OGER";
        ID[ID["SUMMONER"] = 8] = "SUMMONER";
        ID[ID["BIGBOOM"] = 9] = "BIGBOOM";
    })(ID = Entity_1.ID || (Entity_1.ID = {}));
    function getNameById(_id) {
        switch (_id) {
            case ID.RANGED:
                return "Ranged";
            case ID.MELEE:
                return "Tank";
            case ID.BAT:
                return "Bat";
            case ID.REDTICK:
                return "RedTick";
            case ID.SMALLTICK:
                return "SmallTick";
            case ID.SKELETON:
                return "Skeleton";
            case ID.OGER:
                return "Oger";
            case ID.SUMMONER:
                return "Summoner";
            case ID.BIGBOOM:
                return "Big Boom";
        }
        return null;
    }
    Entity_1.getNameById = getNameById;
})(Entity || (Entity = {}));
var Enemy;
(function (Enemy_1) {
    let ENEMYCLASS;
    (function (ENEMYCLASS) {
        ENEMYCLASS[ENEMYCLASS["ENEMYDUMB"] = 0] = "ENEMYDUMB";
        ENEMYCLASS[ENEMYCLASS["ENEMYCIRCLE"] = 1] = "ENEMYCIRCLE";
        ENEMYCLASS[ENEMYCLASS["ENEMYDASH"] = 2] = "ENEMYDASH";
        ENEMYCLASS[ENEMYCLASS["ENEMYSMASH"] = 3] = "ENEMYSMASH";
        ENEMYCLASS[ENEMYCLASS["ENEMYPATROL"] = 4] = "ENEMYPATROL";
        ENEMYCLASS[ENEMYCLASS["ENEMYSHOOT"] = 5] = "ENEMYSHOOT";
        ENEMYCLASS[ENEMYCLASS["SUMMONER"] = 6] = "SUMMONER";
        ENEMYCLASS[ENEMYCLASS["BIGBOOM"] = 7] = "BIGBOOM";
        ENEMYCLASS[ENEMYCLASS["SUMMONORADDS"] = 8] = "SUMMONORADDS";
    })(ENEMYCLASS = Enemy_1.ENEMYCLASS || (Enemy_1.ENEMYCLASS = {}));
    let ENEMYBEHAVIOUR;
    (function (ENEMYBEHAVIOUR) {
        ENEMYBEHAVIOUR[ENEMYBEHAVIOUR["IDLE"] = 0] = "IDLE";
        ENEMYBEHAVIOUR[ENEMYBEHAVIOUR["WALK"] = 1] = "WALK";
        ENEMYBEHAVIOUR[ENEMYBEHAVIOUR["SUMMON"] = 2] = "SUMMON";
        ENEMYBEHAVIOUR[ENEMYBEHAVIOUR["ATTACK"] = 3] = "ATTACK";
        ENEMYBEHAVIOUR[ENEMYBEHAVIOUR["TELEPORT"] = 4] = "TELEPORT";
        ENEMYBEHAVIOUR[ENEMYBEHAVIOUR["SHOOT360"] = 5] = "SHOOT360";
        ENEMYBEHAVIOUR[ENEMYBEHAVIOUR["SHOOT"] = 6] = "SHOOT";
        ENEMYBEHAVIOUR[ENEMYBEHAVIOUR["SMASH"] = 7] = "SMASH";
        ENEMYBEHAVIOUR[ENEMYBEHAVIOUR["STOMP"] = 8] = "STOMP";
        ENEMYBEHAVIOUR[ENEMYBEHAVIOUR["DASH"] = 9] = "DASH";
    })(ENEMYBEHAVIOUR = Enemy_1.ENEMYBEHAVIOUR || (Enemy_1.ENEMYBEHAVIOUR = {}));
    class Enemy extends Entity.Entity {
        currentBehaviour;
        target;
        moveDirection = Game.ƒ.Vector3.ZERO();
        isAggressive;
        canThinkCoolDown;
        canThink;
        stateNext;
        stateCurrent;
        instructions;
        stateMachineInstructions;
        constructor(_id, _position, _netId) {
            super(_id, _netId);
            this.tag = Tag.TAG.ENEMY;
            this.isAggressive = false;
            let ref = Game.enemiesJSON.find(enemy => enemy.name == Entity.ID[_id].toLowerCase());
            console.log(ref);
            this.attributes = new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, ref.attributes.scale, ref.attributes.knockbackForce, ref.attributes.armor, ref.attributes.coolDownReduction, ref.attributes.accuracy);
            if (this.animationContainer != undefined) {
                this.setAnimation(this.animationContainer.animations["idle"]);
            }
            this.canThink = false;
            this.canThinkCoolDown = new Ability.Cooldown(60 + (Math.random() * 5));
            this.canThinkCoolDown.onEndCooldown = this.startThinkin;
            this.canThinkCoolDown.startCooldown();
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0);
            this.mtxLocal.scaling = new ƒ.Vector3(this.attributes.getScale, this.attributes.getScale, 1);
            this.offsetColliderX = ref.offsetColliderX;
            this.offsetColliderY = ref.offsetColliderY;
            this.colliderScaleFaktor = ref.colliderScaleFaktor;
            this.collider = new Collider.Collider(new ƒ.Vector2(this.mtxLocal.translation.x + (ref.offsetColliderX * this.mtxLocal.scaling.x), this.mtxLocal.translation.y + (ref.offsetColliderY * this.mtxLocal.scaling.y)), ((this.mtxLocal.scaling.x * this.idleScale) / 2) * this.colliderScaleFaktor, this.netId);
            this.stateMachineInstructions = new Game.ƒAid.StateMachineInstructions();
            this.shadowOffsetY = -0.8;
        }
        act() {
            this.instructions.act(this.stateCurrent, this);
        }
        transit(_next) {
            console.info(ENEMYBEHAVIOUR[this.stateCurrent] + " to " + ENEMYBEHAVIOUR[_next]);
            this.instructions.transit(this.stateCurrent, _next, this);
        }
        startThinkin = () => {
            this.canThink = true;
        };
        update() {
            this.shadow.updateShadowPos();
            if (this.canThink) {
                if (Networking.client.id == Networking.client.idHost) {
                    super.update();
                    this.act();
                    this.move(this.moveDirection);
                    Networking.updateEnemyPosition(this.cmpTransform.mtxLocal.translation, this.netId);
                }
            }
        }
        ;
        getDamage(_value) {
            super.getDamage(_value);
            this.isAggressive = true;
        }
        getKnockback(_knockbackForce, _position) {
            super.getKnockback(_knockbackForce, _position);
        }
        move(_direction) {
            if (this.isAggressive) {
                this.collide(_direction);
            }
            else {
                this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
            }
        }
        moveSimple(_target) {
            this.target = _target;
            let direction = Game.ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation);
            return direction.toVector2();
        }
        moveAway(_target) {
            let moveSimple = this.moveSimple(_target);
            moveSimple.scale(-1);
            return moveSimple;
        }
        die() {
            super.die();
            Game.currentRoom.enemyCountManager.onEnemyDeath();
        }
        collide(_direction) {
            let knockback = this.currentKnockback.clone;
            if (knockback.magnitude > 0) {
            }
            if (_direction.magnitude > 0) {
                _direction.normalize();
                _direction.add(knockback);
                _direction.scale((Game.deltaTime * this.attributes.speed));
                knockback.scale((Game.deltaTime * this.attributes.speed));
                super.collide(_direction);
                // Collision with Avatars 
                // let avatar: Player.Player[] = (<Player.Player[]>Game.graph.getChildren().filter(element => (<Player.Player>element).tag == Tag.TAG.PLAYER));
                // let avatarColliders: Collider.Collider[] = [];
                // avatar.forEach((elem) => {
                //     avatarColliders.push((<Player.Player>elem).collider);
                // });
                // this.calculateCollision(avatarColliders, _direction);
                // Collision with Enemies
                // let enemies: Enemy.Enemy[] = Game.enemies;
                // let enemyColliders: Collider.Collider[] = [];
                // enemies.forEach((elem) => {
                //     enemyColliders.push((<Enemy.Enemy>elem).collider);
                // });
                // this.calculateCollision(enemyColliders, _direction);
                if (this.canMoveX && this.canMoveY) {
                    this.cmpTransform.mtxLocal.translate(_direction);
                }
                else if (this.canMoveX && !this.canMoveY) {
                    _direction = new ƒ.Vector3(_direction.x, 0, _direction.z);
                    this.cmpTransform.mtxLocal.translate(_direction);
                }
                else if (!this.canMoveX && this.canMoveY) {
                    _direction = new ƒ.Vector3(0, _direction.y, _direction.z);
                    this.cmpTransform.mtxLocal.translate(_direction);
                }
                _direction.subtract(knockback);
            }
            this.reduceKnockback();
        }
    }
    Enemy_1.Enemy = Enemy;
    class EnemyCircle extends Enemy {
        flocking = new Enemy_1.FlockingBehaviour(this, 3, 0.5, 0.1, 0.1, 4, 1, 0, 1);
        circleRadius = 2;
        circleDirection;
        circleTolerance = 0.1;
        constructor(_id, _pos, _netId) {
            super(_id, _pos, _netId);
            this.isAggressive = true;
            this.stateMachineInstructions.actDefault = this.walkAI;
            this.instructions = this.stateMachineInstructions;
            this.circleDirection = this.getCircleDirection();
            this.circleRadius = Calculation.clampNumber(this.circleRadius * Math.random() * (this.circleRadius - 2), 2, this.circleRadius);
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_pos.x, _pos.y, 0.1);
            this.shadowOffsetY = 0;
        }
        getCircleDirection() {
            let random = Math.random();
            if (random > 0.5) {
                return 90;
            }
            else {
                return -90;
            }
        }
        update() {
            this.target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2();
            this.flocking.update();
            super.update();
        }
        walkAI = () => {
            this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
            let distance = this.target.toVector3().getDistance(this.mtxLocal.translation);
            if (Math.abs(distance - this.circleRadius) <= this.circleTolerance) {
                this.walkCircle();
            }
            if (distance > this.circleRadius + this.circleTolerance) {
                this.getCloser();
            }
            if (distance < this.circleRadius - this.circleTolerance) {
                this.getFurtherAway();
            }
        };
        getCloser = () => {
            this.flocking.toTargetWeight = 1;
            this.flocking.notToTargetWeight = 0;
            this.moveDirection = this.flocking.getMoveVector().toVector3();
        };
        getFurtherAway = () => {
            this.flocking.notToTargetWeight = 1;
            this.flocking.toTargetWeight = 0;
            this.moveDirection = this.flocking.getMoveVector().toVector3();
        };
        walkCircle = () => {
            this.flocking.toTargetWeight = 1;
            this.flocking.notToTargetWeight = 0;
            this.moveDirection = Calculation.getRotatedVectorByAngle2D(this.flocking.getMoveVector().toVector3(), this.circleDirection);
        };
    }
    Enemy_1.EnemyCircle = EnemyCircle;
    class EnemyDumb extends Enemy {
        flocking = new Enemy_1.FlockingBehaviour(this, 3, 0.5, 0.1, 1, 3, 1, 0, 1);
        aggressiveDistance = 3 * 3;
        stamina = new Ability.Cooldown(180);
        recover = new Ability.Cooldown(60);
        constructor(_id, _pos, _netId) {
            super(_id, _pos, _netId);
            this.isAggressive = false;
            this.stamina.onEndCooldown = this.OnStaminaCooldownEnd;
            this.recover.onEndCooldown = this.OnRecoverCooldownEnd;
            this.stateMachineInstructions.actDefault = this.idle;
            this.stateMachineInstructions.setAction(ENEMYBEHAVIOUR.WALK, this.walk);
            this.stateMachineInstructions.setAction(ENEMYBEHAVIOUR.IDLE, this.idle);
            this.stateMachineInstructions.setTransition(ENEMYBEHAVIOUR.IDLE, ENEMYBEHAVIOUR.WALK, this.startWalking);
            this.stateMachineInstructions.setTransition(ENEMYBEHAVIOUR.WALK, ENEMYBEHAVIOUR.IDLE, this.startIdling);
            this.instructions = this.stateMachineInstructions;
            this.stateCurrent = ENEMYBEHAVIOUR.IDLE;
        }
        update() {
            this.target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2();
            this.flocking.update();
            super.update();
            this.checkAggressiveState();
        }
        checkAggressiveState() {
            if (this.isAggressive) {
                return;
            }
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitudeSquared;
            if (distance < this.aggressiveDistance) {
                this.isAggressive = true;
            }
        }
        OnStaminaCooldownEnd = () => {
            this.transit(ENEMYBEHAVIOUR.IDLE);
        };
        OnRecoverCooldownEnd = () => {
            this.transit(ENEMYBEHAVIOUR.WALK);
        };
        startIdling = () => {
            this.recover.startCooldown();
        };
        die() {
            super.die();
            this.stamina = null;
            this.recover = null;
        }
        idle = () => {
            this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
            this.moveDirection = Game.ƒ.Vector3.ZERO();
            if (this.isAggressive && !this.recover.hasCooldown) {
                this.transit(ENEMYBEHAVIOUR.WALK);
            }
        };
        startWalking = () => {
            this.stamina.startCooldown();
        };
        walk = () => {
            this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
            this.moveDirection = this.flocking.getMoveVector().toVector3();
        };
    }
    Enemy_1.EnemyDumb = EnemyDumb;
    class EnemySmash extends Enemy {
        coolDown = new Ability.Cooldown(5);
        avatars = [];
        randomPlayer = Math.round(Math.random());
        currentBehaviour = Entity.BEHAVIOUR.IDLE;
        flocking = new Enemy_1.FlockingBehaviour(this, 3, 0.5, 0.1, 1, 4, 1, 0, 0);
        constructor(_id, _position, _netId) {
            super(_id, _position, _netId);
            this.spriteScaleFactor = 2;
            this.updateScale(this.attributes.getScale, false);
        }
        behaviour() {
            this.avatars = [Game.avatar1, Game.avatar2];
            this.target = this.avatars[this.randomPlayer].mtxLocal.translation.toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;
            if (this.currentBehaviour == Entity.BEHAVIOUR.ATTACK && this.getCurrentFrame >= this.animationContainer.animations["attack"].frames.length - 1) {
                this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
            }
            if (distance < 4 && !this.coolDown.hasCooldown) {
                this.coolDown.startCooldown();
                this.currentBehaviour = Entity.BEHAVIOUR.ATTACK;
            }
            if (this.coolDown.hasCooldown && this.currentBehaviour != Entity.BEHAVIOUR.IDLE) {
                this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
            }
            if (this.currentBehaviour != Entity.BEHAVIOUR.FOLLOW) {
                this.currentBehaviour = Entity.BEHAVIOUR.FOLLOW;
            }
        }
        moveBehaviour() {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.FOLLOW:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.moveDirection = this.moveSimple(this.target).toVector3();
                    break;
                case Entity.BEHAVIOUR.ATTACK:
                    this.switchAnimation(Entity.ANIMATIONSTATES.ATTACK);
                    this.moveDirection = ƒ.Vector3.ZERO();
                    break;
                case Entity.BEHAVIOUR.IDLE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                    this.moveDirection = ƒ.Vector3.ZERO();
                    break;
            }
        }
    }
    Enemy_1.EnemySmash = EnemySmash;
    class EnemyDash extends Enemy {
        dash = new Ability.Dash(this.netId, 12, 1, 300, 3);
        lastMoveDireciton;
        dashDistance = Math.pow(2, 2);
        dashCount = 1;
        flocking = new Enemy_1.FlockingBehaviour(this, 3, 0.5, 0.1, 1, 4, 1, 0, 0);
        constructor(_id, _position, _netId) {
            super(_id, _position, _netId);
            this.isAggressive = true;
            this.dash.onEndAbility = this.onEndDash;
            this.stateMachineInstructions.actDefault = this.walk;
            this.stateMachineInstructions.setTransition(ENEMYBEHAVIOUR.WALK, ENEMYBEHAVIOUR.DASH, this.startDash);
            this.stateMachineInstructions.setAction(ENEMYBEHAVIOUR.DASH, this.doDash);
            this.stateMachineInstructions.setAction(ENEMYBEHAVIOUR.WALK, this.walk);
            this.instructions = this.stateMachineInstructions;
            this.lastMoveDireciton = this.moveDirection;
            this.stateCurrent = ENEMYBEHAVIOUR.WALK;
            this.target = Game.ƒ.Vector3.ZERO().toVector2();
        }
        update() {
            this.flocking.update();
            super.update();
        }
        startDash = () => {
            this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
            this.dash.doAbility();
        };
        doDash = () => {
            this.moveDirection = this.lastMoveDireciton;
        };
        onEndDash = () => {
            this.transit(ENEMYBEHAVIOUR.WALK);
        };
        walk = () => {
            this.target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitudeSquared;
            this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
            this.moveDirection = this.flocking.getMoveVector().toVector3();
            this.lastMoveDireciton = this.moveDirection;
            if (distance < this.dashDistance && !this.dash.hasCooldown()) {
                this.transit(ENEMYBEHAVIOUR.DASH);
            }
        };
    }
    Enemy_1.EnemyDash = EnemyDash;
    class EnemyPatrol extends Enemy {
        patrolPoints = [new ƒ.Vector2(0, 4), new ƒ.Vector2(5, 0)];
        waitTime = 1000;
        currenPointIndex = 0;
        flocking = new Enemy_1.FlockingBehaviour(this, 3, 0.5, 0.1, 1, 4, 1, 0, 0);
        moveBehaviour() {
            this.patrol();
        }
        patrol() {
            if (this.mtxLocal.translation.getDistance(ƒ.Vector3.SUM(this.patrolPoints[this.currenPointIndex].toVector3(), Game.currentRoom.mtxLocal.translation)) > 0.3) {
                this.moveDirection = this.moveSimple((ƒ.Vector2.SUM(this.patrolPoints[this.currenPointIndex], Game.currentRoom.mtxLocal.translation.toVector2()))).toVector3();
            }
            else {
                setTimeout(() => {
                    if (this.currenPointIndex + 1 < this.patrolPoints.length) {
                        this.currenPointIndex++;
                    }
                    else {
                        this.currenPointIndex = 0;
                    }
                }, this.waitTime);
            }
        }
    }
    Enemy_1.EnemyPatrol = EnemyPatrol;
    class EnemyShoot extends Enemy {
        distanceToPlayer = 5 * 5;
        flocking = new Enemy_1.FlockingBehaviour(this, 3, 0.5, 0.1, 1, 4, 0, 1, 1);
        distance;
        constructor(_id, _position, _netId) {
            super(_id, _position, _netId);
            this.weapon = new Weapons.RangedWeapon(60, 1, Bullets.BULLETTYPE.SLOW, 1, this.netId, Weapons.AIM.NORMAL);
            this.stateMachineInstructions.setAction(ENEMYBEHAVIOUR.WALK, this.flee);
            this.stateMachineInstructions.setAction(ENEMYBEHAVIOUR.IDLE, this.idle);
            this.stateMachineInstructions.setAction(ENEMYBEHAVIOUR.SHOOT, this.shoot);
            this.instructions = this.stateMachineInstructions;
            this.stateCurrent = ENEMYBEHAVIOUR.IDLE;
            this.spriteScaleFactor = 2;
            this.shadowOffsetY = 0;
            this.shadowOffsetX = -0.1;
            this.updateScale(this.attributes.getScale, false);
        }
        update() {
            this.target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2();
            this.distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitudeSquared;
            this.flocking.update();
            super.update();
        }
        flee = () => {
            this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
            this.moveDirection = this.flocking.getMoveVector().toVector3();
            // if (!this.weapon.getCoolDown.hasCoolDown) {
            //     this.transit(ENEMYBEHAVIOUR.SHOOT);
            // }
            if (this.distance >= this.distanceToPlayer) {
                this.transit(ENEMYBEHAVIOUR.IDLE);
            }
        };
        shoot = () => {
            this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
            let direction = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation);
            this.weapon.shoot(direction, true);
            this.transit(ENEMYBEHAVIOUR.IDLE);
        };
        idle = () => {
            this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
            this.moveDirection = Game.ƒ.Vector3.ZERO();
            if (this.distance < this.distanceToPlayer) {
                this.transit(ENEMYBEHAVIOUR.WALK);
            }
            if (!this.weapon.getCoolDown.hasCooldown) {
                this.transit(ENEMYBEHAVIOUR.SHOOT);
            }
        };
    }
    Enemy_1.EnemyShoot = EnemyShoot;
    class SummonorAdds extends EnemyDash {
        avatar;
        constructor(_id, _position, _target, _netId) {
            super(_id, _position, _netId);
            this.avatar = _target;
            this.stateMachineInstructions.actDefault = this.walk;
            this.stateMachineInstructions.setAction(ENEMYBEHAVIOUR.WALK, this.walk);
            this.flocking.avoidRadius = 2;
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0.1);
            this.shadowOffsetY = 0;
        }
        walk = () => {
            this.target = this.avatar.mtxLocal.translation.toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitudeSquared;
            this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
            this.moveDirection = this.flocking.getMoveVector().toVector3();
            this.lastMoveDireciton = this.moveDirection;
            if (distance < this.dashDistance && !this.dash.hasCooldown()) {
                this.transit(ENEMYBEHAVIOUR.DASH);
            }
        };
    }
    Enemy_1.SummonorAdds = SummonorAdds;
    function getEnemyClass(_enemy) {
        switch (true) {
            case _enemy instanceof EnemyDumb:
                return ENEMYCLASS.ENEMYDUMB;
            case _enemy instanceof EnemyCircle:
                return ENEMYCLASS.ENEMYCIRCLE;
            case _enemy instanceof Enemy_1.BigBoom:
                return ENEMYCLASS.BIGBOOM;
            case _enemy instanceof SummonorAdds:
                return ENEMYCLASS.SUMMONORADDS;
            case _enemy instanceof Enemy_1.Summonor:
                return ENEMYCLASS.SUMMONER;
            case _enemy instanceof EnemyDash:
                return ENEMYCLASS.ENEMYDASH;
            case _enemy instanceof EnemyPatrol:
                return ENEMYCLASS.ENEMYPATROL;
            case _enemy instanceof EnemyShoot:
                return ENEMYCLASS.ENEMYSHOOT;
            case _enemy instanceof EnemySmash:
                return ENEMYCLASS.ENEMYSMASH;
            default:
                return null;
        }
    }
    Enemy_1.getEnemyClass = getEnemyClass;
})(Enemy || (Enemy = {}));
var Items;
(function (Items) {
    let ITEMID;
    (function (ITEMID) {
        ITEMID[ITEMID["ICEBUCKETCHALLENGE"] = 0] = "ICEBUCKETCHALLENGE";
        ITEMID[ITEMID["DMGUP"] = 1] = "DMGUP";
        ITEMID[ITEMID["SPEEDUP"] = 2] = "SPEEDUP";
        ITEMID[ITEMID["PROJECTILESUP"] = 3] = "PROJECTILESUP";
        ITEMID[ITEMID["HEALTHUP"] = 4] = "HEALTHUP";
        ITEMID[ITEMID["SCALEUP"] = 5] = "SCALEUP";
        ITEMID[ITEMID["SCALEDOWN"] = 6] = "SCALEDOWN";
        ITEMID[ITEMID["ARMORUP"] = 7] = "ARMORUP";
        ITEMID[ITEMID["HOMECOMING"] = 8] = "HOMECOMING";
        ITEMID[ITEMID["TOXICRELATIONSHIP"] = 9] = "TOXICRELATIONSHIP";
        ITEMID[ITEMID["VAMPY"] = 10] = "VAMPY";
        ITEMID[ITEMID["SLOWYSLOW"] = 11] = "SLOWYSLOW";
        ITEMID[ITEMID["THORSHAMMER"] = 12] = "THORSHAMMER";
        ITEMID[ITEMID["GETSTRONKO"] = 13] = "GETSTRONKO";
        ITEMID[ITEMID["GETWEAKO"] = 14] = "GETWEAKO";
        ITEMID[ITEMID["ZIPZAP"] = 15] = "ZIPZAP";
        ITEMID[ITEMID["AOETEST"] = 16] = "AOETEST";
    })(ITEMID = Items.ITEMID || (Items.ITEMID = {}));
    Items.txtIceBucket = new ƒ.TextureImage();
    Items.txtDmgUp = new ƒ.TextureImage();
    Items.txtSpeedUp = new ƒ.TextureImage();
    Items.txtProjectilesUp = new ƒ.TextureImage();
    Items.txtHealthUp = new ƒ.TextureImage();
    Items.txtScaleUp = new ƒ.TextureImage();
    Items.txtScaleDown = new ƒ.TextureImage();
    Items.txtHomeComing = new ƒ.TextureImage();
    Items.txtThorsHammer = new ƒ.TextureImage();
    Items.txtToxicRelationship = new ƒ.TextureImage();
    Items.txtGetStronko = new ƒ.TextureImage();
    Items.txtGetWeako = new ƒ.TextureImage();
    class Item extends Game.ƒ.Node {
        tag = Tag.TAG.ITEM;
        id;
        rarity;
        netId;
        description;
        imgSrc;
        collider;
        transform = new ƒ.ComponentTransform();
        position;
        get getPosition() { return this.position; }
        buff = [];
        changedValue;
        constructor(_id, _netId) {
            super(ITEMID[_id]);
            this.id = _id;
            this.netId = Networking.IdManager(_netId);
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad()));
            let material = new ƒ.Material("white", ƒ.ShaderLit, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            this.addComponent(new ƒ.ComponentMaterial(material));
            this.addComponent(new ƒ.ComponentTransform());
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / 2, this.netId);
            this.buff.push(this.getBuffById());
            this.setTextureById();
        }
        clone() {
            return null;
        }
        addRarityBuff() {
            let buff = new Buff.RarityBuff(this.rarity);
            buff.addToItem(this);
        }
        getBuffById() {
            let temp = getBuffItemById(this.id);
            switch (this.id) {
                case ITEMID.TOXICRELATIONSHIP:
                    return Buff.getBuffById(Buff.BUFFID.POISON);
                case ITEMID.VAMPY:
                    return Buff.getBuffById(Buff.BUFFID.BLEEDING);
                case ITEMID.SLOWYSLOW:
                    return Buff.getBuffById(Buff.BUFFID.SLOW);
                case ITEMID.GETSTRONKO:
                    return Buff.getBuffById(Buff.BUFFID.SCALEUP);
                case ITEMID.GETWEAKO:
                    return Buff.getBuffById(Buff.BUFFID.SCALEDOWN);
                default:
                    return null;
            }
        }
        loadTexture(_texture) {
            let newTxt = new ƒ.TextureImage();
            newTxt = _texture;
            let newCoat = new ƒ.CoatRemissiveTextured();
            newCoat.texture = newTxt;
            let newMtr = new ƒ.Material("mtr", ƒ.ShaderLitTextured, newCoat);
            this.getComponent(Game.ƒ.ComponentMaterial).material = newMtr;
        }
        setTextureById() {
            switch (this.id) {
                case ITEMID.ICEBUCKETCHALLENGE:
                    this.loadTexture(Items.txtIceBucket);
                    break;
                case ITEMID.DMGUP:
                    this.loadTexture(Items.txtDmgUp);
                    break;
                case ITEMID.SPEEDUP:
                    this.loadTexture(Items.txtSpeedUp);
                    break;
                case ITEMID.PROJECTILESUP:
                    this.loadTexture(Items.txtProjectilesUp);
                    break;
                case ITEMID.HEALTHUP:
                    this.loadTexture(Items.txtHealthUp);
                    break;
                case ITEMID.SCALEUP:
                    this.loadTexture(Items.txtScaleUp);
                    break;
                case ITEMID.SCALEDOWN:
                    this.loadTexture(Items.txtScaleDown);
                    break;
                case ITEMID.ARMORUP:
                    //TODO: add correct texture and change in JSON
                    break;
                case ITEMID.HOMECOMING:
                    this.loadTexture(Items.txtHomeComing);
                    break;
                case ITEMID.TOXICRELATIONSHIP:
                    this.loadTexture(Items.txtToxicRelationship);
                    break;
                case ITEMID.VAMPY:
                    //TODO: add correct texture and change in JSON
                    break;
                case ITEMID.SLOWYSLOW:
                    //TODO: add correct texture and change in JSON
                    break;
                case ITEMID.THORSHAMMER:
                    this.loadTexture(Items.txtThorsHammer);
                    break;
                case ITEMID.GETSTRONKO:
                    this.loadTexture(Items.txtGetStronko);
                    break;
                case ITEMID.GETWEAKO:
                    this.loadTexture(Items.txtGetWeako);
                    break;
                case ITEMID.ZIPZAP:
                    //TODO: add correct texture and change in JSON
                    break;
            }
        }
        setPosition(_position) {
            this.position = _position;
            this.mtxLocal.translation = _position.toVector3(0.01);
            this.collider.setPosition(_position);
        }
        spawn() {
            Game.graph.addChild(this);
            Networking.spawnItem(this.id, this.position, this.netId);
        }
        despawn() {
            if (Networking.client.id == Networking.client.idHost) {
                Networking.popID(this.netId);
                Networking.removeItem(this.netId);
                Game.graph.removeChild(this);
            }
        }
        addItemToEntity(_avatar) {
            _avatar.items.push(this);
        }
        removeItemFromEntity(_avatar) {
        }
    }
    Items.Item = Item;
    class InternalItem extends Item {
        value;
        choosenOneNetId;
        constructor(_id, _netId) {
            super(_id, _netId);
            const item = getInternalItemById(this.id);
            if (item != undefined) {
                this.name = item.name;
                this.value = item.value;
                this.description = item.description;
                this.imgSrc = item.imgSrc;
                this.rarity = item.rarity;
            }
            this.addRarityBuff();
        }
        setChoosenOneNetId(_netId) {
            this.choosenOneNetId = _netId;
        }
        addItemToEntity(_avatar) {
            super.addItemToEntity(_avatar);
            this.setAttributesById(_avatar, true);
            this.despawn();
        }
        removeItemFromEntity(_avatar) {
            this.setAttributesById(_avatar, false);
            _avatar.items.splice(_avatar.items.indexOf(_avatar.items.find(item => item.id == this.id)), 1);
        }
        clone() {
            return new InternalItem(this.id);
        }
        setAttributesById(_avatar, _addBuff) {
            let host = Networking.client.id == Networking.client.idHost;
            switch (this.id) {
                case ITEMID.ICEBUCKETCHALLENGE:
                    if (host) {
                        if (_addBuff) {
                            this.changedValue = _avatar.attributes.coolDownReduction - Calculation.subPercentageAmountToValue(_avatar.attributes.coolDownReduction, this.value);
                            _avatar.attributes.coolDownReduction = Calculation.subPercentageAmountToValue(_avatar.attributes.coolDownReduction, this.value);
                        }
                        else {
                            _avatar.attributes.coolDownReduction += this.changedValue;
                        }
                        Networking.updateEntityAttributes({ value: _avatar.attributes }, _avatar.netId);
                    }
                    break;
                case ITEMID.DMGUP:
                    if (host) {
                        if (_addBuff) {
                            _avatar.attributes.attackPoints += this.value;
                        }
                        else {
                            _avatar.attributes.attackPoints -= this.value;
                        }
                        Networking.updateEntityAttributes({ value: _avatar.attributes }, _avatar.netId);
                    }
                    break;
                case ITEMID.SPEEDUP:
                    if (host) {
                        if (_addBuff) {
                            this.changedValue = Calculation.addPercentageAmountToValue(_avatar.attributes.speed, this.value) - _avatar.attributes.speed;
                            _avatar.attributes.speed = Calculation.addPercentageAmountToValue(_avatar.attributes.speed, this.value);
                        }
                        else {
                            _avatar.attributes.speed -= this.changedValue;
                        }
                        Networking.updateEntityAttributes({ value: _avatar.attributes }, _avatar.netId);
                    }
                    break;
                case ITEMID.PROJECTILESUP:
                    function rotateBullets() {
                        let magazin = _avatar.weapon.getMagazin;
                        switch (magazin.length) {
                            case 2:
                            case 3:
                                console.log("rotating");
                                magazin[0].mtxLocal.rotateZ(45 / 2);
                                magazin[1].mtxLocal.rotateZ(45 / 2 * -1);
                                _avatar.weapon.magazin = magazin;
                                break;
                            default:
                                break;
                        }
                    }
                    if (host) {
                        if (_addBuff) {
                            _avatar.weapon.projectileAmount += this.value;
                            _avatar.weapon.addFunction(rotateBullets);
                        }
                        else {
                            _avatar.weapon.projectileAmount -= this.value;
                            _avatar.weapon.deleteFunction(rotateBullets);
                        }
                        Networking.updateAvatarWeapon(_avatar.weapon, _avatar.netId);
                    }
                    else {
                        if (_addBuff) {
                            _avatar.weapon.addFunction(rotateBullets);
                        }
                        else {
                            _avatar.weapon.deleteFunction(rotateBullets);
                        }
                    }
                    break;
                case ITEMID.HEALTHUP:
                    if (host) {
                        if (_addBuff) {
                            this.changedValue = Calculation.addPercentageAmountToValue(_avatar.attributes.maxHealthPoints, this.value) - _avatar.attributes.maxHealthPoints;
                            let currentMaxPoints = _avatar.attributes.maxHealthPoints;
                            _avatar.attributes.maxHealthPoints = Calculation.addPercentageAmountToValue(_avatar.attributes.maxHealthPoints, this.value);
                            let amount = _avatar.attributes.maxHealthPoints - currentMaxPoints;
                            _avatar.attributes.healthPoints += amount;
                        }
                        else {
                            let currentMaxPoints = _avatar.attributes.maxHealthPoints;
                            _avatar.attributes.maxHealthPoints -= this.changedValue;
                            let amount = currentMaxPoints - _avatar.attributes.maxHealthPoints;
                            _avatar.attributes.healthPoints -= amount;
                        }
                        Networking.updateEntityAttributes({ value: _avatar.attributes }, _avatar.netId);
                    }
                    break;
                case ITEMID.SCALEUP:
                    if (host) {
                        if (_addBuff) {
                            this.changedValue = Calculation.addPercentageAmountToValue(_avatar.attributes.getScale, this.value) - _avatar.attributes.getScale;
                            _avatar.updateScale(_avatar.attributes.getScale + this.changedValue, _addBuff);
                        }
                        else {
                            _avatar.updateScale(_avatar.attributes.getScale - this.changedValue, _addBuff);
                        }
                        Networking.updateEntityAttributes({ value: _avatar.attributes }, _avatar.netId);
                    }
                    break;
                case ITEMID.SCALEDOWN:
                    if (host) {
                        if (_addBuff) {
                            this.changedValue = _avatar.attributes.getScale - Calculation.subPercentageAmountToValue(_avatar.attributes.getScale, this.value);
                            _avatar.updateScale(_avatar.attributes.getScale - this.changedValue, _addBuff);
                        }
                        else {
                            _avatar.updateScale(_avatar.attributes.getScale + this.changedValue, _addBuff);
                        }
                        Networking.updateEntityAttributes({ value: _avatar.attributes }, _avatar.netId);
                    }
                    break;
                case ITEMID.ARMORUP:
                    if (host) {
                        if (_addBuff) {
                            _avatar.attributes.armor += this.value;
                        }
                        else {
                            _avatar.attributes.armor -= this.value;
                        }
                        Networking.updateEntityAttributes({ value: _avatar.attributes }, _avatar.netId);
                    }
                    break;
                case ITEMID.HOMECOMING:
                    if (host) {
                        if (_avatar instanceof Player.Ranged) {
                            if (_addBuff) {
                                _avatar.weapon.aimType = Weapons.AIM.HOMING;
                            }
                            else {
                                _avatar.weapon.aimType = Weapons.AIM.NORMAL;
                            }
                            Networking.updateAvatarWeapon(_avatar.weapon, _avatar.netId);
                        }
                    }
                    break;
                case ITEMID.THORSHAMMER:
                    if (host) {
                        if (_avatar.weapon instanceof Weapons.ThorsHammer) {
                            return;
                        }
                        _avatar.weapon = new Weapons.ThorsHammer(1, Bullets.BULLETTYPE.THORSHAMMER, 1, _avatar.netId);
                        Networking.updateAvatarWeapon(_avatar.weapon, _avatar.netId);
                    }
                    break;
                case ITEMID.ZIPZAP:
                    if (host) {
                        if (_addBuff) {
                            let newItem = new Bullets.ZipZapObject(_avatar.netId, null);
                            newItem.spawn();
                        }
                        else {
                            let zipzap = Game.graph.getChildren().find(item => item.type == Bullets.BULLETTYPE.ZIPZAP);
                            zipzap.despawn();
                        }
                    }
                    break;
                case ITEMID.AOETEST:
                    if (host) {
                        if (_addBuff) {
                            new Ability.AreaOfEffect(Ability.AOETYPE.HEALTHUP, null).addToEntity(_avatar);
                        }
                        else {
                            _avatar.getChildren().find(child => child.id == Ability.AOETYPE.HEALTHUP).despawn();
                        }
                    }
            }
        }
    }
    Items.InternalItem = InternalItem;
    class BuffItem extends Item {
        value;
        tickRate;
        duration;
        constructor(_id, _netId) {
            super(_id, _netId);
            let temp = getBuffItemById(this.id);
            this.name = temp.name;
            this.value = temp.value;
            this.tickRate = temp.tickRate;
            this.duration = temp.duration;
            this.imgSrc = temp.imgSrc;
            this.description = temp.description;
            this.rarity = temp.rarity;
            this.addRarityBuff();
        }
        addItemToEntity(_avatar) {
            super.addItemToEntity(_avatar);
            this.setBuffById(_avatar);
            this.despawn();
        }
        clone() {
            return new BuffItem(this.id);
        }
        setBuffById(_avatar) {
            let host = Networking.client.id == Networking.client.idHost;
            switch (this.id) {
                case ITEMID.TOXICRELATIONSHIP:
                    if (host) {
                        let buffref = Game.damageBuffJSON.find(buff => buff.id == Buff.BUFFID.POISON);
                        let newBuff = new Buff.DamageBuff(buffref.id, null, buffref.tickRate, 0.5);
                        newBuff.addToEntity(_avatar);
                    }
                    break;
            }
        }
    }
    Items.BuffItem = BuffItem;
    function getInternalItemById(_id) {
        return Game.internalItemJSON.find(item => item.id == _id);
    }
    Items.getInternalItemById = getInternalItemById;
    function getBuffItemById(_id) {
        return Game.buffItemJSON.find(item => item.id == _id);
    }
    Items.getBuffItemById = getBuffItemById;
    class ItemGenerator {
        static itemPool = [];
        static fillPool() {
            Game.internalItemJSON.forEach(item => {
                this.itemPool.push(new Items.InternalItem(item.id));
            });
            Game.buffItemJSON.forEach(item => {
                this.itemPool.push(new BuffItem(item.id));
            });
        }
        static getRandomItem() {
            let possibleItems = [];
            possibleItems = this.getPossibleItems();
            let randomIndex = Math.round(Math.random() * (possibleItems.length - 1));
            let returnItem = possibleItems[randomIndex];
            return returnItem.clone();
        }
        static getRandomItemByRarity(_rarity) {
            let possibleItems = this.itemPool.filter(item => item.rarity == _rarity);
            let randomIndex = Math.round(Math.random() * (possibleItems.length - 1));
            let returnItem = possibleItems[randomIndex];
            return returnItem.clone();
        }
        static getPossibleItems() {
            let chosenRarity = this.getRarity();
            switch (chosenRarity) {
                case RARITY.COMMON:
                    return this.itemPool.filter(item => item.rarity == RARITY.COMMON);
                case RARITY.RARE:
                    return this.itemPool.filter(item => item.rarity == RARITY.RARE);
                case RARITY.EPIC:
                    return this.itemPool.filter(item => item.rarity == RARITY.EPIC);
                case RARITY.LEGENDARY:
                    return this.itemPool.filter(item => item.rarity == RARITY.LEGENDARY);
                default:
                    return this.itemPool.filter(item => item.rarity = RARITY.COMMON);
            }
        }
        static getRarity() {
            let rarityNumber = Math.round(Math.random() * 100);
            if (rarityNumber >= 50) {
                return RARITY.COMMON;
            }
            if (rarityNumber >= 20 && rarityNumber < 50) {
                return RARITY.RARE;
            }
            if (rarityNumber >= 5 && rarityNumber < 20) {
                return RARITY.EPIC;
            }
            if (rarityNumber < 5) {
                return RARITY.LEGENDARY;
            }
            return RARITY.COMMON;
        }
    }
    Items.ItemGenerator = ItemGenerator;
    let RARITY;
    (function (RARITY) {
        RARITY[RARITY["COMMON"] = 0] = "COMMON";
        RARITY[RARITY["RARE"] = 1] = "RARE";
        RARITY[RARITY["EPIC"] = 2] = "EPIC";
        RARITY[RARITY["LEGENDARY"] = 3] = "LEGENDARY";
    })(RARITY = Items.RARITY || (Items.RARITY = {}));
})(Items || (Items = {}));
var AnimationGeneration;
(function (AnimationGeneration) {
    AnimationGeneration.txtRedTickIdle = new ƒ.TextureImage();
    AnimationGeneration.txtRedTickWalk = new ƒ.TextureImage();
    AnimationGeneration.txtSmallTickIdle = new ƒ.TextureImage();
    AnimationGeneration.txtSmallTickWalk = new ƒ.TextureImage();
    AnimationGeneration.txtBatIdle = new ƒ.TextureImage();
    AnimationGeneration.txtSkeletonIdle = new ƒ.TextureImage();
    AnimationGeneration.txtSkeletonWalk = new ƒ.TextureImage();
    AnimationGeneration.txtOgerIdle = new ƒ.TextureImage();
    AnimationGeneration.txtOgerWalk = new ƒ.TextureImage();
    AnimationGeneration.txtOgerAttack = new ƒ.TextureImage();
    AnimationGeneration.txtSummonerIdle = new ƒ.TextureImage();
    AnimationGeneration.txtSummonerSummon = new ƒ.TextureImage();
    AnimationGeneration.txtSummonerTeleport = new ƒ.TextureImage();
    AnimationGeneration.txtRangedIdle = new ƒ.TextureImage();
    AnimationGeneration.txtRangedWalk = new ƒ.TextureImage();
    AnimationGeneration.txtRangedIdleLeft = new ƒ.TextureImage();
    AnimationGeneration.txtRangedWalkLeft = new ƒ.TextureImage();
    AnimationGeneration.ƒAid = FudgeAid;
    class AnimationContainer {
        id;
        animations = {};
        scale = [];
        frameRate = [];
        constructor(_id) {
            this.id = _id;
            this.getAnimationById();
        }
        addAnimation(_ani, _scale, _frameRate) {
            this.animations[_ani.name] = _ani;
            this.scale.push([_ani.name, _scale]);
            this.frameRate.push([_ani.name, _frameRate]);
        }
        getAnimationById() {
            switch (this.id) {
                case Entity.ID.BAT:
                    this.addAnimation(batIdle.generatedSpriteAnimation, batIdle.animationScale, batIdle.frameRate);
                    break;
                case Entity.ID.REDTICK:
                    this.addAnimation(redTickIdle.generatedSpriteAnimation, redTickIdle.animationScale, redTickIdle.frameRate);
                    this.addAnimation(redTickWalk.generatedSpriteAnimation, redTickWalk.animationScale, redTickWalk.frameRate);
                    break;
                case Entity.ID.SMALLTICK:
                    this.addAnimation(smallTickIdle.generatedSpriteAnimation, smallTickIdle.animationScale, smallTickIdle.frameRate);
                    this.addAnimation(smallTickWalk.generatedSpriteAnimation, smallTickWalk.animationScale, smallTickWalk.frameRate);
                    break;
                case Entity.ID.SKELETON:
                    this.addAnimation(skeletonIdle.generatedSpriteAnimation, skeletonIdle.animationScale, skeletonIdle.frameRate);
                    this.addAnimation(skeletonWalk.generatedSpriteAnimation, skeletonWalk.animationScale, skeletonWalk.frameRate);
                    break;
                case Entity.ID.OGER:
                    this.addAnimation(ogerIdle.generatedSpriteAnimation, ogerIdle.animationScale, ogerIdle.frameRate);
                    this.addAnimation(ogerWalk.generatedSpriteAnimation, ogerWalk.animationScale, ogerWalk.frameRate);
                    this.addAnimation(ogerAttack.generatedSpriteAnimation, ogerAttack.animationScale, ogerAttack.frameRate);
                    break;
                case Entity.ID.SUMMONER:
                    this.addAnimation(summonerIdle.generatedSpriteAnimation, summonerIdle.animationScale, summonerIdle.frameRate);
                    this.addAnimation(summonerWalk.generatedSpriteAnimation, summonerWalk.animationScale, summonerWalk.frameRate);
                    this.addAnimation(summonerSummon.generatedSpriteAnimation, summonerSummon.animationScale, summonerSummon.frameRate);
                    this.addAnimation(summonerTeleport.generatedSpriteAnimation, summonerTeleport.animationScale, summonerTeleport.frameRate);
                    break;
                case Entity.ID.RANGED:
                    this.addAnimation(rangedIdle.generatedSpriteAnimation, rangedIdle.animationScale, rangedIdle.frameRate);
                    this.addAnimation(rangedWalk.generatedSpriteAnimation, rangedWalk.animationScale, rangedWalk.frameRate);
                    this.addAnimation(rangedIdleLeft.generatedSpriteAnimation, rangedIdleLeft.animationScale, rangedIdleLeft.frameRate);
                    this.addAnimation(rangedWalkLeft.generatedSpriteAnimation, rangedWalkLeft.animationScale, rangedWalkLeft.frameRate);
                    break;
            }
        }
    }
    AnimationGeneration.AnimationContainer = AnimationContainer;
    class MyAnimationClass {
        id;
        animationName;
        spriteSheet;
        amountOfFrames;
        frameRate;
        generatedSpriteAnimation;
        animationScale;
        constructor(_id, _animationName, _texture, _amountOfFrames, _frameRate) {
            this.id = _id;
            this.animationName = _animationName;
            this.spriteSheet = _texture;
            this.frameRate = _frameRate;
            this.amountOfFrames = _amountOfFrames;
            generateAnimationFromGrid(this);
        }
    }
    //#region spriteSheet
    let rangedIdle;
    let rangedWalk;
    let rangedIdleLeft;
    let rangedWalkLeft;
    let batIdle;
    let redTickIdle;
    let redTickWalk;
    let smallTickIdle;
    let smallTickWalk;
    let skeletonIdle;
    let skeletonWalk;
    let ogerIdle;
    let ogerWalk;
    let ogerAttack;
    let summonerIdle;
    let summonerWalk;
    let summonerSummon;
    let summonerTeleport;
    //#endregion
    //#region AnimationContainer
    let rangedAnimation;
    let batAnimation;
    let redTickAnimation;
    let smallTickAnimation;
    let skeletonAnimation;
    let ogerAnimation;
    let summonerAnimation;
    //#endregion
    function generateAnimationObjects() {
        rangedIdle = new MyAnimationClass(Entity.ID.RANGED, "idle", AnimationGeneration.txtRangedIdle, 5, 12);
        rangedWalk = new MyAnimationClass(Entity.ID.RANGED, "walk", AnimationGeneration.txtRangedWalk, 8, 12);
        rangedIdleLeft = new MyAnimationClass(Entity.ID.RANGED, "idleleft", AnimationGeneration.txtRangedIdleLeft, 5, 12);
        rangedWalkLeft = new MyAnimationClass(Entity.ID.RANGED, "walkleft", AnimationGeneration.txtRangedWalkLeft, 8, 12);
        batIdle = new MyAnimationClass(Entity.ID.BAT, "idle", AnimationGeneration.txtBatIdle, 4, 12);
        redTickIdle = new MyAnimationClass(Entity.ID.REDTICK, "idle", AnimationGeneration.txtRedTickIdle, 6, 12);
        redTickWalk = new MyAnimationClass(Entity.ID.REDTICK, "walk", AnimationGeneration.txtRedTickWalk, 4, 16);
        smallTickIdle = new MyAnimationClass(Entity.ID.SMALLTICK, "idle", AnimationGeneration.txtSmallTickIdle, 6, 12);
        smallTickWalk = new MyAnimationClass(Entity.ID.SMALLTICK, "walk", AnimationGeneration.txtSmallTickWalk, 4, 12);
        skeletonIdle = new MyAnimationClass(Entity.ID.SKELETON, "idle", AnimationGeneration.txtSkeletonIdle, 5, 12);
        skeletonWalk = new MyAnimationClass(Entity.ID.SKELETON, "walk", AnimationGeneration.txtSkeletonWalk, 7, 12);
        ogerIdle = new MyAnimationClass(Entity.ID.OGER, "idle", AnimationGeneration.txtOgerIdle, 5, 6);
        ogerWalk = new MyAnimationClass(Entity.ID.OGER, "walk", AnimationGeneration.txtOgerWalk, 6, 6);
        ogerAttack = new MyAnimationClass(Entity.ID.OGER, "attack", AnimationGeneration.txtOgerAttack, 10, 12);
        summonerIdle = new MyAnimationClass(Entity.ID.SUMMONER, "idle", AnimationGeneration.txtSummonerIdle, 6, 12);
        summonerWalk = new MyAnimationClass(Entity.ID.SUMMONER, "walk", AnimationGeneration.txtSummonerIdle, 6, 12);
        summonerSummon = new MyAnimationClass(Entity.ID.SUMMONER, "summon", AnimationGeneration.txtSummonerSummon, 13, 12);
        summonerTeleport = new MyAnimationClass(Entity.ID.SUMMONER, "teleport", AnimationGeneration.txtSummonerTeleport, 6, 12);
        rangedAnimation = new AnimationContainer(Entity.ID.RANGED);
        batAnimation = new AnimationContainer(Entity.ID.BAT);
        redTickAnimation = new AnimationContainer(Entity.ID.REDTICK);
        smallTickAnimation = new AnimationContainer(Entity.ID.SMALLTICK);
        skeletonAnimation = new AnimationContainer(Entity.ID.SKELETON);
        ogerAnimation = new AnimationContainer(Entity.ID.OGER);
        summonerAnimation = new AnimationContainer(Entity.ID.SUMMONER);
    }
    AnimationGeneration.generateAnimationObjects = generateAnimationObjects;
    function getAnimationById(_id) {
        switch (_id) {
            case Entity.ID.BAT:
                return batAnimation;
            case Entity.ID.REDTICK:
                return redTickAnimation;
            case Entity.ID.SMALLTICK:
                return smallTickAnimation;
            case Entity.ID.SKELETON:
                return skeletonAnimation;
            case Entity.ID.OGER:
                return ogerAnimation;
            case Entity.ID.SUMMONER:
                return summonerAnimation;
            case Entity.ID.RANGED:
                return rangedAnimation;
            default:
                return null;
        }
    }
    AnimationGeneration.getAnimationById = getAnimationById;
    function getPixelRatio(_width, _height) {
        let max = Math.max(_width, _height);
        let min = Math.min(_width, _height);
        let scale = 1 / max * min;
        return scale;
    }
    function generateAnimationFromGrid(_class) {
        let clrWhite = ƒ.Color.CSS("white");
        let coatedSpriteSheet = new ƒ.CoatTextured(clrWhite, _class.spriteSheet);
        let width = _class.spriteSheet.texImageSource.width / _class.amountOfFrames;
        let height = _class.spriteSheet.texImageSource.height;
        let createdAnimation = new AnimationGeneration.ƒAid.SpriteSheetAnimation(_class.animationName, coatedSpriteSheet);
        createdAnimation.generateByGrid(ƒ.Rectangle.GET(0, 0, width, height), _class.amountOfFrames, 32, ƒ.ORIGIN2D.CENTER, ƒ.Vector2.X(width));
        _class.animationScale = getPixelRatio(width, height);
        _class.generatedSpriteAnimation = createdAnimation;
    }
    AnimationGeneration.generateAnimationFromGrid = generateAnimationFromGrid;
})(AnimationGeneration || (AnimationGeneration = {}));
var Networking;
(function (Networking) {
    class Prediction {
        timer = 0;
        currentTick = 0;
        minTimeBetweenTicks;
        gameTickRate = 62.5;
        bufferSize = 1024;
        ownerNetId;
        get owner() { return Game.currentNetObj.find(elem => elem.netId == this.ownerNetId).netObjectNode; }
        ;
        stateBuffer;
        constructor(_ownerNetId) {
            this.minTimeBetweenTicks = 1 / this.gameTickRate;
            this.stateBuffer = new Array(this.bufferSize);
            this.ownerNetId = _ownerNetId;
        }
        handleTick() {
        }
        processMovement(_input) {
            return null;
        }
    } //#region  bullet Prediction
    Networking.Prediction = Prediction;
    class BulletPrediction extends Prediction {
        processMovement(input) {
            let cloneInputVector = input.inputVector.clone;
            let bullet = this.owner;
            bullet.move(cloneInputVector);
            let newStatePayload = { tick: input.tick, position: bullet.mtxLocal.translation, rotation: bullet.mtxLocal.rotation };
            return newStatePayload;
        }
    }
    class ServerBulletPrediction extends BulletPrediction {
        inputQueue = new Queue();
        updateEntityToCheck(_netId) {
            this.ownerNetId = _netId;
        }
        update() {
            this.timer += Game.deltaTime;
            while (this.timer >= this.minTimeBetweenTicks) {
                this.timer -= this.minTimeBetweenTicks;
                this.handleTick();
                this.currentTick++;
            }
        }
        handleTick() {
            let bufferIndex = -1;
            while (this.inputQueue.getQueueLength() > 0) {
                let inputPayload = this.inputQueue.dequeue();
                bufferIndex = inputPayload.tick % this.bufferSize;
                let statePayload = this.processMovement(inputPayload);
                this.stateBuffer[bufferIndex] = statePayload;
            }
            if (bufferIndex != -1) {
                //Send to client new position
                Networking.sendServerBuffer(this.ownerNetId, this.stateBuffer[bufferIndex]);
            }
        }
        onClientInput(inputPayload) {
            this.inputQueue.enqueue(inputPayload);
        }
    }
    Networking.ServerBulletPrediction = ServerBulletPrediction;
    class ClientBulletPrediction extends BulletPrediction {
        inputBuffer;
        latestServerState;
        lastProcessedState;
        flyDirection;
        AsyncTolerance = 0.3;
        constructor(_ownerNetId) {
            super(_ownerNetId);
            this.inputBuffer = new Array(this.bufferSize);
        }
        update() {
            try {
                this.flyDirection = this.owner.flyDirection;
            }
            catch (error) {
                console.log("cant find owner");
            }
            this.timer += Game.deltaTime;
            while (this.timer >= this.minTimeBetweenTicks) {
                this.timer -= this.minTimeBetweenTicks;
                this.handleTick();
                this.currentTick++;
            }
        }
        handleTick() {
            if (this.latestServerState != this.lastProcessedState) {
                this.handleServerReconciliation();
            }
            let bufferIndex = this.currentTick % this.bufferSize;
            let inputPayload = { tick: this.currentTick, inputVector: this.flyDirection, rotation: this.owner.mtxLocal.rotation };
            this.inputBuffer[bufferIndex] = inputPayload;
            this.stateBuffer[bufferIndex] = this.processMovement(inputPayload);
            //send inputPayload to host
            Networking.sendBulletInput(this.ownerNetId, inputPayload);
        }
        onServerMovementState(_serverState) {
            this.latestServerState = _serverState;
        }
        handleServerReconciliation() {
            this.lastProcessedState = this.latestServerState;
            let serverStateBufferIndex = this.latestServerState.tick % this.bufferSize;
            let positionError = Game.ƒ.Vector3.DIFFERENCE(this.latestServerState.position, this.stateBuffer[serverStateBufferIndex].position).magnitude;
            if (positionError > this.AsyncTolerance) {
                console.warn(this.owner.name + " need to be updated to: X:" + this.latestServerState.position.x + " Y: " + this.latestServerState.position.y);
                this.owner.mtxLocal.translation = this.latestServerState.position;
                this.owner.mtxLocal.rotation = this.latestServerState.rotation;
                this.stateBuffer[serverStateBufferIndex] = this.latestServerState;
                let tickToProcess = (this.latestServerState.tick + 1);
                while (tickToProcess < this.currentTick) {
                    let statePayload = this.processMovement(this.inputBuffer[tickToProcess % this.bufferSize]);
                    let bufferIndex = tickToProcess % this.bufferSize;
                    this.stateBuffer[bufferIndex] = statePayload;
                    tickToProcess++;
                }
            }
        }
    }
    Networking.ClientBulletPrediction = ClientBulletPrediction;
    //#endregion
    //#region  avatar Precdiction
    class AvatarPrediction extends Prediction {
        processMovement(input) {
            let cloneInputVector = input.inputVector.clone;
            if (cloneInputVector.magnitude > 0) {
                cloneInputVector.normalize();
            }
            if (Networking.client.id == Networking.client.idHost && input.doesAbility) {
                this.owner.doAbility();
            }
            this.owner.move(cloneInputVector);
            let newStatePayload = { tick: input.tick, position: this.owner.mtxLocal.translation, rotation: this.owner.mtxLocal.rotation };
            return newStatePayload;
        }
    }
    class ClientPrediction extends AvatarPrediction {
        inputBuffer;
        latestServerState;
        lastProcessedState;
        horizontalInput;
        verticalInput;
        doesAbility;
        AsyncTolerance = 0.1;
        constructor(_ownerNetId) {
            super(_ownerNetId);
            this.inputBuffer = new Array(this.bufferSize);
        }
        update() {
            this.horizontalInput = InputSystem.move().x;
            this.verticalInput = InputSystem.move().y;
            this.timer += Game.deltaTime;
            while (this.timer >= this.minTimeBetweenTicks) {
                this.timer -= this.minTimeBetweenTicks;
                this.handleTick();
                this.currentTick++;
            }
        }
        handleTick() {
            if (this.latestServerState != this.lastProcessedState) {
                this.handleServerReconciliation();
            }
            let bufferIndex = this.currentTick % this.bufferSize;
            this.switchAvatarAbilityState();
            let inputPayload = { tick: this.currentTick, inputVector: new ƒ.Vector3(this.horizontalInput, this.verticalInput, 0), doesAbility: this.doesAbility };
            this.inputBuffer[bufferIndex] = inputPayload;
            this.stateBuffer[bufferIndex] = this.processMovement(inputPayload);
            //send inputPayload to host
            Networking.sendClientInput(this.ownerNetId, inputPayload);
        }
        switchAvatarAbilityState() {
            if (this.owner.id == Entity.ID.RANGED) {
                this.doesAbility = this.owner.dash.doesAbility;
            }
            else {
                this.doesAbility = this.owner.block.doesAbility;
            }
        }
        onServerMovementState(_serverState) {
            this.latestServerState = _serverState;
        }
        handleServerReconciliation() {
            this.lastProcessedState = this.latestServerState;
            let serverStateBufferIndex = this.latestServerState.tick % this.bufferSize;
            let positionError = Game.ƒ.Vector3.DIFFERENCE(this.latestServerState.position, this.stateBuffer[serverStateBufferIndex].position).magnitude;
            if (positionError > this.AsyncTolerance) {
                console.warn("you need to be updated to: X:" + this.latestServerState.position.x + " Y: " + this.latestServerState.position.y);
                this.owner.mtxLocal.translation = this.latestServerState.position;
                this.owner.mtxLocal.rotation = this.latestServerState.rotation;
                this.stateBuffer[serverStateBufferIndex] = this.latestServerState;
                let tickToProcess = (this.latestServerState.tick + 1);
                while (tickToProcess < this.currentTick) {
                    let statePayload = this.processMovement(this.inputBuffer[tickToProcess % this.bufferSize]);
                    let bufferIndex = tickToProcess % this.bufferSize;
                    this.stateBuffer[bufferIndex] = statePayload;
                    tickToProcess++;
                }
            }
        }
    }
    Networking.ClientPrediction = ClientPrediction;
    class ServerPrediction extends AvatarPrediction {
        inputQueue = new Queue();
        updateEntityToCheck(_netId) {
            this.ownerNetId = _netId;
        }
        update() {
            this.timer += Game.deltaTime;
            while (this.timer >= this.minTimeBetweenTicks) {
                this.timer -= this.minTimeBetweenTicks;
                this.handleTick();
                this.currentTick++;
            }
        }
        handleTick() {
            let bufferIndex = -1;
            while (this.inputQueue.getQueueLength() > 0) {
                let inputPayload = this.inputQueue.dequeue();
                bufferIndex = inputPayload.tick % this.bufferSize;
                let statePayload = this.processMovement(inputPayload);
                this.stateBuffer[bufferIndex] = statePayload;
            }
            if (bufferIndex != -1) {
                //Send to client new position
                Networking.sendServerBuffer(this.ownerNetId, this.stateBuffer[bufferIndex]);
            }
        }
        onClientInput(inputPayload) {
            this.inputQueue.enqueue(inputPayload);
        }
    }
    Networking.ServerPrediction = ServerPrediction;
    //#endregion
    class Queue {
        items;
        constructor() {
            this.items = [];
        }
        enqueue(_item) {
            this.items.push(_item);
        }
        dequeue() {
            return this.items.shift();
        }
        getQueueLength() {
            return this.items.length;
        }
        getItems() {
            return this.items;
        }
    }
})(Networking || (Networking = {}));
var Ability;
(function (Ability) {
    let AOETYPE;
    (function (AOETYPE) {
        AOETYPE[AOETYPE["HEALTHUP"] = 0] = "HEALTHUP";
    })(AOETYPE = Ability.AOETYPE || (Ability.AOETYPE = {}));
    class AreaOfEffect extends Game.ƒ.Node {
        netId;
        id;
        position;
        get getPosition() { return this.position; }
        ;
        set setPosition(_pos) { this.position = _pos; }
        ;
        collider;
        get getCollider() { return this.collider; }
        ;
        duration;
        areaMat;
        ownerNetId;
        buffList;
        get getBuffList() { return this.buffList; }
        ;
        damageValue;
        constructor(_id, _netId) {
            super(AOETYPE[_id].toLowerCase());
            Networking.IdManager(_netId);
            this.duration = new Ability.Cooldown(120);
            this.duration.onEndCooldown = this.despawn;
            this.addComponent(new Game.ƒ.ComponentMesh(new Game.ƒ.MeshQuad));
            this.damageValue = 1;
            this.areaMat = new ƒ.Material("aoeShader", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), UI.commonParticle));
            let cmpMat = new Game.ƒ.ComponentMaterial(this.areaMat);
            this.addComponent(cmpMat);
            this.addComponent(new Game.ƒ.ComponentTransform());
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), 2, this.netId);
            this.mtxLocal.scaling = new Game.ƒ.Vector3(this.collider.getRadius * 2, this.collider.getRadius * 2, 1);
        }
        eventUpdate = (_event) => {
            this.update();
        };
        update() {
            this.collider.position = this.getParent().mtxWorld.translation.toVector2();
            this.collisionDetection();
        }
        despawn = () => {
            console.log("despawn");
            //TODO: find right parent to cancel;
            Game.graph.removeChild(this);
            Networking.popID(this.netId);
        };
        spawn(_entity) {
            _entity.addChild(this);
            this.mtxLocal.translateZ(0.01);
            if (this.duration == undefined) {
                return;
            }
            else {
                this.duration.startCooldown();
            }
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.eventUpdate);
        }
        addToEntity(_entity) {
            this.spawn(_entity);
            this.ownerNetId = _entity.netId;
        }
        collisionDetection() {
            let colliders = [];
            colliders = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.ENEMY || element.tag == Tag.TAG.PLAYER);
            colliders.forEach(_coll => {
                let entity = _coll;
                if (this.collider.collides(entity.collider) && entity.attributes != undefined) {
                    //TODO: overwrite in other children to do own thing
                    this.applyAreaOfEffect(entity);
                }
            });
        }
        applyAreaOfEffect(_entity) {
            //TODO: overwrite in other classes
            if (this.ownerNetId != _entity.netId) {
                console.log("colliding with: " + _entity.name);
                Buff.getBuffById(Buff.BUFFID.POISON).addToEntity(_entity);
            }
        }
    }
    Ability.AreaOfEffect = AreaOfEffect;
})(Ability || (Ability = {}));
var Entity;
(function (Entity) {
    let ATTRIBUTETYPE;
    (function (ATTRIBUTETYPE) {
        ATTRIBUTETYPE[ATTRIBUTETYPE["HEALTHPOINTS"] = 0] = "HEALTHPOINTS";
        ATTRIBUTETYPE[ATTRIBUTETYPE["MAXHEALTHPOINTS"] = 1] = "MAXHEALTHPOINTS";
        ATTRIBUTETYPE[ATTRIBUTETYPE["KNOCKBACKFORCE"] = 2] = "KNOCKBACKFORCE";
        ATTRIBUTETYPE[ATTRIBUTETYPE["HITABLE"] = 3] = "HITABLE";
        ATTRIBUTETYPE[ATTRIBUTETYPE["ARMOR"] = 4] = "ARMOR";
        ATTRIBUTETYPE[ATTRIBUTETYPE["SPEED"] = 5] = "SPEED";
        ATTRIBUTETYPE[ATTRIBUTETYPE["ATTACKPOINTS"] = 6] = "ATTACKPOINTS";
        ATTRIBUTETYPE[ATTRIBUTETYPE["COOLDOWNREDUCTION"] = 7] = "COOLDOWNREDUCTION";
        ATTRIBUTETYPE[ATTRIBUTETYPE["SCALE"] = 8] = "SCALE";
    })(ATTRIBUTETYPE = Entity.ATTRIBUTETYPE || (Entity.ATTRIBUTETYPE = {}));
    class Attributes {
        healthPoints;
        maxHealthPoints;
        knockbackForce;
        hitable = true;
        armor;
        speed;
        attackPoints;
        coolDownReduction = 1;
        scale;
        get getScale() { return this.scale; }
        ;
        accuracy = 80;
        baseMaxHealthPoints;
        baseHealthPoints;
        baseAttackPoints;
        baseSpeed;
        baseKnockbackForce;
        constructor(_healthPoints, _attackPoints, _speed, _scale, _knockbackForce, _armor, _cooldownReduction, _accuracy) {
            this.scale = _scale;
            this.armor = Calculation.clampNumber(this.newGameFactor(_armor), 0, 99);
            this.healthPoints = this.newGameFactor(_healthPoints);
            this.maxHealthPoints = this.healthPoints;
            this.attackPoints = this.newGameFactor(_attackPoints);
            this.speed = _speed;
            this.knockbackForce = _knockbackForce;
            this.coolDownReduction = _cooldownReduction;
            this.accuracy = _accuracy;
            this.baseHealthPoints = this.healthPoints;
            this.baseMaxHealthPoints = this.healthPoints;
            this.baseAttackPoints = this.attackPoints;
            this.baseSpeed = this.speed;
            this.baseKnockbackForce = this.knockbackForce;
        }
        updateScaleDependencies(_newScale) {
            let difference = _newScale - this.scale;
            if (difference == 0) {
                return;
            }
            this.maxHealthPoints += Math.round((this.baseMaxHealthPoints * difference) * 100) / 100;
            this.healthPoints += Math.round((this.baseHealthPoints * difference) * 100) / 100;
            this.attackPoints += Math.round((this.baseAttackPoints * difference) * 100) / 100;
            this.speed -= Math.round((this.baseSpeed * difference) * 100) / 100;
            this.knockbackForce += Math.fround((this.baseKnockbackForce * difference) * 100) / 100;
            this.scale = _newScale;
        }
        newGameFactor(_value) {
            let amount = 1.5;
            for (let i = 0; i < Game.newGamePlus; i++) {
                _value *= amount;
            }
            return _value;
        }
    }
    Entity.Attributes = Attributes;
})(Entity || (Entity = {}));
var Enemy;
(function (Enemy) {
    let BIGBOOMBEHAVIOUR;
    (function (BIGBOOMBEHAVIOUR) {
        BIGBOOMBEHAVIOUR[BIGBOOMBEHAVIOUR["IDLE"] = 0] = "IDLE";
        BIGBOOMBEHAVIOUR[BIGBOOMBEHAVIOUR["WALK"] = 1] = "WALK";
        BIGBOOMBEHAVIOUR[BIGBOOMBEHAVIOUR["SMASH"] = 2] = "SMASH";
        BIGBOOMBEHAVIOUR[BIGBOOMBEHAVIOUR["STOMP"] = 3] = "STOMP";
    })(BIGBOOMBEHAVIOUR = Enemy.BIGBOOMBEHAVIOUR || (Enemy.BIGBOOMBEHAVIOUR = {}));
    class BigBoom extends Enemy.Enemy {
        damageTaken = 0;
        normalPhaseCd = new Ability.Cooldown(20 * 60);
        furiousPhaseCd = new Ability.Cooldown(10 * 60);
        exhaustedPhaseCd = new Ability.Cooldown(5 * 60);
        smashCd = new Ability.Cooldown(5 * 60);
        smashRadius = 2;
        weapon = new Weapons.RangedWeapon(12, 1, Bullets.BULLETTYPE.STONE, 1, this.netId, Weapons.AIM.NORMAL);
        stomp = new Ability.Stomp(this.netId, 100, 12 * 60, 600);
        dash = new Ability.Dash(this.netId, 30, 1, 8 * 60, 4);
        flocking = new Enemy.FlockingBehaviour(this, 4, 4, 1, 1, 1, 1, 0, 10);
        constructor(_id, _position, _netId) {
            super(_id, _position, _netId);
            this.tag = Tag.TAG.ENEMY;
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.scaling.x / 2, this.netId);
            this.furiousPhaseCd.onEndCooldown = this.stopFuriousPhase;
            this.exhaustedPhaseCd.onEndCooldown = this.stopExaustedPhase;
            this.normalPhaseCd.onEndCooldown = this.startFuriousPhase;
            this.dash.onEndAbility = this.throwStone;
            this.stateMachineInstructions = new Game.ƒAid.StateMachineInstructions();
            this.stateMachineInstructions.transitDefault = () => { };
            this.stateMachineInstructions.actDefault = this.intro;
            this.stateMachineInstructions.setAction(Enemy.ENEMYBEHAVIOUR.IDLE, this.idlePhase);
            this.stateMachineInstructions.setAction(Enemy.ENEMYBEHAVIOUR.WALK, this.walking);
            this.stateMachineInstructions.setAction(Enemy.ENEMYBEHAVIOUR.SMASH, this.doSmash);
            this.stateMachineInstructions.setAction(Enemy.ENEMYBEHAVIOUR.STOMP, this.doStomp);
            this.instructions = this.stateMachineInstructions;
            this.target = Game.avatar1.mtxLocal.translation.toVector2();
            this.spriteScaleFactor = 2;
            this.shadowOffsetY = 0.5;
            this.updateScale(this.attributes.getScale, false);
        }
        die() {
            Networking.popID(this.netId);
            Game.graph.removeChild(this);
            if (Game.currentRoom.roomType == Generation.ROOMTYPE.BOSS) {
                Game.currentRoom.done();
            }
        }
        intro = () => {
            //TODO: Intro animation here and when it is done then fight...
            if (this.damageTaken >= 1) {
                this.normalPhaseCd.startCooldown();
                this.transit(Enemy.ENEMYBEHAVIOUR.WALK);
            }
        };
        walking = () => {
            if (this.damageTaken >= this.attributes.maxHealthPoints * 0.34) {
                this.startFuriousPhase();
            }
            this.target = Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;
            if (distance < 2) {
                let random = Math.round(Math.random() * 100);
                if (random > 95) {
                    this.doSmash();
                }
            }
            this.nextAttack();
            if (!this.dash.doesAbility) {
                this.flocking.update();
                this.moveDirection = this.flocking.getMoveVector().toVector3();
            }
        };
        nextAttack() {
            let random = Math.round(Math.random() * 100);
            switch (true) {
                case random > 80:
                    //Stomp
                    if (!this.stomp.hasCooldown() && !this.stomp.doesAbility) {
                        this.transit(Enemy.ENEMYBEHAVIOUR.STOMP);
                    }
                    break;
                case random <= 80:
                    //Big stone throw
                    if (!this.dash.hasCooldown() && !this.dash.doesAbility) {
                        console.log("Do Dash!");
                        this.target = Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2();
                        this.moveDirection = this.moveAway(this.target).toVector3();
                        this.dash.doAbility();
                    }
                    break;
            }
        }
        throwStone = () => {
            this.weapon.shoot(ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation), true);
        };
        doStomp = () => {
            if (!this.stomp.hasCooldown()) {
                //TODO: switch animation
                // if (this.getCurrentFrame >= ...) {
                this.stomp.doAbility();
                // }
            }
            // if (this.getCurrentFrame >= ...) { 
            this.transit(Enemy.ENEMYBEHAVIOUR.WALK);
            // }
        };
        doSmash = () => {
            if (!this.smashCd.hasCooldown) {
                //TODO: switch animation
                this.smashCd.startCooldown();
                // if (this.getCurrentFrame >= ...) {
                let newPos = this.mtxLocal.translation.clone.toVector2();
                let direction = Game.ƒ.Vector2.DIFFERENCE(this.target, this.mtxLocal.translation.toVector2());
                if (direction.magnitude > 0) {
                    direction.normalize();
                    direction.scale(0.5);
                }
                newPos.add(direction);
                let swordCollider = new Collider.Collider(newPos, this.smashRadius / 2, this.netId);
                if (swordCollider.collides(Game.avatar1.collider)) {
                    Game.avatar1.getDamage(this.attributes.attackPoints);
                }
                if (swordCollider.collides(Game.avatar2.collider)) {
                    Game.avatar2.getDamage(this.attributes.attackPoints);
                }
                // }
            }
            // if (this.getCurrentFrame >= ...) { 
            this.transit(Enemy.ENEMYBEHAVIOUR.WALK);
            // }
        };
        idlePhase = () => {
            this.moveDirection = Game.ƒ.Vector3.ZERO();
        };
        startFuriousPhase = () => {
            this.normalPhaseCd.resetCooldown();
            new Buff.AttributesBuff(Buff.BUFFID.FURIOUS, null, 1, 0).addToEntity(this);
            //Cooldowns
            this.stomp.getCooldown.setMaxCoolDown = this.stomp.getCooldown.getMaxCoolDown / 2;
            this.dash.getCooldown.setMaxCoolDown = this.dash.getCooldown.getMaxCoolDown / 2;
            this.smashCd.setMaxCoolDown = this.smashCd.getMaxCoolDown / 2;
            this.furiousPhaseCd.startCooldown();
            this.damageTaken = 0;
        };
        stopFuriousPhase = () => {
            if (this.buffs.find(buff => buff.id == Buff.BUFFID.FURIOUS) != undefined) {
                this.buffs.find(buff => buff.id == Buff.BUFFID.FURIOUS).removeBuff(this);
            }
            this.startExaustedPhase();
        };
        startExaustedPhase = () => {
            new Buff.AttributesBuff(Buff.BUFFID.EXHAUSTED, null, 1, 0).addToEntity(this);
            this.transit(Enemy.ENEMYBEHAVIOUR.IDLE);
            this.exhaustedPhaseCd.startCooldown();
        };
        stopExaustedPhase = () => {
            if (this.buffs.find(buff => buff.id == Buff.BUFFID.EXHAUSTED) != undefined) {
                this.buffs.find(buff => buff.id == Buff.BUFFID.EXHAUSTED).removeBuff(this);
            }
            //Cooldowns
            this.stomp.getCooldown.setMaxCoolDown = this.stomp.getCooldown.getMaxCoolDown * 2;
            this.dash.getCooldown.setMaxCoolDown = this.dash.getCooldown.getMaxCoolDown * 2;
            this.smashCd.setMaxCoolDown = this.smashCd.getMaxCoolDown * 2;
            this.normalPhaseCd.startCooldown();
            this.transit(Enemy.ENEMYBEHAVIOUR.WALK);
        };
        getDamage(_value) {
            let hpBefore = this.attributes.healthPoints;
            super.getDamage(_value);
            if (this.attributes.hitable) {
                this.damageTaken += hpBefore - this.attributes.healthPoints;
            }
        }
    }
    Enemy.BigBoom = BigBoom;
    class Summonor extends Enemy.Enemy {
        damageTaken = 0;
        attackPhaseCd = new Ability.Cooldown(580);
        defencePhaseCd = new Ability.Cooldown(720);
        shootingCount = 3;
        currentShootingCount = 0;
        teleportPosition = new ƒ.Vector3();
        afterTeleportState;
        dashDirection = 100;
        weapon = new Weapons.RangedWeapon(12, 1, Bullets.BULLETTYPE.SUMMONER, 1, this.netId, Weapons.AIM.HOMING);
        summon = new Ability.SpawnSummoners(this.netId, 0, 1, 45);
        dash = new Ability.Dash(this.netId, 60, 1, 6 * 60, 4);
        shoot360 = new Ability.circleShoot(this.netId, 0, 1, 60);
        shoot360Cooldown = new Ability.Cooldown(580);
        flocking = new Enemy.FlockingBehaviour(this, 4, 4, 1, 1, 1, 1, 1, 10);
        constructor(_id, _position, _netId) {
            super(_id, _position, _netId);
            this.tag = Tag.TAG.ENEMY;
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.scaling.x / 2, this.netId);
            this.defencePhaseCd.onEndCooldown = this.stopDefencePhase;
            this.stateMachineInstructions = new Game.ƒAid.StateMachineInstructions();
            this.stateMachineInstructions.transitDefault = () => { };
            this.stateMachineInstructions.actDefault = this.intro;
            this.stateMachineInstructions.setAction(Enemy.ENEMYBEHAVIOUR.ATTACK, this.attackingPhase);
            this.stateMachineInstructions.setAction(Enemy.ENEMYBEHAVIOUR.SUMMON, this.defencePhase);
            this.stateMachineInstructions.setAction(Enemy.ENEMYBEHAVIOUR.TELEPORT, this.doTeleport);
            this.stateMachineInstructions.setAction(Enemy.ENEMYBEHAVIOUR.SHOOT360, this.shooting360);
            this.instructions = this.stateMachineInstructions;
            this.dash.onDoAbility = this.shootOnDash;
            this.dash.onEndAbility = this.changeDashDirection;
            this.spriteScaleFactor = 2;
            this.shadowOffsetY = 0.2;
            this.shadowOffsetX = -0.1;
            this.updateScale(this.attributes.getScale, false);
            this.shadow.mtxLocal.scale(new ƒ.Vector3(1.5, 1.75, 1));
        }
        intro = () => {
            //TODO: Intro animation here and when it is done then fight...
            if (this.damageTaken >= 1) {
                this.transit(Enemy.ENEMYBEHAVIOUR.ATTACK);
            }
        };
        getDamage(_value) {
            let hpBefore = this.attributes.healthPoints;
            super.getDamage(_value);
            if (this.attributes.hitable) {
                if (this.attributes.hitable) {
                    this.damageTaken += hpBefore - this.attributes.healthPoints;
                }
            }
        }
        die() {
            Networking.popID(this.netId);
            Game.graph.removeChild(this);
            if (Game.currentRoom.roomType == Generation.ROOMTYPE.BOSS) {
                Game.currentRoom.done();
            }
        }
        attackingPhase = () => {
            this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
            if (this.damageTaken >= (this.attributes.maxHealthPoints * 0.34)) {
                this.moveDirection = Game.ƒ.Vector3.ZERO();
                let tempPortPos = new Game.ƒ.Vector2(Game.currentRoom.mtxWorld.translation.x, Game.currentRoom.mtxWorld.translation.y - Game.currentRoom.roomSize / 3);
                this.teleport(Enemy.ENEMYBEHAVIOUR.SUMMON, tempPortPos);
                return;
            }
            if (!this.attackPhaseCd.hasCooldown) {
                this.attackPhaseCd.setMaxCoolDown = Math.round(this.attackPhaseCd.getMaxCoolDown + Math.random() * 5 + Math.random() * -5);
                this.attackPhaseCd.startCooldown();
            }
            if (this.attackPhaseCd.hasCooldown) {
                let distance = ƒ.Vector3.DIFFERENCE(Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2().toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;
                this.target = Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2();
                if (distance < 5) {
                    this.isAggressive = true;
                    this.flocking.notToTargetWeight = 2;
                    this.flocking.toTargetWeight = 1;
                }
                else if (distance > 8) {
                    this.flocking.notToTargetWeight = 1;
                    this.flocking.toTargetWeight = 2;
                }
                if (!this.dash.doesAbility) {
                    this.nextAttack();
                    this.flocking.update();
                    this.moveDirection = this.flocking.getMoveVector().toVector3();
                }
            }
        };
        nextAttack() {
            let random = Math.round(Math.random() * 100);
            switch (true) {
                case random > 99:
                    if (!this.shoot360Cooldown.hasCooldown) {
                        this.currentShootingCount = this.shootingCount;
                        this.teleport(Enemy.ENEMYBEHAVIOUR.SHOOT360, new Game.ƒ.Vector2(Game.currentRoom.mtxWorld.translation.x + 3, Game.currentRoom.mtxWorld.translation.y + 3));
                    }
                    break;
                case random > 50 && random < 70:
                    this.doDash();
                    break;
            }
        }
        doDash() {
            if (this.dash.hasCooldown()) {
                return;
            }
            if (!this.dash.hasCooldown()) {
                if (Math.round(Math.random() * 100) >= 10) {
                    this.dash.doAbility();
                }
            }
        }
        changeDashDirection = () => {
            this.dashDirection *= -1;
        };
        shootOnDash = () => {
            let distance = ƒ.Vector3.DIFFERENCE(Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2().toVector3(), this.cmpTransform.mtxLocal.translation);
            this.moveDirection = Calculation.getRotatedVectorByAngle2D(distance, this.dashDirection);
            this.weapon.shoot(Game.ƒ.Vector2.DIFFERENCE(this.target, this.mtxLocal.translation.toVector2()).toVector3(), true);
            this.weapon.getCoolDown.setMaxCoolDown = Calculation.clampNumber(Math.random() * 24, 10, 24);
        };
        defencePhase = () => {
            if (!this.defencePhaseCd.hasCooldown) {
                this.defencePhaseCd.setMaxCoolDown = Math.round(this.defencePhaseCd.getMaxCoolDown + Math.random() * 5 + Math.random() * -5);
                this.defencePhaseCd.startCooldown();
                new Buff.AttributesBuff(Buff.BUFFID.IMMUNE, null, 1, 0).addToEntity(this);
            }
            else {
                if (this.mtxLocal.translation.equals(this.teleportPosition, 1)) {
                    this.switchAnimation(Entity.ANIMATIONSTATES.SUMMON);
                    this.moveDirection = ƒ.Vector3.ZERO();
                    this.summon.doAbility();
                }
            }
        };
        stopDefencePhase = () => {
            this.damageTaken = 0;
            this.buffs.find(buff => buff.id == Buff.BUFFID.IMMUNE).removeBuff(this);
            this.currentShootingCount = this.shootingCount;
            this.teleport(Enemy.ENEMYBEHAVIOUR.SHOOT360, new Game.ƒ.Vector2(Game.currentRoom.mtxWorld.translation.x, Game.currentRoom.mtxWorld.translation.y));
        };
        /**
         * used to prepare Teleport
         * @param _nextState nextState after the Teleport is done
         * @param _teleportPosition teleportPosistion the Summoner is teleporting to
         */
        teleport(_nextState, _teleportPosition) {
            this.teleportPosition = _teleportPosition.clone.toVector3(this.mtxWorld.translation.z);
            this.afterTeleportState = _nextState;
            this.transit(Enemy.ENEMYBEHAVIOUR.TELEPORT);
        }
        doTeleport = () => {
            if (!this.mtxLocal.translation.equals(this.teleportPosition)) {
                this.switchAnimation(Entity.ANIMATIONSTATES.TELEPORT);
                this.moveDirection = ƒ.Vector3.ZERO();
                if (this.getCurrentFrame >= 5) {
                    this.mtxLocal.translation = this.teleportPosition;
                    this.transit(this.afterTeleportState);
                }
            }
        };
        shooting360 = () => {
            if (this.currentShootingCount > 0) {
                new Buff.AttributesBuff(Buff.BUFFID.IMMUNE, null, 1, 0).addToEntity(this);
                if (!this.shoot360.hasCooldown()) {
                    this.switchAnimation(Entity.ANIMATIONSTATES.SUMMON);
                }
                if (this.getCurrentFrame == 10 && !this.shoot360.hasCooldown()) {
                    this.shoot360.bulletAmount = Math.round(8 + Math.random() * 8);
                    this.shoot360.doAbility();
                    this.currentShootingCount--;
                }
            }
            else if (this.getCurrentFrame >= 12) {
                this.shoot360Cooldown.startCooldown();
                this.transit(Enemy.ENEMYBEHAVIOUR.ATTACK);
                if (this.buffs.find(buff => buff.id == Buff.BUFFID.IMMUNE) != undefined) {
                    this.buffs.find(buff => buff.id == Buff.BUFFID.IMMUNE).removeBuff(this);
                }
                this.currentShootingCount = this.shootingCount;
            }
        };
    }
    Enemy.Summonor = Summonor;
})(Enemy || (Enemy = {}));
var Buff;
(function (Buff_1) {
    let BUFFID;
    (function (BUFFID) {
        BUFFID[BUFFID["BLEEDING"] = 0] = "BLEEDING";
        BUFFID[BUFFID["POISON"] = 1] = "POISON";
        BUFFID[BUFFID["HEAL"] = 2] = "HEAL";
        BUFFID[BUFFID["SLOW"] = 3] = "SLOW";
        BUFFID[BUFFID["IMMUNE"] = 4] = "IMMUNE";
        BUFFID[BUFFID["SCALEUP"] = 5] = "SCALEUP";
        BUFFID[BUFFID["SCALEDOWN"] = 6] = "SCALEDOWN";
        BUFFID[BUFFID["FURIOUS"] = 7] = "FURIOUS";
        BUFFID[BUFFID["EXHAUSTED"] = 8] = "EXHAUSTED";
    })(BUFFID = Buff_1.BUFFID || (Buff_1.BUFFID = {}));
    class Buff {
        duration;
        tickRate;
        id;
        noDuration;
        coolDown;
        constructor(_id, _duration, _tickRate) {
            this.id = _id;
            this.duration = _duration;
            this.tickRate = _tickRate;
            this.noDuration = 0;
            if (_duration != undefined) {
                this.coolDown = new Ability.Cooldown(_duration);
            }
            else {
                this.coolDown = undefined;
            }
        }
        getParticleById(_id) {
            switch (_id) {
                case BUFFID.POISON:
                    return new UI.Particles(BUFFID.POISON, UI.poisonParticle, 6, 12);
                case BUFFID.IMMUNE:
                    return new UI.Particles(BUFFID.IMMUNE, UI.immuneParticle, 1, 6);
                case BUFFID.FURIOUS:
                    return new UI.Particles(BUFFID.FURIOUS, UI.furiousParticle, 8, 6);
                case BUFFID.EXHAUSTED:
                    return new UI.Particles(BUFFID.EXHAUSTED, UI.exhaustedParticle, 1, 6);
                default:
                    return null;
            }
        }
        applyBuff(_avatar) {
            if (Networking.client.id == Networking.client.idHost) {
                this.getBuffStatsById(this.id, _avatar, true);
                Networking.updateBuffList(_avatar.buffs, _avatar.netId);
            }
        }
        /**
         * removes the buff from the buff list, removes the particle and sends the new list to the client
         * @param _avatar entity the buff should be removed
         */
        removeBuff(_avatar) {
            _avatar.removeChild(_avatar.getChildren().find(child => child.id == this.id));
            _avatar.buffs.splice(_avatar.buffs.indexOf(this), 1);
            if (Networking.client.idHost == Networking.client.id) {
                this.getBuffStatsById(this.id, _avatar, false);
                Networking.updateBuffList(_avatar.buffs, _avatar.netId);
            }
        }
        /**
         * only use this function to add buffs to entities
         * @param _avatar entity it should be add to
         * @returns
         */
        addToEntity(_avatar) {
            if (_avatar.buffs.filter(buff => buff.id == this.id).length > 0) {
                return;
            }
            else {
                _avatar.buffs.push(this);
                this.addParticle(_avatar);
                if (this.coolDown != undefined) {
                    this.coolDown.startCooldown();
                }
                Networking.updateBuffList(_avatar.buffs, _avatar.netId);
            }
        }
        /**
         * buff applies its buff stats to the entity and deletes itself when its duration is over
         * @param _avatar entity it should be add to
         */
        doBuffStuff(_avatar) {
        }
        getBuffStatsById(_id, _avatar, _add) {
        }
        addParticle(_avatar) {
            if (_avatar.getChildren().find(child => child.id == this.id) == undefined) {
                let particle = this.getParticleById(this.id);
                if (particle != undefined) {
                    _avatar.addChild(particle);
                    particle.mtxLocal.scale(new ƒ.Vector3(_avatar.mtxLocal.scaling.x, _avatar.mtxLocal.scaling.y, 1));
                    particle.mtxLocal.translation = new ƒ.Vector2(_avatar.offsetColliderX, _avatar.offsetColliderY).toVector3(0.1);
                    particle.activate(true);
                }
            }
        }
    }
    Buff_1.Buff = Buff;
    class RarityBuff {
        id;
        constructor(_id) {
            this.id = _id;
        }
        addToItem(_item) {
            this.addParticleToItem(_item);
        }
        getParticleById(_id) {
            switch (_id) {
                case Items.RARITY.COMMON:
                    return new UI.Particles(_id, UI.commonParticle, 1, 12);
                case Items.RARITY.RARE:
                    return new UI.Particles(_id, UI.rareParticle, 1, 12);
                case Items.RARITY.EPIC:
                    return new UI.Particles(_id, UI.epicParticle, 1, 12);
                case Items.RARITY.LEGENDARY:
                    return new UI.Particles(_id, UI.legendaryParticle, 1, 12);
                default:
                    return new UI.Particles(_id, UI.commonParticle, 1, 12);
            }
        }
        addParticleToItem(_item) {
            if (_item.getChildren().find(child => child.id == this.id) == undefined) {
                let particle = this.getParticleById(this.id);
                if (particle != undefined) {
                    _item.addChild(particle);
                    particle.mtxLocal.scale(new ƒ.Vector3(_item.mtxLocal.scaling.x, _item.mtxLocal.scaling.y, 1));
                    particle.mtxLocal.translateZ(0.1);
                    particle.activate(true);
                }
            }
        }
    }
    Buff_1.RarityBuff = RarityBuff;
    /**
     * creates a new Buff that does Damage to an Entity;
     */
    class DamageBuff extends Buff {
        value;
        constructor(_id, _duration, _tickRate, _value) {
            super(_id, _duration, _tickRate);
            this.value = _value;
        }
        clone() {
            return new DamageBuff(this.id, this.duration, this.tickRate, this.value);
        }
        doBuffStuff(_avatar) {
            if (this.coolDown != undefined) {
                if (!this.coolDown.hasCooldown) {
                    this.removeBuff(_avatar);
                    return;
                }
                else if (this.coolDown.getCurrentCooldown % this.tickRate == 0) {
                    this.applyBuff(_avatar);
                }
            }
            else {
                if (this.noDuration % this.tickRate == 0) {
                    this.applyBuff(_avatar);
                }
                this.noDuration++;
            }
        }
        getBuffStatsById(_id, _avatar, _add) {
            if (_add) {
                switch (_id) {
                    case BUFFID.BLEEDING:
                        _avatar.getDamage(this.value);
                        break;
                    case BUFFID.POISON:
                        // only do damage to player until he has 20% health
                        if (_avatar instanceof Player.Player) {
                            if (_avatar.attributes.healthPoints > _avatar.attributes.maxHealthPoints * 0.2) {
                                _avatar.getDamage(this.value);
                            }
                        }
                        else {
                            _avatar.getDamage(this.value);
                        }
                        break;
                }
            }
            else {
                return;
            }
        }
    }
    Buff_1.DamageBuff = DamageBuff;
    /**
     * creates a new Buff that changes an attribute of an Entity for the duration of the buff
     */
    class AttributesBuff extends Buff {
        isBuffApplied;
        value;
        difHealthPoints;
        difMaxHealthPoints;
        difArmor;
        difSpeed;
        difAttackPoints;
        difCoolDownReduction;
        difScale;
        difAccurary;
        difKnockback;
        constructor(_id, _duration, _tickRate, _value) {
            super(_id, _duration, _tickRate);
            this.isBuffApplied = false;
            this.value = _value;
        }
        clone() {
            return new AttributesBuff(this.id, this.duration, this.tickRate, this.value);
        }
        doBuffStuff(_avatar) {
            if (this.duration != undefined) {
                if (this.duration <= 0) {
                    this.removeBuff(_avatar);
                }
                else if (!this.isBuffApplied) {
                    this.applyBuff(_avatar);
                    this.isBuffApplied = true;
                }
                this.duration--;
            }
            else {
                if (!this.isBuffApplied) {
                    this.applyBuff(_avatar);
                    this.isBuffApplied = true;
                }
                this.addParticle(_avatar);
            }
        }
        getBuffStatsById(_id, _avatar, _add) {
            let payload;
            switch (_id) {
                case BUFFID.SLOW:
                    if (_add) {
                        this.difSpeed = _avatar.attributes.speed - Calculation.subPercentageAmountToValue(_avatar.attributes.speed, this.value);
                        _avatar.attributes.speed -= this.difSpeed;
                    }
                    else {
                        _avatar.attributes.speed += this.difSpeed;
                    }
                    break;
                case BUFFID.IMMUNE:
                    if (_add) {
                        _avatar.attributes.hitable = false;
                    }
                    else {
                        _avatar.attributes.hitable = true;
                    }
                    payload = { value: _avatar.attributes };
                    break;
                case BUFFID.SCALEUP:
                    if (_add) {
                        let currentMaxHealthPoints = _avatar.attributes.maxHealthPoints;
                        let currentHealthPoints = _avatar.attributes.healthPoints;
                        let currentAttackPoints = _avatar.attributes.attackPoints;
                        let currentSpeed = _avatar.attributes.speed;
                        let currentKnockbackForce = _avatar.attributes.knockbackForce;
                        this.difScale = Calculation.addPercentageAmountToValue(_avatar.attributes.getScale, this.value) - _avatar.attributes.getScale;
                        _avatar.updateScale(_avatar.attributes.getScale + this.difScale, _add);
                        this.difMaxHealthPoints = currentMaxHealthPoints - _avatar.attributes.maxHealthPoints;
                        this.difHealthPoints = currentHealthPoints - _avatar.attributes.healthPoints;
                        this.difAttackPoints = currentAttackPoints - _avatar.attributes.attackPoints;
                        this.difSpeed = currentSpeed - _avatar.attributes.speed;
                        this.difKnockback = currentKnockbackForce - _avatar.attributes.knockbackForce;
                    }
                    else {
                        _avatar.updateScale(_avatar.attributes.getScale - this.difScale, _add);
                        _avatar.attributes.maxHealthPoints += this.difMaxHealthPoints;
                        _avatar.attributes.healthPoints += this.difHealthPoints;
                        _avatar.attributes.attackPoints += this.difAttackPoints;
                        _avatar.attributes.speed += this.difSpeed;
                        _avatar.attributes.knockbackForce += this.difKnockback;
                    }
                    payload = { value: _avatar.attributes };
                    break;
                case BUFFID.SCALEDOWN:
                    if (_add) {
                        let currentMaxHealthPoints = _avatar.attributes.maxHealthPoints;
                        let currentHealthPoints = _avatar.attributes.healthPoints;
                        let currentAttackPoints = _avatar.attributes.attackPoints;
                        let currentSpeed = _avatar.attributes.speed;
                        let currentKnockbackForce = _avatar.attributes.knockbackForce;
                        this.difScale = _avatar.attributes.getScale - Calculation.subPercentageAmountToValue(_avatar.attributes.getScale, this.value);
                        _avatar.updateScale(_avatar.attributes.getScale - this.difScale, _add);
                        this.difMaxHealthPoints = currentMaxHealthPoints - _avatar.attributes.maxHealthPoints;
                        this.difHealthPoints = currentHealthPoints - _avatar.attributes.healthPoints;
                        this.difAttackPoints = currentAttackPoints - _avatar.attributes.attackPoints;
                        this.difSpeed = currentSpeed - _avatar.attributes.speed;
                        this.difKnockback = currentKnockbackForce - _avatar.attributes.knockbackForce;
                    }
                    else {
                        _avatar.updateScale(_avatar.attributes.getScale + this.difScale, _add);
                        _avatar.attributes.maxHealthPoints += this.difMaxHealthPoints;
                        _avatar.attributes.healthPoints += this.difHealthPoints;
                        _avatar.attributes.attackPoints += this.difAttackPoints;
                        _avatar.attributes.speed += this.difSpeed;
                        _avatar.attributes.knockbackForce += this.difKnockback;
                    }
                    payload = { value: _avatar.attributes };
                    break;
                case BUFFID.FURIOUS:
                    if (_add) {
                        this.difArmor = 95 - _avatar.attributes.armor;
                        this.difSpeed = _avatar.attributes.speed * 2 - _avatar.attributes.speed;
                        _avatar.attributes.armor += this.difArmor;
                        _avatar.attributes.speed += this.difSpeed;
                        _avatar.weapon.getCoolDown.setMaxCoolDown = _avatar.weapon.getCoolDown.getMaxCoolDown / 2;
                    }
                    else {
                        _avatar.attributes.armor -= this.difArmor;
                        _avatar.attributes.speed -= this.difSpeed;
                        _avatar.weapon.getCoolDown.setMaxCoolDown = _avatar.weapon.getCoolDown.getMaxCoolDown * 2;
                    }
                    break;
                case BUFFID.EXHAUSTED:
                    if (_add) {
                        this.difArmor = 0 - _avatar.attributes.armor;
                        _avatar.attributes.armor += this.difArmor;
                    }
                    else {
                        _avatar.attributes.armor -= this.difArmor;
                    }
                    break;
            }
            payload = { value: _avatar.attributes };
            Networking.updateEntityAttributes(payload, _avatar.netId);
        }
    }
    Buff_1.AttributesBuff = AttributesBuff;
    function getBuffById(_id) {
        let ref = undefined;
        ref = Game.damageBuffJSON.find(buff => buff.id == _id);
        if (ref != undefined) {
            return new DamageBuff(_id, ref.duration, ref.tickRate, ref.value);
        }
        ref = Game.attributeBuffJSON.find(buff => buff.id == _id);
        if (ref != undefined) {
            return new AttributesBuff(_id, ref.duration, ref.tickRate, ref.value);
        }
        return null;
    }
    Buff_1.getBuffById = getBuffById;
})(Buff || (Buff = {}));
var Bullets;
(function (Bullets) {
    let BULLETTYPE;
    (function (BULLETTYPE) {
        BULLETTYPE[BULLETTYPE["STANDARD"] = 0] = "STANDARD";
        BULLETTYPE[BULLETTYPE["HIGHSPEED"] = 1] = "HIGHSPEED";
        BULLETTYPE[BULLETTYPE["SLOW"] = 2] = "SLOW";
        BULLETTYPE[BULLETTYPE["MELEE"] = 3] = "MELEE";
        BULLETTYPE[BULLETTYPE["SUMMONER"] = 4] = "SUMMONER";
        BULLETTYPE[BULLETTYPE["STONE"] = 5] = "STONE";
        BULLETTYPE[BULLETTYPE["THORSHAMMER"] = 6] = "THORSHAMMER";
        BULLETTYPE[BULLETTYPE["ZIPZAP"] = 7] = "ZIPZAP";
    })(BULLETTYPE = Bullets.BULLETTYPE || (Bullets.BULLETTYPE = {}));
    let BULLETCLASS;
    (function (BULLETCLASS) {
        BULLETCLASS[BULLETCLASS["NORMAL"] = 0] = "NORMAL";
        BULLETCLASS[BULLETCLASS["FALLING"] = 1] = "FALLING";
        BULLETCLASS[BULLETCLASS["HOMING"] = 2] = "HOMING";
    })(BULLETCLASS = Bullets.BULLETCLASS || (Bullets.BULLETCLASS = {}));
    Bullets.bulletTxt = new ƒ.TextureImage();
    Bullets.waterBallTxt = new ƒ.TextureImage();
    Bullets.thorsHammerTxt = new ƒ.TextureImage();
    class Bullet extends Game.ƒ.Node {
        tag = Tag.TAG.BULLET;
        ownerNetId;
        get owner() { return Game.entities.find(elem => elem.netId == this.ownerNetId); }
        ;
        netId;
        clientPrediction;
        serverPrediction;
        flyDirection;
        direction;
        collider;
        hitPointsScale;
        speed = 20;
        lifetime = 1 * 60;
        knockbackForce = 4;
        type;
        time = 0;
        killcount = 1;
        hitted = [];
        hittedCd = [];
        texturePath;
        lastPosition;
        countCheckUpdate = 0;
        constructor(_bulletType, _position, _direction, _ownerNetId, _netId) {
            super(BULLETTYPE[_bulletType].toLowerCase());
            this.type = _bulletType;
            this.netId = Networking.IdManager(_netId);
            let ref = Game.bulletsJSON.find(bullet => bullet.name == BULLETTYPE[_bulletType].toLowerCase());
            this.speed = ref.speed;
            this.hitPointsScale = ref.hitPointsScale;
            this.lifetime = ref.lifetime;
            this.knockbackForce = ref.knockbackForce;
            this.killcount = ref.killcount;
            this.texturePath = ref.texturePath;
            this.addComponent(new ƒ.ComponentTransform());
            this.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0);
            let mesh = new ƒ.MeshQuad();
            let cmpMesh = new ƒ.ComponentMesh(mesh);
            this.addComponent(cmpMesh);
            let mtrSolidWhite = new ƒ.Material("SolidWhite", ƒ.ShaderLit, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            let cmpMaterial = new ƒ.ComponentMaterial(mtrSolidWhite);
            this.addComponent(cmpMaterial);
            let colliderPosition = new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x + this.cmpTransform.mtxLocal.scaling.x / 2, this.cmpTransform.mtxLocal.translation.y);
            this.collider = new Collider.Collider(colliderPosition, this.cmpTransform.mtxLocal.scaling.y / 1.5, this.netId);
            if (_direction.magnitudeSquared > 0) {
                _direction.normalize();
            }
            this.updateRotation(_direction);
            this.loadTexture();
            this.flyDirection = ƒ.Vector3.X();
            this.direction = _direction;
            this.ownerNetId = _ownerNetId;
            this.serverPrediction = new Networking.ServerBulletPrediction(this.netId);
            this.clientPrediction = new Networking.ClientBulletPrediction(this.netId);
            this.lastPosition = Game.ƒ.Vector3.ZERO();
            this.mtxLocal.translateZ(0.1);
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.eventUpdate);
        }
        eventUpdate = (_event) => {
            this.update();
        };
        update() {
            this.predict();
            if (Networking.client.idHost == Networking.client.id) {
                this.updateLifetime();
            }
        }
        spawn() {
            Game.graph.addChild(this);
        }
        despawn() {
            Networking.popID(this.netId);
            Networking.removeBullet(this.netId);
            Game.graph.removeChild(this);
            console.log("despawn");
            if (this.type == BULLETTYPE.THORSHAMMER) {
                this.spawnThorsHammer();
            }
        }
        updateLifetime() {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime <= 0) {
                    this.despawn();
                }
            }
        }
        predict() {
            if (Networking.client.idHost != Networking.client.id) {
                if (this.owner == Game.avatar1) {
                    this.clientPrediction.update();
                }
                this.checkUpdate();
            }
            else {
                if (this.owner == Game.avatar2) {
                    this.serverPrediction.update();
                }
                else {
                    this.move(this.flyDirection.clone);
                    Networking.updateBullet(this.mtxLocal.translation, this.mtxLocal.rotation, this.netId);
                }
            }
        }
        checkUpdate() {
            if (this.mtxLocal.translation.equals(this.lastPosition, 0)) {
                this.countCheckUpdate++;
                if (this.countCheckUpdate >= (2 * 60)) {
                    this.despawn();
                }
            }
            else {
                this.countCheckUpdate = 0;
            }
            this.lastPosition = this.mtxLocal.translation.clone;
        }
        move(_direction) {
            _direction.normalize();
            if (Networking.client.idHost == Networking.client.id && this.owner == Game.avatar2) {
                _direction.scale(this.clientPrediction.minTimeBetweenTicks * this.speed);
            }
            else {
                _direction.scale(Game.deltaTime * this.speed);
            }
            this.cmpTransform.mtxLocal.translate(_direction);
            this.offsetCollider();
            this.collisionDetection();
        }
        updateRotation(_direction) {
            this.mtxLocal.rotateZ(Calculation.calcDegree(this.cmpTransform.mtxLocal.translation, ƒ.Vector3.SUM(_direction, this.cmpTransform.mtxLocal.translation)) + 90);
        }
        spawnThorsHammer() {
            if (Networking.client.id == Networking.client.idHost) {
                let item = new Items.InternalItem(Items.ITEMID.THORSHAMMER);
                item.setPosition(this.mtxLocal.translation.toVector2());
                if (this.owner == Game.avatar1) {
                    item.setChoosenOneNetId(Game.avatar2.netId);
                }
                else {
                    item.setChoosenOneNetId(Game.avatar1.netId);
                }
                item.spawn();
            }
        }
        loadTexture() {
            if (this.texturePath != "" && this.texturePath != null) {
                let newTxt = new ƒ.TextureImage();
                let newCoat = new ƒ.CoatRemissiveTextured();
                let newMtr = new ƒ.Material("mtr", ƒ.ShaderLitTextured, newCoat);
                let oldComCoat = new ƒ.ComponentMaterial();
                oldComCoat = this.getComponent(ƒ.ComponentMaterial);
                switch (this.texturePath) {
                    case Bullets.bulletTxt.url:
                        newTxt = Bullets.bulletTxt;
                        break;
                    case Bullets.waterBallTxt.url:
                        newTxt = Bullets.waterBallTxt;
                        break;
                    case Bullets.thorsHammerTxt.url:
                        newTxt = Bullets.thorsHammerTxt;
                        break;
                    default:
                        break;
                }
                newCoat.color = ƒ.Color.CSS("WHITE");
                newCoat.texture = newTxt;
                oldComCoat.material = newMtr;
            }
        }
        setBuffToTarget(_target) {
            this.owner.items.forEach(item => {
                item.buff.forEach(buff => {
                    if (buff != undefined) {
                        buff.clone().addToEntity(_target);
                    }
                });
            });
        }
        offsetCollider() {
            let newPosition = new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x + this.cmpTransform.mtxLocal.scaling.x / 2, this.cmpTransform.mtxLocal.translation.y);
            this.collider.position = newPosition;
        }
        addHitted(_elem) {
            this.hitted.push(_elem);
            this.hittedCd.push(new Ability.Cooldown(60));
            this.hittedCd[this.hittedCd.length - 1].startCooldown();
            this.hittedCd[this.hittedCd.length - 1].onEndCooldown = this.resetHitted;
        }
        resetHitted = () => {
            this.hitted.splice(0, 1);
        };
        collisionDetection() {
            let colliders = [];
            if (this.owner == undefined) {
                this.despawn();
                return;
            }
            if (this.owner.tag == Tag.TAG.PLAYER) {
                colliders = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.ENEMY);
                colliders.forEach((_elem) => {
                    if (this.hitted.find(element => element == _elem)) {
                        return;
                    }
                    let element = _elem;
                    if (this.collider.collides(element.collider) && element.attributes != undefined && this.killcount > 0) {
                        if (element.attributes.healthPoints > 0) {
                            this.addHitted(_elem);
                            if (element instanceof Enemy.SummonorAdds) {
                                if (element.avatar == this.owner) {
                                    this.killcount--;
                                    return;
                                }
                            }
                            element.getDamage(this.owner.attributes.attackPoints * this.hitPointsScale);
                            this.setBuffToTarget(element);
                            element.getKnockback(this.knockbackForce, this.mtxLocal.translation);
                            this.killcount--;
                        }
                    }
                });
            }
            if (this.owner.tag == Tag.TAG.ENEMY) {
                colliders = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.PLAYER);
                colliders.forEach((_elem) => {
                    if (this.hitted.find(element => element == _elem)) {
                        return;
                    }
                    let element = _elem;
                    if (this.collider.collides(element.collider) && element.attributes != undefined) {
                        if (element.attributes.healthPoints > 0 && element.attributes.hitable) {
                            this.addHitted(_elem);
                            element.getDamage(this.hitPointsScale);
                            element.getKnockback(this.knockbackForce, this.mtxLocal.translation);
                            this.killcount--;
                        }
                    }
                });
            }
            if (this.killcount <= 0) {
                this.despawn();
            }
            colliders = [];
            colliders = Game.graph.getChildren().find(element => element.tag == Tag.TAG.ROOM).walls;
            colliders.forEach((_elem) => {
                let element = _elem;
                if (element.collider != undefined && this.collider.collidesRect(element.collider)) {
                    this.despawn();
                }
            });
        }
    }
    Bullets.Bullet = Bullet;
    class NormalBullet extends Bullet {
        constructor(_bulletType, _position, _direction, _ownerNetId, _netId) {
            super(_bulletType, _position, _direction, _ownerNetId, _netId);
        }
    }
    Bullets.NormalBullet = NormalBullet;
    class FallingBullet extends Bullet {
        shadow;
        constructor(_bulletType, _position, _ownerNetId, _netId) {
            super(_bulletType, _position, Game.ƒ.Vector3.ZERO(), _ownerNetId, _netId);
            this.flyDirection = ƒ.Vector3.Z();
            this.flyDirection.scale(-1);
            this.shadow = new Entity.ShadowRound(this);
            this.shadow.mtxLocal.scaling = this.mtxLocal.scaling;
            this.mtxLocal.translateZ(this.generateZIndex());
        }
        update() {
            super.update();
            this.shadow.updateShadowPos();
        }
        move(_direction) {
            _direction.normalize();
            if (Networking.client.idHost == Networking.client.id && this.owner == Game.avatar2) {
                _direction.scale(this.clientPrediction.minTimeBetweenTicks * this.speed);
            }
            else {
                _direction.scale(Game.deltaTime * this.speed);
            }
            this.cmpTransform.mtxLocal.translate(_direction);
            if (this.mtxLocal.translation.z <= 1) {
                this.collisionDetection();
                if (Networking.client.id == Networking.client.idHost) {
                    if (this.mtxLocal.translation.z < 0) {
                        this.despawn();
                    }
                }
            }
        }
        generateZIndex() {
            return Math.random() * 25 + 25;
        }
    }
    Bullets.FallingBullet = FallingBullet;
    class HomingBullet extends Bullet {
        target;
        rotateSpeed = 5;
        constructor(_bullettype, _position, _direction, _ownerId, _target, _netId) {
            super(_bullettype, _position, _direction, _ownerId, _netId);
            if (_target != null) {
                this.target = _target;
            }
            else {
                this.getTarget();
            }
        }
        getTarget() {
            if (this.owner instanceof Enemy.Enemy) {
                this.target = this.owner.target.toVector3();
            }
        }
        move(_direction) {
            super.move(_direction);
            if (Networking.client.id == Networking.client.idHost) {
                this.calculateHoming();
            }
            else {
                if (this.owner == Game.avatar1) {
                    this.calculateHoming();
                }
            }
        }
        setTarget(_netID) {
            if (Game.entities.find(ent => ent.netId == _netID) != undefined) {
                this.target = Game.entities.find(ent => ent.netId == _netID).mtxLocal.translation;
            }
        }
        calculateHoming() {
            let newDirection = ƒ.Vector3.DIFFERENCE(this.target, this.mtxLocal.translation);
            if (newDirection.x != 0 && newDirection.y != 0) {
                newDirection.normalize();
            }
            let rotateAmount2 = ƒ.Vector3.CROSS(newDirection, this.mtxLocal.getX()).z;
            this.mtxLocal.rotateZ(-rotateAmount2 * this.rotateSpeed);
        }
    }
    Bullets.HomingBullet = HomingBullet;
    class ZipZapObject extends Bullet {
        nextTarget;
        avatars;
        playerSize;
        counter;
        tickHit;
        constructor(_ownerNetId, _netId) {
            super(BULLETTYPE.ZIPZAP, new ƒ.Vector2(0, 0), new ƒ.Vector2(0, 0).toVector3(), _ownerNetId, _netId);
            this.avatars = undefined;
            this.counter = 0;
            this.tag = Tag.TAG.UI;
            this.tickHit = new Ability.Cooldown(12);
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.scaling.x / 2, this.netId);
        }
        eventUpdate = (_event) => {
            this.update();
        };
        update() {
            if (Networking.client.idHost == Networking.client.id) {
                if (Game.avatar1 != undefined && Game.avatar2 != undefined) {
                    if (this.avatars == undefined) {
                        this.avatars = [Game.avatar1, Game.avatar2];
                        this.playerSize = this.avatars.length;
                        this.nextTarget = this.avatars[0 % this.playerSize].mtxLocal.translation.toVector2();
                        this.mtxLocal.translation = this.nextTarget.toVector3();
                    }
                    this.avatars = [Game.avatar1, Game.avatar2];
                    this.move();
                    this.collider.position = this.mtxLocal.translation.toVector2();
                    if (!this.tickHit.hasCooldown) {
                        this.collisionDetection();
                        this.tickHit.startCooldown();
                    }
                    Networking.updateBullet(this.mtxLocal.translation, this.mtxLocal.rotation, this.netId);
                    this.killcount = 50;
                }
            }
        }
        spawn() {
            Game.graph.addChild(this);
            Networking.spawnZipZap(this.ownerNetId, this.netId);
        }
        despawn() {
            Game.graph.removeChild(this);
            Networking.removeBullet(this.netId);
        }
        move() {
            let direction = Game.ƒ.Vector2.DIFFERENCE(this.nextTarget, this.mtxLocal.translation.toVector2());
            let distance = direction.magnitudeSquared;
            if (direction.magnitudeSquared > 0) {
                direction.normalize();
            }
            direction.scale(Game.deltaTime * this.speed);
            this.mtxLocal.translate(direction.toVector3());
            if (distance < 1) {
                this.counter = (this.counter + 1) % this.playerSize;
            }
            this.nextTarget = this.avatars[this.counter].mtxLocal.translation.toVector2();
        }
    }
    Bullets.ZipZapObject = ZipZapObject;
})(Bullets || (Bullets = {}));
var Collider;
(function (Collider_1) {
    class Collider {
        ownerNetId;
        radius;
        get getRadius() { return this.radius; }
        ;
        position;
        get top() {
            return (this.position.y - this.radius);
        }
        get left() {
            return (this.position.x - this.radius);
        }
        get right() {
            return (this.position.x + this.radius);
        }
        get bottom() {
            return (this.position.y + this.radius);
        }
        constructor(_position, _radius, _netId) {
            this.position = _position;
            this.radius = _radius;
            this.ownerNetId = _netId;
        }
        setPosition(_position) {
            this.position = _position;
        }
        setRadius(_newRadius) {
            this.radius = _newRadius;
        }
        collides(_collider) {
            let distance = ƒ.Vector2.DIFFERENCE(this.position, _collider.position);
            if (this.radius + _collider.radius > distance.magnitude) {
                return true;
            }
            return false;
        }
        collidesRect(_collider) {
            if (this.left > _collider.right)
                return false;
            if (this.right < _collider.left)
                return false;
            if (this.top > _collider.bottom)
                return false;
            if (this.bottom < _collider.top)
                return false;
            return true;
        }
        getIntersection(_collider) {
            if (!this.collides(_collider))
                return null;
            let distance = ƒ.Vector2.DIFFERENCE(this.position, _collider.position);
            let intersection = this.radius + _collider.radius - distance.magnitude;
            return intersection;
        }
        getIntersectionRect(_collider) {
            if (!this.collidesRect(_collider))
                return null;
            let intersection = new ƒ.Rectangle();
            intersection.x = Math.max(this.left, _collider.left);
            intersection.y = Math.max(this.top, _collider.top);
            intersection.width = Math.min(this.right, _collider.right) - intersection.x;
            intersection.height = Math.min(this.bottom, _collider.bottom) - intersection.y;
            return intersection;
        }
    }
    Collider_1.Collider = Collider;
})(Collider || (Collider = {}));
var EnemySpawner;
(function (EnemySpawner) {
    let spawnTime = 0 * 60;
    let currentTime = spawnTime;
    function spawnMultipleEnemiesAtRoom(_maxEnemies, _roomPos, _enemyClass) {
        if (Networking.client.idHost == Networking.client.id) {
            let spawnedEnemies = 0;
            while (spawnedEnemies < _maxEnemies) {
                if (currentTime == spawnTime) {
                    let position = new ƒ.Vector2(((Math.random() * Game.currentRoom.roomSize / 2) - ((Math.random() * Game.currentRoom.roomSize / 2))), ((Math.random() * Game.currentRoom.roomSize / 2) - ((Math.random() * Game.currentRoom.roomSize / 2))));
                    position.add(_roomPos);
                    if (_enemyClass == undefined) {
                        getRandomEnemy(position);
                    }
                    else {
                        spawnByID(_enemyClass, position);
                    }
                    spawnedEnemies++;
                }
                currentTime--;
                if (currentTime <= 0) {
                    currentTime = spawnTime;
                }
            }
        }
    }
    EnemySpawner.spawnMultipleEnemiesAtRoom = spawnMultipleEnemiesAtRoom;
    function getRandomEnemy(_position) {
        let enemyClass = Math.round(Math.random() * ((Object.keys(Enemy.ENEMYCLASS).length / 2) - 1));
        if (enemyClass == undefined || enemyClass == Enemy.ENEMYCLASS.BIGBOOM || enemyClass == Enemy.ENEMYCLASS.SUMMONER ||
            enemyClass == Enemy.ENEMYCLASS.SUMMONORADDS || enemyClass == Enemy.ENEMYCLASS.ENEMYSMASH ||
            enemyClass == Enemy.ENEMYCLASS.ENEMYPATROL) {
            getRandomEnemy(_position);
            return;
        }
        spawnByID(enemyClass, _position);
    }
    function spawnByID(_enemyClass, _position, _target, _netID) {
        if (Game.currentRoom.enemyCountManager.finished) {
            return;
        }
        console.log("spawned enemy " + Enemy.ENEMYCLASS[_enemyClass].toString());
        let enemy;
        switch (_enemyClass) {
            case Enemy.ENEMYCLASS.ENEMYDASH:
                enemy = new Enemy.EnemyDash(Entity.ID.REDTICK, _position, _netID);
                break;
            case Enemy.ENEMYCLASS.ENEMYDUMB:
                enemy = new Enemy.EnemyDumb(Entity.ID.SMALLTICK, _position, _netID);
                break;
            case Enemy.ENEMYCLASS.ENEMYSHOOT:
                enemy = new Enemy.EnemyShoot(Entity.ID.SKELETON, _position, _netID);
                break;
            case Enemy.ENEMYCLASS.ENEMYSMASH:
                enemy = new Enemy.EnemySmash(Entity.ID.OGER, _position, _netID);
                break;
            case Enemy.ENEMYCLASS.SUMMONORADDS:
                enemy = new Enemy.SummonorAdds(Entity.ID.BAT, _position, _target, _netID);
                break;
            case Enemy.ENEMYCLASS.SUMMONER:
                enemy = new Enemy.Summonor(Entity.ID.SUMMONER, _position, _netID);
                break;
            case Enemy.ENEMYCLASS.BIGBOOM:
                enemy = new Enemy.BigBoom(Entity.ID.BIGBOOM, _position, _netID);
                break;
            case Enemy.ENEMYCLASS.ENEMYCIRCLE:
                enemy = new Enemy.EnemyCircle(Entity.ID.BAT, _position, _netID);
            default:
                break;
        }
        if (enemy != null) {
            Game.graph.addChild(enemy);
            Networking.spawnEnemy(_enemyClass, enemy, enemy.netId);
            if (Game.currentRoom.roomType == Generation.ROOMTYPE.BOSS && Game.currentRoom.boss == undefined) {
                if (_enemyClass == Enemy.ENEMYCLASS.BIGBOOM || _enemyClass == Enemy.ENEMYCLASS.SUMMONER) {
                    console.log(Game.currentRoom.boss);
                    Game.currentRoom.boss = enemy;
                    console.log(Game.currentRoom.boss);
                }
            }
        }
    }
    EnemySpawner.spawnByID = spawnByID;
    function networkSpawnById(_enemyClass, _id, _position, _netID, _target) {
        if (_target != null) {
            if (Game.avatar1.netId == _target) {
                spawnByID(_enemyClass, _position, Game.avatar1, _netID);
            }
            else {
                spawnByID(_enemyClass, _position, Game.avatar2, _netID);
            }
        }
        else {
            spawnByID(_enemyClass, _position, null, _netID);
        }
    }
    EnemySpawner.networkSpawnById = networkSpawnById;
})(EnemySpawner || (EnemySpawner = {}));
var Enemy;
(function (Enemy) {
    class FlockingBehaviour {
        currentNeighbours;
        sightRadius;
        avoidRadius;
        enemies = [];
        pos;
        myEnemy;
        cohesionWeight;
        allignWeight;
        avoidWeight;
        toTargetWeight;
        notToTargetWeight;
        obsticalAvoidWeight = 1.5;
        obsticalCollider;
        constructor(_enemy, _sightRadius, _avoidRadius, _cohesionWeight, _allignWeight, _avoidWeight, _toTargetWeight, _notToTargetWeight, _obsticalAvoidWeight) {
            this.pos = _enemy.mtxLocal.translation.toVector2();
            this.myEnemy = _enemy;
            this.sightRadius = _sightRadius;
            this.avoidRadius = _avoidRadius;
            this.cohesionWeight = _cohesionWeight;
            this.allignWeight = _allignWeight;
            this.avoidWeight = _avoidWeight;
            this.toTargetWeight = _toTargetWeight;
            this.notToTargetWeight = _notToTargetWeight;
            if (_obsticalAvoidWeight != null) {
                this.obsticalAvoidWeight = _obsticalAvoidWeight;
            }
            this.obsticalCollider = new Collider.Collider(this.pos, this.myEnemy.collider.getRadius * 1.75, this.myEnemy.netId);
        }
        update() {
            this.enemies = Game.enemies;
            this.pos = this.myEnemy.mtxLocal.translation.toVector2();
            this.obsticalCollider.position = this.pos;
            this.findNeighbours();
        }
        findNeighbours() {
            this.currentNeighbours = [];
            this.enemies.forEach(enem => {
                if (this.myEnemy.netId != enem.netId) {
                    if (enem.mtxLocal.translation.getDistance(this.pos.toVector3()) < this.sightRadius) {
                        this.currentNeighbours.push(enem);
                    }
                }
            });
        }
        calculateCohesionMove() {
            if (this.currentNeighbours.length <= 0) {
                return ƒ.Vector2.ZERO();
            }
            else {
                let cohesionMove = ƒ.Vector2.ZERO();
                this.currentNeighbours.forEach(enem => {
                    cohesionMove = Game.ƒ.Vector2.SUM(cohesionMove, enem.mtxLocal.translation.toVector2());
                });
                cohesionMove.scale(1 / this.currentNeighbours.length);
                cohesionMove.subtract(this.pos);
                let newDirection = ƒ.Vector3.DIFFERENCE(cohesionMove.toVector3(), this.myEnemy.mtxLocal.translation);
                if (newDirection.magnitude > 0) {
                    newDirection.normalize();
                }
                let rotateAmount2 = ƒ.Vector3.CROSS(newDirection, this.myEnemy.moveDirection).z;
                if (this.myEnemy.moveDirection.magnitudeSquared > 0) {
                    cohesionMove = Calculation.getRotatedVectorByAngle2D(this.myEnemy.moveDirection, -rotateAmount2 * 0.01).toVector2();
                }
                return cohesionMove;
            }
        }
        calculateAllignmentMove() {
            if (this.currentNeighbours.length <= 0) {
                return this.myEnemy.moveDirection.toVector2();
            }
            else {
                let allignmentMove = ƒ.Vector2.ZERO();
                this.currentNeighbours.forEach(enem => {
                    allignmentMove.add(enem.moveDirection.toVector2());
                });
                allignmentMove.scale(1 / this.currentNeighbours.length);
                return allignmentMove;
            }
        }
        calculateAvoidanceMove() {
            if (this.currentNeighbours.length <= 0) {
                return ƒ.Vector2.ZERO();
            }
            else {
                let avoidanceMove = ƒ.Vector2.ZERO();
                let nAvoid = 0;
                this.currentNeighbours.forEach(enem => {
                    if (enem.mtxLocal.translation.getDistance(this.pos.toVector3()) < this.avoidRadius) {
                        nAvoid++;
                        avoidanceMove.add(Game.ƒ.Vector2.DIFFERENCE(this.pos, enem.mtxLocal.translation.toVector2()));
                    }
                });
                if (nAvoid > 0) {
                    avoidanceMove.scale(1 / nAvoid);
                }
                return avoidanceMove;
            }
        }
        calculateObsticalAvoidanceMove() {
            let obsticals = [];
            Game.currentRoom.walls.forEach(elem => {
                obsticals.push(elem);
            });
            Game.currentRoom.obsticals.forEach(elem => {
                obsticals.push(elem);
            });
            let returnVector = Game.ƒ.Vector2.ZERO();
            let nAvoid = 0;
            obsticals.forEach(obstical => {
                if (obstical.collider instanceof Game.ƒ.Rectangle && this.obsticalCollider.collidesRect(obstical.collider)) {
                    let move = Game.ƒ.Vector2.DIFFERENCE(this.pos, obstical.mtxLocal.translation.toVector2());
                    move.normalize();
                    let intersection = this.obsticalCollider.getIntersectionRect(obstical.collider);
                    let areaBeforeMove = intersection.width * intersection.height;
                    this.obsticalCollider.position.add(new Game.ƒ.Vector2(move.x, 0));
                    if (this.obsticalCollider.collidesRect(obstical.collider)) {
                        intersection = this.obsticalCollider.getIntersectionRect(obstical.collider);
                        let afterBeforeMove = intersection.width * intersection.height;
                        if (areaBeforeMove <= afterBeforeMove) {
                            returnVector.add(new Game.ƒ.Vector2(0, move.y));
                        }
                        else {
                            returnVector.add(new Game.ƒ.Vector2(move.x, 0));
                        }
                    }
                    else {
                        returnVector.add(new Game.ƒ.Vector2(move.x, 0));
                    }
                    this.obsticalCollider.position.subtract(new Game.ƒ.Vector2(move.x, 0));
                    nAvoid++;
                }
                if (obstical.collider instanceof Collider.Collider && this.obsticalCollider.collides(obstical.collider)) {
                    let move = Game.ƒ.Vector2.DIFFERENCE(this.pos, obstical.mtxLocal.translation.toVector2());
                    let localAway = Game.ƒ.Vector2.SUM(move, this.myEnemy.mtxLocal.translation.toVector2());
                    let distancePos = (Game.ƒ.Vector2.DIFFERENCE(this.myEnemy.target, Game.ƒ.Vector2.SUM(Calculation.getRotatedVectorByAngle2D(localAway.clone.toVector3(), 135).toVector2(), this.myEnemy.mtxLocal.translation.toVector2())));
                    let distanceNeg = (Game.ƒ.Vector2.DIFFERENCE(this.myEnemy.target, Game.ƒ.Vector2.SUM(Calculation.getRotatedVectorByAngle2D(localAway.clone.toVector3(), -135).toVector2(), this.myEnemy.mtxLocal.translation.toVector2())));
                    if (distanceNeg.magnitudeSquared > distancePos.magnitudeSquared) {
                        move.add(Calculation.getRotatedVectorByAngle2D(move.clone.toVector3(), 135).toVector2());
                    }
                    else {
                        move.add(Calculation.getRotatedVectorByAngle2D(move.clone.toVector3(), -135).toVector2());
                    }
                    returnVector.add(move);
                    nAvoid++;
                }
            });
            if (nAvoid > 0) {
                returnVector.scale(1 / nAvoid);
            }
            return returnVector;
        }
        getMoveVector() {
            let target = Game.ƒ.Vector2.ZERO();
            let notToTarget = Game.ƒ.Vector2.ZERO();
            let cohesion = Game.ƒ.Vector2.ZERO();
            let avoid = Game.ƒ.Vector2.ZERO();
            let allign = Game.ƒ.Vector2.ZERO();
            let obsticalAvoid = Game.ƒ.Vector2.ZERO();
            target = this.myEnemy.moveSimple(this.myEnemy.target);
            if (target.magnitudeSquared > this.toTargetWeight * this.toTargetWeight) {
                target.normalize();
                target.scale(this.toTargetWeight);
            }
            notToTarget = this.myEnemy.moveAway(this.myEnemy.target);
            if (notToTarget.magnitudeSquared > this.notToTargetWeight * this.notToTargetWeight) {
                notToTarget.normalize();
                notToTarget.scale(this.notToTargetWeight);
            }
            cohesion = this.calculateCohesionMove();
            if (cohesion.magnitudeSquared > this.cohesionWeight * this.cohesionWeight) {
                cohesion.normalize();
                cohesion.scale(this.cohesionWeight);
            }
            avoid = this.calculateAvoidanceMove();
            if (avoid.magnitudeSquared > 0) {
                avoid.normalize();
                avoid.scale(this.avoidWeight);
            }
            allign = this.calculateAllignmentMove();
            if (allign.magnitudeSquared > this.allignWeight * this.allignWeight) {
                allign.normalize();
                allign.scale(this.allignWeight);
            }
            obsticalAvoid = this.calculateObsticalAvoidanceMove();
            if (obsticalAvoid.magnitudeSquared > this.obsticalAvoidWeight * this.obsticalAvoidWeight) {
                obsticalAvoid.normalize();
                obsticalAvoid.scale(this.obsticalAvoidWeight);
            }
            let move = Game.ƒ.Vector2.SUM(notToTarget, target, cohesion, avoid, allign, obsticalAvoid);
            return move;
        }
    }
    Enemy.FlockingBehaviour = FlockingBehaviour;
})(Enemy || (Enemy = {}));
var Entity;
(function (Entity) {
    class Merchant extends Entity.Entity {
        constructor(_id, _netId) {
            super(_id, _netId);
        }
    }
    Entity.Merchant = Merchant;
})(Entity || (Entity = {}));
var Calculation;
(function (Calculation) {
    function getCloserAvatarPosition(_startPoint) {
        let target = Game.avatar1;
        let distancePlayer1 = _startPoint.getDistance(Game.avatar1.cmpTransform.mtxLocal.translation);
        let distancePlayer2 = _startPoint.getDistance(Game.avatar2.cmpTransform.mtxLocal.translation);
        if (distancePlayer1 < distancePlayer2) {
            target = Game.avatar1;
        }
        else {
            target = Game.avatar2;
        }
        return target.cmpTransform.mtxLocal.translation;
    }
    Calculation.getCloserAvatarPosition = getCloserAvatarPosition;
    function calcDegree(_center, _target) {
        let xDistance = _target.x - _center.x;
        let yDistance = _target.y - _center.y;
        let degrees = Math.atan2(yDistance, xDistance) * (180 / Math.PI) - 90;
        return degrees;
    }
    Calculation.calcDegree = calcDegree;
    function getRotatedVectorByAngle2D(_vectorToRotate, _angle) {
        let angleToRadian = _angle * (Math.PI / 180);
        let newX = _vectorToRotate.x * Math.cos(angleToRadian) - _vectorToRotate.y * Math.sin(angleToRadian);
        let newY = _vectorToRotate.x * Math.sin(angleToRadian) + _vectorToRotate.y * Math.cos(angleToRadian);
        return new ƒ.Vector3(newX, newY, _vectorToRotate.z);
    }
    Calculation.getRotatedVectorByAngle2D = getRotatedVectorByAngle2D;
    function addPercentageAmountToValue(_baseValue, _percentageAmount) {
        return _baseValue * ((100 + _percentageAmount) / 100);
    }
    Calculation.addPercentageAmountToValue = addPercentageAmountToValue;
    function subPercentageAmountToValue(_baseValue, _percentageAmount) {
        return _baseValue * (100 / (100 + _percentageAmount));
    }
    Calculation.subPercentageAmountToValue = subPercentageAmountToValue;
    function clampNumber(_number, _min, _max) {
        return Math.max(_min, Math.min(_number, _max));
    }
    Calculation.clampNumber = clampNumber;
})(Calculation || (Calculation = {}));
var InputSystem;
(function (InputSystem) {
    document.addEventListener("keydown", keyboardDownEvent);
    document.addEventListener("keyup", keyboardUpEvent);
    document.addEventListener("mousedown", attack);
    //#region rotate
    let mousePosition;
    function rotateToMouse(_mouseEvent) {
        if (Game.gamestate == Game.GAMESTATES.PLAYING) {
            let ray = Game.viewport.getRayFromClient(new ƒ.Vector2(_mouseEvent.pageX - Game.canvas.offsetLeft, _mouseEvent.pageY - Game.canvas.offsetTop));
            mousePosition = ray.intersectPlane(new ƒ.Vector3(0, 0, 0), new ƒ.Vector3(0, 0, 1));
        }
    }
    function calcPositionFromDegree(_degrees, _distance) {
        let distance = 5;
        let newDeg = (_degrees * Math.PI) / 180;
        let y = Math.cos(newDeg);
        let x = Math.sin(newDeg) * -1;
        let coord = new ƒ.Vector2(x, y);
        coord.scale(distance);
        return coord;
    }
    InputSystem.calcPositionFromDegree = calcPositionFromDegree;
    //#endregion
    //#region move and ability
    let controller = new Map([
        ["W", false],
        ["A", false],
        ["S", false],
        ["D", false]
    ]);
    function keyboardDownEvent(_e) {
        if (Game.gamestate == Game.GAMESTATES.PLAYING) {
            if (_e.code.toUpperCase() == "KEYE") {
                Game.avatar1.openDoor();
            }
            if (_e.code.toUpperCase() != "SPACE") {
                let key = _e.code.toUpperCase().substring(3);
                controller.set(key, true);
            }
            if (_e.code.toUpperCase() == "SPACE") {
                //Do abilty from player
                ability();
            }
        }
        if (_e.code.toUpperCase() == "ESCAPE") {
            if (Game.gamestate == Game.GAMESTATES.PLAYING) {
                Game.pause(true, true);
            }
            else {
                Game.playing(true, true);
            }
        }
    }
    function keyboardUpEvent(_e) {
        if (Game.gamestate == Game.GAMESTATES.PLAYING) {
            let key = _e.code.toUpperCase().substring(3);
            controller.set(key, false);
        }
    }
    function move() {
        let moveVector = Game.ƒ.Vector3.ZERO();
        if (controller.get("W")) {
            moveVector.y += 1;
        }
        if (controller.get("A")) {
            moveVector.x -= 1;
        }
        if (controller.get("S")) {
            moveVector.y -= 1;
        }
        if (controller.get("D")) {
            moveVector.x += 1;
        }
        return moveVector;
    }
    InputSystem.move = move;
    function ability() {
        Game.avatar1.doAbility();
    }
    //#endregion
    //#region attack
    function attack(e_) {
        if (Game.gamestate == Game.GAMESTATES.PLAYING) {
            let mouseButton = e_.button;
            switch (mouseButton) {
                case 0:
                    //left mouse button player.attack
                    rotateToMouse(e_);
                    let direction = ƒ.Vector3.DIFFERENCE(mousePosition, Game.avatar1.mtxLocal.translation);
                    Game.avatar1.attack(direction, null, true);
                    break;
                default:
                    break;
            }
        }
    }
    //#endregion
})(InputSystem || (InputSystem = {}));
var UI;
(function (UI) {
    class Minimap extends Game.ƒ.Node {
        tag = Tag.TAG.UI;
        minmapInfo;
        roomMinimapsize = 0.8;
        miniRooms = [];
        offsetX = 11;
        offsetY = 6;
        currentRoom;
        pointer;
        constructor(_minimapInfo) {
            super("Minimap");
            this.minmapInfo = _minimapInfo;
            this.pointer = new Game.ƒ.Node("pointer");
            this.pointer.addComponent(new ƒ.ComponentMesh(new Game.ƒ.MeshQuad));
            this.pointer.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("challengeRoomMat", ƒ.ShaderLit, new ƒ.CoatRemissive(ƒ.Color.CSS("blue")))));
            this.pointer.addComponent(new ƒ.ComponentTransform());
            this.pointer.mtxLocal.scale(Game.ƒ.Vector3.ONE(this.roomMinimapsize / 2));
            this.pointer.mtxLocal.translateZ(10);
            this.addChild(this.pointer);
            this.addComponent(new Game.ƒ.ComponentTransform());
            this.mtxLocal.scale(new Game.ƒ.Vector3(this.roomMinimapsize, this.roomMinimapsize, this.roomMinimapsize));
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.eventUpdate);
            this.createMiniRooms();
            this.setCurrentRoom(Game.currentRoom);
            if (Networking.client.id == Networking.client.idHost) {
                Networking.spawnMinimap(this.minmapInfo);
            }
        }
        createMiniRooms() {
            this.minmapInfo.forEach(element => {
                this.miniRooms.push(new MiniRoom(element.coords, element.roomType));
            });
            this.miniRooms.forEach(room => {
                this.addChild(room);
            });
        }
        eventUpdate = (_event) => {
            this.update();
        };
        setCurrentRoom(_room) {
            this.miniRooms.find(room => room.coordinates.equals(_room.coordinates)).isDiscovered();
            if (this.currentRoom != undefined) {
                let subX = this.currentRoom.coordinates.x - _room.coordinates.x;
                let subY = this.currentRoom.coordinates.y - _room.coordinates.y;
                this.offsetX += subX * this.roomMinimapsize;
                this.offsetY += subY * this.roomMinimapsize;
            }
            this.currentRoom = _room;
        }
        update() {
            if (this.currentRoom != undefined) {
                if (this.currentRoom != Game.currentRoom) {
                    this.setCurrentRoom(Game.currentRoom);
                }
                this.pointer.mtxLocal.translation = this.miniRooms.find(room => room.coordinates.equals(Game.currentRoom.coordinates)).mtxLocal.translation;
            }
        }
    }
    UI.Minimap = Minimap;
    UI.normalRoom = new ƒ.TextureImage();
    ;
    UI.challengeRoom = new ƒ.TextureImage();
    ;
    UI.merchantRoom = new ƒ.TextureImage();
    ;
    UI.treasureRoom = new ƒ.TextureImage();
    ;
    UI.bossRoom = new ƒ.TextureImage();
    ;
    class MiniRoom extends Game.ƒ.Node {
        discovered;
        coordinates;
        roomType;
        opacity = 0.75;
        roomMat;
        mesh = new ƒ.MeshQuad;
        constructor(_coordinates, _roomType) {
            super("MinimapRoom");
            this.coordinates = _coordinates;
            this.roomType = _roomType;
            this.discovered = false;
            this.addComponent(new Game.ƒ.ComponentMesh(this.mesh));
            let cmpMaterial;
            switch (this.roomType) {
                case Generation.ROOMTYPE.START:
                    this.roomMat = new ƒ.Material("roomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white", this.opacity), UI.normalRoom));
                    break;
                case Generation.ROOMTYPE.NORMAL:
                    this.roomMat = new ƒ.Material("roomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white", this.opacity), UI.normalRoom));
                    break;
                case Generation.ROOMTYPE.MERCHANT:
                    this.roomMat = new ƒ.Material("roomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white", this.opacity), UI.merchantRoom));
                    break;
                case Generation.ROOMTYPE.TREASURE:
                    this.roomMat = new ƒ.Material("roomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white", this.opacity), UI.treasureRoom));
                    break;
                case Generation.ROOMTYPE.CHALLENGE:
                    this.roomMat = new ƒ.Material("roomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white", this.opacity), UI.challengeRoom));
                    break;
                case Generation.ROOMTYPE.BOSS:
                    this.roomMat = new ƒ.Material("roomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white", this.opacity), UI.bossRoom));
                    break;
            }
            cmpMaterial = new ƒ.ComponentMaterial(this.roomMat);
            cmpMaterial.sortForAlpha = true;
            this.addComponent(cmpMaterial);
            this.addComponent(new Game.ƒ.ComponentTransform());
            this.mtxLocal.translation = new ƒ.Vector3(this.coordinates.x, this.coordinates.y, 1);
            this.activate(false);
        }
        isDiscovered() {
            this.discovered = true;
            this.activate(true);
        }
    }
})(UI || (UI = {}));
///<reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts"/>
var Networking;
///<reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts"/>
(function (Networking) {
    let FUNCTION;
    (function (FUNCTION) {
        FUNCTION[FUNCTION["CONNECTED"] = 0] = "CONNECTED";
        FUNCTION[FUNCTION["SETGAMESTATE"] = 1] = "SETGAMESTATE";
        FUNCTION[FUNCTION["LOADED"] = 2] = "LOADED";
        FUNCTION[FUNCTION["SETREADY"] = 3] = "SETREADY";
        FUNCTION[FUNCTION["SPAWN"] = 4] = "SPAWN";
        FUNCTION[FUNCTION["TRANSFORM"] = 5] = "TRANSFORM";
        FUNCTION[FUNCTION["CLIENTMOVEMENT"] = 6] = "CLIENTMOVEMENT";
        FUNCTION[FUNCTION["SERVERBUFFER"] = 7] = "SERVERBUFFER";
        FUNCTION[FUNCTION["UPDATEINVENTORY"] = 8] = "UPDATEINVENTORY";
        FUNCTION[FUNCTION["KNOCKBACKREQUEST"] = 9] = "KNOCKBACKREQUEST";
        FUNCTION[FUNCTION["KNOCKBACKPUSH"] = 10] = "KNOCKBACKPUSH";
        FUNCTION[FUNCTION["SPAWNBULLET"] = 11] = "SPAWNBULLET";
        FUNCTION[FUNCTION["BULLETPREDICT"] = 12] = "BULLETPREDICT";
        FUNCTION[FUNCTION["BULLETTRANSFORM"] = 13] = "BULLETTRANSFORM";
        FUNCTION[FUNCTION["BULLETDIE"] = 14] = "BULLETDIE";
        FUNCTION[FUNCTION["SENDMAGAZIN"] = 15] = "SENDMAGAZIN";
        FUNCTION[FUNCTION["SPAWNENEMY"] = 16] = "SPAWNENEMY";
        FUNCTION[FUNCTION["ENEMYTRANSFORM"] = 17] = "ENEMYTRANSFORM";
        FUNCTION[FUNCTION["ENTITYANIMATIONSTATE"] = 18] = "ENTITYANIMATIONSTATE";
        FUNCTION[FUNCTION["ENTITYDIE"] = 19] = "ENTITYDIE";
        FUNCTION[FUNCTION["SPAWNINTERNALITEM"] = 20] = "SPAWNINTERNALITEM";
        FUNCTION[FUNCTION["UPDATEATTRIBUTES"] = 21] = "UPDATEATTRIBUTES";
        FUNCTION[FUNCTION["UPDATEWEAPON"] = 22] = "UPDATEWEAPON";
        FUNCTION[FUNCTION["ITEMDIE"] = 23] = "ITEMDIE";
        FUNCTION[FUNCTION["SENDROOM"] = 24] = "SENDROOM";
        FUNCTION[FUNCTION["SWITCHROOMREQUEST"] = 25] = "SWITCHROOMREQUEST";
        FUNCTION[FUNCTION["UPDATEBUFF"] = 26] = "UPDATEBUFF";
        FUNCTION[FUNCTION["UPDATEUI"] = 27] = "UPDATEUI";
        FUNCTION[FUNCTION["SPWANMINIMAP"] = 28] = "SPWANMINIMAP";
        FUNCTION[FUNCTION["SPAWNZIPZAP"] = 29] = "SPAWNZIPZAP";
    })(FUNCTION = Networking.FUNCTION || (Networking.FUNCTION = {}));
    var ƒClient = FudgeNet.FudgeClient;
    Networking.createdRoom = false;
    Networking.clients = [];
    Networking.someoneIsHost = false;
    Networking.currentIDs = [];
    function connecting() {
        Networking.client = new ƒClient();
        Networking.client.addEventListener(FudgeNet.EVENT.MESSAGE_RECEIVED, receiveMessage);
        Networking.client.connectToServer("wss:fudge-server-ara.onrender.com");
        addClientID();
        function addClientID() {
            if (Networking.client.id != undefined) {
                let obj = { id: Networking.client.id, ready: false };
                Networking.clients.push(obj);
            }
            else {
                setTimeout(addClientID, 300);
            }
        }
    }
    Networking.connecting = connecting;
    async function receiveMessage(_event) {
        if (_event instanceof MessageEvent) {
            let message = JSON.parse(_event.data);
            if (message.content != undefined && message.content.text == FUNCTION.LOADED.toString()) {
                Game.loaded = true;
            }
            if (message.idSource != Networking.client.id) {
                if (message.command == FudgeNet.COMMAND.ROOM_CREATE) {
                    console.log(message.content.room);
                    let html = document.getElementById("RoomId");
                    html.parentElement.style.visibility = "visible";
                    html.textContent = message.content.room;
                    Networking.createdRoom = true;
                    joinRoom(message.content.room);
                }
                if (message.command == FudgeNet.COMMAND.ROOM_ENTER) {
                    if (Networking.createdRoom) {
                        Networking.client.becomeHost();
                    }
                }
                if (message.command == FudgeNet.COMMAND.ROOM_GET_IDS) {
                    if (message.content != undefined && document.getElementById("Hostscreen").style.visibility != "hidden") {
                        let rooms = message.content.rooms;
                        document.getElementById("Rooms").innerHTML = "";
                        if (rooms.length > 0) {
                            let newRooms = [];
                            rooms.forEach(room => {
                                if (room != "Lobby") {
                                    newRooms.push("<p>" + room + "</p>");
                                }
                            });
                            document.getElementById("Rooms").innerHTML = newRooms.toString().replaceAll(",", "");
                        }
                        setTimeout(() => {
                            getRooms();
                        }, 5000);
                    }
                }
                if (message.command != FudgeNet.COMMAND.SERVER_HEARTBEAT && message.command != FudgeNet.COMMAND.CLIENT_HEARTBEAT) {
                    //Add new client to array clients
                    if (message.content != undefined && message.content.text == FUNCTION.CONNECTED.toString()) {
                        if (message.content.value != Networking.client.id && Networking.clients.find(element => element == message.content.value) == undefined) {
                            if (Networking.clients.find(elem => elem.id == message.content.value) == null) {
                                Networking.clients.push({ id: message.content.value, ready: false });
                            }
                        }
                    }
                    if (message.content != undefined && message.content.text == FUNCTION.SETGAMESTATE.toString()) {
                        if (message.content.playing) {
                            Game.playing(false, true);
                        }
                        else if (!message.content.playing) {
                            Game.pause(false, true);
                        }
                    }
                    //SPAWN MINIMAP BY CLIENT
                    if (message.content != undefined && message.content.text == FUNCTION.SPWANMINIMAP.toString()) {
                        let oldMiniMapInfo = message.content.miniMapInfos;
                        let newMiniMapInfo = [];
                        for (let i = 0; i < oldMiniMapInfo.length; i++) {
                            let newCoords = new Game.ƒ.Vector2(oldMiniMapInfo[i].coords.data[0], oldMiniMapInfo[i].coords.data[1]);
                            newMiniMapInfo.push({ coords: newCoords, roomType: oldMiniMapInfo[i].roomType });
                        }
                        if (Game.miniMap != undefined) {
                            Game.graph.removeChild(Game.miniMap);
                        }
                        Game.miniMap = new UI.Minimap(newMiniMapInfo);
                        Game.graph.addChild(Game.miniMap);
                    }
                    //FROM CLIENT INPUT VECTORS FROM AVATAR
                    if (message.content != undefined && message.content.text == FUNCTION.CLIENTMOVEMENT.toString()) {
                        let inputVector = new Game.ƒ.Vector3(message.content.input.inputVector.data[0], message.content.input.inputVector.data[1], message.content.input.inputVector.data[2]);
                        let input = { tick: message.content.input.tick, inputVector: inputVector, doesAbility: message.content.input.doesAbility };
                        Game.serverPredictionAvatar.updateEntityToCheck(message.content.netId);
                        Game.serverPredictionAvatar.onClientInput(input);
                    }
                    // TO CLIENT CALCULATED POSITION FOR AVATAR
                    if (message.content != undefined && message.content.text == FUNCTION.SERVERBUFFER.toString()) {
                        let netObj = Game.currentNetObj.find(entity => entity.netId == message.content.netId);
                        let position = new Game.ƒ.Vector3(message.content.buffer.position.data[0], message.content.buffer.position.data[1], message.content.buffer.position.data[2]);
                        let rotation = new Game.ƒ.Vector3(message.content.buffer.rotation.data[0], message.content.buffer.rotation.data[1], message.content.buffer.rotation.data[2]);
                        let state = { tick: message.content.buffer.tick, position: position, rotation: rotation };
                        if (netObj != undefined) {
                            let obj = netObj.netObjectNode;
                            if (obj instanceof Player.Player) {
                                obj.client.onServerMovementState(state);
                            }
                            else {
                                obj.clientPrediction.onServerMovementState(state);
                            }
                        }
                    }
                    //FROM CLIENT BULLET VECTORS
                    if (message.content != undefined && message.content.text == FUNCTION.BULLETPREDICT.toString()) {
                        let inputVector = new Game.ƒ.Vector3(message.content.input.inputVector.data[0], message.content.input.inputVector.data[1], message.content.input.inputVector.data[2]);
                        let inputRotationVector = new Game.ƒ.Vector3(message.content.input.rotation.data[0], message.content.input.rotation.data[1], message.content.input.rotation.data[2]);
                        let input = { tick: message.content.input.tick, inputVector: inputVector, rotation: inputRotationVector };
                        let netObj = Game.currentNetObj.find(elem => elem.netId == message.content.netId);
                        let bullet;
                        if (netObj != undefined) {
                            bullet = netObj.netObjectNode;
                            bullet.serverPrediction.updateEntityToCheck(message.content.netId);
                            bullet.serverPrediction.onClientInput(input);
                        }
                    }
                    //Set client ready
                    if (message.content != undefined && message.content.text == FUNCTION.SETREADY.toString()) {
                        if (Networking.clients.find(element => element.id == message.content.netId) != null) {
                            Networking.clients.find(element => element.id == message.content.netId).ready = true;
                        }
                    }
                    //Spawn avatar2 as ranged or melee 
                    if (message.content != undefined && message.content.text == FUNCTION.SPAWN.toString()) {
                        let netId = message.content.netId;
                        let attributes = new Entity.Attributes(message.content.attributes.healthPoints, message.content.attributes.attackPoints, message.content.attributes.speed, message.content.attributes.scale, message.content.attributes.knockbackForce, message.content.attributes.armor, message.content.attributes.coolDownReduction, message.content.attributes.accuracy);
                        if (message.content.type == Entity.ID.MELEE) {
                            Game.avatar2 = new Player.Melee(Entity.ID.MELEE, netId);
                        }
                        else if (message.content.type == Entity.ID.RANGED) {
                            Game.avatar2 = new Player.Ranged(Entity.ID.RANGED, netId);
                        }
                        Game.avatar2.mtxLocal.translation = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], 0);
                        Game.avatar2.attributes = attributes;
                    }
                    //Runtime updates and communication
                    //Sync avatar2 position and rotation
                    if (message.content != undefined && message.content.text == FUNCTION.TRANSFORM.toString()) {
                        let moveVector = new Game.ƒ.Vector3(message.content.value.data[0], message.content.value.data[1], message.content.value.data[2]);
                        let rotateVector = new Game.ƒ.Vector3(message.content.rotation.data[0], message.content.rotation.data[1], message.content.rotation.data[2]);
                        if (Game.avatar2 != undefined) {
                            Game.avatar2.mtxLocal.translation = moveVector;
                            Game.avatar2.mtxLocal.rotation = rotateVector;
                            Game.avatar2.collider.position = moveVector.toVector2();
                        }
                    }
                    //Update inventory
                    if (message.content != undefined && message.content.text == FUNCTION.UPDATEINVENTORY.toString()) {
                        let newItem;
                        if (Items.getBuffItemById(message.content.itemId) != null) {
                            newItem = new Items.BuffItem(message.content.itemId, message.content.itemNetId);
                        }
                        else if (Items.getInternalItemById(message.content.itemId) != null) {
                            newItem = new Items.InternalItem(message.content.itemId, message.content.itemNetId);
                        }
                        let entity = Game.entities.find(elem => elem.netId == message.content.netId);
                        if (message.content.add) {
                            newItem.addItemToEntity(entity);
                        }
                        else {
                            newItem.removeItemFromEntity(entity);
                        }
                        if (Game.avatar1 == entity) {
                            UI.itemPopUp(newItem);
                        }
                    }
                    //Client request for move knockback
                    if (message.content != undefined && message.content.text == FUNCTION.KNOCKBACKREQUEST.toString()) {
                        let position = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                        let enemy = Game.enemies.find(elem => elem.netId == message.content.netId);
                        enemy.getKnockback(message.content.knockbackForce, position);
                    }
                    //Host push move knockback from enemy
                    if (message.content != undefined && message.content.text == FUNCTION.KNOCKBACKPUSH.toString()) {
                        if (Networking.client.id != Networking.client.idHost) {
                            let position = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                            Game.avatar1.getKnockback(message.content.knockbackForce, position);
                        }
                    }
                    //Spawn normal bullet from host
                    if (message.content != undefined && message.content.text == FUNCTION.SPAWNBULLET.toString()) {
                        let bullet;
                        let entity = Game.entities.find(elem => elem.netId == message.content.ownerNetId);
                        if (entity != null) {
                            let direction = new Game.ƒ.Vector3(message.content.direction.data[0], message.content.direction.data[1], message.content.direction.data[2]);
                            if (message.content.bulletType == null && entity instanceof Player.Melee) {
                                entity.attack(direction);
                                return;
                            }
                            if (message.content.bulletType == Bullets.BULLETCLASS.NORMAL) {
                                bullet = new Bullets.NormalBullet(entity.weapon.bulletType, entity.mtxLocal.translation.toVector2(), direction, message.content.ownerNetId, message.content.bulletNetId);
                            }
                            if (message.content.bulletType == Bullets.BULLETCLASS.FALLING) {
                                bullet = new Bullets.FallingBullet(entity.weapon.bulletType, entity.mtxLocal.translation.toVector2(), message.content.ownerNetId, message.content.bulletNetId);
                            }
                            bullet.spawn();
                        }
                    }
                    //Send magazin
                    if (message.content != undefined && message.content.text == FUNCTION.SENDMAGAZIN.toString()) {
                        let entity = Game.entities.find(elem => elem.netId == message.content.magazin.ownerNetId);
                        let tempMagazin = message.content.magazin;
                        entity.weapon.magazin = [];
                        for (let i = 0; i < tempMagazin.bulletTypes.length; i++) {
                            let direction = new Game.ƒ.Vector3(message.content.magazin.directions[i].data[0], message.content.magazin.directions[i].data[1], 0);
                            if (entity.weapon.aimType == Weapons.AIM.NORMAL) {
                                entity.weapon.magazin.push(new Bullets.NormalBullet(tempMagazin.bulletTypes[i], entity.mtxLocal.translation.toVector2(), direction, tempMagazin.ownerNetId, tempMagazin.netIds[i]));
                            }
                            else {
                                console.log(tempMagazin);
                                entity.weapon.magazin.push(new Bullets.HomingBullet(tempMagazin.bulletTypes[i], entity.mtxLocal.translation.toVector2(), direction, tempMagazin.ownerNetId, new Game.ƒ.Vector3(message.content.magazin.targets[i].data[0], message.content.magazin.targets[i].data[1], message.content.magazin.targets[i].data[2]), tempMagazin.netIds[i]));
                            }
                        }
                        entity.weapon.shoot(Game.ƒ.Vector3.ZERO(), false);
                    }
                    //Sync bullet transform from host to client
                    if (message.content != undefined && message.content.text == FUNCTION.BULLETTRANSFORM.toString()) {
                        if (Game.currentNetObj.find(element => element.netId == message.content.netId) != undefined) {
                            if (Game.currentNetObj.find(element => element.netId == message.content.netId).netObjectNode != null) {
                                let newPosition = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                                let newRotation = new Game.ƒ.Vector3(message.content.rotation.data[0], message.content.rotation.data[1], message.content.rotation.data[2]);
                                Game.currentNetObj.find(element => element.netId == message.content.netId).netObjectNode.mtxLocal.translation = newPosition;
                                Game.currentNetObj.find(element => element.netId == message.content.netId).netObjectNode.mtxLocal.rotation = newRotation;
                            }
                        }
                    }
                    //Kill bullet at the client from host
                    if (message.content != undefined && message.content.text == FUNCTION.BULLETDIE.toString()) {
                        if (Networking.client.id != Networking.client.idHost) {
                            let bullet = Game.bullets.find(element => element.netId == message.content.netId);
                            if (bullet != undefined) {
                                bullet.despawn();
                            }
                        }
                    }
                    //Spawn enemy at the client 
                    if (message.content != undefined && message.content.text == FUNCTION.SPAWNENEMY.toString()) {
                        EnemySpawner.networkSpawnById(message.content.enemyClass, message.content.id, new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]), message.content.netId, message.content.target);
                    }
                    //Sync enemy transform from host to client
                    if (message.content != undefined && message.content.text == FUNCTION.ENEMYTRANSFORM.toString()) {
                        let enemy = Game.enemies.find(enem => enem.netId == message.content.netId);
                        if (enemy != undefined) {
                            enemy.cmpTransform.mtxLocal.translation = new ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                            enemy.setCollider();
                        }
                    }
                    //Sync animation state
                    if (message.content != undefined && message.content.text == FUNCTION.ENTITYANIMATIONSTATE.toString()) {
                        let entity = Game.entities.find(enem => enem.netId == message.content.netId);
                        if (entity != undefined) {
                            entity.switchAnimation(message.content.state);
                        }
                    }
                    //Kill entity at the client from host
                    if (message.content != undefined && message.content.text == FUNCTION.ENTITYDIE.toString()) {
                        let entity = Game.entities.find(enem => enem.netId == message.content.netId);
                        if (entity != undefined) {
                            entity.die();
                        }
                    }
                    //update Entity buff List
                    if (message.content != undefined && message.content.text == FUNCTION.UPDATEBUFF.toString()) {
                        let buffList = message.content.buffList;
                        let entity = Game.entities.find(ent => ent.netId == message.content.netId);
                        if (entity != undefined) {
                            entity.buffs.forEach(oldBuff => {
                                let buffToCheck = buffList.find(buff => buff.id == oldBuff.id);
                                if (buffToCheck == undefined) {
                                    oldBuff.removeBuff(entity);
                                }
                            });
                            buffList.forEach(buff => {
                                let newBuff = Buff.getBuffById(buff.id);
                                newBuff.tickRate = buff.tickRate;
                                newBuff.duration = buff.duration;
                                newBuff.addToEntity(entity);
                            });
                        }
                    }
                    //update UI
                    if (message.content != undefined && message.content.text == FUNCTION.UPDATEUI.toString()) {
                        let position = new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]);
                        Game.graph.addChild(new UI.DamageUI(position.toVector3(), message.content.value));
                    }
                    //spawn special items
                    if (message.content != undefined && message.content.text == FUNCTION.SPAWNZIPZAP.toString()) {
                        if (Networking.client.id != Networking.client.idHost) {
                            let item = new Bullets.ZipZapObject(message.content.ownerNetId, message.content.netId);
                            item.spawn();
                        }
                    }
                    //Spawn item from host
                    if (message.content != undefined && message.content.text == FUNCTION.SPAWNINTERNALITEM.toString()) {
                        if (Networking.client.id != Networking.client.idHost) {
                            if (Items.getBuffItemById(message.content.id) != null) {
                                let newItem = new Items.BuffItem(message.content.id, message.content.netId);
                                newItem.setPosition(new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]));
                                Game.graph.addChild(newItem);
                            }
                            else if (Items.getInternalItemById(message.content.id) != null) {
                                let newItem = new Items.InternalItem(message.content.id, message.content.netId);
                                newItem.setPosition(new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]));
                                Game.graph.addChild(newItem);
                            }
                        }
                    }
                    //apply item attributes
                    if (message.content != undefined && message.content.text == FUNCTION.UPDATEATTRIBUTES.toString()) {
                        let refAttributes = message.content.payload.value;
                        let entity = Game.entities.find(elem => elem.netId == message.content.netId);
                        entity.updateScale(refAttributes.scale, false);
                        entity.attributes.accuracy = refAttributes.accuracy;
                        entity.attributes.armor = refAttributes.armor;
                        entity.attributes.attackPoints = refAttributes.attackPoints;
                        entity.attributes.coolDownReduction = refAttributes.coolDownReduction;
                        entity.attributes.maxHealthPoints = refAttributes.maxHealthPoints;
                        entity.attributes.healthPoints = refAttributes.healthPoints;
                        entity.attributes.hitable = refAttributes.hitable;
                        entity.attributes.knockbackForce = refAttributes.knockbackForce;
                        entity.attributes.speed = refAttributes.speed;
                        entity.attributes.scale = refAttributes.scale;
                    }
                    //apply weapon
                    if (message.content != undefined && message.content.text == FUNCTION.UPDATEWEAPON.toString()) {
                        let entity = Game.entities.find(elem => elem.netId == message.content.netId);
                        let refWeapon = message.content.weapon;
                        let tempWeapon;
                        switch (message.content.type) {
                            case Weapons.WEAPONTYPE.RANGEDWEAPON:
                                tempWeapon = new Weapons.RangedWeapon(message.content.weapon.cooldown.coolDown, message.content.weapon.attackCount, refWeapon.bulletType, refWeapon.projectileAmount, refWeapon.ownerNetId, refWeapon.aimType);
                                break;
                            case Weapons.WEAPONTYPE.MELEEWEAPON:
                                tempWeapon = new Weapons.MeleeWeapon(message.content.weapon.cooldown.coolDown, message.content.weapon.attackCount, refWeapon.bulletType, refWeapon.projectileAmount, refWeapon.ownerNetId, refWeapon.aimType);
                                break;
                            case Weapons.WEAPONTYPE.THORSHAMMERWEAPON:
                                tempWeapon = new Weapons.ThorsHammer(message.content.weapon.attackCount, refWeapon.bulletType, refWeapon.projectileAmount, refWeapon.ownerNetId);
                                tempWeapon.weaponStorage = entity.weapon;
                                break;
                            default:
                                console.warn(Weapons.WEAPONTYPE[message.content.type] + " does not exist in Networking switch");
                                break;
                        }
                        if (entity.weapon instanceof Weapons.ThorsHammer) {
                            entity.weapon = entity.weapon.weaponStorage;
                        }
                        else {
                            tempWeapon.ItemFunctions = entity.weapon.ItemFunctions;
                            entity.weapon = tempWeapon;
                        }
                    }
                    //Kill item from host
                    if (message.content != undefined && message.content.text == FUNCTION.ITEMDIE.toString()) {
                        let item = Game.graph.getChildren().find(enem => enem.netId == message.content.netId);
                        Game.graph.removeChild(item);
                        popID(message.content.netId);
                    }
                    //send room 
                    if (message.content != undefined && message.content.text == FUNCTION.SENDROOM.toString()) {
                        let coordiantes = new Game.ƒ.Vector2(message.content.room.coordinates.data[0], message.content.room.coordinates.data[1]);
                        let tanslation = new Game.ƒ.Vector3(message.content.room.translation.data[0], message.content.room.translation.data[1], message.content.room.translation.data[2]);
                        let roomInfo = { coordinates: coordiantes, roomSize: message.content.room.roomSize, exits: message.content.room.exits, roomType: message.content.room.roomType, translation: tanslation };
                        let newRoom;
                        console.warn("room: " + roomInfo);
                        switch (roomInfo.roomType) {
                            case Generation.ROOMTYPE.START:
                                newRoom = new Generation.StartRoom(roomInfo.coordinates, roomInfo.roomSize);
                                break;
                            case Generation.ROOMTYPE.NORMAL:
                                newRoom = new Generation.NormalRoom(roomInfo.coordinates, roomInfo.roomSize);
                                break;
                            case Generation.ROOMTYPE.BOSS:
                                newRoom = new Generation.BossRoom(roomInfo.coordinates, roomInfo.roomSize);
                                break;
                            case Generation.ROOMTYPE.TREASURE:
                                newRoom = new Generation.TreasureRoom(roomInfo.coordinates, roomInfo.roomSize);
                                break;
                            case Generation.ROOMTYPE.MERCHANT:
                                newRoom = new Generation.MerchantRoom(roomInfo.coordinates, roomInfo.roomSize);
                                break;
                            case Generation.ROOMTYPE.CHALLENGE:
                                newRoom = new Generation.ChallengeRoom(roomInfo.coordinates, roomInfo.roomSize);
                                break;
                        }
                        newRoom.exits = roomInfo.exits;
                        newRoom.mtxLocal.translation = roomInfo.translation;
                        newRoom.setSpawnPoints();
                        newRoom.openDoors();
                        Generation.addRoomToGraph(newRoom);
                    }
                    //send request to switch rooms
                    if (message.content != undefined && message.content.text == FUNCTION.SWITCHROOMREQUEST.toString()) {
                        if (message.content.direction == null && Game.currentRoom instanceof Generation.BossRoom) {
                            Game.currentRoom.exitDoor.changeRoom();
                        }
                        else {
                            Generation.switchRoom(message.content.direction);
                        }
                    }
                }
            }
        }
    }
    function setClientReady() {
        Networking.clients.find(element => element.id == Networking.client.id).ready = true;
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SETREADY, netId: Networking.client.id } });
    }
    Networking.setClientReady = setClientReady;
    function setGamestate(_playing) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.id).id, content: { text: FUNCTION.SETGAMESTATE, playing: _playing } });
    }
    Networking.setGamestate = setGamestate;
    function createRoom() {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.SERVER, command: FudgeNet.COMMAND.ROOM_CREATE });
    }
    Networking.createRoom = createRoom;
    function joinRoom(_roomId) {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.SERVER, command: FudgeNet.COMMAND.ROOM_ENTER, content: { room: _roomId } });
    }
    Networking.joinRoom = joinRoom;
    function getRooms() {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.SERVER, command: FudgeNet.COMMAND.ROOM_GET_IDS });
    }
    Networking.getRooms = getRooms;
    //#region player
    function loaded() {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.LOADED } });
    }
    Networking.loaded = loaded;
    function spawnPlayer() {
        if (Game.avatar1.id == Entity.ID.MELEE) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Entity.ID.MELEE, attributes: Game.avatar1.attributes, position: Game.avatar1.cmpTransform.mtxLocal.translation, netId: Game.avatar1.netId } });
        }
        else {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Entity.ID.RANGED, attributes: Game.avatar1.attributes, position: Game.avatar1.cmpTransform.mtxLocal.translation, netId: Game.avatar1.netId } });
        }
    }
    Networking.spawnPlayer = spawnPlayer;
    function setClient() {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: Networking.FUNCTION.CONNECTED, value: Networking.client.id } });
    }
    Networking.setClient = setClient;
    function updateAvatarPosition(_position, _rotation) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.id).id, content: { text: FUNCTION.TRANSFORM, value: _position, rotation: _rotation } });
    }
    Networking.updateAvatarPosition = updateAvatarPosition;
    function sendClientInput(_netId, _inputPayload) {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.CLIENTMOVEMENT, netId: _netId, input: _inputPayload } });
    }
    Networking.sendClientInput = sendClientInput;
    function sendServerBuffer(_netId, _buffer) {
        if (Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.id).id, content: { text: FUNCTION.SERVERBUFFER, netId: _netId, buffer: _buffer } });
        }
    }
    Networking.sendServerBuffer = sendServerBuffer;
    function knockbackRequest(_netId, _knockbackForce, _position) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.client.idHost, content: { text: FUNCTION.KNOCKBACKREQUEST, netId: _netId, knockbackForce: _knockbackForce, position: _position } });
    }
    Networking.knockbackRequest = knockbackRequest;
    function knockbackPush(_knockbackForce, _position) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.KNOCKBACKPUSH, knockbackForce: _knockbackForce, position: _position } });
    }
    Networking.knockbackPush = knockbackPush;
    function updateInventory(_add, _itemId, _itemNetId, _netId) {
        if (Networking.client.id == Networking.client.idHost) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.UPDATEINVENTORY, add: _add, itemId: _itemId, itemNetId: _itemNetId, netId: _netId } });
        }
    }
    Networking.updateInventory = updateInventory;
    function spawnMinimap(_miniMapInfos) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SPWANMINIMAP, miniMapInfos: _miniMapInfos } });
    }
    Networking.spawnMinimap = spawnMinimap;
    //#endregion
    //#region bullet
    function spawnBullet(_bulletType, _direction, _bulletNetId, _ownerNetId) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.id).id, content: { text: FUNCTION.SPAWNBULLET, bulletType: _bulletType, direction: _direction, ownerNetId: _ownerNetId, bulletNetId: _bulletNetId } });
    }
    Networking.spawnBullet = spawnBullet;
    function sendMagazin(_magazin) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.id).id, content: { text: FUNCTION.SENDMAGAZIN, magazin: _magazin } });
    }
    Networking.sendMagazin = sendMagazin;
    function sendBulletInput(_netId, _inputPayload) {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.BULLETPREDICT, netId: _netId, input: _inputPayload } });
    }
    Networking.sendBulletInput = sendBulletInput;
    function updateBullet(_position, _rotation, _netId) {
        if (Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.BULLETTRANSFORM, position: _position, rotation: _rotation, netId: _netId } });
        }
    }
    Networking.updateBullet = updateBullet;
    function removeBullet(_netId) {
        if (Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.BULLETDIE, netId: _netId } });
        }
    }
    Networking.removeBullet = removeBullet;
    //#endregion
    //#region specialItems
    function spawnZipZap(_ownerNetId, _netId) {
        if (Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SPAWNZIPZAP, ownerNetId: _ownerNetId, netId: _netId } });
        }
    }
    Networking.spawnZipZap = spawnZipZap;
    //#endregion
    //#region enemy
    function spawnEnemy(_enemyClass, _enemy, _netId) {
        if (Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SPAWNENEMY, enemyClass: _enemyClass, id: _enemy.id, attributes: _enemy.attributes, position: _enemy.mtxLocal.translation, netId: _netId, target: _enemy.target } });
        }
    }
    Networking.spawnEnemy = spawnEnemy;
    function updateEnemyPosition(_position, _netId) {
        if (Networking.client.id == Networking.client.idHost) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.ENEMYTRANSFORM, position: _position, netId: _netId } });
        }
    }
    Networking.updateEnemyPosition = updateEnemyPosition;
    function updateEntityAnimationState(_state, _netId) {
        if (Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.ENTITYANIMATIONSTATE, state: _state, netId: _netId } });
        }
    }
    Networking.updateEntityAnimationState = updateEntityAnimationState;
    function removeEntity(_netId) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.ENTITYDIE, netId: _netId } });
    }
    Networking.removeEntity = removeEntity;
    //#endregion
    //#region items
    function spawnItem(_id, _position, _netId) {
        if (Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SPAWNINTERNALITEM, id: _id, position: _position, netId: _netId } });
        }
    }
    Networking.spawnItem = spawnItem;
    function updateEntityAttributes(_attributePayload, _netId) {
        if (Networking.client.idHost != Networking.client.id) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.UPDATEATTRIBUTES, payload: _attributePayload, netId: _netId } });
        }
        else {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.UPDATEATTRIBUTES, payload: _attributePayload, netId: _netId } });
        }
    }
    Networking.updateEntityAttributes = updateEntityAttributes;
    function updateAvatarWeapon(_weapon, _targetNetId) {
        if (Networking.client.idHost != Networking.client.id) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.UPDATEWEAPON, weapon: _weapon, type: _weapon.getType(), netId: _targetNetId } });
        }
        else {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.UPDATEWEAPON, weapon: _weapon, type: _weapon.getType(), netId: _targetNetId } });
        }
    }
    Networking.updateAvatarWeapon = updateAvatarWeapon;
    function removeItem(_netId) {
        if (Networking.client.idHost != Networking.client.id) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.ITEMDIE, netId: _netId } });
        }
        else {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.ITEMDIE, netId: _netId } });
        }
    }
    Networking.removeItem = removeItem;
    //#endregion
    //#region buffs
    function updateBuffList(_buffList, _netId) {
        if (Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.UPDATEBUFF, buffList: _buffList, netId: _netId } });
        }
    }
    Networking.updateBuffList = updateBuffList;
    //#endregion
    //#region UI
    function updateUI(_position, _value) {
        if (Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.UPDATEUI, position: _position, value: _value } });
        }
    }
    Networking.updateUI = updateUI;
    //#endregion
    //#region room
    function sendRoom(_room) {
        if (Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SENDROOM, room: _room } });
        }
    }
    Networking.sendRoom = sendRoom;
    function switchRoomRequest(_direction) {
        if (Networking.client.idHost != Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.client.idHost, content: { text: FUNCTION.SWITCHROOMREQUEST, direction: _direction } });
        }
    }
    Networking.switchRoomRequest = switchRoomRequest;
    //#endregion
    /**
     * generates individual IDs on Host without duplicates returns the given NetId
     * @param _netId if undefined generates a new NetId -> only undefined on Host
     * @returns a new netId or the netId provided by the host
     */
    function IdManager(_netId) {
        if (_netId != undefined) {
            Networking.currentIDs.push(_netId);
            return _netId;
        }
        else {
            return generateNewId();
        }
    }
    Networking.IdManager = IdManager;
    function generateNewId() {
        let newId;
        while (true) {
            newId = idGenerator();
            if (Networking.currentIDs.find(id => id == newId) == undefined) {
                break;
            }
        }
        Networking.currentIDs.push(newId);
        return newId;
    }
    function idGenerator() {
        let id = Math.floor(Math.random() * 1000);
        return id;
    }
    function popID(_id) {
        Networking.currentIDs.splice(Networking.currentIDs.indexOf(_id), 1);
    }
    Networking.popID = popID;
    function isNetworkObject(_object) {
        return "netId" in _object;
    }
    Networking.isNetworkObject = isNetworkObject;
    function getNetId(_object) {
        if (isNetworkObject(_object)) {
            return _object.netId;
        }
        return null;
    }
    Networking.getNetId = getNetId;
    window.addEventListener("beforeunload", onUnload, false);
    function onUnload() {
        //TODO: Things we do after the player left the game
    }
})(Networking || (Networking = {}));
var Player;
(function (Player_1) {
    class Player extends Entity.Entity {
        client;
        abilityCount = 1;
        currentabilityCount = this.abilityCount;
        constructor(_id, _netId) {
            super(_id, _netId);
            let ref = Game.avatarsJSON.find(avatar => avatar.name == Entity.ID[_id].toLowerCase());
            console.log(ref);
            this.attributes = new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, ref.attributes.scale, ref.attributes.knockbackForce, ref.attributes.armor, ref.attributes.coolDownReduction, ref.attributes.accuracy);
            this.tag = Tag.TAG.PLAYER;
            this.client = new Networking.ClientPrediction(this.netId);
            this.spriteScaleFactor = 2;
            this.updateScale(this.attributes.getScale, false);
            this.shadowOffsetX = 0.05;
            this.shadowOffsetY = -0.1;
        }
        move(_direction) {
            if (_direction.magnitude > 0) {
                _direction.normalize();
                if (_direction.x >= 0) {
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                }
                else {
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALKLEFT);
                }
            }
            else if (_direction.magnitude <= 0) {
                if (this.currentAnimationState == Entity.ANIMATIONSTATES.WALKLEFT || this.currentAnimationState == Entity.ANIMATIONSTATES.IDLELEFT) {
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLELEFT);
                }
                else {
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                }
            }
            this.setCollider();
            this.scaleMoveVector(_direction);
            this.moveDirection.add(_direction);
            this.collide(this.moveDirection);
            this.moveDirection.subtract(_direction);
        }
        openDoor() {
            let walls = Game.currentRoom.walls;
            walls.forEach((wall) => {
                if (wall.door != undefined && wall.door.isActive) {
                    if (wall.door.collider != undefined && this.collider.collidesRect(wall.door.collider)) {
                        wall.door.changeRoom();
                    }
                }
            });
            if (Game.currentRoom.exitDoor != undefined) {
                if (Game.currentRoom.exitDoor.collider != undefined && this.collider.collidesRect(Game.currentRoom.exitDoor.collider)) {
                    (Game.currentRoom.exitDoor).changeRoom();
                }
            }
        }
        scaleMoveVector(_direction) {
            if (Networking.client.id == Networking.client.idHost && this == Game.avatar1) {
                _direction.scale((Game.deltaTime * this.attributes.speed));
            }
            else {
                _direction.scale((this.client.minTimeBetweenTicks * this.attributes.speed));
            }
        }
        predict() {
            if (Networking.client.idHost != Networking.client.id) {
                this.client.update();
            }
            else {
                this.move(InputSystem.move());
            }
        }
        collide(_direction) {
            super.collide(_direction);
            if (Networking.client.id == Networking.client.idHost) {
                this.getItemCollision();
            }
            let enemies = Game.enemies;
            let enemiesCollider = [];
            enemies.forEach(element => {
                enemiesCollider.push(element.collider);
            });
            //Collision with Enemies
            // this.calculateCollider(enemiesCollider, _direction);
            if (this.canMoveX && this.canMoveY) {
                this.cmpTransform.mtxLocal.translate(_direction);
            }
            else if (this.canMoveX && !this.canMoveY) {
                _direction = new ƒ.Vector3(_direction.x, 0, _direction.z);
                this.cmpTransform.mtxLocal.translate(_direction);
            }
            else if (!this.canMoveX && this.canMoveY) {
                _direction = new ƒ.Vector3(0, _direction.y, _direction.z);
                this.cmpTransform.mtxLocal.translate(_direction);
            }
        }
        getItemCollision() {
            let itemCollider = Game.items;
            itemCollider.forEach(item => {
                if (this.collider.collides(item.collider)) {
                    if (item instanceof Items.InternalItem && item.choosenOneNetId != undefined) {
                        if (item.choosenOneNetId != this.netId) {
                            return;
                        }
                    }
                    if (Game.currentRoom.roomType == Generation.ROOMTYPE.TREASURE) {
                        Game.currentRoom.onItemCollect(item);
                    }
                    if (Game.currentRoom.roomType == Generation.ROOMTYPE.MERCHANT) {
                        if (!Game.currentRoom.onItemCollect(item, this)) {
                            return;
                        }
                    }
                    item.addItemToEntity(this);
                    Networking.updateInventory(true, item.id, item.netId, this.netId);
                    if (item instanceof Items.InternalItem) {
                        console.log(item.name + ": " + item.description + " smth changed to: " + item.value);
                    }
                    if (item instanceof Items.BuffItem) {
                        console.log(item.name + ": " + item.description + " smth changed to: " + Buff.BUFFID[item.buff[0].id].toString());
                    }
                    if (Game.avatar1 == this) {
                        UI.itemPopUp(item);
                    }
                }
            });
        }
        getKnockback(_knockbackForce, _position) {
            super.getKnockback(_knockbackForce, _position);
        }
        doAbility() {
        }
    }
    Player_1.Player = Player;
    class Melee extends Player {
        block = new Ability.Block(this.netId, 600, 1, 5 * 60);
        abilityCooldownTime = 40;
        currentabilityCooldownTime = this.abilityCooldownTime;
        weapon = new Weapons.MeleeWeapon(12, 1, Bullets.BULLETTYPE.MELEE, 1, this.netId, Weapons.AIM.NORMAL);
        swordRadius = 0.75;
        attack(_direction, _netId, _sync) {
            this.weapon.shoot(_direction, _sync, _netId);
        }
        //Block
        doAbility() {
            this.block.doAbility();
        }
    }
    Player_1.Melee = Melee;
    class Ranged extends Player {
        weapon = new Weapons.RangedWeapon(35, 1, Bullets.BULLETTYPE.STANDARD, 1, this.netId, Weapons.AIM.NORMAL);
        dash = new Ability.Dash(this.netId, 8, 1, 60, 5);
        performAbility = false;
        lastMoveDirection;
        attack(_direction, _netId, _sync) {
            this.weapon.shoot(_direction, _sync, _netId);
        }
        move(_direction) {
            if (this.dash.doesAbility) {
                super.move(this.lastMoveDirection);
            }
            else {
                super.move(_direction);
                if (_direction.magnitude > 0) {
                    this.lastMoveDirection = _direction;
                }
            }
        }
        //Dash
        doAbility() {
            this.dash.doAbility();
        }
    }
    Player_1.Ranged = Ranged;
})(Player || (Player = {}));
var Generation;
(function (Generation) {
    let ROOMTYPE;
    (function (ROOMTYPE) {
        ROOMTYPE[ROOMTYPE["START"] = 0] = "START";
        ROOMTYPE[ROOMTYPE["NORMAL"] = 1] = "NORMAL";
        ROOMTYPE[ROOMTYPE["MERCHANT"] = 2] = "MERCHANT";
        ROOMTYPE[ROOMTYPE["TREASURE"] = 3] = "TREASURE";
        ROOMTYPE[ROOMTYPE["CHALLENGE"] = 4] = "CHALLENGE";
        ROOMTYPE[ROOMTYPE["BOSS"] = 5] = "BOSS";
    })(ROOMTYPE = Generation.ROOMTYPE || (Generation.ROOMTYPE = {}));
    class EnemyCountManager {
        maxEnemyCount;
        get getMaxEnemyCount() { return this.maxEnemyCount; }
        ;
        currentEnemyCount;
        get getCurrentEnemyCount() { return this.currentEnemyCount; }
        ;
        finished;
        setFinished;
        constructor(_enemyCount, _setFinished) {
            this.maxEnemyCount = _enemyCount;
            this.currentEnemyCount = _enemyCount;
            this.finished = false;
            this.setFinished = _setFinished;
            if (_enemyCount <= 0) {
                if (this.setFinished) {
                    this.finished = true;
                }
            }
        }
        onEnemyDeath() {
            this.currentEnemyCount--;
            if (this.currentEnemyCount <= 0) {
                if (this.setFinished) {
                    this.finished = true;
                }
            }
        }
    }
    Generation.EnemyCountManager = EnemyCountManager;
    Generation.txtStartRoom = new Game.ƒ.TextureImage();
    Generation.txtNormalRoom = new Game.ƒ.TextureImage();
    Generation.txtBossRoom = new Game.ƒ.TextureImage();
    Generation.txtMerchantRoom = new Game.ƒ.TextureImage();
    Generation.txtTreasureRoom = new Game.ƒ.TextureImage();
    Generation.txtChallengeRoom = new Game.ƒ.TextureImage();
    class Room extends ƒ.Node {
        tag;
        roomType;
        coordinates;
        walls = [];
        obsticals = [];
        enemyCountManager;
        positionUpdated = false;
        exitDoor;
        roomSize = 30;
        exits; // N E S W
        mesh = new ƒ.MeshQuad;
        cmpMesh = new ƒ.ComponentMesh(this.mesh);
        avatarSpawnPointN;
        get getSpawnPointN() { return this.avatarSpawnPointN; }
        ;
        avatarSpawnPointE;
        get getSpawnPointE() { return this.avatarSpawnPointE; }
        ;
        avatarSpawnPointS;
        get getSpawnPointS() { return this.avatarSpawnPointS; }
        ;
        avatarSpawnPointW;
        get getSpawnPointW() { return this.avatarSpawnPointW; }
        ;
        cmpMaterial = new ƒ.ComponentMaterial();
        constructor(_coordiantes, _roomSize, _roomType) {
            super("room");
            this.tag = Tag.TAG.ROOM;
            this.coordinates = _coordiantes;
            this.enemyCountManager = new EnemyCountManager(0, true);
            if (_roomSize != undefined) {
                this.roomSize = _roomSize;
            }
            if (_roomType != undefined) {
                this.roomType = _roomType;
            }
            this.exits = { north: false, east: false, south: false, west: false };
            this.addComponent(new ƒ.ComponentTransform());
            this.cmpTransform.mtxLocal.scaling = new ƒ.Vector3(this.roomSize, this.roomSize, 1);
            this.addComponent(this.cmpMesh);
            this.addComponent(this.cmpMaterial);
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(0, 0, -0.01);
            this.addWalls();
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.eventUpdate);
        }
        eventUpdate = (_event) => {
            this.update();
        };
        onAddToGraph() {
        }
        update() {
        }
        addWalls() {
            let offset = 0.499 + 1 / this.roomSize / 2;
            let newWall = (new Wall(new ƒ.Vector2(offset, 0), new ƒ.Vector2(1 / this.roomSize, offset * 2 + 1 / this.roomSize), this));
            newWall.getComponent(ƒ.ComponentMaterial).material = new ƒ.Material("doorMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Generation.txtWallWest));
            this.addChild(newWall);
            newWall = (new Wall(new ƒ.Vector2(0, offset), new ƒ.Vector2(1 + 0.8 / this.roomSize, 1 / this.roomSize), this));
            newWall.getComponent(ƒ.ComponentMaterial).material = new ƒ.Material("doorMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Generation.txtWallSouth));
            this.addChild(newWall);
            newWall.mtxLocal.translateZ(0.00001);
            newWall = (new Wall(new ƒ.Vector2(-offset, 0), new ƒ.Vector2(1 / this.roomSize, offset * 2 + 1 / this.roomSize), this));
            newWall.getComponent(ƒ.ComponentMaterial).material = new ƒ.Material("doorMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Generation.txtWallEast));
            this.addChild(newWall);
            newWall = (new Wall(new ƒ.Vector2(0, -offset), new ƒ.Vector2(1 + 0.8 / this.roomSize, 1 / this.roomSize), this));
            newWall.getComponent(ƒ.ComponentMaterial).material = new ƒ.Material("doorMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Generation.txtWallNorth));
            this.addChild(newWall);
            newWall.mtxLocal.translateZ(0.00001);
            this.getChildren().filter(elem => elem.tag == Tag.TAG.WALL).forEach(wall => {
                this.walls.push(wall);
            });
        }
        setSpawnPoints() {
            this.avatarSpawnPointE = new ƒ.Vector2(this.mtxLocal.translation.x + ((this.roomSize / 2) - 2), this.mtxLocal.translation.y);
            this.avatarSpawnPointW = new ƒ.Vector2(this.mtxLocal.translation.x - ((this.roomSize / 2) - 2), this.mtxLocal.translation.y);
            this.avatarSpawnPointN = new ƒ.Vector2(this.mtxLocal.translation.x, this.mtxLocal.translation.y + ((this.roomSize / 2) - 2));
            this.avatarSpawnPointS = new ƒ.Vector2(this.mtxLocal.translation.x, this.mtxLocal.translation.y - ((this.roomSize / 2) - 2));
        }
        getRoomSize() {
            return this.roomSize;
        }
        setRoomExit(_neighbour) {
            let dif = Game.ƒ.Vector2.DIFFERENCE(_neighbour.coordinates, this.coordinates);
            if (dif.equals(Generation.compareNorth)) {
                this.exits.north = true;
            }
            if (dif.equals(Generation.compareEast)) {
                this.exits.east = true;
            }
            if (dif.equals(Generation.compareSouth)) {
                this.exits.south = true;
            }
            if (dif.equals(Generation.compareWest)) {
                this.exits.west = true;
            }
        }
        openDoors() {
            if (this.exits.north) {
                this.walls.find(wall => wall.door.direction.north == true).door.openDoor();
            }
            if (this.exits.east) {
                this.walls.find(wall => wall.door.direction.east == true).door.openDoor();
            }
            if (this.exits.south) {
                this.walls.find(wall => wall.door.direction.south == true).door.openDoor();
            }
            if (this.exits.west) {
                this.walls.find(wall => wall.door.direction.west == true).door.openDoor();
            }
        }
    }
    Generation.Room = Room;
    class StartRoom extends Room {
        startRoomMat = new ƒ.Material("startRoomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Generation.txtStartRoom));
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.START);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.startRoomMat;
        }
    }
    Generation.StartRoom = StartRoom;
    class NormalRoom extends Room {
        normalRoomMat = new ƒ.Material("normalRoomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Generation.txtNormalRoom));
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.NORMAL);
            this.enemyCountManager = new EnemyCountManager(15, true);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.normalRoomMat;
        }
    }
    Generation.NormalRoom = NormalRoom;
    class BossRoom extends Room {
        boss;
        bossRoomMat = new ƒ.Material("bossRoomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Generation.txtBossRoom));
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.BOSS);
            this.enemyCountManager = new EnemyCountManager(0, false);
            this.exitDoor = new ExitDoor();
            this.addChild(this.exitDoor);
            this.exitDoor.mtxLocal.translateZ(-0.099);
            this.exitDoor.mtxLocal.scale(Game.ƒ.Vector3.ONE(0.1));
            this.exitDoor.getComponent(ƒ.ComponentMaterial).material = new ƒ.Material("doorMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Generation.txtDoorExit));
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.bossRoomMat;
        }
        update() {
            super.update();
            if (this.enemyCountManager.finished == true) {
                this.exitDoor.activate(true);
                this.exitDoor.setCollider();
            }
        }
        done() {
            this.enemyCountManager.finished = true;
        }
        onAddToGraph() {
            if (this.boss == undefined) {
                this.boss = this.getRandomBoss();
            }
            if (this.boss != undefined) {
                if (!this.enemyCountManager.finished) {
                    Game.graph.addChild(this.boss);
                    Networking.spawnEnemy(Enemy.getEnemyClass(this.boss), this.boss, this.boss.netId);
                }
            }
        }
        getRandomBoss() {
            if (Game.runs % 3 == 0) {
                return new Enemy.Summonor(Entity.ID.SUMMONER, this.mtxWorld.translation.toVector2());
            }
            else {
                return new Enemy.BigBoom(Entity.ID.BIGBOOM, this.mtxWorld.translation.toVector2());
            }
        }
    }
    Generation.BossRoom = BossRoom;
    class TreasureRoom extends Room {
        treasureRoomMat = new ƒ.Material("treasureRoomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Generation.txtTreasureRoom));
        spawnChance = 25;
        get getSpawnChance() { return this.spawnChance; }
        ;
        treasureCount = 2;
        treasures = [];
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.TREASURE);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.treasureRoomMat;
            if (Networking.client.id == Networking.client.idHost) {
                this.createTreasures();
            }
        }
        createTreasures() {
            let treasures = [];
            for (let i = 0; i < this.treasureCount; i++) {
                treasures.push(Items.ItemGenerator.getRandomItem());
            }
            this.treasures = treasures;
        }
        onAddToGraph() {
            let i = 0;
            this.treasures.forEach(item => {
                item.setPosition(new ƒ.Vector2(this.mtxLocal.translation.x + i, this.mtxLocal.translation.y));
                item.spawn();
                i++;
            });
        }
        onItemCollect(_item) {
            if (this.treasures.find(item => item == _item) != undefined) {
                this.treasures.splice(this.treasures.indexOf(_item), 1);
            }
        }
    }
    Generation.TreasureRoom = TreasureRoom;
    class MerchantRoom extends Room {
        merchantRoomMat = new ƒ.Material("merchantRoomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Generation.txtMerchantRoom));
        merchant = new Entity.Merchant(Entity.ID.MERCHANT);
        items = [];
        itemsSpawnPoints = [];
        itemCount = 5;
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.MERCHANT);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.merchantRoomMat;
            this.merchant.mtxLocal.translateZ(0.01);
            this.merchant.mtxLocal.translateY(5 / this.roomSize);
            this.merchant.mtxLocal.scale(Game.ƒ.Vector3.ONE(1 / this.roomSize));
            this.addChild(this.merchant);
            if (Networking.client.id == Networking.client.idHost) {
                this.createShop();
            }
        }
        createShop() {
            let items = [];
            for (let i = 0; i < this.itemCount; i++) {
                items.push(Items.ItemGenerator.getRandomItem());
            }
            this.items = items;
        }
        onAddToGraph() {
            this.createSpawnPoints();
            let i = 0;
            this.items.forEach(item => {
                if (item.getPosition != undefined) {
                    if (this.itemsSpawnPoints.find(pos => pos.equals(item.getPosition)) == undefined) {
                        item.setPosition(this.itemsSpawnPoints[i]);
                    }
                }
                else {
                    item.setPosition(this.itemsSpawnPoints[i]);
                }
                item.spawn();
                i++;
            });
        }
        createSpawnPoints() {
            this.itemsSpawnPoints = [];
            let middle = this.mtxWorld.clone.translation;
            this.itemsSpawnPoints.push(new ƒ.Vector2(middle.x, middle.y + 3));
            this.itemsSpawnPoints.push(new ƒ.Vector2(middle.x + 3, middle.y + 3));
            this.itemsSpawnPoints.push(new ƒ.Vector2(middle.x - 3, middle.y + 3));
            this.itemsSpawnPoints.push(new ƒ.Vector2(middle.x + 2, middle.y + 1));
            this.itemsSpawnPoints.push(new ƒ.Vector2(middle.x - 2, middle.y + 1));
        }
        onItemCollect(_item, _avatar) {
            if (this.items.find(item => item == _item) != undefined) {
                return this.shoping(_item, _avatar);
            }
            return false;
        }
        shoping(_item, _avatar) {
            let sameRarity = _avatar.items.filter(item => item.rarity == _item.rarity);
            let lowerRarity = [];
            if (_item.rarity != Items.RARITY.COMMON) {
                lowerRarity = _avatar.items.filter(item => item.rarity == (_item.rarity - 1));
            }
            if (sameRarity.length > 0) {
                let index = Math.round(Math.random() * (sameRarity.length - 1));
                sameRarity[index].removeItemFromEntity(_avatar);
                this.items.splice(this.items.indexOf(_item), 1);
                Networking.updateInventory(false, sameRarity[index].id, sameRarity[index].netId, _avatar.netId);
            }
            else {
                if (lowerRarity.length >= 3) {
                    let index1 = Math.round(Math.random() * (lowerRarity.length - 1));
                    lowerRarity[index1].removeItemFromEntity(_avatar);
                    lowerRarity.splice(lowerRarity.indexOf(lowerRarity[index1]), 1);
                    lowerRarity.slice(index1, 1);
                    lowerRarity.splice(index1, 1);
                    Networking.updateInventory(false, lowerRarity[index1].id, lowerRarity[index1].netId, _avatar.netId);
                    let index2 = Math.round(Math.random() * (lowerRarity.length - 1));
                    lowerRarity[index2].removeItemFromEntity(_avatar);
                    lowerRarity.splice(lowerRarity.indexOf(lowerRarity[index2]), 1);
                    lowerRarity.slice(index2, 1);
                    lowerRarity.splice(index2, 1);
                    Networking.updateInventory(false, lowerRarity[index2].id, lowerRarity[index2].netId, _avatar.netId);
                    let index3 = Math.round(Math.random() * (lowerRarity.length - 1));
                    lowerRarity[index3].removeItemFromEntity(_avatar);
                    lowerRarity.splice(lowerRarity.indexOf(lowerRarity[index3]), 1);
                    lowerRarity.slice(index3, 1);
                    lowerRarity.splice(index3, 1);
                    Networking.updateInventory(false, lowerRarity[index3].id, lowerRarity[index3].netId, _avatar.netId);
                    this.items.splice(this.items.indexOf(_item), 1);
                }
                else {
                    return false;
                }
            }
            return true;
        }
    }
    Generation.MerchantRoom = MerchantRoom;
    let CHALLENGE;
    (function (CHALLENGE) {
        CHALLENGE[CHALLENGE["THORSHAMMER"] = 0] = "THORSHAMMER";
    })(CHALLENGE || (CHALLENGE = {}));
    class ChallengeRoom extends Room {
        challenge;
        item;
        challengeRoomMat = new ƒ.Material("challengeRoomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Generation.txtChallengeRoom));
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.CHALLENGE);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.challengeRoomMat;
            this.challenge = this.randomChallenge();
            this.enemyCountManager.finished = false;
        }
        randomChallenge() {
            let index = Math.round(Math.random() * (Object.keys(CHALLENGE).length / 2 - 1));
            return CHALLENGE[CHALLENGE[index]];
        }
        update() {
            if (this.enemyCountManager.finished) {
                if (Networking.client.id == Networking.client.idHost) {
                    switch (this.challenge) {
                        case CHALLENGE.THORSHAMMER:
                            this.stopThorsHammerChallenge();
                            break;
                        default:
                            break;
                    }
                }
            }
            else {
                if (Networking.client.id == Networking.client.idHost) {
                    switch (this.challenge) {
                        case CHALLENGE.THORSHAMMER:
                            this.spawnEnemys();
                            break;
                        default:
                            break;
                    }
                }
            }
        }
        onAddToGraph() {
            if (Networking.client.id == Networking.client.idHost) {
                switch (this.challenge) {
                    case CHALLENGE.THORSHAMMER:
                        this.startThorsHammerChallenge();
                        break;
                    default:
                        break;
                }
            }
        }
        spawnEnemys() {
            let avatar1Inv = Game.avatar1.items.find(item => item == this.item);
            let avatar2Inv = Game.avatar2.items.find(item => item == this.item);
            if (avatar1Inv != undefined || avatar2Inv != undefined) {
                if (this.enemyCountManager.getMaxEnemyCount <= 0) {
                    this.enemyCountManager = new EnemyCountManager(10, false);
                    EnemySpawner.spawnMultipleEnemiesAtRoom(this.enemyCountManager.getMaxEnemyCount, this.mtxLocal.translation.toVector2(), Enemy.ENEMYCLASS.ENEMYDASH);
                }
            }
            if (this.enemyCountManager.getMaxEnemyCount > 0 && this.enemyCountManager.getCurrentEnemyCount <= 0) {
                this.enemyCountManager.finished = true;
            }
        }
        startThorsHammerChallenge() {
            if (this.enemyCountManager.finished) {
                return;
            }
            Game.avatar1.weapon = new Weapons.ThorsHammer(1, Bullets.BULLETTYPE.THORSHAMMER, 1, Game.avatar1.netId);
            Game.avatar2.weapon = new Weapons.ThorsHammer(1, Bullets.BULLETTYPE.THORSHAMMER, 1, Game.avatar2.netId);
            Networking.updateAvatarWeapon(Game.avatar1.weapon, Game.avatar1.netId);
            Networking.updateAvatarWeapon(Game.avatar2.weapon, Game.avatar2.netId);
            let thorshammer = new Items.InternalItem(Items.ITEMID.THORSHAMMER);
            let choosenOne;
            if (Math.round(Math.random()) > 0) {
                choosenOne = Game.avatar1;
            }
            else {
                choosenOne = Game.avatar2;
            }
            thorshammer.choosenOneNetId = choosenOne.netId;
            thorshammer.setPosition(this.mtxLocal.translation.toVector2());
            thorshammer.spawn();
            this.item = thorshammer;
        }
        stopThorsHammerChallenge() {
            let avatar1Inv = Game.avatar1.items.find(item => item.id == Items.ITEMID.THORSHAMMER);
            let avatar2Inv = Game.avatar2.items.find(item => item.id == Items.ITEMID.THORSHAMMER);
            if (avatar1Inv != undefined || avatar2Inv != undefined) {
                if (avatar1Inv != undefined) {
                    Game.avatar1.items.splice(Game.avatar1.items.indexOf(avatar1Inv), 1);
                    Networking.updateInventory(false, avatar1Inv.id, avatar1Inv.netId, Game.avatar1.netId);
                }
                if (avatar2Inv != undefined) {
                    Game.avatar2.items.splice(Game.avatar2.items.indexOf(avatar2Inv), 1);
                    Networking.updateInventory(false, avatar2Inv.id, avatar2Inv.netId, Game.avatar2.netId);
                }
            }
            if (Game.avatar1.weapon instanceof Weapons.ThorsHammer || Game.avatar2.weapon instanceof Weapons.ThorsHammer) {
                Game.avatar1.weapon = Game.avatar1.weapon.weaponStorage;
                Game.avatar2.weapon = Game.avatar2.weapon.weaponStorage;
                Networking.updateAvatarWeapon(Game.avatar1.weapon, Game.avatar1.netId);
                Networking.updateAvatarWeapon(Game.avatar2.weapon, Game.avatar2.netId);
            }
            let roomInv = Game.items.find(item => item.id == Items.ITEMID.THORSHAMMER);
            if (roomInv != undefined) {
                roomInv.despawn();
            }
        }
    }
    Generation.ChallengeRoom = ChallengeRoom;
    Generation.txtWallNorth = new Game.ƒ.TextureImage();
    Generation.txtWallSouth = new Game.ƒ.TextureImage();
    Generation.txtWallEast = new Game.ƒ.TextureImage();
    Generation.txtWallWest = new Game.ƒ.TextureImage();
    class Wall extends ƒ.Node {
        tag = Tag.TAG.WALL;
        collider;
        door;
        normal;
        get getNormal() { return this.normal; }
        ;
        constructor(_pos, _scaling, _room) {
            super("Wall");
            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("red", ƒ.ShaderLit, new ƒ.CoatRemissive(ƒ.Color.CSS("grey")))));
            let newPos = _pos.toVector3(0.01);
            this.mtxLocal.scaling = _scaling.toVector3(1);
            this.mtxLocal.translation = newPos;
            if (_pos.x != 0) {
                if (_pos.x > 0) {
                    this.addDoor(_pos, _scaling);
                    this.normal = new ƒ.Vector3(-1, 0, 0);
                }
                else if (_pos.x < 0) {
                    this.addDoor(_pos, _scaling);
                    this.normal = new ƒ.Vector3(1, 0, 0);
                }
            }
            else {
                if (_pos.y > 0) {
                    this.addDoor(_pos, _scaling);
                    this.normal = new ƒ.Vector3(0, -1, 0);
                }
                else if (_pos.y < 0) {
                    this.addDoor(_pos, _scaling);
                    this.normal = new ƒ.Vector3(0, 1, 0);
                }
            }
        }
        addDoor(_pos, _scaling) {
            this.door = new Door();
            this.addChild(this.door);
            if (Math.abs(_pos.x) > 0) {
                this.door.mtxLocal.scaling = new Game.ƒ.Vector3(1, _scaling.x / _scaling.y * 3, 1);
                if (_pos.x > 0) {
                    this.door.direction = { north: false, east: true, south: false, west: false };
                    this.door.getComponent(ƒ.ComponentMaterial).material = new ƒ.Material("doorMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Generation.txtDoorEast));
                }
                else {
                    this.door.direction = { north: false, east: false, south: false, west: true };
                    this.door.getComponent(ƒ.ComponentMaterial).material = new ƒ.Material("doorMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Generation.txtDoorWest));
                }
            }
            else {
                this.door.mtxLocal.scaling = new Game.ƒ.Vector3(_scaling.y / _scaling.x * 3, 1, 1);
                if (_pos.y > 0) {
                    this.door.direction = { north: true, east: false, south: false, west: false };
                    this.door.getComponent(ƒ.ComponentMaterial).material = new ƒ.Material("doorMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Generation.txtDoorNorth));
                }
                else {
                    this.door.direction = { north: false, east: false, south: true, west: false };
                    this.door.getComponent(ƒ.ComponentMaterial).material = new ƒ.Material("doorMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Generation.txtDoorSouth));
                }
            }
        }
        setCollider() {
            this.collider = new Game.ƒ.Rectangle(this.mtxWorld.translation.x, this.mtxWorld.translation.y, this.mtxWorld.scaling.x, this.mtxWorld.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
        }
    }
    Generation.Wall = Wall;
    Generation.txtDoorNorth = new Game.ƒ.TextureImage();
    Generation.txtDoorSouth = new Game.ƒ.TextureImage();
    Generation.txtDoorEast = new Game.ƒ.TextureImage();
    Generation.txtDoorWest = new Game.ƒ.TextureImage();
    class Door extends ƒ.Node {
        tag = Tag.TAG.DOOR;
        collider;
        direction;
        doorMat = new ƒ.Material("doorMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Generation.txtDoorNorth));
        constructor() {
            super("Door");
            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(this.doorMat));
            this.mtxLocal.translateZ(0.1);
            this.closeDoor();
        }
        setCollider() {
            if (this.isActive) {
                this.collider = new Game.ƒ.Rectangle(this.mtxWorld.translation.x, this.mtxWorld.translation.y, this.mtxWorld.scaling.x, this.mtxWorld.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            }
        }
        changeRoom() {
            if (Networking.client.id == Networking.client.idHost) {
                Generation.switchRoom(this.direction);
            }
            else {
                Networking.switchRoomRequest(this.direction);
            }
        }
        openDoor() {
            this.activate(true);
        }
        closeDoor() {
            this.activate(false);
        }
    }
    Generation.Door = Door;
    Generation.txtDoorExit = new Game.ƒ.TextureImage();
    class ExitDoor extends Door {
        changeRoom() {
            Game.runs++;
            if (Game.runs % 3 == 0) {
                Game.newGamePlus++;
            }
            if (Networking.client.id == Networking.client.idHost) {
                Generation.procedualRoomGeneration();
            }
            else {
                Networking.switchRoomRequest(null);
            }
        }
    }
    Generation.ExitDoor = ExitDoor;
    class Obsitcal extends ƒ.Node {
        tag = Tag.TAG.OBSTICAL;
        collider;
        parentRoom;
        direction;
        constructor(_parent, _position, _scale) {
            super("Obstical");
            this.parentRoom = _parent;
            this.parentRoom.obsticals.push(this);
            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("black", ƒ.ShaderLit, new ƒ.CoatRemissive(ƒ.Color.CSS("black")))));
            this.mtxLocal.translation = _position.toVector3(0.01);
            this.mtxLocal.scale(Game.ƒ.Vector3.ONE(_scale));
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.scaling.x / 2, null);
        }
    }
    Generation.Obsitcal = Obsitcal;
})(Generation || (Generation = {}));
var Generation;
(function (Generation) {
    let numberOfRooms = 5;
    Generation.generationFailed = false;
    Generation.rooms = [];
    Generation.compareNorth = new ƒ.Vector2(0, 1);
    Generation.compareEast = new ƒ.Vector2(1, 0);
    Generation.compareSouth = new ƒ.Vector2(0, -1);
    Generation.compareWest = new ƒ.Vector2(-1, 0);
    function procedualRoomGeneration() {
        Generation.rooms = [];
        Generation.generationFailed = false;
        Generation.rooms.push(generateStartRoom());
        Generation.rooms.push.apply(Generation.rooms, generateNormalRooms());
        addBossRoom();
        Generation.rooms.push.apply(Generation.rooms, generateTreasureRoom());
        Generation.rooms.push(generateMerchantRoom());
        Generation.rooms.push(generateChallengeRoom());
        setExits();
        Generation.rooms.forEach(room => { console.log(room.mtxLocal.translation.clone.toString()); });
        moveRoomToWorldCoords(Generation.rooms[0]);
        setExits();
        startLevel();
        Game.setMiniMap();
    }
    Generation.procedualRoomGeneration = procedualRoomGeneration;
    /**
     * generates a grid thats connected toggether from a given starting point
     * @param _startCoord the starting point
     * @returns vector2 array of a connecting grid without overlaps
     */
    function generateSnakeGrid(_startCoord) {
        let grid = [];
        grid.push(_startCoord);
        for (let i = 0; i < numberOfRooms; i++) {
            let nextCoord = getNextPossibleCoordFromSpecificCoord(grid, grid[grid.length - 1]);
            if (nextCoord == undefined) {
                break;
            }
            else {
                grid.push(nextCoord);
            }
        }
        return grid;
    }
    /**
     * function to get a random neigihbour taking care of an acutal grid
     * @param _grid existing grid the function should care about
     * @param _specificCoord the coord you want the next possible coord
     * @returns a vector2 coord thats not inside of _grid and around  _specificCoord
     */
    function getNextPossibleCoordFromSpecificCoord(_grid, _specificCoord) {
        let coordNeighbours = getNeighbourCoordinate(_specificCoord);
        for (let i = 0; i < coordNeighbours.length; i++) {
            let randomIndex = Math.round(Math.random() * (coordNeighbours.length - 1));
            let nextCoord = coordNeighbours[randomIndex];
            if (_grid.find(coord => coord.equals(nextCoord))) {
                coordNeighbours = coordNeighbours.filter(coord => !coord.equals(nextCoord));
                continue;
            }
            else {
                return nextCoord;
            }
        }
        return null;
    }
    /**
     * function to get all neighbours ignoring the current grid
     * @param _coord coordiante you want the neighbour from
     * @returns 4 neighbours in direction N E S and W
     */
    function getNeighbourCoordinate(_coord) {
        let neighbours = [];
        neighbours.push(new ƒ.Vector2(_coord.x + 1, _coord.y));
        neighbours.push(new ƒ.Vector2(_coord.x - 1, _coord.y));
        neighbours.push(new ƒ.Vector2(_coord.x, _coord.y + 1));
        neighbours.push(new ƒ.Vector2(_coord.x, _coord.y - 1));
        return neighbours;
    }
    function generateStartRoom() {
        let startRoom = new Generation.StartRoom(new ƒ.Vector2(0, 0), 30);
        return startRoom;
    }
    function generateNormalRooms() {
        let gridCoords;
        let normalRooms = [];
        while (true) {
            gridCoords = generateSnakeGrid(Generation.rooms[0].coordinates);
            if ((gridCoords.length - 1) == numberOfRooms) {
                break;
            }
        }
        gridCoords.forEach(coord => {
            normalRooms.push(new Generation.NormalRoom(coord, 20));
        });
        return normalRooms;
    }
    function addBossRoom() {
        let biggestDistance = ƒ.Vector2.ZERO();
        Generation.rooms.forEach(room => {
            if (Math.abs(room.coordinates.x) > biggestDistance.x && Math.abs(room.coordinates.y) > biggestDistance.y) {
                biggestDistance = room.coordinates;
            }
        });
        let roomCoord = getCoordsFromRooms();
        let nextCoord = getNextPossibleCoordFromSpecificCoord(roomCoord, roomCoord[0]);
        if (nextCoord == undefined) {
            Generation.generationFailed = true;
        }
        else {
            Generation.rooms.push(new Generation.BossRoom(nextCoord, 30));
        }
    }
    function generateTreasureRoom() {
        let roomCoords = getCoordsFromRooms();
        let newTreasureRooms = [];
        Generation.rooms.forEach(room => {
            if (room.roomType == Generation.ROOMTYPE.NORMAL) {
                let nextCoord = getNextPossibleCoordFromSpecificCoord(roomCoords, room.coordinates);
                if (nextCoord != undefined) {
                    let trRoom = new Generation.TreasureRoom(nextCoord, 10);
                    if (isSpawning(trRoom.getSpawnChance)) {
                        newTreasureRooms.push(trRoom);
                    }
                }
            }
        });
        return newTreasureRooms;
    }
    function generateMerchantRoom() {
        for (let i = 0; i < Generation.rooms.length; i++) {
            if (i > 0) {
                let nextCoord = getNextPossibleCoordFromSpecificCoord(getCoordsFromRooms(), Generation.rooms[i].coordinates);
                if (nextCoord != undefined) {
                    return new Generation.MerchantRoom(nextCoord, 20);
                }
            }
        }
        Generation.generationFailed = true;
        return null;
    }
    function generateChallengeRoom() {
        for (let i = 0; i < Generation.rooms.length; i++) {
            if (i > 0) {
                let nextCoord = getNextPossibleCoordFromSpecificCoord(getCoordsFromRooms(), Generation.rooms[i].coordinates);
                if (nextCoord != undefined) {
                    return new Generation.ChallengeRoom(nextCoord, 20);
                }
            }
        }
        Generation.generationFailed = true;
        return null;
    }
    /**
     * function to get coordiantes from all existing rooms
     * @returns Vector2 array with coordinates of all current existing rooms in RoomGeneration.rooms
     */
    function getCoordsFromRooms() {
        let coords = [];
        Generation.rooms.forEach(room => {
            coords.push(room.coordinates);
        });
        return coords;
    }
    Generation.getCoordsFromRooms = getCoordsFromRooms;
    function setExits() {
        Generation.rooms.forEach(room => {
            let neighbours = Generation.rooms.filter(element => element != room);
            neighbours.forEach(neighbour => {
                room.setRoomExit(neighbour);
                room.setSpawnPoints();
                room.openDoors();
            });
        });
    }
    function isSpawning(_spawnChance) {
        let x = Math.round(Math.random() * 100);
        if (x < _spawnChance) {
            return true;
        }
        return false;
    }
    function moveRoomToWorldCoords(_firstRoom) {
        let neighbourN = Generation.rooms.find(room => room.coordinates.equals(new Game.ƒ.Vector2(_firstRoom.coordinates.clone.x, (_firstRoom.coordinates.clone.y + 1))));
        let neighbourE = Generation.rooms.find(room => room.coordinates.equals(new Game.ƒ.Vector2((_firstRoom.coordinates.clone.x + 1), _firstRoom.coordinates.clone.y)));
        let neighbourS = Generation.rooms.find(room => room.coordinates.equals(new Game.ƒ.Vector2(_firstRoom.coordinates.clone.x, (_firstRoom.coordinates.clone.y - 1))));
        let neighbourW = Generation.rooms.find(room => room.coordinates.equals(new Game.ƒ.Vector2((_firstRoom.coordinates.clone.x - 1), _firstRoom.coordinates.clone.y)));
        if (neighbourN != undefined && !neighbourN.positionUpdated) {
            neighbourN.mtxLocal.translation = new ƒ.Vector3(neighbourN.coordinates.x * (_firstRoom.roomSize / 2 + neighbourN.roomSize / 2), neighbourN.coordinates.y * (_firstRoom.roomSize / 2 + neighbourN.roomSize / 2), -0.01);
            neighbourN.positionUpdated = true;
            moveRoomToWorldCoords(neighbourN);
        }
        if (neighbourE != undefined && !neighbourE.positionUpdated) {
            neighbourE.mtxLocal.translation = new ƒ.Vector3(neighbourE.coordinates.x * (_firstRoom.roomSize / 2 + neighbourE.roomSize / 2), neighbourE.coordinates.y * (_firstRoom.roomSize / 2 + neighbourE.roomSize / 2), -0.01);
            neighbourE.positionUpdated = true;
            moveRoomToWorldCoords(neighbourE);
        }
        if (neighbourS != undefined && !neighbourS.positionUpdated) {
            neighbourS.mtxLocal.translation = new ƒ.Vector3(neighbourS.coordinates.x * (_firstRoom.roomSize / 2 + neighbourS.roomSize / 2), neighbourS.coordinates.y * (_firstRoom.roomSize / 2 + neighbourS.roomSize / 2), -0.01);
            neighbourS.positionUpdated = true;
            moveRoomToWorldCoords(neighbourS);
        }
        if (neighbourW != undefined && !neighbourW.positionUpdated) {
            neighbourW.mtxLocal.translation = new ƒ.Vector3(neighbourW.coordinates.x * (_firstRoom.roomSize / 2 + neighbourW.roomSize / 2), neighbourW.coordinates.y * (_firstRoom.roomSize / 2 + neighbourW.roomSize / 2), -0.01);
            neighbourW.positionUpdated = true;
            moveRoomToWorldCoords(neighbourW);
        }
    }
    function switchRoom(_direction) {
        if (Game.currentRoom.enemyCountManager.finished) {
            let newRoom;
            let newPosition;
            if (_direction.north) {
                newRoom = Generation.rooms.find(room => room.coordinates.equals(new ƒ.Vector2(Game.currentRoom.coordinates.x, Game.currentRoom.coordinates.y + 1)));
                newPosition = newRoom.getSpawnPointS;
            }
            if (_direction.east) {
                newRoom = Generation.rooms.find(room => room.coordinates.equals(new ƒ.Vector2(Game.currentRoom.coordinates.x + 1, Game.currentRoom.coordinates.y)));
                newPosition = newRoom.getSpawnPointW;
            }
            if (_direction.south) {
                newRoom = Generation.rooms.find(room => room.coordinates.equals(new ƒ.Vector2(Game.currentRoom.coordinates.x, Game.currentRoom.coordinates.y - 1)));
                newPosition = newRoom.getSpawnPointN;
            }
            if (_direction.west) {
                newRoom = Generation.rooms.find(room => room.coordinates.equals(new ƒ.Vector2(Game.currentRoom.coordinates.x - 1, Game.currentRoom.coordinates.y)));
                newPosition = newRoom.getSpawnPointE;
            }
            if (newRoom == undefined) {
                console.error("no room found");
                return;
            }
            addRoomToGraph(newRoom);
            if (Networking.client.id == Networking.client.idHost) {
                Game.avatar1.cmpTransform.mtxLocal.translation = newPosition.toVector3();
                Game.avatar2.cmpTransform.mtxLocal.translation = newPosition.toVector3();
            }
        }
    }
    Generation.switchRoom = switchRoom;
    function startLevel() {
        let newPosition = new Game.ƒ.Vector2(0, 0);
        if (Game.avatar2 != undefined && Networking.client.id == Networking.client.idHost) {
            Game.avatar1.mtxLocal.translation = newPosition.toVector3();
            Game.avatar2.mtxLocal.translation = newPosition.toVector3();
        }
        addRoomToGraph(Generation.rooms[0]);
    }
    /**
     * removes erything unreliable from the graph and adds the new room to the graph , sending it to the client & spawns enemies if existing in room
     * @param _room the room it should spawn
     */
    function addRoomToGraph(_room) {
        Networking.sendRoom({ coordinates: _room.coordinates, roomSize: _room.roomSize, exits: _room.exits, roomType: _room.roomType, translation: _room.mtxLocal.translation });
        let oldObjects = Game.graph.getChildren().filter(elem => (elem.tag != Tag.TAG.PLAYER));
        oldObjects = oldObjects.filter(elem => (elem.tag != Tag.TAG.UI));
        oldObjects.forEach((elem) => {
            Game.graph.removeChild(elem);
        });
        Game.graph.addChild(_room);
        Game.viewport.calculateTransforms();
        if (Networking.client.id == Networking.client.idHost) {
            _room.onAddToGraph();
        }
        _room.walls.forEach(wall => {
            wall.setCollider();
            if (wall.door != undefined) {
                wall.door.setCollider();
            }
        });
        Game.currentRoom = _room;
        EnemySpawner.spawnMultipleEnemiesAtRoom(Game.currentRoom.enemyCountManager.getMaxEnemyCount, Game.currentRoom.mtxLocal.translation.toVector2());
    }
    Generation.addRoomToGraph = addRoomToGraph;
})(Generation || (Generation = {}));
var Entity;
(function (Entity) {
    Entity.txtShadow = new Game.ƒ.TextureImage();
    Entity.txtShadowRound = new Game.ƒ.TextureImage();
    class Shadow extends Game.ƒ.Node {
        mesh = new ƒ.MeshQuad();
        shadowMatt = new ƒ.Material("shadow", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Entity.txtShadow));
        shadowParent;
        cmpMaterial;
        constructor(_parent) {
            super("shadow");
            this.shadowParent = _parent;
            this.addComponent(new Game.ƒ.ComponentMesh(this.mesh));
            this.cmpMaterial = new ƒ.ComponentMaterial(this.shadowMatt);
            this.cmpMaterial.sortForAlpha = true;
            this.addComponent(this.cmpMaterial);
            this.addComponent(new Game.ƒ.ComponentTransform());
            _parent.addChild(this);
        }
        updateShadowPos() {
            this.mtxLocal.translation = new ƒ.Vector3(0, 0, this.shadowParent.mtxLocal.translation.z * -1);
            if (this.shadowParent instanceof Entity.Entity) {
                let offsetY = (this.shadowParent.shadowOffsetY * this.shadowParent.attributes.getScale);
                if (offsetY < this.shadowParent.shadowOffsetY) {
                    offsetY = (this.shadowParent.shadowOffsetY / this.shadowParent.attributes.getScale);
                }
                this.mtxLocal.translateY(-((this.shadowParent.spriteScaleFactor / (this.mtxWorld.scaling.y * this.shadowParent.spriteScaleFactor))) - offsetY);
                this.mtxLocal.translateX(this.shadowParent.shadowOffsetX);
            }
        }
    }
    Entity.Shadow = Shadow;
    class ShadowRound extends Shadow {
        shadowMatRound = new ƒ.Material("shadow", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Entity.txtShadowRound));
        constructor(_parent) {
            super(_parent);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.shadowMatRound;
        }
        updateShadowPos() {
            let factor = (this.shadowParent.mtxLocal.translation.z * 0.1) + 1;
            this.mtxLocal.translation = new ƒ.Vector3(0, 0, this.shadowParent.mtxLocal.translation.z * -1);
            this.mtxLocal.scaling = new Game.ƒ.Vector3(1 * factor, 1 * factor, 1 * factor);
        }
    }
    Entity.ShadowRound = ShadowRound;
})(Entity || (Entity = {}));
var Weapons;
(function (Weapons) {
    let AIM;
    (function (AIM) {
        AIM[AIM["NORMAL"] = 0] = "NORMAL";
        AIM[AIM["HOMING"] = 1] = "HOMING";
    })(AIM = Weapons.AIM || (Weapons.AIM = {}));
    let WEAPONTYPE;
    (function (WEAPONTYPE) {
        WEAPONTYPE[WEAPONTYPE["RANGEDWEAPON"] = 0] = "RANGEDWEAPON";
        WEAPONTYPE[WEAPONTYPE["MELEEWEAPON"] = 1] = "MELEEWEAPON";
        WEAPONTYPE[WEAPONTYPE["THORSHAMMERWEAPON"] = 2] = "THORSHAMMERWEAPON";
    })(WEAPONTYPE = Weapons.WEAPONTYPE || (Weapons.WEAPONTYPE = {}));
    class Weapon {
        ownerNetId;
        get owner() { return Game.entities.find(elem => elem.netId == this.ownerNetId); }
        ;
        cooldown;
        get getCoolDown() { return this.cooldown; }
        ;
        attackCount;
        get getAttackCount() { return this.attackCount; }
        ;
        currentAttackCount;
        aimType;
        bulletType = Bullets.BULLETTYPE.STANDARD;
        projectileAmount = 1;
        constructor(_cooldownTime, _attackCount, _bulletType, _projectileAmount, _ownerNetId, _aimType) {
            this.attackCount = _attackCount;
            this.currentAttackCount = _attackCount;
            this.bulletType = _bulletType;
            this.projectileAmount = _projectileAmount;
            this.ownerNetId = _ownerNetId;
            this.aimType = _aimType;
            this.cooldown = new Ability.Cooldown(_cooldownTime);
        }
        inaccuracy(_direciton) {
            _direciton.x = _direciton.x + Math.random() * 10 / this.owner.attributes.accuracy - Math.random() * 10 / this.owner.attributes.accuracy;
            _direciton.y = _direciton.y + Math.random() * 10 / this.owner.attributes.accuracy - Math.random() * 10 / this.owner.attributes.accuracy;
        }
        fire(_magazine) {
            _magazine.forEach(bullet => {
                bullet.spawn();
            });
        }
    }
    Weapons.Weapon = Weapon;
    class RangedWeapon extends Weapon {
        magazin;
        get getMagazin() { return this.magazin; }
        ;
        set setMagazin(_magazin) { this.magazin = _magazin; }
        ;
        ItemFunctions = [];
        shoot(_direction, _sync, _bulletNetId) {
            let _position = this.owner.mtxLocal.translation.toVector2();
            if (_sync) {
                if (this.currentAttackCount <= 0 && !this.cooldown.hasCooldown) {
                    this.currentAttackCount = this.attackCount;
                }
                if (this.currentAttackCount > 0 && !this.cooldown.hasCooldown) {
                    if (this.owner.attributes.accuracy < 100) {
                        this.inaccuracy(_direction);
                    }
                    this.magazin = this.loadMagazine(_position, _direction, this.bulletType, _bulletNetId);
                    this.processItemEffects();
                    this.sendMagazin();
                    this.fire(this.magazin);
                    this.currentAttackCount--;
                    if (this.currentAttackCount <= 0 && !this.cooldown.hasCooldown) {
                        this.cooldown.setMaxCoolDown = this.cooldown.getMaxCoolDown * this.owner.attributes.coolDownReduction;
                        this.cooldown.startCooldown();
                    }
                }
            }
            else {
                this.processItemEffects();
                this.fire(this.magazin);
            }
        }
        sendMagazin() {
            let bulletType = [];
            let directions = [];
            let netIds = [];
            let targets = [];
            let magazinpayload;
            if (this.aimType == AIM.NORMAL) {
                this.magazin.forEach(bul => { bulletType.push(bul.type); directions.push(bul.direction.toVector2()); netIds.push(bul.netId); });
                magazinpayload = { bulletTypes: bulletType, directions: directions, ownerNetId: this.ownerNetId, netIds: netIds };
            }
            else {
                this.magazin.forEach(bul => { bulletType.push(bul.type); directions.push(bul.direction.toVector2()); netIds.push(bul.netId); targets.push(bul.target); });
                magazinpayload = { bulletTypes: bulletType, directions: directions, ownerNetId: this.ownerNetId, netIds: netIds, targets: targets };
            }
            Networking.sendMagazin(magazinpayload);
        }
        fire(_magazine) {
            super.fire(_magazine);
            this.magazin = [];
        }
        addFunction(_func) {
            this.ItemFunctions.push(_func);
        }
        deleteFunction(_func) {
            this.ItemFunctions.splice(this.ItemFunctions.indexOf(_func), 1);
        }
        processItemEffects() {
            this.ItemFunctions.forEach(func => {
                func();
            });
        }
        loadMagazine(_position, _direction, _bulletType, _netId) {
            let magazine = [];
            for (let i = 0; i < this.projectileAmount; i++) {
                switch (this.aimType) {
                    case AIM.NORMAL:
                        magazine.push(new Bullets.NormalBullet(this.bulletType, _position, _direction, this.ownerNetId, _netId));
                        break;
                    case AIM.HOMING:
                        magazine.push(new Bullets.HomingBullet(this.bulletType, _position, _direction, this.ownerNetId, null, _netId));
                        break;
                }
            }
            return magazine;
        }
        getType() {
            return WEAPONTYPE.RANGEDWEAPON;
        }
    }
    Weapons.RangedWeapon = RangedWeapon;
    class MeleeWeapon extends Weapon {
        shoot(_direction, _sync, _bulletNetId) {
            let newPos = this.owner.mtxLocal.translation.clone.toVector2();
            if (_direction.magnitude > 0) {
                _direction.normalize();
                _direction.scale(0.5);
            }
            newPos.add(_direction.toVector2());
            let swordCollider = new Collider.Collider(newPos, this.owner.swordRadius / 2, this.ownerNetId);
            Game.enemies.forEach(enemy => {
                if (swordCollider.collides(enemy.collider)) {
                    enemy.getDamage(this.owner.attributes.attackPoints);
                }
            });
            if (Networking.client.id != Networking.client.idHost && this.owner == Game.avatar1) {
                Networking.spawnBullet(null, _direction, null, this.ownerNetId);
            }
        }
        getType() {
            return WEAPONTYPE.MELEEWEAPON;
        }
    }
    Weapons.MeleeWeapon = MeleeWeapon;
    class ThorsHammer extends RangedWeapon {
        weaponStorage;
        constructor(_attackCount, _bulletType, _projectileAmount, _ownerNetId) {
            super(1, _attackCount, _bulletType, _projectileAmount, _ownerNetId, AIM.NORMAL);
            this.weaponStorage = this.owner.weapon;
            this.bulletType = Bullets.BULLETTYPE.THORSHAMMER;
        }
        getType() {
            return WEAPONTYPE.THORSHAMMERWEAPON;
        }
        shoot(_direction, _sync, _bulletNetId) {
            if (this.owner.items.find(item => item.id == Items.ITEMID.THORSHAMMER) != null) {
                let _position = this.owner.mtxLocal.translation.toVector2();
                if (_sync) {
                    if (this.currentAttackCount <= 0 && !this.cooldown.hasCooldown) {
                        this.currentAttackCount = this.attackCount;
                    }
                    if (this.currentAttackCount > 0 && !this.cooldown.hasCooldown) {
                        this.magazin = this.loadMagazine(_position, _direction, this.bulletType, _bulletNetId);
                        this.sendMagazin();
                        this.fire(this.magazin);
                        this.currentAttackCount--;
                        if (this.currentAttackCount <= 0 && !this.cooldown.hasCooldown) {
                            this.cooldown.setMaxCoolDown = this.cooldown.getMaxCoolDown * this.owner.attributes.coolDownReduction;
                            this.cooldown.startCooldown();
                        }
                    }
                }
                else {
                    this.fire(this.magazin);
                }
            }
        }
        fire(_magazine) {
            super.fire(_magazine);
            let removeItem = this.owner.items.find(item => item.id == Items.ITEMID.THORSHAMMER);
            if (removeItem != undefined) {
                this.owner.items.splice(this.owner.items.indexOf(removeItem), 1);
            }
        }
    }
    Weapons.ThorsHammer = ThorsHammer;
})(Weapons || (Weapons = {}));