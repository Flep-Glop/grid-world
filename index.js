const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");

const TILE_SIZE = 16;
const MAP_COLUMNS = 64;
const MAP_ROWS = 36;
const COLLISION_TILE_ID = 4516;

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

const playerImage = new Image();
playerImage.src = "img/player.png";

const player = new Player({
    image: playerImage,
    position: {
        row: 6,
        column: 12
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

function serverTick() {
    const event = new Event("tick");
    document.dispatchEvent(event);
}

const tickRate = setInterval(serverTick, 600);



addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    if (player.storedPath.length > 0) {
        let midPath = player.storedPath[0].split("x");
        let midPathRow = Number(midPath[0]);
        let midPathColumn = Number(midPath[1]);
        player.startRow = midPathRow;
        player.startColumn = midPathColumn;
    }
    player.targetRow = Math.floor(canvasY / TILE_SIZE);
    player.targetColumn = Math.floor(canvasX / TILE_SIZE);
    player.generatePathway();
});

addEventListener('contextmenu', (e) => {
    e.preventDefault();
    customContextMenu.style.top = `${e.pageY}px`;
    customContextMenu.style.left = `${e.pageX}px`;
    customContextMenu.style.display = 'block';
});

addEventListener('click', (e) => {
    customContextMenu.style.display = 'none';
});

document.addEventListener("tick", (e) => {
    player.movePlayer();
});

function animate() {
    window.requestAnimationFrame(animate);
    c.clearRect(0, 0, canvas.width, canvas.height);
    backgroundSprite.draw();
    bookItem.draw();
    player.drawStoredPath();
    player.draw();
    rock.draw();
    player.boundaries.forEach(boundary => {
        boundary.draw()
    });
}
animate();