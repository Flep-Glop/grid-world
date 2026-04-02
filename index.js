const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const customContextMenu = document.getElementById("customContextMenu");
const inventoryContextMenu = document.getElementById("inventoryContextMenu");
const combatQuizPanel = document.getElementById("combatQuizPanel");
const combatQuizQuestionEl = document.getElementById("combatQuizQuestion");
const combatQuizAnswersEl = document.getElementById("combatQuizAnswers");


// --- Game State ---

let cameraX = 0;
let cameraY = 0;
let xpDrops = [];
let droppedItems = [];
let shownAction = null;
let hoverRow = 0;
let hoverColumn = 0;
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
    strengthXP: 0,
    hitpointsXP: 0,
    position: {
        row: 6,
        column: 12
    }
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

const mainSpriteSheet = new Image();
mainSpriteSheet.src = "img/main-spritesheet.png";

const actionSpriteSheet = new Image();
actionSpriteSheet.src = "img/action-spritesheet.png";

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

let playerSprites = preloadImages(playerAnimations);
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
    },
    totalHealth: 100,
    attackDamage: 2
});

const goblinImage = new Image();
goblinImage.src = "img/goblin.png";

const goblin = new Enemy({
    image: goblinImage,
    position: { column: 35, row: 8 },
    totalHealth: 12,
    attackDamage: 1,
    action: {
        actionId: "fight",
        label: "Attack Goblin",
        examineText: "Lil green guy with a pointy stick",
        canInteract: () => !goblin.isDead,
        onPrimary: startAttackGoblinAt
    }
});


const rockImage = new Image();
rockImage.src = "img/rock.png"

const rock = new InteractiveObject({
    image: rockImage,
    position: { column: 25, row: 5 },
    action: {
        actionId: "mine",
        label: "Mine Tin Rock",
        examineText: "Big ol' Rock",
        canInteract: () => true,
        onPrimary: (row, column) => {startMineAt(row, column);}
    }
});

const worldObjects = [rock, goblin];


function getActionDisplayForTile(hoverRow, hoverColumn) {
    for (const obj of worldObjects) {
        if (!obj.action) continue;
        if (obj.position.column === hoverColumn &&
            obj.position.row === hoverRow &&
            obj.action.canInteract()) {
            return obj.action.actionId;
        }
    }
    return null;
}

function showActionForTile(hoverRow, hoverColumn) {
    let actionId = getActionDisplayForTile(hoverRow, hoverColumn);
    if (actionId !== null) {
        shownAction = new ActionDisplay({
            actionId: actionId,
            hoverPosition: {
                column: hoverColumn,
                row: hoverRow
            }
        });
    } else {
        shownAction = null;
    }
};


// --- Combat quiz (optional buffs: right = double next hit, wrong = skip next player swing) ---

function loadCombatQuestion() {
    if (!combatQuizQuestionEl || !combatQuizAnswersEl) return;
    const q = getRandomCombatQuestion();
    combatQuizQuestionEl.textContent = q.question;
    combatQuizAnswersEl.innerHTML = "";
    for (const ans of q.answers) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = ans.text;
        btn.addEventListener("click", () => {
            if (btn.disabled) return;
            registerQuizResult(ans.correct);
            markCombatQuizAnswered();
            for (const child of combatQuizAnswersEl.children) {
                child.disabled = true;
                child.classList.remove("answer-correct", "answer-wrong");
            }
            btn.classList.add(ans.correct ? "answer-correct" : "answer-wrong");
        });
        combatQuizAnswersEl.appendChild(btn);
    }
}

function openCombatQuizPanel() {
    if (!combatQuizPanel) return;
    combatQuizPanel.classList.add("visible");
    loadCombatQuestion();
}

function closeCombatQuizPanel() {
    if (!combatQuizPanel) return;
    combatQuizPanel.classList.remove("visible");
    combatQuizAnswersEl.innerHTML = "";
    combatQuizQuestionEl.textContent = "";
}

document.addEventListener("combatQuizOpen", openCombatQuizPanel);
document.addEventListener("combatQuizClose", closeCombatQuizPanel);
document.addEventListener("combatQuizAdvanceQuestion", () => {
    if (combatQuizPanel && combatQuizPanel.classList.contains("visible")) {
        loadCombatQuestion();
    }
});

combatQuizPanel.addEventListener("click", (e) => {
    e.stopPropagation();
});


// --- Inventory Functions ---

const inventory = new InventoryUI({
    inventoryItems: localSave.inventoryItems,
});

function findEmptyInventorySlot() {
    const emptySlot = localSave.inventoryItems.findIndex(item => item === null);
    return emptySlot;
}

function dropItem(itemData, position) {
    const droppedItem = new DroppedItem({
        itemId: itemData.id,
        position: {
            column: position.column,
            row: position.row
        },
    })
    droppedItems.push(droppedItem);
}

function tileHasDroppedItem(row, column) {
    return droppedItems.some(
        (item) => item.position.row === row && item.position.column === column
    );
}

function applyMidPathStartFromNextStep() {
    if (player.storedPath.length > 0) {
        player.startRow = tileRow(player.storedPath[0]);
        player.startColumn = tileColumn(player.storedPath[0]);
    }
}

function setWalkTarget(row, column) {
    player.targetRow = row;
    player.targetColumn = column;
    player.generatePathway();
}

function walkHereFromMenu(row, column) {
    setWalkTarget(row, column);
    player.movePlayer();
    console.log("Walk Here");
}

function startPlayerAction(row, column, flag, columnOffset = 0) {
    player.targetRow = row;
    player.targetColumn = column + columnOffset;
    player.generatePathway();
    player[flag] = true;
}

function startPickUpAt(row, column) {
    startPlayerAction(row, column, "isPickingUp");
}

function startMineAt(row, column) {
    startPlayerAction(row, column, "isMining", -1);
}

function startAttackGoblinAt(row, column) {
    startPlayerAction(row, column, "isAttacking", -1);
}

/** Priority: pick up > mine > attack. Returns true if a primary action was started. */
function tryPrimaryWorldAction(row, column) {
    if (tileHasDroppedItem(row, column)) {
        startPickUpAt(row, column);
        return true;
    }
    for (const obj of worldObjects) {
        if (!obj.action) continue;
        if (obj.position.column === column &&
            obj.position.row === row &&
            obj.action.canInteract()) {
            obj.action.onPrimary(row, column);
            return true;
        }
    }
    return false;
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
                let itemId = localSave.inventoryItems[slot];
                console.log("Item: ", ITEMS[itemId].id);
                dropItem(ITEMS[itemId], player.position);
                inventory.inventoryItems[slot] = null;
                console.log("Dropping item: ", ITEMS[itemId].name);
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
    const actions = [
        { label: "Walk Here", handler: () => { walkHereFromMenu(row, column); } }
    ];

    if (tileHasDroppedItem(row, column)) {
        actions.push({ label: "Pick Up", handler: () => startPickUpAt(row, column) });
    }

    for (const obj of worldObjects) {
        if (!obj.action) continue;
        if (obj.position.row === row &&
            obj.position.column === column &&
            obj.action.canInteract()) {
            actions.push({
                label: obj.action.label,
                handler: () => obj.action.onPrimary(row, column)
            });
            if (obj.action.examineText) {
                actions.push({
                    label: "Examine " + obj.action.label.split(" ").slice(1).join(" "),
                    handler: () => console.log(obj.action.examineText)
                });
            }
        }
    }
    for (const action of actions) {
        const ul = document.createElement("ul");
        ul.textContent = action.label;
        ul.addEventListener("click", action.handler);
        customContextMenu.appendChild(ul);
    }
}

addEventListener('mousemove', (e) => {
    const worldPosition = getWorldPosition(e);
    const tile = worldToTile(worldPosition.worldX, worldPosition.worldY);
    hoverRow = tile.row;
    hoverColumn = tile.column;
    showActionForTile(hoverRow, hoverColumn);
});

addEventListener('click', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("#combatQuizPanel")) return;
    if (getInventorySlotPosition(e) >= 0) return;

    const worldPosition = getWorldPosition(e);
    applyMidPathStartFromNextStep();

    const { row, column } = worldToTile(worldPosition.worldX, worldPosition.worldY);

    if (tryPrimaryWorldAction(row, column)) {
        return;
    }

    setWalkTarget(row, column);
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
        const worldPosition = getWorldPosition(e);
        const { row, column } = worldToTile(worldPosition.worldX, worldPosition.worldY);
        getActionsForTile(row, column);
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
    player.attackEnemy();
    player.pickUpItem();
    respawnTimer();
    saveLocalSave();
});



// --- Game Loop ---

function animate() {

    if (player.moveStartTime) {
        let timeElapsed = (performance.now() - player.moveStartTime) / TICK_RATE;
        timeElapsed = Math.min(timeElapsed, 1);
        player.interpOffset.x = player.interpStart.x * (1 - timeElapsed);
        player.interpOffset.y = player.interpStart.y * (1 - timeElapsed);
    }

    window.requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    cameraX = player.position.column * MAP_TILE_SIZE + player.interpOffset.x - canvas.width / ZOOM / 2;
    cameraY = player.position.row * MAP_TILE_SIZE + player.interpOffset.y - canvas.height / ZOOM / 2;

    xpDrops = xpDrops.filter(xpDrop => !xpDrop.isDone);

    inventory.position.x = cameraX + 440;
    inventory.position.y = cameraY + 170;

    ctx.save();
    ctx.scale(ZOOM, ZOOM);
    ctx.imageSmoothingEnabled = false;
    ctx.translate(-cameraX, -cameraY);

    backgroundSprite.draw();
    // player.drawStoredPath();
    rock.draw();
    if (!goblin.isDead) {
        goblin.draw();
    }
    inventory.draw();
    droppedItems.forEach(droppedItem => {
        droppedItem.draw();
    });
    xpDrops.forEach(xpDrop => {
        xpDrop.draw();
    });
    // drawCoordinates(hoverRow, hoverColumn);
    if (shownAction !== null) {
        shownAction.draw();
    }
    player.draw();
    updateAndDrawCombatOverlays();
    // player.boundaries.forEach(boundary => {
    //     boundary.draw()
    // });

    ctx.restore();


}
animate();