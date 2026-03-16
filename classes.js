class Sprite {
    constructor({ image, position, frames = { max: 1 }, sprites = [] }) {
        this.position = position;
        this.image = image;
        this.frames = {...frames, val: 0, elapsed: 0 };
        
        this.image.onload = () => {
            this.width = this.image.width / this.frames.max;
            this.height = this.image.height;
        };
        this.moving = false;
        this.sprites = sprites;
    }

    draw() {
        c.drawImage(
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
        c.drawImage(
            this.image, 
            0,
            0,
            this.image.width,
            this.image.height,
            this.position.column * TILE_SIZE,
            this.position.row * TILE_SIZE,
            this.width,
            this.height
        )
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
        c.drawImage(
            this.image,
            0,
            0,
            this.image.width,
            this.image.height,
            this.position.column * TILE_SIZE,
            this.position.row * TILE_SIZE,
            this.image.width,
            this.image.height
        )
        
    }

}

class Player {
    constructor({ image, position }) {
        this.image = image;
        this.position = position;
        this.startRow = position.row;
        this.startColumn = position.column;
        this.currentRow = 0;
        this.currentColumn = 0;
        this.targetRow = 0;
        this.targetColumn = 0;

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
                                x: j * TILE_SIZE,
                                y: i * TILE_SIZE
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
            // If the queueKey is already in closedSet
            if (this.closedSet.includes(queueKey)) {
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

    // Move the player along the storedPath
    movePlayer() {
        if (this.storedPath.length > 0) {
            let path = this.storedPath[0].split("x");
            let pathRow = Number(path[0]);
            let pathColumn = Number(path[1]);
            this.position.column = pathColumn;
            this.position.row = pathRow;
            this.startRow = pathRow;
            this.startColumn = pathColumn;
            this.storedPath.shift();
        }
    }

    // Draw the storedPath
    drawStoredPath() {
        for (let storedTile of this.storedPath) {
            let path = storedTile.split("x");
            let pathRow = Number(path[0]);
            let pathColumn = Number(path[1]);
            c.fillStyle = 'rgba(71, 82, 180, 0.3)'
            c.fillRect(pathColumn * TILE_SIZE, pathRow * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
    // Draw the player
    draw() {
        c.drawImage(
            this.image,
            0,
            0,
            this.image.width,
            this.image.height,
            this.position.column * TILE_SIZE,
            this.position.row * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE
        )
    }
}

class Boundary {
    constructor( { position } ) {
        this.position = position;
    }

    draw() {
        c.fillStyle = 'rgba(255, 0, 0, 0.5)'
        c.fillRect(this.position.x, this.position.y, TILE_SIZE, TILE_SIZE)
    }
}
