function checkInventoryFull() {
    return !localSave.inventoryItems.includes(null);
}

function getLevel(xp) {
    if (xp < 5) {
        return 1;
    }
    else if (xp >= 5 && xp < 10) {
        return 2;
    }
    else if (xp >= 10 && xp < 15) {
        return 3;
    }
    else if (xp >= 15 && xp < 20) {
        return 4;
    }
    else if (xp >=20 && xp < 50) {
        return 5;
    }
    else if (xp >= 50 && xp < 100) {
        return 6;
    }
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

function chooseCombatMove() {
    const possibleMoves = ["slash"]
    combatMove = possibleMoves[0]
    return combatMove;
}

function executeCombatMove(combatMove) {
    switch (combatMove) {
        case "slash":
            player.slashAccuracy = 0.75
            if (Math.random() < player.slashAccuracy) {
                goblin.currentHealth -= player.attackDamage;
                console.log("Goblin health: ", goblin.currentHealth);
                return goblin.currentHealth;
            }
            else {
                console.log("Player attack missed");
                return
            }
    }
}

function enemyCombatMove() {
    enemySlashDamage = 10
    enemyAttackAccuracy = 0.75
    if (Math.random() < enemyAttackAccuracy) {
        player.currentHealth -= enemySlashDamage;
        console.log("Player health: ", player.currentHealth);
    }
    else {
        console.log("Enemy attack missed");
    }
    return
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
    return
}

function checkForPlayerDeath() {
    if (player.currentHealth <= 0) {
        player.isDead = true;
        console.log("Player is dead");
    }
    return
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
