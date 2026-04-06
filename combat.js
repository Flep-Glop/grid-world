// --- Combat Quiz UI ---

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


// --- Combat Logic ---

function isPlayerAdjacentToCurrentEnemy() {
    return (
        player.position.row === currentEnemy.position.row &&
        player.position.column === currentEnemy.position.column - 1
    );
}

function resetCombatEncounterState() {
    combatEncounterTick = 0;
    combatRangeLatch = false;
    skipNextPlayerAttack = false;
    doubleNextPlayerAttack = false;
    combatQuizAwaitingPlayerTurn = false;
    combatHitSplats = [];
    document.dispatchEvent(new CustomEvent("combatQuizClose"));
}

function registerQuizResult(isCorrect) {
    if (isCorrect) {
        doubleNextPlayerAttack = true;
    } else {
        skipNextPlayerAttack = true;
    }
}

function markCombatQuizAnswered() {
    combatQuizAwaitingPlayerTurn = true;
}

function tryAdvanceCombatQuizAfterPlayerTurn() {
    if (!combatQuizAwaitingPlayerTurn) return;
    combatQuizAwaitingPlayerTurn = false;
    document.dispatchEvent(new CustomEvent("combatQuizAdvanceQuestion"));
}

function executeCombatMove(combatMove, damageMultiplier = 1) {
    switch (combatMove) {
        case "slash":
            player.slashAccuracy = 0.75;
            if (Math.random() < player.slashAccuracy) {
                const dmg = Math.floor(player.attackDamage * damageMultiplier);
                awardXP("Strength", dmg * 4);
                awardXP("Hitpoints", dmg);
                currentEnemy.currentHealth -= dmg;
                const gw = currentEnemy.image.width > 0 ? currentEnemy.image.width : MAP_TILE_SIZE;
                const gx = currentEnemy.position.column * MAP_TILE_SIZE + gw / 2;
                const gy = currentEnemy.position.row * MAP_TILE_SIZE;
                spawnCombatHitSplat(gx, gy, String(dmg), "#ff6b6b");
                console.log("Current Enemy health: ", currentEnemy.currentHealth, damageMultiplier > 1 ? "(double damage)" : "");
                return currentEnemy.currentHealth;
            }
            console.log("Player attack missed");
            return;
    }
}

function runPlayerCombatSwing() {
    player.setState("attacking");
    if (skipNextPlayerAttack) {
        skipNextPlayerAttack = false;
        console.log("Player attack skipped (quiz penalty)");
    } else {
        const mult = doubleNextPlayerAttack ? 2 : 1;
        doubleNextPlayerAttack = false;
        executeCombatMove("slash", mult);
        checkForEnemyDeath();
    }
    tryAdvanceCombatQuizAfterPlayerTurn();
}

function runEnemyCombatSwing() {
    const enemySlashDamage = currentEnemy.attackDamage;
    const enemyAttackAccuracy = 0.75;
    if (Math.random() < enemyAttackAccuracy) {
        player.currentHealth -= enemySlashDamage;
        const px =
            player.position.column * MAP_TILE_SIZE -
            player.offset.x +
            player.interpOffset.x +
            (player.image.width / player.frames.max) / 2;
        const py =
            player.position.row * MAP_TILE_SIZE -
            player.offset.y +
            player.interpOffset.y;
        spawnCombatHitSplat(px, py, String(enemySlashDamage), "#6bcfff");
        console.log("Player health: ", player.currentHealth);
    } else {
        console.log("Enemy attack missed");
    }
}

function processCombatEncounter() {
    if (!player.isAttacking || currentEnemy.isDead) {
        if (combatRangeLatch) {
            resetCombatEncounterState();
        }
        return;
    }

    const inRange =
        isPlayerAdjacentToCurrentEnemyForCombat() && player.storedPath.length === 0;

    if (!inRange) {
        if (combatRangeLatch) {
            combatRangeLatch = false;
            combatEncounterTick = 0;
            skipNextPlayerAttack = false;
            doubleNextPlayerAttack = false;
            combatQuizAwaitingPlayerTurn = false;
            combatHitSplats = [];
            document.dispatchEvent(new CustomEvent("combatQuizClose"));
        }
        return;
    }

    if (!combatRangeLatch) {
        combatRangeLatch = true;
        combatEncounterTick = 0;
        document.dispatchEvent(new CustomEvent("combatQuizOpen"));
    }

    const phase = combatEncounterTick % COMBAT_ENCOUNTER_PERIOD;
    if (phase === 0) {
        runPlayerCombatSwing();
    } else if (phase === COMBAT_ENCOUNTER_PERIOD / 2) {
        runEnemyCombatSwing();
        checkForPlayerDeath();
    }

    combatEncounterTick++;

    if (currentEnemy.isDead || player.isDead) {
        player.isAttacking = false;
        player.setState("idle");
        resetCombatEncounterState();
    }
}


// --- Combat UI ---

function drawHealthBar(x, y, w, h, current, total) {
    const ratio = Math.max(0, Math.min(1, total > 0 ? current / total : 0));
    ctx.fillStyle = "red";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#4c4";
    ctx.fillRect(x, y, Math.max(0, w * ratio), h);
}

function spawnCombatHitSplat(worldX, worldY, text, color) {
    combatHitSplats.push({
        x: worldX,
        y: worldY,
        text,
        color,
        frame: 0,
        duration: 45
    });
}

function updateAndDrawCombatOverlays() {
    const barW = 14;
    const barH = 4;
    if (player.isAttacking) {
        if (!currentEnemy.isDead) {
            const gw = currentEnemy.image.width > 0 ? currentEnemy.image.width : MAP_TILE_SIZE;
            const gx = currentEnemy.position.column * MAP_TILE_SIZE + (gw - barW) / 2;
            const gy = currentEnemy.position.row * MAP_TILE_SIZE - 8;
            drawHealthBar(gx, gy, barW, barH, currentEnemy.currentHealth, currentEnemy.totalHealth);
        }

        if (!player.isDead) {
            const pw = player.image.width / player.frames.max;
            const px =
                player.position.column * MAP_TILE_SIZE -
                player.offset.x * ZOOM +
                player.interpOffset.x +
                (pw - barW) / 2;
            const py =
                player.position.row * MAP_TILE_SIZE +
                player.interpOffset.y -
                8;
            drawHealthBar(px, py, barW, barH, player.currentHealth, player.totalHealth);
        }
    }
    for (let i = combatHitSplats.length - 1; i >= 0; i--) {
        const s = combatHitSplats[i];
        s.frame++;
        const t = s.frame / s.duration;
        if (t >= 1) {
            combatHitSplats.splice(i, 1);
            continue;
        }
        const alpha = 1 - t;
        const floatY = s.y - t * 22;
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = s.color;
        ctx.globalAlpha = alpha;
        ctx.fillText(s.text, s.x, floatY);
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}


// --- Death & Respawn ---

function checkForEnemyDeath() {
    if (currentEnemy && currentEnemy.currentHealth <= 0) {
        let enemyId = currentEnemy.enemyId;
        console.log("Current enemy: ", enemyId);
        currentEnemy.isDead = true;
        if (DROP_TABLE[enemyId].alwaysDrop) {
            let alwaysDrop = DROP_TABLE[enemyId].alwaysDrop;
            console.log("Always drop: ", alwaysDrop);
        if (DROP_TABLE[enemyId].items) {
            let rolledItem = rollDrop(DROP_TABLE[enemyId].items);
            console.log("Rolled item: ", rolledItem);
            dropItem(ITEMS[alwaysDrop], currentEnemy.position);
            dropItem(ITEMS[rolledItem], currentEnemy.position);
            }
        }
    }
}

function checkForPlayerDeath() {
    if (player.currentHealth <= 0) {
        player.isDead = true;
        console.log("Player is dead");
    }
}

function respawnTimer() {
    if (currentEnemy && currentEnemy.isDead) {
        currentEnemy.respawnTimer++;
        if (currentEnemy.respawnTimer >= 10) {
            currentEnemy.isDead = false;
            currentEnemy.currentHealth = currentEnemy.totalHealth;
            currentEnemy.respawnTimer = 0;
        }
    }
}

function isPlayerAdjacentToCurrentEnemyForCombat() {
    return (
        player.position.row === currentEnemy.position.row &&
        player.position.column === currentEnemy.position.column - 1
    );
}
