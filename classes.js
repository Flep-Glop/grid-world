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

class InventoryUI {
    constructor({ inventoryItems }) {
        this.inventoryItems = inventoryItems;
        this.slotSize = 16;
        this.slotRows = 7;
        this.slotColumns = 4;
        this.slots = this.slotRows * this.slotColumns;
        this.width = this.slotColumns * this.slotSize;
        this.height = this.slotRows * this.slotSize;
        this.position = {
            x: 570,
            y: 120
        };
    }

    draw() {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height)
        for (let i = 0; i < this.inventoryItems.length; i++) {
            const itemId = this.inventoryItems[i];
            if (itemId === null) continue;

            const render = ITEMS[itemId].render;
            const column = i % this.slotColumns;
            const row = Math.floor(i / this.slotColumns);
            const drawX = this.position.x + column * this.slotSize;
            const drawY = this.position.y + row * this.slotSize;

            ctx.drawImage(
                mainSpriteSheet,
                render.column * this.slotSize,
                render.row * this.slotSize,
                this.slotSize,
                this.slotSize,
                drawX, drawY, this.slotSize, this.slotSize
            );
        }
    }
}

class InteractiveObject {
    constructor({ image, position, action }) {
        this.image = image;
        this.position = position;
        this.action = action;
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
            this.position.column * MAP_TILE_SIZE,
            this.position.row * MAP_TILE_SIZE,
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
        this.duration = 180;
        this.isDone = false;
    }

    draw() {
        ctx.font = "6px Arial";
        const progress = this.frameCount / this.duration;
        ctx.fillStyle = `rgb(255, 255, 255, ${1 - progress * 2})`;
        ctx.fillText(
            this.skill + ": " + this.amount + " XP",
            cameraX + 400,
            cameraY + 60 + this.yOffset - this.frameCount * 0.4
        );
        if (this.frameCount < this.duration) {
            this.frameCount++;
        } else {
            this.isDone = true;
        }
    }
}

class Enemy extends InteractiveObject {
    constructor({ image, position, totalHealth, attackDamage, dropTable, respawnTimer, action }) {
        super({ image, position, action });
        this.totalHealth = totalHealth;
        this.currentHealth = totalHealth;
        this.attackDamage = attackDamage;
        this.slashAccuracy = 0.75;
        this.dropTable = dropTable;
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