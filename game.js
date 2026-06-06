const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 1200;
canvas.height = 800;

// Game constants
const TILE_SIZE = 40;
const MIND_DECAY_RATE = 0.3;
const ISOLATION_TIME = 600000; // 10 minutes in ms
const BREAKDOWN_TIME = 900000; // 15 minutes in ms
const MONSTER_SPAWN_TIME = 600000; // 10 minutes
const ALLY_DANGER_DISTANCE = 500;
const ALLY_SAFE_DISTANCE = 150;

// Game state
let gameState = {
    time: 0,
    round: 1,
    isGameRunning: true,
    monsterSpawned: false,
    monsterSpawnTime: MONSTER_SPAWN_TIME
};

// Player class
class Player {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 40;
        this.speedX = 0;
        this.speedY = 0;
        this.speed = 5;
        this.type = type; // 'normal', 'reactive', 'glitch', 'scientist', 'lunatic', 'kleptoman'
        this.mind = 100;
        this.health = 100;
        this.infected = false;
        this.isolation = 0;
        this.inventory = [];
        this.color = this.getColor();
        this.lastAllyContact = Date.now();
        this.breathing = 0;
    }

    getColor() {
        switch(this.type) {
            case 'reactive': return '#00ff00';
            case 'glitch': return '#ff00ff';
            case 'scientist': return '#ffff00';
            case 'lunatic': return '#ff6600';
            case 'kleptoman': return '#00ffff';
            default: return '#ffff00';
        }
    }

    update(dt, allPlayers) {
        // Check isolation
        let nearAlly = false;
        for (let other of allPlayers) {
            if (other !== this) {
                const dist = Math.hypot(this.x - other.x, this.y - other.y);
                if (dist < ALLY_SAFE_DISTANCE && !other.infected) {
                    nearAlly = true;
                    this.lastAllyContact = Date.now();
                    break;
                }
            }
        }

        // Mind decay
        if (!nearAlly) {
            this.isolation += dt;
            const isolationSeconds = this.isolation / 1000;
            
            if (isolationSeconds > 10 && isolationSeconds < 15) {
                this.mind = Math.max(0, this.mind - MIND_DECAY_RATE * dt / 1000);
            } else if (isolationSeconds >= 15) {
                this.mind = Math.max(0, this.mind - MIND_DECAY_RATE * 2 * dt / 1000);
                this.breathing = (this.breathing + 0.1) % (Math.PI * 2);
            }
        } else {
            this.isolation = 0;
            this.mind = Math.min(100, this.mind + 0.5 * dt / 1000);
        }

        // Death condition
        if (this.mind <= 0) {
            this.health = 0;
        }

        // Apply movement
        this.x += this.speedX * this.speed;
        this.y += this.speedY * this.speed;

        // Boundary check
        this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
        this.y = Math.max(0, Math.min(canvas.height - this.height, this.y));
    }

    draw() {
        // Body
        ctx.fillStyle = this.infected ? '#ff0000' : this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Head
        ctx.fillStyle = this.infected ? '#990000' : 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + 8, 8, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = this.infected ? '#00ff00' : '#000';
        ctx.fillRect(this.x + this.width / 2 - 8, this.y + 4, 3, 3);
        ctx.fillRect(this.x + this.width / 2 + 5, this.y + 4, 3, 3);

        // Radiation glow for reactive type
        if (this.type === 'reactive') {
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 50, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Glitch effect for glitch type
        if (this.type === 'glitch') {
            ctx.fillStyle = 'rgba(255, 0, 255, 0.2)';
            ctx.fillRect(this.x + Math.random() * 5, this.y + Math.random() * 5, this.width - Math.random() * 5, this.height - Math.random() * 5);
        }
    }
}

// Monster class (Bacteria/Mimick)
class Monster {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.width = 40;
        this.height = 50;
        this.speed = 3;
        this.targetPlayer = null;
        this.mimickingPlayer = null;
        this.recordedVoiceLines = [];
        this.health = 150;
    }

    findTarget(players) {
        let closest = null;
        let closestDist = Infinity;
        for (let player of players) {
            if (!player.infected) {
                const dist = Math.hypot(this.x - player.x, this.y - player.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = player;
                }
            }
        }
        return closest;
    }

    update(players) {
        this.targetPlayer = this.findTarget(players);
        
        if (this.targetPlayer) {
            const dx = this.targetPlayer.x - this.x;
            const dy = this.targetPlayer.y - this.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist > 0) {
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
            }
        }
    }

    draw() {
        // Body
        ctx.fillStyle = '#8b0000';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Infected aura
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 70, 0, Math.PI * 2);
        ctx.stroke();

        // Eyes (glowing red)
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x + this.width / 2 - 12, this.y + 10, 5, 5);
        ctx.fillRect(this.x + this.width / 2 + 7, this.y + 10, 5, 5);
    }
}

// Water source class
class WaterSource {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 50;
        this.infected = false;
    }

    draw() {
        ctx.fillStyle = this.infected ? '#ff4444' : 'rgba(100, 200, 255, 0.6)';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = this.infected ? '#ff0000' : '#0099ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }

    draw() {
        ctx.fillStyle = this.infected ? '#ff4444' : 'rgba(100, 200, 255, 0.6)';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = this.infected ? '#ff0000' : '#0099ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // Label
        ctx.fillStyle = '#00ff00';
        ctx.font = '10px Courier';
        ctx.fillText('WATER', this.x + 10, this.y + 25);
    }
}

// Trap class
class Trap {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 80;
        this.height = 60;
        this.triggered = false;
    }

    draw() {
        ctx.fillStyle = this.triggered ? '#ff0000' : '#cc0000';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        ctx.fillStyle = '#ffff00';
        ctx.font = '10px Courier';
        ctx.fillText('TRAP', this.x + 25, this.y + 30);
    }

    checkCollision(player) {
        return player.x < this.x + this.width &&
               player.x + player.width > this.x &&
               player.y < this.y + this.height &&
               player.y + player.height > this.y;
    }
}

// Game initialization
let players = [];
let monster = null;
let waterSources = [];
let traps = [];

function initGame() {
    players = [];
    
    // Create 4 players with different types
    const types = ['normal', 'reactive', 'glitch', 'scientist'];
    const positions = [
        { x: 100, y: 100 },
        { x: 1000, y: 100 },
        { x: 100, y: 650 },
        { x: 1000, y: 650 }
    ];
    
    for (let i = 0; i < types.length; i++) {
        players.push(new Player(positions[i].x, positions[i].y, types[i]));
    }
    
    // Create water sources
    waterSources = [
        new WaterSource(300, 350),
        new WaterSource(900, 350),
        new WaterSource(600, 150)
    ];
    
    // Create traps
    traps = [
        new Trap(400, 200),
        new Trap(800, 600),
        new Trap(500, 400)
    ];
    
    monster = null;
    gameState.time = 0;
}

// Input handling
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    if (e.key === ' ') {
        // Space - interact with water
        const player = players[0];
        for (let water of waterSources) {
            const dist = Math.hypot(player.x - water.x, player.y - water.y);
            if (dist < 100) {
                if (Math.random() > 0.1 || water.infected) {
                    player.inventory.push('water');
                    if (Math.random() < 0.1) {
                        player.infected = true;
                    }
                }
            }
        }
    }
    
    if (e.key === 'q' || e.key === 'Q') {
        // Q - drink water
        const player = players[0];
        if (player.inventory.includes('water')) {
            player.inventory = player.inventory.filter(item => item !== 'water');
            player.mind = Math.min(100, player.mind + 30);
        }
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Update game
let lastTime = Date.now();
function update() {
    const now = Date.now();
    const dt = now - lastTime;
    lastTime = now;
    
    gameState.time += dt;
    
    // Player movement
    if (players.length > 0) {
        const player = players[0];
        player.speedX = 0;
        player.speedY = 0;
        
        if (keys['w']) player.speedY = -1;
        if (keys['s']) player.speedY = 1;
        if (keys['a']) player.speedX = -1;
        if (keys['d']) player.speedX = 1;
    }
    
    // Update all players
    for (let player of players) {
        player.update(dt, players);
    }
    
    // Spawn monster at 10 minutes
    if (gameState.time > MONSTER_SPAWN_TIME && !gameState.monsterSpawned) {
        monster = new Monster();
        gameState.monsterSpawned = true;
    }
    
    // Update monster
    if (monster) {
        monster.update(players);
        
        // Check collision with player
        for (let player of players) {
            const dist = Math.hypot(monster.x - player.x, monster.y - player.y);
            if (dist < 40) {
                if (!player.infected) {
                    player.infected = true;
                }
            }
        }
    }
    
    // Check traps
    for (let trap of traps) {
        for (let player of players) {
            if (trap.checkCollision(player)) {
                player.health -= 5;
                trap.triggered = true;
            }
        }
    }
    
    // Remove dead players
    players = players.filter(p => p.health > 0);
}

// Draw game
function draw() {
    // Clear canvas with yellow background
    ctx.fillStyle = '#f4e4a6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(200, 150, 100, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
    
    // Draw water sources
    for (let water of waterSources) {
        water.draw();
    }
    
    // Draw traps
    for (let trap of traps) {
        trap.draw();
    }
    
    // Draw players
    for (let player of players) {
        player.draw();
    }
    
    // Draw monster
    if (monster) {
        monster.draw();
    }
    
    // Update HUD
    updateHUD();
}

// Update HUD elements
function updateHUD() {
    if (players.length === 0) return;
    
    const player = players[0];
    
    // Mind bar
    const mindFill = document.getElementById('mindFill');
    mindFill.style.width = Math.max(0, player.mind) + '%';
    if (player.mind < 30) {
        mindFill.classList.add('danger');
    } else {
        mindFill.classList.remove('danger');
    }
    
    // Health
    document.getElementById('healthText').textContent = Math.round(player.health) + '%';
    
    // Status
    let status = 'OK';
    if (player.infected) status = '<span class="warning">INFECTED</span>';
    else if (player.mind < 30) status = '<span class="warning">CRITICAL</span>';
    else if (player.isolation > 300000) status = 'ISOLATED';
    document.getElementById('statusText').innerHTML = status;
    
    // Team info
    let infectedCount = players.filter(p => p.infected).length;
    document.getElementById('teamCount').textContent = Math.max(0, players.length);
    document.getElementById('infectedCount').textContent = infectedCount;
    
    // Distance to ally
    let minDist = Infinity;
    for (let other of players) {
        if (other !== player) {
            const dist = Math.hypot(player.x - other.x, player.y - other.y);
            minDist = Math.min(minDist, dist);
        }
    }
    document.getElementById('allyDistance').textContent = minDist === Infinity ? '∞' : Math.round(minDist);
    
    // Inventory
    const itemSlots = document.getElementById('itemSlots');
    itemSlots.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const slot = document.createElement('div');
        slot.className = 'item-slot';
        if (i < player.inventory.length) {
            slot.textContent = player.inventory[i][0].toUpperCase();
        }
        itemSlots.appendChild(slot);
    }
}

// Main game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start game
initGame();
gameLoop();