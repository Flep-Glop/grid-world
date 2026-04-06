// --- Coordinate/Tile Utilities ---

function resizeCanvas() {
    const scaleX = window.innerWidth / canvas.width;
    const scaleY = window.innerHeight / canvas.height;
    const scale = Math.min(scaleX, scaleY);

    canvas.style.width = `${canvas.width * scale}px`;
    canvas.style.height = `${canvas.height * scale}px`;
}

function worldToTile(worldX, worldY) {
    return {
        row: Math.floor(worldY / MAP_TILE_SIZE),
        column: Math.floor(worldX / MAP_TILE_SIZE)
    };
}

function drawCoordinates(row, column) {
    ctx.fillStyle = 'white';
    ctx.font = '8px Arial';
    ctx.fillText(row + ", " + column, column * MAP_TILE_SIZE, row * MAP_TILE_SIZE);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(column * MAP_TILE_SIZE, row * MAP_TILE_SIZE, MAP_TILE_SIZE, MAP_TILE_SIZE);
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

function tileKey(row, column) {
    return row * MAP_COLUMNS + column;
}

function tileRow(key) {
    return Math.floor(key / MAP_COLUMNS);
}

function tileColumn(key) {
    return key % MAP_COLUMNS;
}


// --- Side Panel Utilities ---

function getInventorySlotPosition(e) {
    let pos = getCanvasPosition(e);
    return sidePanel.getClickedSlot(pos.canvasX, pos.canvasY);
}

function handlePanelClick(e) {
    let pos = getCanvasPosition(e);
    sidePanel.handleClick(pos.canvasX, pos.canvasY);
}

function isClickOnPanel(e) {
    let pos = getCanvasPosition(e);
    return sidePanel.isInBounds(pos.canvasX, pos.canvasY);
}

function checkInventoryFull() {
    return !localSave.inventoryItems.includes(null);
}


// --- XP/Leveling Utilities ---

let xpDropYOffset = 0;
function awardXP(skill, amount) {
    const key = skill.toLowerCase() + "XP";
    localSave[key] += amount;
    xpDrops.push(new ExperienceDrop({ skill, amount, yOffset: xpDropYOffset }));
    xpDropYOffset += 15;
    setTimeout(() => { xpDropYOffset -= 15; }, 50);
}

function getLevel(xp) {
    let level = 1
    for (const threshold of XP_THRESHOLDS) {
        if (xp >= threshold) level++;
    }
    return level;
}


// --- General Utilities ---

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
