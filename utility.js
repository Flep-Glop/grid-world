function worldToTile(worldX, worldY) {
    return {
        row: Math.floor(worldY / MAP_TILE_SIZE),
        column: Math.floor(worldX / MAP_TILE_SIZE)
    };
}

function tileKey(row, column) {
    return row * MAP_COLUMNS + column;
}

function tileRow(key) {
    return Math.floor(key / MAP_COLUMNS);
}

function tileColumn(key) {
    return key % MAP_COLUMNS;
}

function checkInventoryFull() {
    return !localSave.inventoryItems.includes(null);
}

let xpDropYOffset = 0;
function awardXP(skill, amount) {
    const key = skill.toLowerCase() + "XP";
    localSave[key] += amount;
    xpDrops.push(new ExperienceDrop({ skill, amount, yOffset: xpDropYOffset }));
    xpDropYOffset += 15;
    setTimeout(() => { xpDropYOffset -= 15; }, 50);
}

function getLevel(xp) {
    let level = 1;
    for (const threshold of XP_THRESHOLDS) {
        if (xp >= threshold) level++;
    }
    return level;
}

function resizeCanvas() {
    const scaleX = window.innerWidth / canvas.width;
    const scaleY = window.innerHeight / canvas.height;
    const scale = Math.min(scaleX, scaleY);

    canvas.style.width = `${canvas.width * scale}px`;
    canvas.style.height = `${canvas.height * scale}px`;
}

function preloadImages(playerAnimations) {
    const loaded = {};
    for (const [key, config] of Object.entries(playerAnimations)) {
        const img = new Image();
        img.src = config.src;
        loaded[key] = {
            image: img,
            frames: config.frames
        };
    }
    return loaded;
}


function getCanvasPosition(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    return {
        canvasX: canvasX,
        canvasY: canvasY
    }
}


function getWorldPosition(e) {
    const canvasPosition = getCanvasPosition(e);
    const worldX = canvasPosition.canvasX / ZOOM + cameraX;
    const worldY = canvasPosition.canvasY / ZOOM + cameraY;
    return {
        worldX: worldX,
        worldY: worldY
    }
}


function getInventorySlotPosition(e) {
    const  canvasPosition = getCanvasPosition(e);
    let inventorySlotPositions = [];
    for (let i = 0; i < INVENTORY_SLOTS; i++) {
        const column = i % INVENTORY_COLUMNS;
        const row = Math.floor(i / INVENTORY_COLUMNS);
        inventorySlotPositions.push({
            x: INVENTORY_CANVAS_X_START + column * INVENTORY_TILE_SIZE * ZOOM,
            y: INVENTORY_CANVAS_Y_START + row * INVENTORY_TILE_SIZE * ZOOM
        });
    }
    const clickedSlot = inventorySlotPositions.findIndex(slot =>
        canvasPosition.canvasX >= slot.x &&
        canvasPosition.canvasX <= slot.x + INVENTORY_TILE_SIZE * ZOOM &&
        canvasPosition.canvasY >= slot.y &&
        canvasPosition.canvasY <= slot.y + INVENTORY_TILE_SIZE * ZOOM
    );
    console.log("Inventory clicked on slot: ", clickedSlot);
    return clickedSlot;
}

/** Increments once per tick while player is adjacent and ready to fight; drives 0/2/4/6… phases. */
let combatEncounterTick = 0;
/** True after first tick we are in range (path cleared, next to goblin). */
let combatRangeLatch = false;
/** Wrong quiz answer: skip the next scheduled player strike (consumes that phase). */
let skipNextPlayerAttack = false;
/** Right quiz answer: next player strike that deals damage uses double damage. */
let doubleNextPlayerAttack = false;
/** After an answer is chosen, next question waits until the next player combat phase resolves. */
let combatQuizAwaitingPlayerTurn = false;

/** Floating damage numbers (world space). */
let combatHitSplats = [];

function isPlayerAdjacentToGoblinForCombat() {
    return (
        player.position.row === goblin.position.row &&
        player.position.column === goblin.position.column - 1
    );
}

function resetCombatEncounterState() {
    combatEncounterTick = 0;
    combatRangeLatch = false;
    skipNextPlayerAttack = false;
    doubleNextPlayerAttack = false;
    combatQuizAwaitingPlayerTurn = false;
    combatHitSplats = [];
    document.dispatchEvent(new CustomEvent("combatQuizClose"));
}

/**
 * Wrong: next player attack phase is skipped.
 * Right: next damaging player hit deals double damage (skip consumes the phase without using double).
 */
function registerQuizResult(isCorrect) {
    if (isCorrect) {
        doubleNextPlayerAttack = true;
    } else {
        skipNextPlayerAttack = true;
    }
}

function markCombatQuizAnswered() {
    combatQuizAwaitingPlayerTurn = true;
}

function tryAdvanceCombatQuizAfterPlayerTurn() {
    if (!combatQuizAwaitingPlayerTurn) return;
    combatQuizAwaitingPlayerTurn = false;
    document.dispatchEvent(new CustomEvent("combatQuizAdvanceQuestion"));
}

function executeCombatMove(combatMove, damageMultiplier = 1) {
    switch (combatMove) {
        case "slash":
            player.slashAccuracy = 0.75;
            if (Math.random() < player.slashAccuracy) {
                const dmg = Math.floor(player.attackDamage * damageMultiplier);
                awardXP("Strength", dmg * 4);
                awardXP("Hitpoints", dmg);
                goblin.currentHealth -= dmg;
                const gw = goblin.image.width > 0 ? goblin.image.width : MAP_TILE_SIZE;
                const gx = goblin.position.column * MAP_TILE_SIZE + gw / 2;
                const gy = goblin.position.row * MAP_TILE_SIZE;
                spawnCombatHitSplat(gx, gy, String(dmg), "#ff6b6b");
                console.log("Goblin health: ", goblin.currentHealth, damageMultiplier > 1 ? "(double damage)" : "");
                return goblin.currentHealth;
            }
            console.log("Player attack missed");
            return;
    }
}

function runPlayerCombatSwing() {
    player.setState("attacking");
    if (skipNextPlayerAttack) {
        skipNextPlayerAttack = false;
        console.log("Player attack skipped (quiz penalty)");
    } else {
        const mult = doubleNextPlayerAttack ? 2 : 1;
        doubleNextPlayerAttack = false;
        executeCombatMove("slash", mult);
        checkForEnemyDeath();
    }
    tryAdvanceCombatQuizAfterPlayerTurn();
}

function runEnemyCombatSwing() {
    const enemySlashDamage = goblin.attackDamage;
    const enemyAttackAccuracy = 0.75;
    if (Math.random() < enemyAttackAccuracy) {
        player.currentHealth -= enemySlashDamage;
        const px =
            player.position.column * MAP_TILE_SIZE -
            player.offset.x +
            player.interpOffset.x +
            (player.image.width / player.frames.max) / 2;
        const py =
            player.position.row * MAP_TILE_SIZE -
            player.offset.y +
            player.interpOffset.y;
        spawnCombatHitSplat(px, py, String(enemySlashDamage), "#6bcfff");
        console.log("Player health: ", player.currentHealth);
    } else {
        console.log("Enemy attack missed");
    }
}

function spawnCombatHitSplat(worldX, worldY, text, color) {
    combatHitSplats.push({
        x: worldX,
        y: worldY,
        text,
        color,
        frame: 0,
        duration: 45
    });
}

function updateAndDrawCombatOverlays() {
    const barW = 14;
    const barH = 4;

    if (!goblin.isDead) {
        const gw = goblin.image.width > 0 ? goblin.image.width : MAP_TILE_SIZE;
        const gx = goblin.position.column * MAP_TILE_SIZE + (gw - barW) / 2;
        const gy = goblin.position.row * MAP_TILE_SIZE - 8;
        drawHealthBar(gx, gy, barW, barH, goblin.currentHealth, goblin.totalHealth);
    }

    if (!player.isDead) {
        const pw = player.image.width / player.frames.max;
        const px =
            player.position.column * MAP_TILE_SIZE -
            player.offset.x +
            player.interpOffset.x +
            (pw - barW) / 2;
        const py =
            player.position.row * MAP_TILE_SIZE -
            player.offset.y +
            player.interpOffset.y -
            8;
        drawHealthBar(px, py, barW, barH, player.currentHealth, player.totalHealth);
    }

    for (let i = combatHitSplats.length - 1; i >= 0; i--) {
        const s = combatHitSplats[i];
        s.frame++;
        const t = s.frame / s.duration;
        if (t >= 1) {
            combatHitSplats.splice(i, 1);
            continue;
        }
        const alpha = 1 - t;
        const floatY = s.y - t * 22;
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = s.color;
        ctx.globalAlpha = alpha;
        ctx.fillText(s.text, s.x, floatY);
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

function drawHealthBar(x, y, w, h, current, total) {
    const ratio = Math.max(0, Math.min(1, total > 0 ? current / total : 0));
    ctx.fillStyle = "red";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#4c4";
    ctx.fillRect(x, y, Math.max(0, w * ratio), h);
}

/**
 * Player strikes on ticks 0,4,8,…; goblin on 2,6,10,… (relative to entering combat range).
 * Only runs while isAttacking and adjacent with no remaining path tiles.
 */
function processCombatEncounter() {
    if (!player.isAttacking || goblin.isDead) {
        if (combatRangeLatch) {
            resetCombatEncounterState();
        }
        return;
    }

    const inRange =
        isPlayerAdjacentToGoblinForCombat() && player.storedPath.length === 0;

    if (!inRange) {
        if (combatRangeLatch) {
            combatRangeLatch = false;
            combatEncounterTick = 0;
            skipNextPlayerAttack = false;
            doubleNextPlayerAttack = false;
            combatQuizAwaitingPlayerTurn = false;
            combatHitSplats = [];
            document.dispatchEvent(new CustomEvent("combatQuizClose"));
        }
        return;
    }

    if (!combatRangeLatch) {
        combatRangeLatch = true;
        combatEncounterTick = 0;
        document.dispatchEvent(new CustomEvent("combatQuizOpen"));
    }

    const phase = combatEncounterTick % COMBAT_ENCOUNTER_PERIOD;
    if (phase === 0) {
        runPlayerCombatSwing();
    } else if (phase === COMBAT_ENCOUNTER_PERIOD / 2) {
        runEnemyCombatSwing();
        checkForPlayerDeath();
    }

    combatEncounterTick++;

    if (goblin.isDead || player.isDead) {
        player.isAttacking = false;
        player.setState("idle");
        resetCombatEncounterState();
    }
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function rollDrop(dropTable) {
    let maxroll = 0;
    for (let itemDropRate of dropTable) {
        maxroll += itemDropRate.chance;
    }

    let roll = getRandomInt(maxroll);
    
    let cumulative = 0;
    for (let itemDropRate of dropTable) {
        cumulative += itemDropRate.chance;
        if (roll < cumulative) {
            return itemDropRate.item;
        }
    }
}

function checkForEnemyDeath() {
    if (goblin.currentHealth <= 0) {
        goblin.isDead = true;
        console.log("Goblin is dead");
        let alwaysDrop = DROP_TABLE.goblin.alwaysDrop;
        let rolledItem = rollDrop(DROP_TABLE.goblin.items);
        dropItem(ITEMS[alwaysDrop], goblin.position);
        dropItem(ITEMS[rolledItem], goblin.position);
    }
}

function checkForPlayerDeath() {
    if (player.currentHealth <= 0) {
        player.isDead = true;
        console.log("Player is dead");
    }
}

function drawCoordinates(row, column) {
    ctx.fillStyle = 'white';
    ctx.font = '8px Arial';
    ctx.fillText(row + ", " + column, column * MAP_TILE_SIZE, row * MAP_TILE_SIZE);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(column * MAP_TILE_SIZE, row * MAP_TILE_SIZE, MAP_TILE_SIZE, MAP_TILE_SIZE);
}

function respawnTimer() {
    if (goblin.isDead) {
        goblin.respawnTimer++;
        if (goblin.respawnTimer >= 10) {
            goblin.isDead = false;
            goblin.currentHealth = goblin.totalHealth;
            goblin.respawnTimer = 0;
        }
    }
}