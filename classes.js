class Sprite {
    constructor({ image, position, frames = { max: 1 }, sprites = [] }) {
        this.position = position;
        this.image = image;
        this.frames = {...frames, val: 0, elapsed: 0 };
        
        this.image.onload = () => {
            this.width = this.image.width / this.frames.max;
            this.height = this.image.height;
        };
        this.sprites = sprites;
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

        if (!this.moving) return
        if (this.frames.max > 1) {
            this.frames.elapsed++
        }
        if (this.frames.elapsed % 10 === 0) {
            if (this.frames.val < this.frames.max - 1) this.frames.val++
            else this.frames.val = 0
        }
    }
}

class Item {
    constructor({ name, description, image, position }) {
        this.name = name;
        this.description = description;
        this.image = image;
        this.position = position;
        this.image.onload = () => {
            this.width = this.image.width
            this.height = this.image.height
        };
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
            this.width,
            this.height
        )
    }
}

class InventoryUI {
    constructor({ inventoryItems, full}) {
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
        this.image = new Image();
        this.image.src = `img/book.png`;
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
    constructor({ image, position }) {
        this.image = image;
        this.position = position;

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
    constructor({ skill, amount, position }) {
        this.skill = skill;
        this.amount = amount;
        this.position = {
            x: position.x,
            y: position.y
        };
        this.frameCount = 0;
        this.duration = 180;
        this.isDone = false;
    }

    draw() {
        const progress = this.frameCount / this.duration;
        ctx.fillStyle = `rgb(255, 255, 255, ${1 - progress})`
        ctx.fillText(this.skill + ": " +this.amount + " XP",
            this.position.x,
            this.position.y - this.frameCount * 0.1)
        if (this.frameCount < 400) {
            this.frameCount++;
        }
        else {
            xpDrops.shift();
            this.isDone = true;
            this.frameCount = 0;
        }
    }
}

class Enemy {
    constructor({ image, position, totalHealth, attackDamage, dropTable, respawnTimer }) {
        this.image = image;
        this.position = position;
        this.totalHealth = totalHealth;
        this.currentHealth = totalHealth;
        this.attackDamage = attackDamage;
        this.slashAccuracy = 0.75;
        this.dropTable = dropTable;
        this.isDead = false;
        this.respawnTimer = respawnTimer;
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
        this.currentRow = 0;
        this.currentColumn = 0;
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
        this.isSmelting = false;
        this.isPickingUp = false;
        this.isAttacking = false;
        this.smeltingProgress = 0;
        this.queueSet = [];
        this.closedSet = [];
        this.collisionsMap = [];
        this.boundaries = [];
        this.boundaryKeys = [];
        this.storedPath = [];

        for (let i = 0; i < collisions.length; i+=MAP_COLUMNS) {
            this.collisionsMap.push(collisions.slice(i,i+MAP_COLUMNS));
        }

        this.collisionsMap.forEach((row, i) => {
            row.forEach((symbol, j) => {
                if (symbol === COLLISION_TILE_ID) {
                    this.boundaries.push(
                        new Boundary({
                            position: {
                                x: j * MAP_TILE_SIZE,
                                y: i * MAP_TILE_SIZE
                            }
                        })
                    )
                    this.boundaryKeys.push(`${i}x${j}`);
                }
            })
        })
    }

    getNeighbors(row, column) {
        let neighbors = [];
        if (row - 1 >= 0)
            neighbors.push(`${row - 1}x${column}`);
        if (row + 1 <= MAP_ROWS - 1)
            neighbors.push(`${row + 1}x${column}`);
        if (column - 1 >= 0)
            neighbors.push(`${row}x${column - 1}`);
        if (column + 1 <= MAP_COLUMNS - 1)
            neighbors.push(`${row}x${column + 1}`);
        if (column + 1 <= MAP_COLUMNS - 1 && row - 1 >= 0)
            neighbors.push(`${row - 1}x${column + 1}`);
        if (column + 1 <= MAP_COLUMNS - 1 && row + 1 <= MAP_ROWS - 1)
            neighbors.push(`${row + 1}x${column + 1}`);
        if (column - 1 >= 0 && row + 1 <= MAP_ROWS - 1)
            neighbors.push(`${row + 1}x${column - 1}`);
        if (column - 1 >= 0 && row - 1 >= 0)
            neighbors.push(`${row - 1}x${column - 1}`);
        return neighbors;
    }

    calculateCost(a) {
        let key = a.split("x");
        let keyRow = Number(key[0]);
        let keyColumn = Number(key[1]);

        let costFromStart = Math.max(Math.abs(this.startRow - keyRow), Math.abs(this.startColumn - keyColumn));
        let costFromTarget = Math.max(Math.abs(this.targetRow - keyRow), Math.abs(this.targetColumn - keyColumn));

        let totalCost = costFromStart + costFromTarget;
        return totalCost;
    }

    calculateClosedCost(a) {
        let key = a.split("x");
        let keyRow = Number(key[0]);
        let keyColumn = Number(key[1]);

        let costFromTarget = Math.max(Math.abs(this.targetRow - keyRow), Math.abs(this.targetColumn - keyColumn));
        return costFromTarget;
    }

    sortQueue() {
        this.queueSet.sort((a, b) => this.calculateCost(a) - this.calculateCost(b));
    }

    sortClosedSet() {
        this.closedSet.sort((a, b) => this.calculateClosedCost(a) - this.calculateClosedCost(b));
    }

    generatePathway() {
        // Reset pathfinding variables
        this.storedPath = [];
        this.queueSet = [];
        this.closedSet = [];
        let parentMap = {};
        let startKey = `${this.startRow}x${this.startColumn}`;
        let targetKey = `${this.targetRow}x${this.targetColumn}`;

        // Add startKey to queue
        this.queueSet.push(startKey);

        // While queueSet is not empty, sort and filter the queue
        while (this.queueSet.length > 0) {
            this.sortQueue();
            let queueKey = this.queueSet[0];
            if (startKey === targetKey) {
                this.storedPath = [];
                return;
            }
            // If the queueKey is already in closedSet
            else if (this.closedSet.includes(queueKey)) {
                this.queueSet.shift();
                continue;
            }
            // If the queueKey is a boundary
            else if (this.boundaryKeys.includes(queueKey)) {
                this.queueSet.shift();
                continue;
            }
            // If target is found
            else if (queueKey === targetKey) {
                let currentKey = queueKey;
                while (currentKey != startKey) {
                    this.storedPath.unshift(currentKey);
                    currentKey = parentMap[currentKey];
                }
                break;
            }
            // If the queueKey is not the target, in closedSet, or a boundary
            else {
                // Add the queueKey to closedSet
                this.closedSet.push(queueKey);

                // Remove queueKey from queueSet, set new currentRow and currentColumn, and get neighbors
                let expandedKey = this.queueSet.shift();
                let parts = expandedKey.split("x");
                this.currentRow = Number(parts[0]);
                this.currentColumn = Number(parts[1]);
                
                let neighbors = this.getNeighbors(this.currentRow, this.currentColumn);
                for (let neighbor of neighbors) {
                    if (!parentMap[neighbor] && neighbor !== startKey) {
                        parentMap[neighbor] = expandedKey;
                    }
                    this.queueSet.push(neighbor);
                }
            }
        }
        if (this.storedPath.length === 0) {
            this.sortClosedSet();
            let currentKey = this.closedSet[0];
            while (currentKey != startKey) {
                this.storedPath.unshift(currentKey);
                currentKey = parentMap[currentKey];
            }

        }
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

    // Move the player along the storedPath
    movePlayer() {
        if (this.storedPath.length > 0) {
            this.setState("walking");
            let path = this.storedPath[0].split("x");
            let pathRow = Number(path[0]);
            let pathColumn = Number(path[1]);
            this.position.column = pathColumn;
            this.position.row = pathRow;
            this.startRow = pathRow;
            this.startColumn = pathColumn;
            localSave.position.column = pathColumn;
            localSave.position.row = pathRow;
            this.storedPath.shift();
        }
        else {
            this.setState("idle");
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
            xpDrops.push(tinOreDrop)
            const emptySlot = findEmptyInventorySlot();
            if (!checkInventoryFull()) {
                localSave.inventoryItems[emptySlot] = ITEMS.tinOre.id;
                console.log("Inventory not full, adding tin ore");
            }
            else {
                dropItem(ITEMS.tinOre, this.position);
                console.log("Inventory full, dropping tin ore");
            }
            localSave.miningXP += 1;
        }
    }

    smeltOre() {
        if (!this.isSmelting) return;
        //     this.setState("smelting");
        //     this.smeltingProgress++;
        //     console.log("Smelting!", this.smeltingProgress);
        //     if (this.smeltingProgress >= 3) {
        //         this.isSmelting = false;
        //         this.smeltingProgress = 0;
        //         this.setState("idle");
        //         console.log("You smelted a tin ingot!");
        //     }
        // }
    }

    attackEnemy() {
        if (!this.isAttacking) return;
        this.setState("attacking");
        combatMove = chooseCombatMove();
        executeCombatMove(combatMove);
        checkForEnemyDeath();
        if (goblin.isDead) {
            this.setState("idle");
            this.isAttacking = false;
            return;
        }
        enemyCombatMove();
        checkForPlayerDeath();
        if (goblin.isDead) {
            this.setState("idle");
            this.isAttacking = false;
            return;
        }
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
        )
        if (!itemFound) {
            this.isPickingUp = false;
            return;
        }
        droppedItems.splice(droppedItems.indexOf(itemFound), 1);
        const emptySlot = findEmptyInventorySlot();
        localSave.inventoryItems[emptySlot] = itemFound.itemId;
        this.isPickingUp = false;
    }

    // Draw the storedPath
    drawStoredPath() {
        for (let storedTile of this.storedPath) {
            let path = storedTile.split("x");
            let pathRow = Number(path[0]);
            let pathColumn = Number(path[1]);
            ctx.fillStyle = 'rgba(71, 82, 180, 0.3)'
            ctx.fillRect(pathColumn * MAP_TILE_SIZE, pathRow * MAP_TILE_SIZE, MAP_TILE_SIZE, MAP_TILE_SIZE);
        }
    }

    // Draw the player
    draw() {
        ctx.drawImage(
            this.image,
            this.frames.val * (this.image.width / this.frames.max),
            0,
            this.image.width / this.frames.max,
            this.image.height,
            this.position.column * MAP_TILE_SIZE - this.offset.x,
            this.position.row * MAP_TILE_SIZE - this.offset.y,
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