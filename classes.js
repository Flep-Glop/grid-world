class Sprite {
    constructor({ image, position, frames = { max: 1 } }) {
        this.position = position;
        this.image = image;
        this.frames = {...frames, val: 0, elapsed: 0 };
        
        this.image.onload = () => {
            this.width = this.image.width / this.frames.max;
            this.height = this.image.height;
        };
    }

    draw() {
        ctx.drawImage(
            this.image,
            this.frames.val * this.width,
            0,
            this.image.width / this.frames.max,
            this.image.height,
            this.position.x,
            this.position.y,
            this.image.width / this.frames.max,
            this.image.height
        )

        if (this.frames.max > 1) {
            this.frames.elapsed++
        }
        if (this.frames.elapsed % 10 === 0) {
            if (this.frames.val < this.frames.max - 1) this.frames.val++
            else this.frames.val = 0
        }
    }
}

class SidePanelUI {
    constructor() {
        this.activeTab = "inventory";
        this.position = { x: 0, y: 0 };
        this.width = INVENTORY_COLUMNS * INVENTORY_TILE_SIZE;
        this.height = INVENTORY_ROWS * INVENTORY_TILE_SIZE;
    }

    draw() {
        let x = this.position.x;
        let y = this.position.y;

        this.drawTabRow(UPPER_TABS, x, y);
        y += TAB_SIZE;

        ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
        ctx.fillRect(x, y, this.width, this.height);
        this.drawContent(x, y);
        y += this.height;

        this.drawTabRow(LOWER_TABS, x, y);
    }

    drawTabRow(tabs, x, y) {
        for (let i = 0; i < tabs.length; i++) {
            let tx = x + i * TAB_SIZE;
            let active = tabs[i].id === this.activeTab;

            ctx.fillStyle = active ? "rgba(100, 80, 60, 0.9)" : "rgba(40, 35, 30, 0.8)";
            ctx.fillRect(tx, y, TAB_SIZE, TAB_SIZE);
            ctx.strokeStyle = active ? "#8a7a5a" : "#555";
            ctx.lineWidth = 0.5;
            ctx.strokeRect(tx + 0.25, y + 0.25, TAB_SIZE - 0.5, TAB_SIZE - 0.5);

            ctx.fillStyle = active ? "#fff" : "#aaa";
            ctx.font = "4px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(tabs[i].label, tx + TAB_SIZE / 2, y + TAB_SIZE / 2);
        }
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
    }

    drawContent(x, y) {
        if (this.activeTab === "inventory") {
            for (let i = 0; i < localSave.inventoryItems.length; i++) {
                let itemId = localSave.inventoryItems[i];
                if (itemId === null) continue;
                let render = ITEMS[itemId].render;
                let col = i % INVENTORY_COLUMNS;
                let row = Math.floor(i / INVENTORY_COLUMNS);
                ctx.drawImage(
                    mainSpriteSheet,
                    render.column * INVENTORY_TILE_SIZE, render.row * INVENTORY_TILE_SIZE,
                    INVENTORY_TILE_SIZE, INVENTORY_TILE_SIZE,
                    x + col * INVENTORY_TILE_SIZE, y + row * INVENTORY_TILE_SIZE,
                    INVENTORY_TILE_SIZE, INVENTORY_TILE_SIZE
                );
            }
        }
        else if (this.activeTab === "skills") {
            ctx.fillStyle = "#ccc";
            ctx.font = "5px Arial";
            let skills = [
                { name: "Mining", xp: localSave.miningXP },
                { name: "Strength", xp: localSave.strengthXP },
                { name: "Hitpoints", xp: localSave.hitpointsXP },
            ];
            for (let i = 0; i < skills.length; i++) {
                ctx.fillText(skills[i].name + ": Lv " + getLevel(skills[i].xp), x + 4, y + 10 + i * 12);
            }
        }
        else if (this.activeTab === "equipment") {
            let slotIndex = 0;
            for (let equipmentId of Object.values(localSave.equipmentItems)) {
                if (equipmentId === null) { slotIndex++; continue; }
                let render = ITEMS[equipmentId].render;
                let col = slotIndex % INVENTORY_COLUMNS;
                let row = Math.floor(slotIndex / INVENTORY_COLUMNS);
                ctx.drawImage(
                    mainSpriteSheet,
                    render.column * INVENTORY_TILE_SIZE, render.row * INVENTORY_TILE_SIZE,
                    INVENTORY_TILE_SIZE, INVENTORY_TILE_SIZE,
                    x + col * INVENTORY_TILE_SIZE, y + row * INVENTORY_TILE_SIZE,
                    INVENTORY_TILE_SIZE, INVENTORY_TILE_SIZE
                );
                slotIndex++;
            }
        }
        else {
            ctx.fillStyle = "#888";
            ctx.font = "5px Arial";
            ctx.textAlign = "center";
            ctx.fillText(this.activeTab, x + this.width / 2, y + this.height / 2);
            ctx.textAlign = "left";
        }
    }

    isInBounds(canvasX, canvasY) {
        let rx = canvasX - SIDE_PANEL_WORLD_X * ZOOM;
        let ry = canvasY - SIDE_PANEL_WORLD_Y * ZOOM;
        return rx >= 0 && rx < this.width * ZOOM
            && ry >= 0 && ry < (TAB_SIZE * 2 + this.height) * ZOOM;
    }

    handleClick(canvasX, canvasY) {
        let rx = canvasX - SIDE_PANEL_WORLD_X * ZOOM;
        let ry = canvasY - SIDE_PANEL_WORLD_Y * ZOOM;
        let tabH = TAB_SIZE * ZOOM;

        if (ry < tabH) {
            let i = Math.floor(rx / tabH);
            if (i < UPPER_TABS.length) this.activeTab = UPPER_TABS[i].id;
        }
        else if (ry >= tabH + this.height * ZOOM) {
            let i = Math.floor(rx / tabH);
            if (i < LOWER_TABS.length) this.activeTab = LOWER_TABS[i].id;
        }
    }

    getClickedSlot(canvasX, canvasY) {
        if (this.activeTab !== "inventory" && this.activeTab !== "equipment") return -1;
        let rx = canvasX - SIDE_PANEL_WORLD_X * ZOOM;
        let ry = canvasY - SIDE_PANEL_WORLD_Y * ZOOM - TAB_SIZE * ZOOM;
        if (rx < 0 || rx >= this.width * ZOOM) return -1;
        if (ry < 0 || ry >= this.height * ZOOM) return -1;
        let slot = Math.floor(ry / (INVENTORY_TILE_SIZE * ZOOM)) * INVENTORY_COLUMNS
                 + Math.floor(rx / (INVENTORY_TILE_SIZE * ZOOM));
        if (this.activeTab === "inventory") {
            return slot < INVENTORY_SLOTS ? slot : -1;
        }
        let equipmentKeys = Object.keys(localSave.equipmentItems);
        return slot < equipmentKeys.length ? slot : -1;
    }
}

class InteractiveObject {
    constructor({ image, position, action, offset = { x: 0, y: 0 } }) {
        this.image = image;
        this.position = position;
        this.action = action;
        this.offset = {
            x: offset.x,
            y: offset.y
        }
        this.image.onload = () => {
            this.width = this.image.width;
            this.height = this.image.height;
        }
    }
    
    draw() {
        ctx.drawImage(
            this.image,
            0,
            0,
            this.image.width,
            this.image.height,
            this.position.column * MAP_TILE_SIZE - this.offset.x,
            this.position.row * MAP_TILE_SIZE - this.offset.y,
            this.image.width,
            this.image.height
        )
        
    }

}

class ExperienceDrop {
    constructor({ skill, amount, yOffset }) {
        this.skill = skill;
        this.amount = amount;
        this.yOffset = yOffset || 0;
        this.frameCount = 0;
        this.duration = 1000;
        this.isDone = false;
    }

    draw() {
        ctx.font = "6px Arial";
        const progress = this.frameCount / this.duration;
        ctx.fillStyle = `rgb(255, 255, 255, ${1 - progress * 2})`;
        ctx.fillText(
            this.skill + ": " + this.amount + " XP",
            cameraX + 400,
            cameraY + 60 + this.yOffset - this.frameCount * 0.1
        );
        if (this.frameCount < this.duration) {
            this.frameCount++;
        } else {
            this.isDone = true;
        }
    }
}

class Enemy extends InteractiveObject {
    constructor({ image, enemyId, name, position, totalHealth, attackDamage, dropTable, respawnTimer, action , offset = { x: 0, y: 0 } }) {
        super({ image, position, action, offset });
        this.enemyId = enemyId;
        this.totalHealth = totalHealth;
        this.currentHealth = totalHealth;
        this.attackDamage = attackDamage;
        this.slashAccuracy = 0.75;
        this.dropTable = dropTable;
        this.name = name;
        this.isDead = false;
        this.respawnTimer = respawnTimer || 0;
    }
}

class Pathfinder {
    constructor(blockedTiles) {
        this.blockedTiles = blockedTiles;
    }

    static DIRS = [[-1,0],[1,0],[0,-1],[0,1],[-1,1],[1,1],[1,-1],[-1,-1]];

    getNeighbors(row, column) {
        return Pathfinder.DIRS
            .map(([dr, dc]) => [row + dr, column + dc])
            .filter(([r, c]) => r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLUMNS)
            .map(([r, c]) => tileKey(r, c));
    }

    calculateCost(key, startRow, startColumn, targetRow, targetColumn) {
        let keyRow = tileRow(key);
        let keyColumn = tileColumn(key);
        let costFromStart = Math.max(Math.abs(startRow - keyRow), Math.abs(startColumn - keyColumn));
        let costFromTarget = Math.max(Math.abs(targetRow - keyRow), Math.abs(targetColumn - keyColumn));
        return costFromStart + costFromTarget;
    }

    calculateClosedCost(key, targetRow, targetColumn) {
        let keyRow = tileRow(key);
        let keyColumn = tileColumn(key);
        return Math.max(Math.abs(targetRow - keyRow), Math.abs(targetColumn - keyColumn));
    }

    findPath(startRow, startColumn, targetRow, targetColumn) {
        let startKey = tileKey(startRow, startColumn);
        let targetKey = tileKey(targetRow, targetColumn);

        if (startKey === targetKey) return [];

        let queueSet = [];
        let closedSet = new Set();
        let parentMap = new Map();

        queueSet.push(startKey);

        while (queueSet.length > 0) {
            let minIdx = 0;
            for (let i = 1; i < queueSet.length; i++) {
                if (this.calculateCost(queueSet[i], startRow, startColumn, targetRow, targetColumn) <
                    this.calculateCost(queueSet[minIdx], startRow, startColumn, targetRow, targetColumn)) {
                    minIdx = i;
                }
            }
            let queueKey = queueSet.splice(minIdx, 1)[0];

            if (closedSet.has(queueKey) || this.blockedTiles.has(queueKey)) {
                continue;
            }

            if (queueKey === targetKey) {
                let path = [];
                let currentKey = queueKey;
                while (currentKey !== startKey) {
                    path.unshift(currentKey);
                    currentKey = parentMap.get(currentKey);
                }
                return path;
            }

            closedSet.add(queueKey);

            let neighbors = this.getNeighbors(tileRow(queueKey), tileColumn(queueKey));
            for (let neighbor of neighbors) {
                if (!parentMap.has(neighbor) && neighbor !== startKey) {
                    parentMap.set(neighbor, queueKey);
                }
                queueSet.push(neighbor);
            }
        }

        // No path found -- walk as close as possible
        let closedArray = Array.from(closedSet);
        closedArray.sort((a, b) =>
            this.calculateClosedCost(a, targetRow, targetColumn) -
            this.calculateClosedCost(b, targetRow, targetColumn)
        );
        let path = [];
        let currentKey = closedArray[0];
        while (currentKey !== startKey) {
            path.unshift(currentKey);
            currentKey = parentMap.get(currentKey);
        }
        return path;
    }
}

class Player {
    constructor({ sprites, initialState, position, offset, totalHealth, attackDamage }) {
        this.sprites = sprites;
        const initial = this.sprites[initialState];
        this.image = initial.image;
        this.currentState = initialState;
        this.frames = { max: initial.frames.max, val: 0, elapsed: 0 };
        this.position = position;
        this.startRow = position.row;
        this.startColumn = position.column;
        this.targetRow = 0;
        this.targetColumn = 0;
        this.offset = offset;
        this.totalHealth = totalHealth;
        this.currentHealth = totalHealth;
        this.attackDamage = attackDamage;
        this.image.onload = () => {
            this.width = this.image.width / this.frames.max;
            this.height = this.image.height;
        };

        this.isMining = false;
        this.isPickingUp = false;
        this.isAttacking = false;
        this.storedPath = [];

        this.interpStart = { x: 0, y: 0 };
        this.interpOffset = { x: 0, y: 0 };
        this.isMoving = false;
        this.moveStartTime = 0;

        const blockedTiles = new Set();
        for (let i = 0; i < collisions.length; i++) {
            if (collisions[i] === COLLISION_TILE_ID) {
                blockedTiles.add(i);
            }
        }
        this.pathfinder = new Pathfinder(blockedTiles);
    }

    generatePathway() {
        this.storedPath = this.pathfinder.findPath(
            this.startRow, this.startColumn,
            this.targetRow, this.targetColumn
        );
    }

    setState(stateName) {
        if (this.currentState === stateName) return;

        const animation = this.sprites[stateName];
        if (!animation) return;

        this.frames.max = animation.frames.max;
        this.frames.val = 0;
        this.frames.elapsed = 0;
        this.image = animation.image;
        this.currentState = stateName;
    }

    movePlayer() {
        if (this.storedPath.length > 0) {
            this.isMoving = true;
            this.setState("walking");

            let nextKey = this.storedPath[0];
            let pathRow = tileRow(nextKey);
            let pathColumn = tileColumn(nextKey);

            let deltaColumn = pathColumn - this.position.column;
            let deltaRow = pathRow - this.position.row;

            this.position.column = pathColumn;
            this.position.row = pathRow;
            this.startRow = pathRow;
            this.startColumn = pathColumn;
            localSave.position.column = pathColumn;
            localSave.position.row = pathRow;
            this.storedPath.shift();

            this.interpStart = {
                x: -deltaColumn * MAP_TILE_SIZE,
                y: -deltaRow * MAP_TILE_SIZE
            };

            this.moveStartTime = performance.now();
        }
        else {
            this.setState("idle");
            this.isMoving = false;
        }
    }

    mineRock() {
        if (!this.isMining) return;

        this.setState("mining");
        let miningResult = Math.floor(Math.random() * 2);
        console.log("Mining!", miningResult);

        if (miningResult === 1) {
            this.isMining = false;
            this.setState("idle");
            console.log("You mined a tin!");
            awardXP("Mining", ITEMS.tinOre.mining.xp);
            const emptySlot = findEmptyInventorySlot();
            if (!checkInventoryFull()) {
                localSave.inventoryItems[emptySlot] = ITEMS.tinOre.id;
                console.log("Inventory not full, adding tin ore");
            }
            else {
                dropItem(ITEMS.tinOre, this.position);
                console.log("Inventory full, dropping tin ore");
            }
        }
    }

    attackEnemy() {
        processCombatEncounter();
    }

    pickUpItem() {
        if (!this.isPickingUp) return;
        if (checkInventoryFull()) {
            this.isPickingUp = false;
            return;
        }
        const itemFound = droppedItems.find( item =>
            item.position.row === this.targetRow &&
            item.position.column === this.targetColumn
        );
        if (!itemFound) {
            this.isPickingUp = false;
            return;
        }
        droppedItems.splice(droppedItems.indexOf(itemFound), 1);
        const emptySlot = findEmptyInventorySlot();
        localSave.inventoryItems[emptySlot] = itemFound.itemId;
        this.isPickingUp = false;
    }

    drawStoredPath() {
        for (let key of this.storedPath) {
            let pathRow = tileRow(key);
            let pathColumn = tileColumn(key);
            ctx.fillStyle = 'rgba(71, 82, 180, 0.3)';
            ctx.fillRect(pathColumn * MAP_TILE_SIZE, pathRow * MAP_TILE_SIZE, MAP_TILE_SIZE, MAP_TILE_SIZE);
        }
    }

    draw() {
        ctx.drawImage(
            this.image,
            this.frames.val * (this.image.width / this.frames.max),
            0,
            this.image.width / this.frames.max,
            this.image.height,
            this.position.column * MAP_TILE_SIZE - this.offset.x + this.interpOffset.x,
            this.position.row * MAP_TILE_SIZE - this.offset.y + this.interpOffset.y,
            this.image.width / this.frames.max,
            this.image.height
        )
        if (this.frames.max > 1) {
            this.frames.elapsed++
        }
        if (this.frames.elapsed % 20 === 0) {
            if (this.frames.val < this.frames.max - 1) this.frames.val++
            else this.frames.val = 0
        }
    }
}

class Boundary {
    constructor( { position } ) {
        this.position = position;
    }

    draw() {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'
        ctx.fillRect(this.position.x, this.position.y, MAP_TILE_SIZE, MAP_TILE_SIZE)
    }
}

class DroppedItem {
    constructor({ itemId, position }) {
        this.itemId = itemId;
        this.position = {
            column: position.column,
            row: position.row
        };
    }

    draw() {
        const render = ITEMS[this.itemId].render;
        ctx.drawImage(
            mainSpriteSheet,
            render.column * MAP_TILE_SIZE,
            render.row * MAP_TILE_SIZE,
            MAP_TILE_SIZE,
            MAP_TILE_SIZE,
            this.position.column * MAP_TILE_SIZE,
            this.position.row * MAP_TILE_SIZE,
            MAP_TILE_SIZE,
            MAP_TILE_SIZE
        )
    }
}

class ActionDisplay {
    constructor({ actionId, hoverPosition }) {
        this.actionId = actionId;
        this.position = {
            column: hoverPosition.column,
            row: hoverPosition.row
        };
    }

    draw() {
        const render = ACTIONS[this.actionId].render;
        ctx.drawImage(
            actionSpriteSheet,
            render.column * ACTION_TILE_SIZE,
            render.row * ACTION_TILE_SIZE,
            ACTION_TILE_SIZE,
            ACTION_TILE_SIZE,
            this.position.column * MAP_TILE_SIZE - (ACTION_TILE_SIZE - MAP_TILE_SIZE) / 2,
            this.position.row * MAP_TILE_SIZE - (ACTION_TILE_SIZE - MAP_TILE_SIZE) / 2,
            ACTION_TILE_SIZE,
            ACTION_TILE_SIZE
        )
    }
}