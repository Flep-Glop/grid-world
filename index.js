const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");
const customContextMenu = document.getElementById("customContextMenu");

const TILE_SIZE = 16;
const MAP_COLUMNS = 64;
const MAP_ROWS = 36;
const COLLISION_TILE_ID = 4516;
const ZOOM = 2;

let cameraX = 0;
let cameraY = 0;

const playerAnimations = {
    idle: { src: "img/player-idle.png", frames: { max: 4 } },
    walking: { src: "img/player-walk.png", frames: { max: 8 } },
    mining: { src: "img/player-pickaxe.png", frames: { max: 6 } },
}

let localSave = {
    inventoryItems: [
        null, null, null, null, 
        null, null, null, null, 
        null, null, null, null, 
        null, null, null, null, 
        null, null, null, null, 
        null, null, null, null, 
        null, null, null, null ],
    miningXP: 0,
    smeltingXP: 0,
    position: {
        row: 6,
        column: 12
    }
}

function saveLocalSave() {
    localStorage.setItem("localSave", JSON.stringify(localSave));
}

function loadLocalSave() {
    localSave = JSON.parse(localStorage.getItem("localSave"));
}

function clearLocalSave() {
    localStorage.removeItem("localSave");
}

if (localStorage.getItem("localSave")) {
// nuke option if save is bugged
    // clearLocalSave();
    // saveLocalSave();
    // console.log("Local save cleared");
    loadLocalSave();
    console.log("Local save loaded");
}

console.log(localSave);

const inventory = new InventoryUI({
    inventoryItems: localSave.inventoryItems,
    full: false
})

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
};

console.log("Mining Level: " + getLevel(localSave.miningXP));


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

const playerSprites = preloadImages(playerAnimations);

canvas.width = MAP_COLUMNS * TILE_SIZE;
canvas.height = MAP_ROWS * TILE_SIZE;

function resizeCanvas() {
    const scaleX = window.innerWidth / canvas.width;
    const scaleY = window.innerHeight / canvas.height;
    const scale = Math.min(scaleX, scaleY);

    canvas.style.width = `${canvas.width * scale}px`;
    canvas.style.height = `${canvas.height * scale}px`;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const backgroundImage = new Image();
backgroundImage.src = "img/grid-world.png";

const backgroundSprite = new Sprite({
    image: backgroundImage,
    position: {
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height
    }
})

const player = new Player({
    sprites: playerSprites,
    initialState: "idle",
    position: {
        row: localSave.position.row,
        column: localSave.position.column
    },
    frames: {
        max: 4
    },
    offset: {
        x: 11,
        y: 11
    }
});

const bookImage = new Image();
bookImage.src = "img/book.png";

const bookItem = new Item({
    name: "Tome of the Unknown",
    description: "A book that contains the secrets of the unknown.",
    image: bookImage,
    position: {
        column: 14,
        row: 5
    }
});

const rockImage = new Image();
rockImage.src = "img/rock.png"

const rock = new InteractiveObject({
    image: rockImage,
    position: {
        column: 25,
        row: 5
    }
})


let xpDrops = [];

const tinOreDrop = new experienceDrop({
    skill: "Mining",
    amount: ORES.tin.miningXP,
    position: {
        x: cameraX + 100,
        y: cameraY + 100
    }
});

const tinOreImage = new Image();
tinOreImage.src = "img/tin-ore.png"


const forgeImage = new Image();
forgeImage.src = "img/forge.png"

const forge = new InteractiveObject({
    image: forgeImage,
    position: {
        column: 23,
        row: 5
    }
})

droppedItems = [];


function dropItem(image, position) {
    const droppedItem = new DroppedItem({
        image: image,
        position: {
            column: position.column,
            row: position.row
        }
    })
    droppedItems.push(droppedItem);
}

function serverTick() {
    const event = new Event("tick");
    document.dispatchEvent(event);
}

function findEmptyInventorySlot() {
    const emptySlot = localSave.inventoryItems.findIndex(item => item === null);
    return emptySlot;
};



// for (let i = 0; i < this.inventory.length; i++) {
//     const column = i % this.slotColumns;
//     const row = Math.floor(i / this.slotColumns);
    
// }

// function dropInventoryItem(inventoryItem) {
//     const droppedInvItem = 
// }


const tickRate = setInterval(serverTick, 600);

// function getActionsForInventory(inventoryItem) {
//     customContextMenu.innerHTML = "";
//     const actions = [
//         {
//             label: "Drop",
//             handler: () => {
//                 dropInventoryItem(inventoryItem);
//             }

//         }
//     ]

// }

function getActionsForTile(row, column) {
    customContextMenu.innerHTML = "";

    const containsItem = (item) => item.position.row === row && item.position.column === column;

    const actions = [
        {
            label: "Walk Here",
            handler: () => {
                player.targetRow = row;
                player.targetColumn = column;
                player.generatePathway();
                player.movePlayer();
                console.log("Walk Here");
                customContextMenu.style.display = 'none';
            }
        }
    ];
    if (droppedItems.some(containsItem)) {
        actions.push({
            label: "Pick Up",
            handler: () => {
                player.targetRow = row;
                player.targetColumn = column;
                player.generatePathway();
                player.isPickingUp = true;
                customContextMenu.style.display = 'none';
            }
        });
    }
    if (row === rock.position.row && column === rock.position.column) {
        actions.push({
            label: "Mine Tin Rock",
            handler: () => {
                player.targetRow = row;
                player.targetColumn = column;
                player.generatePathway();
                player.isMining = true;
                customContextMenu.style.display = 'none';
            }
        });
        actions.push({
            label: "Examine Tin Rock",
            handler: () => {
                console.log("Big ol' rock");
                customContextMenu.style.display = 'none';
            }
        });
    }

    if (row === forge.position.row && column === forge.position.column) {
        actions.push({
            label: "Smelt Tin Ore",
            handler: () => {
                player.targetRow = row;
                player.targetColumn = column;
                player.generatePathway();
                player.isSmelting = true;
                customContextMenu.style.display = 'none';
            }
        });
    }

    for (const action of actions) {
        const ul = document.createElement("ul");
        ul.textContent = action.label;
        ul.addEventListener("click", action.handler);
        customContextMenu.appendChild(ul);
    }
}

addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    const worldX = canvasX / ZOOM + cameraX;
    const worldY = canvasY / ZOOM + cameraY;


    if (player.storedPath.length > 0) {
        let midPath = player.storedPath[0].split("x");
        let midPathRow = Number(midPath[0]);
        let midPathColumn = Number(midPath[1]);
        player.startRow = midPathRow;
        player.startColumn = midPathColumn;
    }
    player.targetRow = Math.floor(worldY / TILE_SIZE);
    player.targetColumn = Math.floor(worldX / TILE_SIZE);
    player.generatePathway();
});

customContextMenu.addEventListener('click', (e) => {
    e.stopPropagation();
});

let contextTarget = {
    row: 0,
    column: 0
}

addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    const worldX = canvasX / ZOOM + cameraX;
    const worldY = canvasY / ZOOM + cameraY;

    contextTarget.row = Math.floor(worldY / TILE_SIZE);
    contextTarget.column = Math.floor(worldX / TILE_SIZE);
    getActionsForTile(contextTarget.row, contextTarget.column);
    // getActionsForInventory();
    customContextMenu.style.top = `${e.pageY}px`;
    customContextMenu.style.left = `${e.pageX}px`;
    customContextMenu.style.display = 'block';
});

addEventListener('click', (e) => {
    customContextMenu.style.display = 'none';
});

let tickCount = 0;

document.addEventListener("tick", (e) => {
    player.movePlayer();
    player.mineRock();
    player.smeltOre();
    player.pickUpItem();
    saveLocalSave();
});

function animate() {
    window.requestAnimationFrame(animate);
    c.clearRect(0, 0, canvas.width, canvas.height);

    cameraX = player.position.column * TILE_SIZE - canvas.width / ZOOM / 2;
    cameraY = player.position.row * TILE_SIZE - canvas.height / ZOOM / 2;

    xpDrops.forEach(xpDrop => {
        xpDrop.position.x = cameraX + 430;
        xpDrop.position.y = cameraY + 80;
    });

    inventory.position.x = cameraX + 440;
    inventory.position.y = cameraY + 170;

    c.save();
    c.scale(ZOOM, ZOOM);
    c.imageSmoothingEnabled = false;
    c.translate(-cameraX, -cameraY);

    backgroundSprite.draw();
    bookItem.draw();
    player.drawStoredPath();
    rock.draw();
    inventory.draw();
    droppedItems.forEach(droppedItem => {
        droppedItem.draw();
    });
    xpDrops.forEach(xpDrop => {
        xpDrop.draw();
    });
    player.draw();
    // player.boundaries.forEach(boundary => {
    //     boundary.draw()
    // });

    c.restore();


}
animate();