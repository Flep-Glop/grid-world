// --- Inventory Functions ---

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

function useItem(slot) {
    return null;
}

function equipItem(bodyPart, itemId) {
    localSave.equipmentItems[bodyPart] = itemId;
    localSave.inventoryItems[localSave.inventoryItems.findIndex(item => item === itemId)] = null;
    console.log("Equipped: ", localSave.equipmentItems[bodyPart]);
}

function examineItem(slot) {
    return null;
}

function consumeItem(slot) {
    return null;
}


// --- Dropped Item Functions ---

function tileHasDroppedItem(row, column) {
    return droppedItems.some(
        (item) => item.position.row === row && item.position.column === column
    );
}

function getDroppedItemOnTile(row, column) {
    return droppedItems.find(
        (item) => item.position.row === row && item.position.column === column
    )
}


// --- Movement Functions ---

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


// --- Action Display ---

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
}


// --- Action Menus ---

function getFirstActionForInventory(slot) {
    if (localSave.inventoryItems[slot] === null || slot < 0) return;
    let itemId = localSave.inventoryItems[slot];
    const itemName = ITEMS[itemId].name;
    return { verb: "Use", noun: itemName };
}

function getFirstActionForEquipment(slot) {
    if (slot < 0) return;
    let equipmentKeys = Object.keys(localSave.equipmentItems);
    if (slot >= equipmentKeys.length) return;
    let key = equipmentKeys[slot];
    let itemId = localSave.equipmentItems[key];
    if (itemId === null) return;
    const itemName = ITEMS[itemId].name;
    return { verb: "Unequip", noun: itemName };
}

function getActionsForInventorySlot(slot) {
    inventoryContextMenu.innerHTML = "";

    const actions = [];
    if (["helmet", "gloves", "boots", "ring", "amulet", "shield", "sword"].includes(ITEMS[localSave.inventoryItems[slot]].type)) {        actions.push({
            verb: "Equip",
            noun: ITEMS[localSave.inventoryItems[slot]].name,
            handler: () => {
                equipItem(ITEMS[localSave.inventoryItems[slot]].type, localSave.inventoryItems[slot]);
            }
        });
    }

    if (ITEMS[localSave.inventoryItems[slot]].type === "consumeable") {
        actions.push({
            verb: "Consume",
            noun: ITEMS[localSave.inventoryItems[slot]].name,
            handler: () => {
                consumeItem(slot);
            }
        });
    }
    
    actions.push({
        verb: "Use",
        noun: ITEMS[localSave.inventoryItems[slot]].name,
        handler: () => {
            useItem(slot);
        }
    });

    actions.push({
        verb: "Examine",
        noun: ITEMS[localSave.inventoryItems[slot]].name,
        handler: () => {
            examineItem(slot);
        }
    });
    
    actions.push({
        verb: "Drop",
        noun: ITEMS[localSave.inventoryItems[slot]].name,
        handler: () => {
            let itemId = localSave.inventoryItems[slot];
            dropItem(ITEMS[itemId], player.position);
            localSave.inventoryItems[slot] = null;
            inventoryContextMenu.style.display = 'none';
        }
    });
    
    for (const action of actions) {
        const ul = document.createElement("ul");
        ul.innerHTML = `<span class = "action-verb"> ${action.verb} </span> <span class = "action-noun">${action.noun}</span>`;
        ul.addEventListener("click", action.handler);
        inventoryContextMenu.appendChild(ul);
    }
}

function getActionsForEquipmentSlot(slot) {
    inventoryContextMenu.innerHTML = "";

    const actions = [];
    if (["helmet", "gloves", "boots", "ring", "amulet", "shield", "sword"].includes(ITEMS[localSave.equipmentItems[slot]].type)) {        actions.push({
            verb: "Equip",
            noun: ITEMS[localSave.equipmentItems[slot]].name,
            handler: () => {
                equipItem(ITEMS[localSave.equipmentItems[slot]].type, localSave.equipmentItems[slot]);
            }
        });
    }

    if (ITEMS[localSave.equipmentItems[slot]].type === "consumeable") {
        actions.push({
            verb: "Consume",
            noun: ITEMS[localSave.equipmentItems[slot]].name,
            handler: () => {
                consumeItem(slot);
            }
        });
    }
    
    actions.push({
        verb: "Use",
        noun: ITEMS[localSave.equipmentItems[slot]].name,
        handler: () => {
            useItem(slot);
        }
    });

    actions.push({
        verb: "Examine",
        noun: ITEMS[localSave.equipmentItems[slot]].name,
        handler: () => {
            examineItem(slot);
        }
    });
    
    actions.push({
        verb: "Drop",
        noun: ITEMS[localSave.equipmentItems[slot]].name,
        handler: () => {
            let itemId = localSave.equipmentItems[slot];
            dropItem(ITEMS[itemId], player.position);
            localSave.equipmentItems[slot] = null;
            inventoryContextMenu.style.display = 'none';
        }
    });
    
    for (const action of actions) {
        const ul = document.createElement("ul");
        ul.innerHTML = `<span class = "action-verb"> ${action.verb} </span> <span class = "action-noun">${action.noun}</span>`;
        ul.addEventListener("click", action.handler);
        inventoryContextMenu.appendChild(ul);
    }
}

function getFirstActionForTile(row, column) {
    if (tileHasDroppedItem(row, column)) {
        const itemOnFloor = getDroppedItemOnTile(row, column);
        const itemName = ITEMS[itemOnFloor.itemId].name;
        return { verb: "Pick Up ", noun: itemName };
    }

    for (const obj of worldObjects) {
        if (!obj.action) continue;
        if (obj.position.row === row &&
            obj.position.column === column &&
            obj.action.canInteract()) {
            return { verb: obj.action.label, noun: obj.name };
        }
    }

    return null;
}

function getActionsForTile(row, column) {
    customContextMenu.innerHTML = "";
    const actions = [];

    if (tileHasDroppedItem(row, column)) {
        for (const itemOnFloor of droppedItems) {
            const itemName = ITEMS[itemOnFloor.itemId].name;
            console.log("Item: ", itemOnFloor);
            actions.push({
                verb: "Pick Up ",
                noun: itemName,
                handler: () => startPickUpAt(row, column)
            });
        }
    }

    for (const obj of worldObjects) {
        if (!obj.action) continue;
        if (obj.position.row === row &&
            obj.position.column === column &&
            obj.action.canInteract()) {
            actions.push({
                verb: obj.action.label,
                noun: obj.name,
                handler: () => obj.action.onPrimary(row, column)
            });
            if (obj.action.examineText) {
                actions.push({
                    verb: "Examine ",
                    noun: obj.name,
                    handler: () => console.log(obj.action.examineText)
                });
            }
        }
    }

    actions.push({
        verb: "Walk Here",
        noun: "",
        handler: () => { walkHereFromMenu(row, column); }
    });

    for (const action of actions) {
        const ul = document.createElement("ul");
        ul.innerHTML = `<span class = "action-verb"> ${action.verb} </span> <span class = "action-noun">${action.noun}</span>`;
        ul.addEventListener("click", action.handler);
        customContextMenu.appendChild(ul);
    }
}


// --- Starting Actions ---

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

function getCurrentEnemyAt(row, column) {
    return worldObjects.find( obj => 
        obj.position.row === row &&
        obj.position.column === column &&
        obj.action.actionId === "fight"
    )
}   
function startAttackCurrentEnemyAt(row, column) {
    currentEnemy = getCurrentEnemyAt(row, column);
    startPlayerAction(row, column, "isAttacking", -1);
    return currentEnemy;
}

function tryPrimaryWorldAction(row, column) {
    for (const obj of worldObjects) {
        if (!obj.action) continue;
        if (obj.position.column === column &&
            obj.position.row === row &&
            obj.action.canInteract()) {
                obj.action.onPrimary(row, column);
                return true;
            }
        }
        if (tileHasDroppedItem(row, column)) {
            startPickUpAt(row, column);
            return true;
        }
        return false;
}
