const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const customContextMenu = document.getElementById("customContextMenu");
const inventoryContextMenu = document.getElementById("inventoryContextMenu");


// --- Game State ---

let cameraX = 0;
let cameraY = 0;
let xpDrops = [];
let droppedItems = [];
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
};
let contextTarget = {
    row: 0,
    column: 0
};


// --- Local Save Functions ---

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


// --- Canvas Setup ---

canvas.width = MAP_COLUMNS * MAP_TILE_SIZE;
canvas.height = MAP_ROWS * MAP_TILE_SIZE;

window.addEventListener('resize', resizeCanvas);
resizeCanvas();


// --- Game Objects ---

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
});

const playerSprites = preloadImages(playerAnimations);
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
});

const tinOreImage = new Image();
tinOreImage.src = "img/tin-ore.png"
const tinOreDrop = new ExperienceDrop({
    skill: "Mining",
    amount: ORES.tin.miningXP,
    position: {
        x: cameraX + 100,
        y: cameraY + 100
    }
});

const forgeImage = new Image();
forgeImage.src = "img/forge.png"
const forge = new InteractiveObject({
    image: forgeImage,
    position: {
        column: 23,
        row: 5
    }
});


// --- Inventory Functions ---

const inventory = new InventoryUI({
    inventoryItems: localSave.inventoryItems,
    full: false
});

function findEmptyInventorySlot() {
    const emptySlot = localSave.inventoryItems.findIndex(item => item === null);
    return emptySlot;
}

function dropItem(itemData, position) {
    const image = new Image();
    image.src = itemData.image
    const droppedItem = new DroppedItem({
        image: image,
        data: itemData,
        position: {
            column: position.column,
            row: position.row
        }
    })
    droppedItems.push(droppedItem);
}


// --- Tick Functions ---

function serverTick() {
    const event = new Event("tick");
    document.dispatchEvent(event);
}
const tickRate = setInterval(serverTick, TICK_RATE);


// --- Event Listeners ---

function getActionsForInventorySlot(slot) {
    inventoryContextMenu.innerHTML = "";

    const actions = [
        {
            label: "Drop",
            handler: () => {
                let item = localSave.inventoryItems[slot];
                console.log("Item: ", item);
                dropItem(item, player.position);
                inventory.inventoryItems[slot] = null;
                console.log("Dropping item: ", item.name);
                inventoryContextMenu.style.display = 'none';
            }
        }

    ]
    
    for (const action of actions) {
        const ul = document.createElement("ul");
        ul.textContent = action.label;
        ul.addEventListener("click", action.handler);
        inventoryContextMenu.appendChild(ul);
    }

}

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
    let worldPosition = getWorldPosition(e);
    if (player.storedPath.length > 0) {
        let midPath = player.storedPath[0].split("x");
        let midPathRow = Number(midPath[0]);
        let midPathColumn = Number(midPath[1]);
        player.startRow = midPathRow;
        player.startColumn = midPathColumn;
    }
    player.targetRow = Math.floor(worldPosition.worldY / MAP_TILE_SIZE);
    player.targetColumn = Math.floor(worldPosition.worldX / MAP_TILE_SIZE);
    player.generatePathway();
});

customContextMenu.addEventListener('click', (e) => {
    e.stopPropagation();
});

inventoryContextMenu.addEventListener('click', (e) => {
    e.stopPropagation();
});


addEventListener('contextmenu', (e) => {
    e.preventDefault();

    customContextMenu.style.display = 'none';
    inventoryContextMenu.style.display = 'none';

    let clickedSlot = getInventorySlotPosition(e);

    if (clickedSlot >= 0) {
        getActionsForInventorySlot(clickedSlot);
        inventoryContextMenu.style.top = `${e.pageY}px`;
        inventoryContextMenu.style.left = `${e.pageX}px`;
        inventoryContextMenu.style.display = 'block';
    }
    else {
        let worldPosition = getWorldPosition(e);
        contextTarget.row = Math.floor(worldPosition.worldY / MAP_TILE_SIZE);
        contextTarget.column = Math.floor(worldPosition.worldX / MAP_TILE_SIZE);
        getActionsForTile(contextTarget.row, contextTarget.column);
        customContextMenu.style.top = `${e.pageY}px`;
        customContextMenu.style.left = `${e.pageX}px`;
        customContextMenu.style.display = 'block';
    }
});

addEventListener('click', (e) => {
    customContextMenu.style.display = 'none';
    inventoryContextMenu.style.display = 'none';
});

document.addEventListener("tick", (e) => {
    player.movePlayer();
    player.mineRock();
    player.smeltOre();
    player.pickUpItem();
    saveLocalSave();
});


// --- Game Loop ---

function animate() {
    window.requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    cameraX = player.position.column * MAP_TILE_SIZE - canvas.width / ZOOM / 2;
    cameraY = player.position.row * MAP_TILE_SIZE - canvas.height / ZOOM / 2;

    xpDrops.forEach(xpDrop => {
        xpDrop.position.x = cameraX + 430;
        xpDrop.position.y = cameraY + 80;
    });

    inventory.position.x = cameraX + 440;
    inventory.position.y = cameraY + 170;

    ctx.save();
    ctx.scale(ZOOM, ZOOM);
    ctx.imageSmoothingEnabled = false;
    ctx.translate(-cameraX, -cameraY);

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

    ctx.restore();


}
animate();