const MAP_TILE_SIZE = 16;
const MAP_COLUMNS = 64;
const MAP_ROWS = 36;
const MAP_WIDTH = 1024;
const MAP_HEIGHT = 576;

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

const playerAnimations = {
    idle: { src: "img/player-idle.png", frames: { max: 4 } },
    walking: { src: "img/player-walk.png", frames: { max: 8 } },
    mining: { src: "img/player-pickaxe.png", frames: { max: 6 } },
};