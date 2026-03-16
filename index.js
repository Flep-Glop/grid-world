const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");
const customContextMenu = document.getElementById("customContextMenu");

const TILE_SIZE = 16;
const MAP_COLUMNS = 64;
const MAP_ROWS = 36;
const COLLISION_TILE_ID = 4516;
const ZOOM = 2;


const playerAnimations = {
    idle: { src: "img/player-idle.png", frames: { max: 4 } },
    walking: { src: "img/player-walk.png", frames: { max: 8 } },
    mining: { src: "img/player-pickaxe.png", frames: { max: 6 } },
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
        row: 6,
        column: 12
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

const forgeImage = new Image();
forgeImage.src = "img/forge.png"

const forge = new InteractiveObject({
    image: forgeImage,
    position: {
        column: 23,
        row: 5
    }
})

function serverTick() {
    const event = new Event("tick");
    document.dispatchEvent(event);
}

const tickRate = setInterval(serverTick, 600);


function getActionsForTile(row, column) {
    customContextMenu.innerHTML = "";
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

    if (row === bookItem.position.row && column === bookItem.position.column) {
        actions.push({
            label: "Pick Up",
            handler: () => {
                player.targetRow = row;
                player.targetColumn = column;
                player.generatePathway();
                player.movePlayer();
                bookItem.position.row = -10;
                bookItem.position.column = -10;
                console.log("Pick Up");
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


let cameraX = 0;
let cameraY = 0;

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


    customContextMenu.style.top = `${e.pageY}px`;
    customContextMenu.style.left = `${e.pageX}px`;
    customContextMenu.style.display = 'block';
});

addEventListener('click', (e) => {
    customContextMenu.style.display = 'none';
});

document.addEventListener("tick", (e) => {
    player.movePlayer();
    player.mineRock();
    player.smeltOre();
});

function animate() {
    window.requestAnimationFrame(animate);
    c.clearRect(0, 0, canvas.width, canvas.height);

    cameraX = player.position.column * TILE_SIZE - canvas.width / ZOOM / 2;
    cameraY = player.position.row * TILE_SIZE - canvas.height / ZOOM / 2;

    c.save();
    c.scale(ZOOM, ZOOM);
    c.imageSmoothingEnabled = false;
    c.translate(-cameraX, -cameraY);

    backgroundSprite.draw();
    bookItem.draw();
    player.drawStoredPath();
    player.draw();
    rock.draw();
    // player.boundaries.forEach(boundary => {
    //     boundary.draw()
    // });

    c.restore();

}
animate();