// Game setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const pauseScreen = document.getElementById('pauseScreen');
const leaderboardScreen = document.getElementById('leaderboardScreen');
const achievementPopup = document.getElementById('achievementPopup');

// Add mute button SVG toggle
let muteIconHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M11 5L6 9H2v6h4l5 4V5z"/>
    <path d="M15.54 8.46a5 5 0 010 7.07"/>
</svg>`;
let mutedIconHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M11 5L6 9H2v6h4l5 4V5z"/>
    <line x1="23" y1="9" x2="17" y2="15"/>
    <line x1="17" y1="9" x2="23" y2="15"/>
</svg>`;

// UI Elements
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const menuButton = document.getElementById('menuButton');
const pauseButton = document.getElementById('pauseButton');
const resumeButton = document.getElementById('resumeButton');
const quitButton = document.getElementById('quitButton');
const muteButton = document.getElementById('muteButton');
const showLeaderboardBtn = document.getElementById('showLeaderboard');
const backToMenuBtn = document.getElementById('backToMenu');
const clearLeaderboardBtn = document.getElementById('clearLeaderboard');

const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const finalScoreDisplay = document.getElementById('finalScore');
const finalComboDisplay = document.getElementById('finalCombo');
const comboDisplay = document.getElementById('comboDisplay');
const difficultyDisplay = document.getElementById('difficultyDisplay');
const highScoreDisplay = document.getElementById('highScore');
const newHighScoreDisplay = document.getElementById('newHighScore');
const achievementsDisplay = document.getElementById('achievements');
const activePowerupsDisplay = document.getElementById('activePowerups');
const playerNameInput = document.getElementById('playerName');
const mobileControls = document.getElementById('mobileControls');

// Set canvas size
function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Audio setup
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let isMuted = false;

function playSound(frequency, duration, type = 'sine') {
    if (isMuted) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

const sounds = {
    collect: () => playSound(800, 0.1),
    rainbow: () => {
        playSound(600, 0.15);
        setTimeout(() => playSound(800, 0.15), 100);
        setTimeout(() => playSound(1000, 0.15), 200);
    },
    hit: () => playSound(150, 0.3, 'sawtooth'),
    powerup: () => {
        playSound(400, 0.1);
        setTimeout(() => playSound(600, 0.1), 80);
        setTimeout(() => playSound(800, 0.15), 160);
    },
    achievement: () => {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => playSound(800 + i * 200, 0.15), i * 100);
        }
    }
};

// Game state
let gameRunning = false;
let gamePaused = false;
let score = 0;
let lives = 3;
let difficulty = 'easy';
let shipColor = 'blue';
let playerName = 'Pilot';
let highScore = 0;
let combo = 0;
let maxCombo = 0;
let lastStarTime = 0;
let comboTimeout = null;

let player;
let stars = [];
let asteroids = [];
let particles = [];
let powerups = [];
let activePowerups = [];
let backgroundStars = [];
let animationId;
let gameTime = 0;
let firstPlay = true;
let unlockedAchievements = [];
let frozenTime = 0;

// Difficulty settings
const difficultySettings = {
    easy: { asteroidSpawnRate: 0.01, starSpawnRate: 0.025, asteroidSpeed: 2, lives: 5 },
    medium: { asteroidSpawnRate: 0.018, starSpawnRate: 0.02, asteroidSpeed: 3, lives: 3 },
    hard: { asteroidSpawnRate: 0.025, starSpawnRate: 0.015, asteroidSpeed: 4, lives: 2 }
};

// Ship colors
const shipColors = {
    blue: { main: '#4fc3f7', light: '#81d4fa', dark: '#0288d1' },
    red: { main: '#ff6b6b', light: '#ff8787', dark: '#c92a2a' },
    green: { main: '#51cf66', light: '#8ce99a', dark: '#2f9e44' },
    purple: { main: '#cc5de8', light: '#e599f7', dark: '#9c36b5' },
    gold: { main: '#ffd700', light: '#ffe066', dark: '#f59f00' }
};

// Achievements
const achievements = [
    { id: 'first100', name: 'Century Club', condition: () => score >= 100, unlocked: false },
    { id: 'combo5', name: '5x Combo Master', condition: () => maxCombo >= 5, unlocked: false },
    { id: 'flawless', name: 'Flawless Run', condition: () => score >= 50 && lives === difficultySettings[difficulty].lives, unlocked: false },
    { id: 'survivor', name: '60 Second Survivor', condition: () => gameTime >= 60000, unlocked: false },
    { id: 'rainbow', name: 'Rainbow Hunter', condition: () => false, manual: true },
];

// Load/Save functions
function loadHighScore() {
    const saved = localStorage.getItem('cosmicHighScore');
    highScore = saved ? parseInt(saved) : 0;
    highScoreDisplay.textContent = highScore;
}

function saveHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('cosmicHighScore', highScore);
        highScoreDisplay.textContent = highScore;
        return true;
    }
    return false;
}

function saveToLeaderboard() {
    let leaderboard = JSON.parse(localStorage.getItem('cosmicLeaderboard') || '[]');
    leaderboard.push({
        name: playerName,
        score: score,
        difficulty: difficulty,
        date: new Date().toISOString()
    });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10);
    localStorage.setItem('cosmicLeaderboard', JSON.stringify(leaderboard));
}

function displayLeaderboard() {
    const leaderboard = JSON.parse(localStorage.getItem('cosmicLeaderboard') || '[]');
    const list = document.getElementById('leaderboardList');
    
    if (leaderboard.length === 0) {
        list.innerHTML = '<p style="color: rgba(255,255,255,0.6); padding: 20px;">No records yet. Be the first!</p>';
        return;
    }
    
    list.innerHTML = leaderboard.map((entry, index) => `
        <div class="leaderboard-entry">
            <span class="leaderboard-rank">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}</span>
            <span class="leaderboard-name">${entry.name}</span>
            <span class="leaderboard-difficulty">${entry.difficulty}</span>
            <span class="leaderboard-score">${entry.score}</span>
        </div>
    `).join('');
}

// Background stars
class BackgroundStar {
    constructor(layer) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = layer === 1 ? 1 : layer === 2 ? 1.5 : 2;
        this.speed = layer * 0.3;
        this.opacity = 0.3 + (layer * 0.2);
    }

    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }

    update() {
        this.y += this.speed * (frozenTime > 0 ? 0.2 : 1);
        if (this.y > canvas.height) {
            this.y = 0;
            this.x = Math.random() * canvas.width;
        }
    }
}

function initBackgroundStars() {
    backgroundStars = [];
    for (let i = 0; i < 100; i++) {
        const layer = Math.floor(Math.random() * 3) + 1;
        backgroundStars.push(new BackgroundStar(layer));
    }
}

// Player
class Player {
    constructor() {
        this.width = 40;
        this.height = 40;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 20;
        this.baseSpeed = 5;
        this.speed = this.baseSpeed;
        this.dx = 0;
        this.dy = 0;
        this.trail = [];
        this.invincible = false;
        this.magnetActive = false;
    }

    draw() {
        // Trail
        this.trail.forEach((pos, index) => {
            const alpha = (index / this.trail.length) * 0.5;
            ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
            ctx.beginPath();
            ctx.arc(pos.x + this.width / 2, pos.y + this.height / 2, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        
        const colors = shipColors[shipColor];
        
        if (this.invincible) {
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, 25, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.fillStyle = colors.main;
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(-15, 15);
        ctx.lineTo(15, 15);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = colors.light;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = colors.dark;
        ctx.beginPath();
        ctx.moveTo(-15, 5);
        ctx.lineTo(-25, 15);
        ctx.lineTo(-15, 15);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(15, 5);
        ctx.lineTo(25, 15);
        ctx.lineTo(15, 15);
        ctx.closePath();
        ctx.fill();
        
        const glowColor = this.speed > this.baseSpeed ? '#ffd700' : '#ff6b6b';
        ctx.fillStyle = glowColor;
        ctx.globalAlpha = 0.7 + Math.random() * 0.3;
        ctx.beginPath();
        ctx.arc(-8, 15, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(8, 15, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    update() {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 10) this.trail.shift();

        this.x += this.dx;
        this.y += this.dy;

        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
        if (this.y < 0) this.y = 0;
        if (this.y + this.height > canvas.height) this.y = canvas.height - this.height;
    }
}

// Star
class Star {
    constructor(type = 'normal') {
        this.type = type;
        this.size = type === 'rainbow' ? 30 : type === 'freeze' ? 25 : 20 + Math.random() * 10;
        this.x = Math.random() * (canvas.width - this.size);
        this.y = -this.size;
        this.speed = 2 + Math.random() * 2;
        this.rotation = 0;
        this.rotationSpeed = 0.05 + Math.random() * 0.1;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
        ctx.rotate(this.rotation);
        
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (this.type === 'rainbow') {
            ctx.fillText('🌈', 0, 0);
        } else if (this.type === 'freeze') {
            ctx.fillText('⏸️', 0, 0);
        } else {
            ctx.fillText('⭐', 0, 0);
        }
        
        ctx.restore();
    }

    update() {
        this.y += this.speed * (frozenTime > 0 ? 0.2 : 1);
        this.rotation += this.rotationSpeed;
    }

    collidesWith(obj) {
        return this.x < obj.x + obj.width &&
               this.x + this.size > obj.x &&
               this.y < obj.y + obj.height &&
               this.y + this.size > obj.y;
    }
}

// Asteroid
class Asteroid {
    constructor() {
        this.size = 25 + Math.random() * 15;
        this.x = Math.random() * (canvas.width - this.size);
        this.y = -this.size;
        const settings = difficultySettings[difficulty];
        this.speed = settings.asteroidSpeed + Math.random() * 2 + (score / 500);
        this.rotation = 0;
        this.rotationSpeed = 0.02 + Math.random() * 0.08;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
        ctx.rotate(this.rotation);
        
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('☄️', 0, 0);
        
        ctx.restore();
    }

    update() {
        this.y += this.speed * (frozenTime > 0 ? 0.2 : 1);
        this.rotation += this.rotationSpeed;
    }

    collidesWith(obj) {
        return this.x < obj.x + obj.width &&
               this.x + this.size > obj.x &&
               this.y < obj.y + obj.height &&
               this.y + this.size > obj.y;
    }
}

// Powerup
class Powerup {
    constructor() {
        const types = ['shield', 'magnet', 'speed'];
        this.type = types[Math.floor(Math.random() * types.length)];
        this.size = 25;
        this.x = Math.random() * (canvas.width - this.size);
        this.y = -this.size;
        this.speed = 2;
        this.rotation = 0;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
        ctx.rotate(this.rotation);
        
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const icons = { shield: '🛡️', magnet: '💥', speed: '⏩' };
        ctx.fillText(icons[this.type], 0, 0);
        
        ctx.restore();
    }

    update() {
        this.y += this.speed;
        this.rotation += 0.05;
    }

    collidesWith(obj) {
        return this.x < obj.x + obj.width &&
               this.x + this.size > obj.x &&
               this.y < obj.y + obj.height &&
               this.y + this.size > obj.y;
    }
}

// Particle
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = 3 + Math.random() * 3;
        this.speedX = (Math.random() - 0.5) * 6;
        this.speedY = (Math.random() - 0.5) * 6;
        this.color = color;
        this.life = 30;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / 30;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life--;
    }
}

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

// Combo system
function updateCombo() {
    combo++;
    if (combo > maxCombo) maxCombo = combo;
    
    clearTimeout(comboTimeout);
    comboTimeout = setTimeout(() => {
        combo = 0;
        comboDisplay.textContent = '';
    }, 2000);
    
    if (combo >= 2) {
        comboDisplay.textContent = `${combo}x COMBO! 🔥`;
        comboDisplay.style.animation = 'none';
        setTimeout(() => comboDisplay.style.animation = 'pulse 0.5s ease-in-out', 10);
    }
}

// Achievement system
function checkAchievements() {
    achievements.forEach(ach => {
        if (!ach.unlocked && !ach.manual && ach.condition()) {
            ach.unlocked = true;
            unlockedAchievements.push(ach.name);
            showAchievement(ach.name);
        }
    });
}

function showAchievement(name) {
    sounds.achievement();
    document.getElementById('achievementText').textContent = name;
    achievementPopup.classList.remove('hidden');
    setTimeout(() => achievementPopup.classList.add('hidden'), 3000);
}

// Powerup activation
function activatePowerup(type) {
    sounds.powerup();
    const duration = 5000;
    
    if (type === 'shield') {
        player.invincible = true;
        addPowerupIndicator('🛡️ Shield', duration);
        setTimeout(() => player.invincible = false, duration);
    } else if (type === 'magnet') {
        player.magnetActive = true;
        addPowerupIndicator('💥 Magnet', duration);
        setTimeout(() => player.magnetActive = false, duration);
    } else if (type === 'speed') {
        player.speed = player.baseSpeed * 2;
        addPowerupIndicator('⏩ Speed', duration);
        setTimeout(() => player.speed = player.baseSpeed, duration);
    }
}

function addPowerupIndicator(text, duration) {
    const indicator = document.createElement('div');
    indicator.className = 'powerup-indicator';
    indicator.innerHTML = `<span>${text}</span><span class="powerup-timer">${(duration/1000).toFixed(0)}s</span>`;
    activePowerupsDisplay.appendChild(indicator);
    
    const interval = setInterval(() => {
        const timeLeft = parseInt(indicator.querySelector('.powerup-timer').textContent);
        if (timeLeft > 1) {
            indicator.querySelector('.powerup-timer').textContent = `${timeLeft - 1}s`;
        }
    }, 1000);
    
    setTimeout(() => {
        clearInterval(interval);
        indicator.remove();
    }, duration);
}

// Spawn functions
function spawnStar() {
    const settings = difficultySettings[difficulty];
    if (Math.random() < settings.starSpawnRate) {
        const rand = Math.random();
        if (rand < 0.05) {
            stars.push(new Star('rainbow'));
        } else if (rand < 0.1) {
            stars.push(new Star('freeze'));
        } else {
            stars.push(new Star('normal'));
        }
    }
}

function spawnAsteroid() {
    const settings = difficultySettings[difficulty];
    if (Math.random() < settings.asteroidSpawnRate * (1 + score / 1000)) {
        asteroids.push(new Asteroid());
    }
}

function spawnPowerup() {
    if (Math.random() < 0.005) {
        powerups.push(new Powerup());
    }
}

// Update displays
function updateDisplay() {
    scoreDisplay.textContent = score;
    
    // Update life bars
    livesDisplay.innerHTML = '';
    for (let i = 0; i < lives; i++) {
        const lifeBar = document.createElement('span');
        lifeBar.className = 'life-bar';
        livesDisplay.appendChild(lifeBar);
    }
    
    difficultyDisplay.textContent = difficulty.toUpperCase();
}

// Keyboard controls
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    if (e.key.toLowerCase() === 'p' && gameRunning) {
        togglePause();
    }
    
    if (e.key.toLowerCase() === 'm') {
        toggleMute();
    }
    
    if (gameRunning && !gamePaused && player) {
        if (keys['arrowleft'] || keys['a']) player.dx = -player.speed;
        if (keys['arrowright'] || keys['d']) player.dx = player.speed;
        if (keys['arrowup'] || keys['w']) player.dy = -player.speed;
        if (keys['arrowdown'] || keys['s']) player.dy = player.speed;
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    
    if (player) {
        if (!keys['arrowleft'] && !keys['a'] && !keys['arrowright'] && !keys['d']) {
            player.dx = 0;
        }
        if (!keys['arrowup'] && !keys['w'] && !keys['arrowdown'] && !keys['s']) {
            player.dy = 0;
        }
        
        if (keys['arrowleft'] || keys['a']) player.dx = -player.speed;
        if (keys['arrowright'] || keys['d']) player.dx = player.speed;
        if (keys['arrowup'] || keys['w']) player.dy = -player.speed;
        if (keys['arrowdown'] || keys['s']) player.dy = player.speed;
    }
});

// Pause/Resume
function togglePause() {
    if (!gameRunning) return;
    gamePaused = !gamePaused;
    if (gamePaused) {
        pauseScreen.classList.remove('hidden');
    } else {
        pauseScreen.classList.add('hidden');
    }
}

function toggleMute() {
    isMuted = !isMuted;
    muteButton.innerHTML = `<span class="btn-glow"></span>${isMuted ? mutedIconHTML : muteIconHTML}`;
}

// Game loop
let lastTime = 0;
function gameLoop(timestamp) {
    if (!gameRunning) return;
    if (gamePaused) {
        animationId = requestAnimationFrame(gameLoop);
        return;
    }

    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    gameTime += deltaTime;

    // Clear with fade effect
    ctx.fillStyle = 'rgba(10, 10, 30, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Background stars
    backgroundStars.forEach(star => {
        star.update();
        star.draw();
    });

    // Spawn objects
    spawnStar();
    spawnAsteroid();
    spawnPowerup();

    // Update frozen time
    if (frozenTime > 0) {
        frozenTime -= deltaTime;
    }

    // Update and draw player
    player.update();
    player.draw();

    // Stars
    for (let i = stars.length - 1; i >= 0; i--) {
        stars[i].update();
        stars[i].draw();

        // Magnet effect
        if (player.magnetActive && stars[i].y > 0) {
            const dx = (player.x + player.width / 2) - (stars[i].x + stars[i].size / 2);
            const dy = (player.y + player.height / 2) - (stars[i].y + stars[i].size / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
                stars[i].x += dx * 0.05;
                stars[i].y += dy * 0.05;
            }
        }

        if (stars[i].collidesWith(player)) {
            let points = 10;
            if (stars[i].type === 'rainbow') {
                points = 50;
                sounds.rainbow();
                achievements.find(a => a.id === 'rainbow').unlocked = true;
                unlockedAchievements.push('Rainbow Hunter');
                showAchievement('Rainbow Hunter');
            } else if (stars[i].type === 'freeze') {
                frozenTime = 3000;
                sounds.powerup();
                createParticles(stars[i].x + stars[i].size / 2, stars[i].y + stars[i].size / 2, '#00ffff', 20);
            } else {
                sounds.collect();
            }
            
            score += points * (combo >= 2 ? combo : 1);
            updateCombo();
            updateDisplay();
            createParticles(stars[i].x + stars[i].size / 2, stars[i].y + stars[i].size / 2, '#ffd700', 15);
            stars.splice(i, 1);
            checkAchievements();
            continue;
        }

        if (stars[i].y > canvas.height) {
            stars.splice(i, 1);
        }
    }

    // Asteroids
    for (let i = asteroids.length - 1; i >= 0; i--) {
        asteroids[i].update();
        asteroids[i].draw();

        if (!player.invincible && asteroids[i].collidesWith(player)) {
            lives--;
            sounds.hit();
            updateDisplay();
            createParticles(asteroids[i].x + asteroids[i].size / 2, asteroids[i].y + asteroids[i].size / 2, '#ff6b6b', 20);
            asteroids.splice(i, 1);

            if (lives <= 0) {
                endGame();
                return;
            }
            continue;
        }

        if (asteroids[i].y > canvas.height) {
            asteroids.splice(i, 1);
        }
    }

    // Powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
        powerups[i].update();
        powerups[i].draw();

        if (powerups[i].collidesWith(player)) {
            activatePowerup(powerups[i].type);
            createParticles(powerups[i].x + powerups[i].size / 2, powerups[i].y + powerups[i].size / 2, '#8b5cf6', 15);
            powerups.splice(i, 1);
            continue;
        }

        if (powerups[i].y > canvas.height) {
            powerups.splice(i, 1);
        }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();

        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }

    checkAchievements();
    animationId = requestAnimationFrame(gameLoop);
}

// Start game
function startGame() {
    score = 0;
    lives = difficultySettings[difficulty].lives;
    stars = [];
    asteroids = [];
    particles = [];
    powerups = [];
    activePowerups = [];
    combo = 0;
    maxCombo = 0;
    gameTime = 0;
    frozenTime = 0;
    unlockedAchievements = [];
    player = new Player();
    gameRunning = true;
    gamePaused = false;
    
    initBackgroundStars();
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    leaderboardScreen.classList.add('hidden');
    
    updateDisplay();
    lastTime = performance.now();
    gameLoop(lastTime);
}

// End game
function endGame() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    
    finalScoreDisplay.textContent = score;
    finalComboDisplay.textContent = maxCombo;
    
    const isNewHighScore = saveHighScore();
    if (isNewHighScore) {
        newHighScoreDisplay.classList.remove('hidden');
    } else {
        newHighScoreDisplay.classList.add('hidden');
    }
    
    saveToLeaderboard();
    
    if (unlockedAchievements.length > 0) {
        achievementsDisplay.innerHTML = unlockedAchievements.map(name => 
            `<div class="achievement-item">🏆 ${name}</div>`
        ).join('');
    } else {
        achievementsDisplay.innerHTML = '';
    }
    
    gameOverScreen.classList.remove('hidden');
}

// UI Events
startButton.addEventListener('click', () => {
    playerName = playerNameInput.value.trim() || 'Pilot';
    startGame();
});

restartButton.addEventListener('click', startGame);

menuButton.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
});

quitButton.addEventListener('click', () => {
    gameRunning = false;
    gamePaused = false;
    cancelAnimationFrame(animationId);
    pauseScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
});

resumeButton.addEventListener('click', togglePause);
pauseButton.addEventListener('click', togglePause);
muteButton.addEventListener('click', toggleMute);

showLeaderboardBtn.addEventListener('click', () => {
    displayLeaderboard();
    startScreen.classList.add('hidden');
    leaderboardScreen.classList.remove('hidden');
});

backToMenuBtn.addEventListener('click', () => {
    leaderboardScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
});

clearLeaderboardBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all records?')) {
        localStorage.removeItem('cosmicLeaderboard');
        displayLeaderboard();
    }
});

// Difficulty selection
document.querySelectorAll('.diff-card').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-card').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.difficulty;
    });
});

// Ship color selection
document.querySelectorAll('.color-chip').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.color-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        shipColor = btn.dataset.color;
    });
});

// Mobile detection
if ('ontouchstart' in window) {
    mobileControls.classList.remove('hidden');
    
    // Simple touch controls
    let touchStartX = 0, touchStartY = 0;
    
    canvas.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!player || gamePaused) return;
        
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        
        const dx = touchX - touchStartX;
        const dy = touchY - touchStartY;
        
        player.dx = dx * 0.1;
        player.dy = dy * 0.1;
        
        touchStartX = touchX;
        touchStartY = touchY;
    });
    
    canvas.addEventListener('touchend', () => {
        if (player) {
            player.dx = 0;
            player.dy = 0;
        }
    });
}

// Initialize
loadHighScore();
