document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const gameContainer = document.getElementById('gameContainer');
    const gameCanvas = document.getElementById('gameCanvas');
    const startScreen = document.getElementById('startScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const pauseScreen = document.getElementById('pauseScreen');
    const playButton = document.getElementById('playButton');
    const restartButton = document.getElementById('restartButton');
    const mainMenuButton = document.getElementById('mainMenuButton');
    const resumeButton = document.getElementById('resumeButton');
    const quitButton = document.getElementById('quitButton');
    const scoreElement = document.getElementById('scoreElement');
    const highScoreElement = document.getElementById('highScoreElement');
    const finalScore = document.getElementById('finalScore');
    const newHighScore = document.getElementById('newHighScore');
    const achievementUnlocked = document.getElementById('achievementUnlocked');
    const muteButton = document.getElementById('muteButton');
    const pauseButton = document.getElementById('pauseButton');
    const fuelElement = document.getElementById('fuelElement');
    const levelElement = document.getElementById('levelElement');
    const powerupIndicator = document.getElementById('powerupIndicator');
    const difficultySelect = document.getElementById('difficultySelect');
    
    const ctx = gameCanvas.getContext('2d');

    // Set canvas dimensions
    function resizeCanvas() {
        gameCanvas.width = gameContainer.clientWidth;
        gameCanvas.height = gameContainer.clientHeight;
    }
    
    resizeCanvas();

    // Game variables
    let gameActive = false;
    let gamePaused = false;
    let score = 0;
    let level = 1;
    let highScore = localStorage.getItem('planeHighScore') || 0;
    let animationFrameId;
    let lastTime = 0;
    let obstacleTimer = 0;
    let obstacleInterval = 1500; // Time in ms between obstacles
    let obstacleSpeed = 5;
    let difficulty = 1;
    let muted = false;
    let fuel = 100;
    let fuelDecreaseRate = 0.1;
    let fuelIncreaseAmount = 30;
    let powerupActive = false;
    let powerupType = null;
    let powerupDuration = 0;
    let gameTime = 0;
    let dayNightCycle = false;
    let isNight = false;
    let dayLength = 60000; // 60 seconds per day/night cycle
    let achievements = JSON.parse(localStorage.getItem('planeAchievements')) || {
        firstFlight: false,
        fuelMaster: false,
        nightFlyer: false,
        speedDemon: false,
        levelMaster: false
    };
    
    // Create night overlay
    const nightOverlay = document.createElement('div');
    nightOverlay.className = 'night-overlay';
    gameContainer.appendChild(nightOverlay);
    
    // Audio elements
    const backgroundMusic = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-game-show-suspense-waiting-668.mp3');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.3;

    const crashSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-arcade-game-explosion-2759.mp3');
    const pointSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3');
    const whooshSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-quick-jump-arcade-game-239.mp3');
    const powerupSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-arcade-bonus-alert-767.mp3');
    const fuelSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-positive-interface-beep-221.mp3');
    const achievementSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3');
    const levelUpSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-ethereal-fairy-win-sound-2019.mp3');
    const alertSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');

    // Initialize high score display
    highScoreElement.textContent = `High Score: ${highScore}`;

    // Create plane object
    const plane = {
        x: 100,
        y: gameCanvas.height / 2,
        width: 60,
        height: 30,
        speed: 5,
        velocityY: 0,
        gravity: 0.2,
        lift: -5,
        invincible: false,
        trailTimer: 0,
        trail: [],
        
        draw: function() {
            // Draw trail effect when power-up active
            if (powerupActive && (powerupType === 'speed' || powerupType === 'invincibility')) {
                ctx.save();
                this.trail.forEach((pos, i) => {
                    const alpha = 1 - (i / this.trail.length);
                    ctx.globalAlpha = alpha * 0.5;
                    
                    const trailColor = powerupType === 'speed' ? '#FF4500' : '#4169E1';
                    ctx.fillStyle = trailColor;
                    
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, 5 + (i / this.trail.length) * 15, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.restore();
            }
            
            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.rotate(this.velocityY * 0.03);
            
            // Flash effect when invincible
            if (this.invincible && Math.floor(Date.now() / 150) % 2 === 0) {
                ctx.globalAlpha = 0.7;
            }
            
            // Plane body - change color based on power-up
            ctx.fillStyle = powerupActive ? 
                (powerupType === 'speed' ? '#FF4500' : 
                 powerupType === 'invincibility' ? '#4169E1' : '#F0F0F0') : 
                '#F0F0F0';
                
            ctx.beginPath();
            ctx.ellipse(-5, 0, this.width / 2, this.height / 3, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Wings
            ctx.fillStyle = powerupActive ? 
                (powerupType === 'speed' ? '#FF6347' : 
                 powerupType === 'invincibility' ? '#6495ED' : '#3498db') : 
                '#3498db';
                
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-10, -this.height);
            ctx.lineTo(10, -this.height);
            ctx.closePath();
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(-5, 0);
            ctx.lineTo(-15, this.height / 2);
            ctx.lineTo(15, this.height / 2);
            ctx.closePath();
            ctx.fill();
            
            // Tail
            ctx.beginPath();
            ctx.moveTo(-this.width / 2, 0);
            ctx.lineTo(-this.width / 2 - 10, -this.height / 3);
            ctx.lineTo(-this.width / 2 + 5, -this.height / 3);
            ctx.closePath();
            ctx.fill();
            
            // Windows
            ctx.fillStyle = isNight ? '#FFFF00' : '#333';
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(-15 + i * 12, -2, 3, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Propeller
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(this.width / 2 - 5, 0, 5, 0, Math.PI * 2);
            ctx.fill();
            
            const now = Date.now();
            const rotationSpeed = powerupActive && powerupType === 'speed' ? 30 : 50;
            const rotation = (now / rotationSpeed) % (Math.PI * 2);
            
            ctx.save();
            ctx.translate(this.width / 2 - 5, 0);
            ctx.rotate(rotation);
            ctx.fillStyle = '#555';
            ctx.fillRect(-1, -15, 2, 30);
            ctx.rotate(Math.PI / 2);
            ctx.fillRect(-1, -15, 2, 30);
            ctx.restore();
            
            // Add flame effect for speed power-up
            if (powerupActive && powerupType === 'speed') {
                ctx.beginPath();
                ctx.moveTo(-this.width / 2 - 10, 0);
                
                const flameHeight = 20 + Math.sin(Date.now() / 100) * 10;
                
                ctx.lineTo(-this.width / 2 - 30, -flameHeight / 2);
                ctx.lineTo(-this.width / 2 - 40, 0);
                ctx.lineTo(-this.width / 2 - 30, flameHeight / 2);
                ctx.closePath();
                
                const gradient = ctx.createLinearGradient(
                    -this.width / 2 - 10, 0,
                    -this.width / 2 - 40, 0
                );
                gradient.addColorStop(0, '#FF4500');
                gradient.addColorStop(1, '#FFFF00');
                ctx.fillStyle = gradient;
                ctx.fill();
            }
            
            // Shield effect for invincibility
            if (powerupActive && powerupType === 'invincibility') {
                ctx.beginPath();
                ctx.arc(0, 0, this.width / 1.5, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(65, 105, 225, 0.6)';
                ctx.lineWidth = 3;
                ctx.stroke();
                
                // Add shield particles
                for (let i = 0; i < 5; i++) {
                    const angle = (Date.now() / 1000 + i) % (Math.PI * 2);
                    const x = Math.cos(angle) * this.width / 1.5;
                    const y = Math.sin(angle) * this.width / 1.5;
                    
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(100, 149, 237, 0.8)';
                    ctx.fill();
                }
            }
            
            ctx.restore();
        },
        
        update: function(deltaTime) {
            // Update trail for effects
            this.trailTimer += deltaTime;
            if (this.trailTimer > 50) {
                this.trail.unshift({
                    x: this.x + this.width / 4,
                    y: this.y + this.height / 2
                });
                
                if (this.trail.length > 10) {
                    this.trail.pop();
                }
                
                this.trailTimer = 0;
            }
            
            // Apply gravity
            this.velocityY += this.gravity;
            this.y += this.velocityY;
            
            // Limit velocityY to prevent too steep angles
            this.velocityY = Math.max(-10, Math.min(10, this.velocityY));
            
            // Boundary checks - die if hitting top or bottom
            if (this.y < 0 || this.y + this.height > gameCanvas.height) {
                if (!this.invincible) {
                    gameOver();
                } else {
                    // Bounce off boundaries when invincible
                    if (this.y < 0) {
                        this.y = 0;
                        this.velocityY = Math.abs(this.velocityY) * 0.5;
                    } else {
                        this.y = gameCanvas.height - this.height;
                        this.velocityY = -Math.abs(this.velocityY) * 0.5;
                    }
                }
            }
            
            // Decrease fuel over time
            if (gameActive && !gamePaused) {
                fuel -= fuelDecreaseRate * (difficulty / 2);
                
                // Update fuel display
                fuelElement.textContent = `Fuel: ${Math.max(0, Math.floor(fuel))}%`;
                
                // Alert when fuel is getting low
                if (fuel <= 20 && fuel > 19.9 && !muted) {
                    alertSound.play().catch(e => console.log("Audio play error:", e));
                }
                
                // Out of fuel - float down more quickly
                if (fuel <= 0) {
                    this.gravity = 0.4;
                    fuelElement.style.color = "red";
                } else {
                    this.gravity = 0.2;
                    fuelElement.style.color = fuel <= 20 ? "orange" : "white";
                }
            }
        },
        
        flap: function() {
            if (fuel > 0 || this.invincible) {
                this.velocityY = this.lift * (powerupActive && powerupType === 'speed' ? 1.2 : 1);
                
                if (!muted) {
                    whooshSound.currentTime = 0;
                    whooshSound.play().catch(e => console.log("Audio play error:", e));
                }
                
                // Consume fuel when flapping
                if (!this.invincible) {
                    fuel -= 1;
                }
            } else {
                // Weaker flap when out of fuel
                this.velocityY = this.lift * 0.4;
            }
        }
    };

    // Pipes array and power-ups array
    let pipes = [];
    let powerups = [];
    
    // Background stars for night mode
    let stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * gameCanvas.width,
            y: Math.random() * gameCanvas.height * 0.7, // Keep stars above ground
            size: Math.random() * 2 + 1,
            twinkle: Math.random()
        });
    }
    
    // Function to create a new pipe
    function createPipe() {
        const minGap = 130 - (difficulty * 5);
        const maxGap = 170 - (difficulty * 3);
        const pipeGap = Math.max(minGap, Math.min(maxGap, 150 - (difficulty * 3))); // Balance difficulty
        
        const pipeHeight = Math.floor(Math.random() * (gameCanvas.height - pipeGap - 200)) + 50;
        
        pipes.push({
            x: gameCanvas.width,
            topHeight: pipeHeight,
            bottomY: pipeHeight + pipeGap,
            width: 80,
            passed: false
        });
        
        // Randomly spawn a power-up with the pipe
        if (Math.random() < 0.15) { // 15% chance for power-up
            spawnPowerup();
        }
        
        // Spawn fuel with decreasing frequency as difficulty increases
        if (Math.random() < 0.3 - (difficulty * 0.02)) {
            spawnFuel();
        }
    }
    
    // Function to spawn a power-up
    function spawnPowerup() {
        const types = ['speed', 'invincibility'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        powerups.push({
            x: gameCanvas.width + Math.random() * 200, // Spawn slightly after pipe
            y: Math.random() * (gameCanvas.height - 100) + 50,
            width: 30,
            height: 30,
            type: type,
            collected: false,
            rotation: 0
        });
    }
    
    // Function to spawn a fuel can
    function spawnFuel() {
        powerups.push({
            x: gameCanvas.width + Math.random() * 100,
            y: Math.random() * (gameCanvas.height - 100) + 50,
            width: 25,
            height: 35,
            type: 'fuel',
            collected: false,
            rotation: 0
        });
    }
    
    // Background elements
    const background = {
        ground: {
            y: gameCanvas.height - 60,
            height: 60,
            position: 0,
            draw: function() {
                // Scroll the ground
                this.position -= obstacleSpeed * 0.7;
                if (this.position <= -gameCanvas.width) {
                    this.position = 0;
                }
                
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(0, this.y, gameCanvas.width, this.height);
                
                // Grass
                ctx.fillStyle = isNight ? '#1E3B1E' : '#2E8B57';
                ctx.fillRect(0, this.y, gameCanvas.width, 15);
                
                // Ground details with parallax scrolling
                ctx.fillStyle = '#A0522D';
                for (let i = 0; i < gameCanvas.width * 2; i += 30) {
                    const xPos = (i + this.position) % (gameCanvas.width * 1.5);
                    if (xPos < gameCanvas.width) {
                        ctx.fillRect(xPos, this.y + 25, 20, 5);
                        ctx.fillRect(xPos + 15, this.y + 40, 25, 5);
                    }
                }
            }
        },
        mountains: {
            position: 0,
            draw: function() {
                // Slower parallax for mountains
                this.position -= obstacleSpeed * 0.1;
                if (this.position <= -gameCanvas.width) {
                    this.position = 0;
                }
                
                // Draw mountains with parallax effect
                for (let i = -1; i <= 1; i++) {
                    const baseX = this.position + gameCanvas.width * i;
                    
                    // First mountain
                    ctx.fillStyle = isNight ? '#394070' : '#6A5ACD';
                    ctx.beginPath();
                    ctx.moveTo(baseX, background.ground.y);
                    ctx.lineTo(baseX + 250, 150);
                    ctx.lineTo(baseX + 500, background.ground.y);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Second mountain
                    ctx.fillStyle = isNight ? '#232850' : '#483D8B';
                    ctx.beginPath();
                    ctx.moveTo(baseX + 400, background.ground.y);
                    ctx.lineTo(baseX + 650, 180);
                    ctx.lineTo(baseX + 900, background.ground.y);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Snow caps - always visible, even at night
                    ctx.fillStyle = '#F0F8FF';
                    ctx.beginPath();
                    ctx.moveTo(baseX + 230, 170);
                    ctx.lineTo(baseX + 250, 150);
                    ctx.lineTo(baseX + 270, 170);
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.moveTo(baseX + 630, 200);
                    ctx.lineTo(baseX + 650, 180);
                    ctx.lineTo(baseX + 670, 200);
                    ctx.closePath();
                    ctx.fill();
                }
},
            stars: {
                draw: function() {
                    if (isNight) {
                        stars.forEach(star => {
                            // Make stars twinkle
                            const twinkle = 0.5 + Math.sin(Date.now() * 0.001 + star.twinkle * 10) * 0.5;
                            
                            ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
                            ctx.beginPath();
                            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                            ctx.fill();
                        });
                    }
                }
            },
            clouds: {
                positions: [
                    { x: 100, y: 100, size: 40, speed: 0.3 },
                    { x: 300, y: 50, size: 60, speed: 0.2 },
                    { x: 500, y: 150, size: 50, speed: 0.4 },
                    { x: 700, y: 80, size: 70, speed: 0.25 }
                ],
                draw: function() {
                    ctx.fillStyle = isNight ? 'rgba(200, 200, 220, 0.5)' : 'rgba(255, 255, 255, 0.8)';
                    
                    this.positions.forEach(cloud => {
                        cloud.x -= cloud.speed * (obstacleSpeed / 5);
                        if (cloud.x + cloud.size * 2 < 0) {
                            cloud.x = gameCanvas.width + cloud.size;
                            cloud.y = Math.random() * (background.ground.y / 2);
                        }
                        
                        ctx.beginPath();
                        ctx.arc(cloud.x, cloud.y, cloud.size / 2, 0, Math.PI * 2);
                        ctx.arc(cloud.x + cloud.size / 2, cloud.y - cloud.size / 4, cloud.size / 3, 0, Math.PI * 2);
                        ctx.arc(cloud.x + cloud.size, cloud.y, cloud.size / 2, 0, Math.PI * 2);
                        ctx.closePath();
                        ctx.fill();
                    });
                }
            },
            moon: {
                x: 100,
                y: 100,
                size: 50,
                draw: function() {
                    if (isNight) {
                        // Draw moon
                        ctx.fillStyle = '#FFFCEA';
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // Moon craters
                        ctx.fillStyle = '#E0E0D0';
                        [
                            { x: -15, y: -10, size: 10 },
                            { x: 5, y: 15, size: 8 },
                            { x: 20, y: -5, size: 12 }
                        ].forEach(crater => {
                            ctx.beginPath();
                            ctx.arc(this.x + crater.x, this.y + crater.y, crater.size, 0, Math.PI * 2);
                            ctx.fill();
                        });
                    }
                }
            },
            sun: {
                x: 700,
                y: 100,
                size: 60,
                rays: 12,
                draw: function() {
                    if (!isNight) {
                        // Sun glow
                        const gradient = ctx.createRadialGradient(
                            this.x, this.y, 0,
                            this.x, this.y, this.size * 1.5
                        );
                        gradient.addColorStop(0, 'rgba(255, 255, 0, 0.8)');
                        gradient.addColorStop(1, 'rgba(255, 200, 0, 0)');
                        
                        ctx.fillStyle = gradient;
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, this.size * 1.5, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // Sun body
                        ctx.fillStyle = '#FFFF00';
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // Sun rays
                        ctx.strokeStyle = '#FFFF00';
                        ctx.lineWidth = 5;
                        
                        for (let i = 0; i < this.rays; i++) {
                            const angle = (i / this.rays) * Math.PI * 2;
                            const rayLength = this.size * 0.7 + Math.sin(Date.now() / 200 + i) * 10;
                            
                            ctx.beginPath();
                            ctx.moveTo(
                                this.x + Math.cos(angle) * this.size,
                                this.y + Math.sin(angle) * this.size
                            );
                            ctx.lineTo(
                                this.x + Math.cos(angle) * (this.size + rayLength),
                                this.y + Math.sin(angle) * (this.size + rayLength)
                            );
                            ctx.stroke();
                        }
                    }
                }
            }
        }
    };

    // Draw pipe function
    function drawPipe(pipe) {
        const pipeColor = isNight ? '#1A5E1A' : '#2E8B57';
        const pipeEdgeColor = isNight ? '#0F4F0F' : '#228B22';
        const pipeWidth = pipe.width;
        
        // Top pipe
        ctx.fillStyle = pipeColor;
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
        
        // Top pipe edge
        ctx.fillStyle = pipeEdgeColor;
        ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, pipeWidth + 10, 20);
        
        // Bottom pipe
        ctx.fillStyle = pipeColor;
        ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth, gameCanvas.height - pipe.bottomY);
        
        // Bottom pipe edge
        ctx.fillStyle = pipeEdgeColor;
        ctx.fillRect(pipe.x - 5, pipe.bottomY, pipeWidth + 10, 20);
        
        // Add some visual details
        ctx.fillStyle = isNight ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.2)';
        
        // Pipe rivets
        for (let i = 20; i < pipe.topHeight - 20; i += 20) {
            ctx.beginPath();
            ctx.arc(pipe.x + 15, i, 3, 0, Math.PI * 2);
            ctx.arc(pipe.x + pipeWidth - 15, i, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        for (let i = pipe.bottomY + 20; i < gameCanvas.height - 20; i += 20) {
            ctx.beginPath();
            ctx.arc(pipe.x + 15, i, 3, 0, Math.PI * 2);
            ctx.arc(pipe.x + pipeWidth - 15, i, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Draw power-up function
    function drawPowerup(powerup) {
        ctx.save();
        ctx.translate(powerup.x + powerup.width / 2, powerup.y + powerup.height / 2);
        
        powerup.rotation += 0.03;
        ctx.rotate(powerup.rotation);
        
        if (powerup.type === 'speed') {
            // Draw speed power-up (lightning bolt)
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.moveTo(-powerup.width / 3, -powerup.height / 2);
            ctx.lineTo(powerup.width / 4, -powerup.height / 6);
            ctx.lineTo(0, -powerup.height / 6);
            ctx.lineTo(-powerup.width / 4, powerup.height / 6);
            ctx.lineTo(0, powerup.height / 6);
            ctx.lineTo(-powerup.width / 8, powerup.height / 2);
            ctx.lineTo(powerup.width / 3, 0);
            ctx.closePath();
            ctx.fill();
            
            // Glow effect
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
            ctx.lineWidth = 6;
            ctx.stroke();
            
        } else if (powerup.type === 'invincibility') {
            // Draw shield power-up
            ctx.fillStyle = '#4169E1';
            ctx.beginPath();
            ctx.arc(0, 0, powerup.width / 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#87CEFA';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, powerup.width / 3, 0, Math.PI * 2);
            ctx.stroke();
            
            // Shield symbol
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.moveTo(-powerup.width / 4, -powerup.height / 6);
            ctx.lineTo(powerup.width / 4, -powerup.height / 6);
            ctx.lineTo(powerup.width / 3, powerup.height / 6);
            ctx.lineTo(0, powerup.height / 3);
            ctx.lineTo(-powerup.width / 3, powerup.height / 6);
            ctx.closePath();
            ctx.fill();
            
        } else if (powerup.type === 'fuel') {
            // Draw fuel can
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(-powerup.width / 2, -powerup.height / 2, powerup.width, powerup.height);
            
            // Can details
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(-powerup.width / 2, -powerup.height / 2, powerup.width, powerup.height / 6);
            ctx.fillRect(-powerup.width / 2, powerup.height / 3, powerup.width, powerup.height / 6);
            
            // Fuel symbol
            ctx.fillStyle = '#FFFF00';
            ctx.beginPath();
            ctx.moveTo(-powerup.width / 4, -powerup.height / 4);
            ctx.lineTo(powerup.width / 4, -powerup.height / 4);
            ctx.lineTo(powerup.width / 4, powerup.height / 4);
            ctx.lineTo(-powerup.width / 4, powerup.height / 4);
            ctx.closePath();
            ctx.fill();
        }
        
        // Add pulsing glow effect
        const glowRadius = Math.sin(Date.now() / 200) * 5 + 10;
        ctx.beginPath();
        ctx.arc(0, 0, powerup.width / 2 + glowRadius, 0, Math.PI * 2);
        
        let glowColor;
        if (powerup.type === 'speed') glowColor = 'rgba(255, 215, 0, 0.3)';
        else if (powerup.type === 'invincibility') glowColor = 'rgba(65, 105, 225, 0.3)';
        else glowColor = 'rgba(255, 0, 0, 0.3)';
        
        ctx.fillStyle = glowColor;
        ctx.fill();
        
        ctx.restore();
    }

    // Collision detection
    function checkCollision(plane, pipe) {
        // Skip collision check if plane is invincible
        if (plane.invincible) return false;
        
        const planeRight = plane.x + plane.width - 10;
        const planeLeft = plane.x + 10;
        const planeTop = plane.y + 5;
        const planeBottom = plane.y + plane.height - 5;
        
        // Top pipe collision
        if (planeRight > pipe.x && planeLeft < pipe.x + pipe.width && 
            planeTop < pipe.topHeight) {
            return true;
        }
        
        // Bottom pipe collision
        if (planeRight > pipe.x && planeLeft < pipe.x + pipe.width && 
            planeBottom > pipe.bottomY) {
            return true;
        }
        
        return false;
    }
    
    // Check collision with power-ups
    function checkPowerupCollision(plane, powerup) {
        const planeRight = plane.x + plane.width - 10;
        const planeLeft = plane.x + 10;
        const planeTop = plane.y + 5;
        const planeBottom = plane.y + plane.height - 5;
        
        const powerupRight = powerup.x + powerup.width;
        const powerupLeft = powerup.x;
        const powerupTop = powerup.y;
        const powerupBottom = powerup.y + powerup.height;
        
        if (planeRight > powerupLeft && planeLeft < powerupRight &&
            planeBottom > powerupTop && planeTop < powerupBottom) {
            return true;
        }
        
        return false;
    }

    // Activate a power-up
    function activatePowerup(type) {
        powerupActive = true;
        powerupType = type;
        
        if (type === 'speed') {
            obstacleSpeed *= 1.5;
            powerupDuration = 5000; // 5 seconds of speed
            powerupIndicator.textContent = "SPEED BOOST!";
            powerupIndicator.style.backgroundColor = "rgba(255, 215, 0, 0.7)";
        } else if (type === 'invincibility') {
            plane.invincible = true;
            powerupDuration = 8000; // 8 seconds of invincibility
            powerupIndicator.textContent = "INVINCIBLE!";
            powerupIndicator.style.backgroundColor = "rgba(65, 105, 225, 0.7)";
        }
        
        powerupIndicator.style.display = "block";
        
        if (!muted) {
            powerupSound.currentTime = 0;
            powerupSound.play().catch(e => console.log("Audio play error:", e));
        }
    }
    
    // End power-up effect
    function deactivatePowerup() {
        if (powerupType === 'speed') {
            obstacleSpeed /= 1.5;
        } else if (powerupType === 'invincibility') {
            plane.invincible = false;
        }
        
        powerupActive = false;
        powerupType = null;
        powerupIndicator.style.display = "none";
    }
    
    // Collect fuel
    function collectFuel() {
        fuel = Math.min(100, fuel + fuelIncreaseAmount);
        
        if (!muted) {
            fuelSound.currentTime = 0;
            fuelSound.play().catch(e => console.log("Audio play error:", e));
        }
    }
    
    // Level up function
    function levelUp() {
        level++;
        levelElement.textContent = `Level: ${level}`;
        
        // Temporary visual effect
        levelElement.style.fontSize = "26px";
        levelElement.style.color = "#00FF00";
        
        setTimeout(() => {
            levelElement.style.fontSize = "20px";
            levelElement.style.color = "#4CAF50";
        }, 1000);
        
        // Increase difficulty
        difficulty += 0.5;
        obstacleSpeed = Math.min(10, 5 + difficulty / 2); // Cap max speed
        
        // Make fuel consumption more efficient with higher levels
        fuelDecreaseRate = Math.max(0.05, 0.1 - (level * 0.005));
        
        // Play level up sound
        if (!muted) {
            levelUpSound.currentTime = 0;
            levelUpSound.play().catch(e => console.log("Audio play error:", e));
        }
        
        checkAchievement('levelMaster');
    }
    
    // Achievement system
    function checkAchievement(type) {
        if (achievements[type]) return; // Already unlocked
        
        let unlocked = false;
        
        switch(type) {
            case 'firstFlight':
                unlocked = true; // Always awarded on first game
                break;
            case 'fuelMaster':
                unlocked = fuel <= 5 && score >= 20; // Maintained flight with low fuel
                break;
            case 'nightFlyer':
                unlocked = isNight && score >= 15; // Good score during night time
                break;
            case 'speedDemon':
                unlocked = obstacleSpeed >= 9; // Reached very high speed
                break;
            case 'levelMaster':
                unlocked = level >= 5; // Reached level 5
                break;
        }
        
        if (unlocked) {
            achievements[type] = true;
            localStorage.setItem('planeAchievements', JSON.stringify(achievements));
            
            // Show achievement notification
            achievementUnlocked.style.display = 'block';
            
            if (!muted) {
                achievementSound.currentTime = 0;
                achievementSound.play().catch(e => console.log("Audio play error:", e));
            }
        }
    }

    // Initialize game
    function initGame() {
        // Load difficulty settings
        let selectedDifficulty = difficultySelect.value;
        
        switch(selectedDifficulty) {
            case 'easy':
                difficulty = 0.5;
                fuelDecreaseRate = 0.07;
                obstacleInterval = 2000;
                break;
            case 'medium':
                difficulty = 1;
                fuelDecreaseRate = 0.1;
                obstacleInterval = 1500;
                break;
            case 'hard':
                difficulty = 1.5;
                fuelDecreaseRate = 0.13;
                obstacleInterval = 1200;
                break;
        }
        
        gameActive = true;
        gamePaused = false;
        score = 0;
        level = 1;
        pipes = [];
        powerups = [];
        fuel = 100;
        powerupActive = false;
        powerupType = null;
        powerupDuration = 0;
        gameTime = 0;
        plane.invincible = false;
        plane.trail = [];
        obstacleSpeed = 5;
        obstacleTimer = 0; // Reset the timer
        
        // Reset plane position
        plane.x = 100;
        plane.y = gameCanvas.height / 2;
        plane.velocityY = 0;
        
        // Hide screens, show game elements
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        pauseScreen.style.display = 'none';
        gameCanvas.style.display = 'block';
        scoreElement.style.display = 'block';
        highScoreElement.style.display = 'block';
        fuelElement.style.display = 'block';
        levelElement.style.display = 'block';
        newHighScore.style.display = 'none';
        achievementUnlocked.style.display = 'none';
        
        // Update UI
        scoreElement.textContent = `Score: ${score}`;
        levelElement.textContent = `Level: ${level}`;
        fuelElement.textContent = `Fuel: ${Math.floor(fuel)}%`;
        
        // Check for first flight achievement
        checkAchievement('firstFlight');
        
        // Play background music
        if (!muted) {
            backgroundMusic.currentTime = 0;
            backgroundMusic.play().catch(e => console.log("Audio play error:", e));
        }
        
        // Start game loop
        lastTime = performance.now();
        gameLoop();
    }

    // Game loop
    function gameLoop(timestamp) {
        if (!gameActive) return;
        if (gamePaused) {
            animationFrameId = requestAnimationFrame(gameLoop);
            return;
        }

        // Calculate delta time
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        // Update game time for day/night cycle
        gameTime += deltaTime;
        
        // Handle day/night cycle
        if (dayNightCycle && gameTime > dayLength) {
            isNight = !isNight;
            gameTime = 0;
            
            // Update night overlay
            nightOverlay.style.opacity = isNight ? 0.5 : 0;
            
            // Check night flyer achievement
            if (isNight) {
                checkAchievement('nightFlyer');
            }
        }

        // Clear canvas
        ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

        // Draw background
        const skyColor1 = isNight ? '#000033' : '#87CEEB';
        const skyColor2 = isNight ? '#191970' : '#1E90FF';
        
        const skyGradient = ctx.createLinearGradient(0, 0, 0, background.ground.y);
        skyGradient.addColorStop(0, skyColor1);
        skyGradient.addColorStop(1, skyColor2);
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, gameCanvas.width, background.ground.y);
        
        // Draw appropriate celestial bodies
        if (isNight) {
            background.stars.draw();
            background.moon.draw();
        } else {
            background.sun.draw();
        }
        
        // Draw mountains and clouds
        background.mountains.draw();
        background.clouds.draw();
        background.ground.draw();

        // Update obstacles
        obstacleTimer += deltaTime;
        if (obstacleTimer > obstacleInterval) {
            createPipe();
            obstacleTimer = 0;
            
            // Decrease interval as game progresses (up to a limit)
            obstacleInterval = Math.max(800, obstacleInterval - 20);
        }
        
        // Update and draw pipes
        for (let i = pipes.length - 1; i >= 0; i--) {
            const pipe = pipes[i];
            pipe.x -= obstacleSpeed;
            
            // Draw pipes
            drawPipe(pipe);
            
            // Check if plane passed the pipe
            if (!pipe.passed && plane.x > pipe.x + pipe.width) {
                pipe.passed = true;
                score++;
                scoreElement.textContent = `Score: ${score}`;
                
                // Play point sound
                if (!muted) {
                    pointSound.currentTime = 0;
                    pointSound.play().catch(e => console.log("Audio play error:", e));
                }
                
                // Level up every 10 points
                if (score % 10 === 0) {
                    levelUp();
                }
                
                // Check for speed demon achievement
                if (obstacleSpeed >= 9) {
                    checkAchievement('speedDemon');
                }
                
                // Check for fuel master achievement
                if (fuel <= 5) {
                    checkAchievement('fuelMaster');
                }
            }
            
            // Collision detection
            if (checkCollision(plane, pipe)) {
                gameOver();
                return;
            }
            
            // Remove pipes that are off-screen
            if (pipe.x + pipe.width < 0) {
                pipes.splice(i, 1);
            }
        }
        
        // Update and draw power-ups
        for (let i = powerups.length - 1; i >= 0; i--) {
            const powerup = powerups[i];
            powerup.x -= obstacleSpeed;
            
            // Draw power-up
            drawPowerup(powerup);
            
            // Check if power-up is collected
            if (!powerup.collected && checkPowerupCollision(plane, powerup)) {
                powerup.collected = true;
                
                if (powerup.type === 'fuel') {
                    collectFuel();
                } else {
                    activatePowerup(powerup.type);
                }
                
                // Remove collected power-up
                powerups.splice(i, 1);
            }
            
            // Remove power-ups that are off-screen
            if (powerup.x + powerup.width < 0) {
                powerups.splice(i, 1);
            }
        }
        
        // Update power-up duration
        if (powerupActive) {
            powerupDuration -= deltaTime;
            
            if (powerupDuration <= 0) {
                deactivatePowerup();
            }
        }
        
        // Update and draw plane
        plane.update(deltaTime);
        plane.draw();
        
        // Request next frame
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    // Game over function
    function gameOver() {
        gameActive = false;
        cancelAnimationFrame(animationFrameId);
        
        // Stop music and play crash sound
        backgroundMusic.pause();
        if (!muted) {
            crashSound.currentTime = 0;
            crashSound.play().catch(e => console.log("Audio play error:", e));
        }
        
        // Update high score if needed
        finalScore.textContent = `Score: ${score}`;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('planeHighScore', highScore);
            highScoreElement.textContent = `High Score: ${highScore}`;
            newHighScore.style.display = 'block';
        }
        
        // Show game over screen
        gameOverScreen.style.display = 'flex';
        gameCanvas.style.display = 'none';
    }
    
    // Pause game function
    function togglePause() {
        if (!gameActive) return;
        
        gamePaused = !gamePaused;
        
        if (gamePaused) {
            backgroundMusic.pause();
            pauseScreen.style.display = 'flex';
        } else {
            if (!muted) {
                backgroundMusic.play().catch(e => console.log("Audio play error:", e));
            }
            pauseScreen.style.display = 'none';
        }
    }
    
    // Return to main menu
    function returnToMainMenu() {
        gameActive = false;
        cancelAnimationFrame(animationFrameId);
        backgroundMusic.pause();
        
        gameCanvas.style.display = 'none';
        gameOverScreen.style.display = 'none';
        pauseScreen.style.display = 'none';
        scoreElement.style.display = 'none';
        highScoreElement.style.display = 'none';
        fuelElement.style.display = 'none';
        levelElement.style.display = 'none';
        powerupIndicator.style.display = 'none';
        
        startScreen.style.display = 'flex';
    }

    // Event listeners
    playButton.addEventListener('click', initGame);
    restartButton.addEventListener('click', initGame);
    resumeButton.addEventListener('click', togglePause);
    pauseButton.addEventListener('click', togglePause);
    mainMenuButton.addEventListener('click', returnToMainMenu);
    quitButton.addEventListener('click', returnToMainMenu);
    
    // Toggle day/night cycle
    document.addEventListener('keydown', function(e) {
        if (e.key === 'n' && gameActive) {
            dayNightCycle = !dayNightCycle;
        }
    });
    
    // Keyboard controls
    document.addEventListener('keydown', function(e) {
        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
            if (gameActive) {
                togglePause();
            }
            return;
        }
        
        if (!gameActive && !gamePaused && (e.key === ' ' || e.key === 'Enter')) {
            initGame();
            return;
        }
        
        if (gameActive && !gamePaused && 
           (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W')) {
            plane.flap();
            e.preventDefault(); // Prevent page scrolling
        }
    });
    
    // Touch controls for mobile
    gameCanvas.addEventListener('touchstart', function(e) {
        if (gameActive && !gamePaused) {
            plane.flap();
            e.preventDefault(); // Prevent scrolling
        }
    });
    
    // Mute button functionality
    muteButton.addEventListener('click', function() {
        muted = !muted;
        if (muted) {
            backgroundMusic.pause();
            muteButton.textContent = '🔇';
        } else {
            if (gameActive && !gamePaused) {
                backgroundMusic.play().catch(e => console.log("Audio play error:", e));
            }
            muteButton.textContent = '🔊';
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        resizeCanvas();
        
        // Update ground position
        background.ground.y = gameCanvas.height - 60;
        
        // Adjust plane position if it's now out of bounds
        if (plane.y + plane.height > gameCanvas.height) {
            plane.y = gameCanvas.height - plane.height;
        }
        
        // Update sun/moon positions
        background.sun.x = gameCanvas.width - 100;
        background.moon.x = 100;
    });
    
    // Initialize canvas for proper display
    resizeCanvas();
    
    // Display high score on load
    highScoreElement.textContent = `High Score: ${highScore}`;
    
    // Turn on day/night cycle by default
    dayNightCycle = true;
});
