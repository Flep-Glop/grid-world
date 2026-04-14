// --- DOM References ---

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
let combatEncounterTick = 0;
let combatRangeLatch = false;
let skipNextPlayerAttack = false;
let doubleNextPlayerAttack = false;
let combatQuizAwaitingPlayerTurn = false;
let combatHitSplats = [];
let currentEnemy = null;
let localSave = {
    inventoryItems: [
        null, null, null, null, 
        null, null, null, null, 
        null, null, null, null, 
        null, null, null, null, 
        null, null, null, null, 
        null, null, null, null, 
        null, null, null, null ],
    equipmentItems: { 
        helmet: null,
        gloves: null, 
        boots: null, 
        ring: null, 
        amulet: null, 
        shield: null, 
        sword: null },
    miningXP: 0,
    strengthXP: 0,
    hitpointsXP: 0,
    skill: {
        miningLevel: 0,
        strengthLevel: 0,
        hitpointsLevel: 0
    },
    position: {
        row: 8,
        column: 12
    }
};


// --- Local Save ---

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
    // clearLocalSave();
    loadLocalSave();
    console.log("Local save loaded");
}

localSave.skill.strengthLevel = getLevel(localSave.strengthXP);


// --- Canvas Setup ---

canvas.width = MAP_COLUMNS * MAP_TILE_SIZE;
canvas.height = MAP_ROWS * MAP_TILE_SIZE;

window.addEventListener('resize', resizeCanvas);
resizeCanvas();


// --- Image Loading ---

const mainSpriteSheet = new Image();
mainSpriteSheet.src = "img/main-spritesheet.png";

const actionSpriteSheet = new Image();
actionSpriteSheet.src = "img/action-spritesheet.png";

const backgroundImage = new Image();
backgroundImage.src = "img/grid-world.png";

const minotaurImage = new Image();
minotaurImage.src = "img/minotaur.png";

const snatcherImage = new Image();
snatcherImage.src = "img/snatcher.png";

const goblinImage = new Image();
goblinImage.src = "img/goblin.png";

const rockImage = new Image();
rockImage.src = "img/rock.png";

let playerSprites = preloadImages(playerAnimations);
let goblinSprites = preloadImages(goblinAnimations);


// --- Game Objects ---

const backgroundSprite = new Sprite({
    image: backgroundImage,
    position: {
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height
    }
});

const player = new Player({
    sprites: playerSprites,
    initialState: "idle",
    position: {
        row: localSave.position.row,
        column: localSave.position.column
    },
    offset: {
        x: 11,
        y: 11
    },
    totalHealth: 100,
    attackDamage: localSave.skill.strengthLevel
});

const minotaur = new Enemy({
    image: minotaurImage,
    position: { column: 44, row: 6 },
    offset: {
        x: 2,
        y: 4
    },
    totalHealth: 12,
    attackDamage: 1,
    action: {
        actionId: "fight",
        label: "Attack Goatman",
        examineText: "Big ol' goat man combo duo thingy",
        canInteract: () => !minotaur.isDead,
        onPrimary: startAttackCurrentEnemyAt
    }
});

const snatcher = new Enemy({
    image: snatcherImage,
    position: { column: 14, row: 26 },
    offset: {
        x: 2,
        y: 4
    },
    totalHealth: 12,
    attackDamage: 1,
    action: {
        actionId: "fight",
        label: "Attack Snatcher",
        examineText: "Big ol' snatcher",
        canInteract: () => !snatcher.isDead,
        onPrimary: startAttackCurrentEnemyAt
    }
});

const goblin = new Enemy({
    enemyId: "goblin",
    sprites: goblinSprites,
    initialState: "idle",
    name: "Goblin",
    position: { column: 35, row: 8 },
    offset: {
        x: 2,
        y: 4
    },
    totalHealth: 24,
    attackDamage: 1,
    action: {
        actionId: "fight",
        label: "Attack",
        examineText: "Lil green guy with a pointy stick",
        canInteract: () => !goblin.isDead,
        onPrimary: startAttackCurrentEnemyAt
    }
});

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

const worldObjects = [rock, goblin, minotaur, snatcher];

const sidePanel = new SidePanelUI();


// --- Event Listeners ---

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

addEventListener('mousemove', (e) => {
    const worldPosition = getWorldPosition(e);
    const slot = getInventorySlotPosition(e);
    const tile = worldToTile(worldPosition.worldX, worldPosition.worldY);
    hoverRow = tile.row;
    hoverColumn = tile.column;
    showActionForTile(hoverRow, hoverColumn);

    const firstAction = getFirstActionForTile(hoverRow, hoverColumn);
    const firstActionInventory = getFirstActionForInventory(slot);
    const firstActionEquipment = getFirstActionForEquipment(slot);

    if (firstAction) {
        hoverTooltip.innerHTML = `<span class = "action-verb"> ${firstAction.verb} </span> <span class = "action-noun">${firstAction.noun}</span>`;
        hoverTooltip.style.display = 'block';
        hoverTooltip.style.top = `${e.pageY}px`;
        hoverTooltip.style.left = `${e.pageX}px`;
    } 
    else if (firstActionInventory) {
        hoverTooltip.innerHTML = `<span class = "action-verb"> ${firstActionInventory.verb} </span> <span class = "action-noun">${firstActionInventory.noun}</span>`;
        hoverTooltip.style.display = 'block';
        hoverTooltip.style.top = `${e.pageY}px`;
        hoverTooltip.style.left = `${e.pageX}px`;
    } else if (firstActionEquipment) {
        hoverTooltip.innerHTML = `<span class = "action-verb"> ${firstActionEquipment.verb} </span> <span class = "action-noun">${firstActionEquipment.noun}</span>`;
        hoverTooltip.style.display = 'block';
        hoverTooltip.style.top = `${e.pageY}px`;
        hoverTooltip.style.left = `${e.pageX}px`;
    } else {
        hoverTooltip.style.display = 'none';
    }
});

addEventListener('click', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("#combatQuizPanel")) return;
    if (isClickOnPanel(e)) {
        handlePanelClick(e);
        return;
    }

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
    else if (isClickOnPanel(e)) {
        return;
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


// --- Tick ---

function serverTick() {
    const event = new Event("tick");
    document.dispatchEvent(event);
}
const tickRate = setInterval(serverTick, TICK_RATE);

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

    sidePanel.position.x = cameraX + SIDE_PANEL_WORLD_X;
    sidePanel.position.y = cameraY + SIDE_PANEL_WORLD_Y;

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
    sidePanel.draw();
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
