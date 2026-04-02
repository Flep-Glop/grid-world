const ITEMS = {


// ------------- Miscellaneous -------------
    bones: {
        id: "bones",
        name: "Bones",
        description: "A pile of bones.",
        type: "miscellaneous",
        render: { column: 14, row: 4 }
    },
    leather: {
        id: "leather",
        name: "Leather",
        description: "A piece of leather.",
        type: "miscellaneous",
        render: { column: 5, row: 6 }
    },
    goblinTooth: {
        id: "goblinTooth",
        name: "Goblin Tooth",
        description: "A goblin tooth.",
        type: "miscellaneous",
        render: { column: 13, row: 5 }
    },
    coins: {
        id: "coins",
        name: "Coins",
        description: "A pile of coins.",
        type: "miscellaneous",
        render: { column: 0, row: 0 }
    },
    sapphire: {
        id: "sapphire",
        name: "Sapphire",
        description: "A sapphire.",
        type: "gem",
        render: { column: 9, row: 3 }
    },

// ------------- Ores & Ingots -------------
    tinOre: {
        id: "tinOre",
        name: "Tin Ore",
        description: "A chunk of tin ore.",
        type: "ore",
        render: { column: 4, row: 5 },
        mining: { level: 1, xp: 1, odds: 2 },
    },

    ironIngot: {
        id: "ironIngot",
        name: "Iron Ingot",
        description: "A chunk of iron ingot.",
        type: "ingot",
        render: { column: 4, row: 8 }
    },


// ------------- Gear & Accessories -------------
    bronzeHelmet: {
        id: "bronzeHelmet",
        name: "Bronze Helmet",
        description: "A bronze helmet.",
        type: "helmet",
        render: { column: 1, row: 0 }
    },
    tinSword: {
        id: "tinSword",
        name: "Tin Sword",
        description: "A tin sword.",
        type: "sword",
        render: { column: 4, row: 1 }
    },
    bronzeRing: {
        id: "bronzeRing",
        name: "Bronze Ring",
        description: "A bronze ring.",
        type: "ring",
        render: { column: 11, row: 0 }
    },
    woodShield: {
        id: "woodShield",
        name: "Wood Shield",
        description: "A wood shield.",
        type: "shield",
        render: { column: 8, row: 0 }
    },
    steelGloves: {
        id: "steelGloves",
        name: "Steel Gloves",
        description: "Steel gloves.",
        type: "gloves",
        render: { column: 9, row: 2 }
    } 
}

const ACTIONS = {
    mine: {
        id: "mine",
        name: "Mine",
        type: "skilling",
        render: { column: 1, row: 0 }
    },
    fight: {
        id: "fight",
        name: "Fight",
        type: "combat",
        render: { column: 0, row: 0 }
    },
    enter: {
        id: "enter",
        name: "Enter",
        type: "navigation",
        render: { column: 17, row: 0 }
    }
}

