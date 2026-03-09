const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");

let tickCounter = 0;


function serverTick() {
    tickCounter++;

    const event = new Event("tick");
    document.dispatchEvent(event);
}

const tickRate = setInterval(serverTick, 600);

canvas.width = 1024;
canvas.height = 576;

const tileMap = [];

function populateTileMap() {
    for (let i = 0; i < canvas.width; i += 16) {
        for (let j = 0; j < canvas.height; j += 16) {
            tileMap.push({
                x: i,
                y: j,
                width: 15,
                height: 15
            });
        }
    }
}

populateTileMap();

function drawTileMap() {
    for (let i = 0; i < tileMap.length; i++) {
        c.fillStyle = "purple";
        c.fillRect(tileMap[i].x, tileMap[i].y, tileMap[i].width, tileMap[i].height);
    }
}
drawTileMap();

const player = {
    x: 0,
    y: 0,
    width: 16,
    height: 16
}

function drawPlayer() {
    c.fillStyle = "red";
    c.fillRect(player.x, player.y, player.width, player.height);
}
drawPlayer();

function drawClosedTile() {
    c.fillStyle = "blue";
    c.fillRect(currentColumn * 16, currentRow * 16, 16, 16);
}

function drawCurrentTile() {
    c.fillStyle = "green";
    c.fillRect(currentColumn * 16, currentRow * 16, 16, 16);
}

let startRow = 0;
let startColumn = 0;
let currentRow = 0;
let currentColumn = 0;
let targetRow = 0;
let targetColumn = 0;

let queueSet = [];
let closedSet = [];
let parentForTile = null;

function addNeighborsToQueue(currentRow, currentColumn) {
    if (currentRow - 1 >= 0) {
        upTileKey = `${currentRow - 1}x${currentColumn}`,
        queueSet.push(upTileKey);
    }
    if (currentRow + 1 <= 35) {
        downTileKey = `${currentRow + 1}x${currentColumn}`,
        queueSet.push(downTileKey);
    }
    if (currentColumn - 1 >= 0) {
        leftTileKey = `${currentRow}x${currentColumn - 1}`,
        queueSet.push(leftTileKey);
    }
    if (currentColumn + 1 <= 63) {
        rightTileKey = `${currentRow}x${currentColumn + 1}`,
        queueSet.push(rightTileKey);
    }
    if (currentColumn - 1 >= 0 && currentRow + 1 >= 0) {
        upLeftTileKey = `${currentRow + 1}x${currentColumn - 1}`,
        queueSet.push(upLeftTileKey);
    }
    if (currentColumn + 1 <= 63 && currentRow + 1 >= 0) {
        upRightTileKey = `${currentRow - 1}x${currentColumn - 1}`,
        queueSet.push(upRightTileKey);
    }
    if (currentColumn + 1 <= 63 && currentRow + 1 <= 35) {
        downRightTileKey = `${currentRow - 1}x${currentColumn + 1}`,
        queueSet.push(downRightTileKey);
    }
    if (currentColumn - 1 >= 0 && currentRow + 1 <= 35) {
        downLeftTileKey = `${currentRow + 1}x${currentColumn + 1}`,
        queueSet.push(downLeftTileKey);
    }
}

function calculateCost(a) {
    let key = a.split("x");
    let keyRow = Number(key[0]);
    let keyColumn = Number(key[1]);
    let costFromStart = Math.abs(startRow - keyRow) + Math.abs(startColumn - keyColumn);
    let costFromTarget = Math.abs(targetRow - keyRow) + Math.abs(targetColumn - keyColumn);
    let totalCost = costFromStart + costFromTarget;
    return totalCost;
}

function sortQueue() {
    queueSet.sort((a, b) => calculateCost(a) - calculateCost(b));
}

let storedPath = [];

function generatePathway() {
    storedPath = [];
    drawCurrentTile();
    queueSet = [];
    closedSet = [];
    parentForTile = null;
    let startKey = `${startRow}x${startColumn}`;
    let targetKey = `${targetRow}x${targetColumn}`;
    queueSet.push(startKey);
    while (queueSet.length > 0) {
        sortQueue();
        let queueKey = queueSet[0];
        if (queueKey === targetKey) {
            console.log("Target Found");
            break;
        }
        else if (closedSet.includes(queueKey)) {
            queueSet.shift();
            continue;
        }
        else {
            closedSet.push(queueKey);
            parentForTileKey = queueSet.shift();
            parentForTile = parentForTileKey.split("x");
            currentRow = Number(parentForTile[0]);
            currentColumn = Number(parentForTile[1]);
            drawClosedTile(currentRow, currentColumn);
            addNeighborsToQueue(currentRow, currentColumn);
            storedPath.push(parentForTileKey);
        }
    startRow = currentRow;
    startColumn = currentColumn;
    }
}

function movePlayer() {
    if (storedPath.length > 0) {
        for (let i=0; i < storedPath.length; i++) {
            let path = storedPath[0].split("x");
            let pathRow = Number(path[0]);
            let pathColumn = Number(path[1]);
            player.x = pathColumn * 16;
            player.y = pathRow * 16;
        }
    storedPath.shift();
    }
}

addEventListener('mousedown', (e) => {
    if (storedPath.length > 0) {
        let midPath = storedPath[0].split("x");
        let midPathRow = Number(midPath[0]);
        let midPathColumn = Number(midPath[1]);
        startRow = midPathRow;
        startColumn = midPathColumn;
    }
    targetRow = Math.floor(e.offsetY / 16);
    targetColumn = Math.floor(e.offsetX / 16);
    generatePathway();
});


function drawStoredPath() {
    for (let i = 0; i < storedPath.length; i++) {
        let path = storedPath[i].split("x");
        let pathRow = Number(path[0]);
        let pathColumn = Number(path[1]);
        c.fillStyle = "blue";
        c.fillRect(pathColumn * 16, pathRow * 16, 16, 16);
    }
}

document.addEventListener("tick", (e) => {
    movePlayer();
});

function animate() {
    window.requestAnimationFrame(animate);
    c.clearRect(0, 0, canvas.width, canvas.height);
    drawTileMap();
    drawPlayer();
    drawStoredPath();
}
animate();

// fix diagonal movement
// replace player rectangle with image
// replace grid with tileset
// add obstacles to the map