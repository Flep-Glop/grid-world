// this script is used to swap the assets in the game

let assetSwapEnabled = true;

function enableAssetSwap() {
    if (!assetSwapEnabled) return;

    mainSpriteSheet.src = "img/main-spritesheet-simplified.png";
    actionSpriteSheet.src = "img/action-spritesheet-simplified.png";
    backgroundImage.src = "tiled/grid-world-simplified.png";
    goblinImage.src = "img/goblin-simplified.png";
    rockImage.src = "img/rock-simplified.png";

    const newAnimations = {
        idle: { src: "img/player-simplified.png", frames: { max: 1 } },
        walking: { src: "img/player-simplified.png", frames: { max: 1 } },
        mining: { src: "img/player-simplified.png", frames: { max: 1 } },
        attacking: { src: "img/player-simplified.png", frames: { max: 1 } }
    };
    playerSprites = preloadImages(newAnimations);
    player.sprites = playerSprites;
    player.offset = {
        x: 0,
        y: 0
    }
    player.currentState = null;
    player.setState("idle");
}
enableAssetSwap();