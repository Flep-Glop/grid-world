const MAP_TILE_SIZE = 16;
const MAP_COLUMNS = 64;
const MAP_ROWS = 36;
const MAP_WIDTH = 1024;
const MAP_HEIGHT = 576;

const ACTION_TILE_SIZE = 20;

const COLLISION_TILE_ID = 4516;

const ZOOM = 2;

const INVENTORY_TILE_SIZE = 16;
const INVENTORY_COLUMNS = 4;
const INVENTORY_ROWS = 7;
const INVENTORY_SLOTS = INVENTORY_COLUMNS * INVENTORY_ROWS;

const INVENTORY_CANVAS_X_START = 880;
const INVENTORY_CANVAS_X_END = 1008;
const INVENTORY_CANVAS_Y_START = 340;
const INVENTORY_CANVAS_Y_END = 564;

const TICK_RATE = 600;

const XP_THRESHOLDS = [5, 10, 15, 20, 50, 100];


/** Combat: player swing on encounter ticks 0,4,8,…; goblin on 2,6,10,… (see processCombatEncounter in utility.js). */
const COMBAT_ENCOUNTER_PERIOD = 4;

const playerAnimations = {
    idle: { src: "img/player-idle.png", frames: { max: 4 } },
    walking: { src: "img/player-walk.png", frames: { max: 8 } },
    mining: { src: "img/player-pickaxe.png", frames: { max: 6 } },
    attacking: { src: "img/player-sword.png", frames: { max: 6 } }
};

const DROP_TABLE = {
    goblin: {
        alwaysDrop: "bones",
        items: [
            { item: "tinOre", chance: 10 },
            { item: "leather", chance: 10 },
            { item: "goblinTooth", chance: 10 },
            { item: "tinSword", chance: 10 },
            { item: "coins", chance: 10 },
            { item: "ironIngot", chance: 5 },
            { item: "bronzeHelmet", chance: 5 },
            { item: "steelGloves", chance: 3 },
            { item: "bronzeRing", chance: 2 },
            { item: "woodShield", chance: 2 },
            { item: "sapphire", chance: 1 }
        ]
    }
}