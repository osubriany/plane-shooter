class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        this.player = new Player();
        this.enemies = [];
        this.bullets = [];
        this.powerUps = [];
        this.particles = []; // Array to store particles
        
        this.score = 0;
        this.gameOver = false;
        this.wave = 1;
        this.enemySpawnTimer = 0;
        this.powerUpSpawnTimer = 0;
        this.timeRemaining = 60 * 60; // 60 seconds * 60 frames per second
        
        // Frame timing
        this.lastFrameTime = 0;
        
        // Pause state
        this.isPaused = false;
        
        // Initialize audio
        this.explosionSound = new Audio('https://freesound.org/data/previews/445/445517_8206808-lq.mp3');
        this.explosionSound.volume = 0.5; // Reduce volume slightly
        
        // Initialize background music
        this.gameMusic = document.getElementById('gameMusic');
        this.gameMusic.volume = 0.3; // Set volume to 30%
        this.gameMusic.loop = true;
        
        // Initialize game
        this.init();
    }

    init() {
        // If already initialized, don't set up event listeners again
        if (this.initialized) {
            return;
        }
        
        // Focus the canvas first
        this.canvas.tabIndex = 0;
        this.canvas.focus();
        
        // Add keyboard event listeners directly to the canvas
        this.canvas.addEventListener('keydown', (e) => {
            // Handle pause
            if (e.key === 'Escape') {
                this.togglePause();
                return;
            }
            
            // Prevent default behavior for WASD keys
            if (['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
                e.preventDefault();
            }
            this.handleKeyDown(e);
            
            // Start music on first key press if not already playing
            if (!this.gameMusic.playing) {
                try {
                    this.gameMusic.play();
                } catch (error) {
                    console.log('Error playing music:', error);
                }
            }
        });
        this.canvas.addEventListener('keyup', (e) => {
            // Prevent default behavior for WASD keys
            if (['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
                e.preventDefault();
            }
            this.handleKeyUp(e);
        });

        // Add click handler to focus canvas when clicked
        this.canvas.addEventListener('click', () => {
            this.canvas.focus();
        });

        // Add pause menu button event listeners
        const resumeButton = document.getElementById('resumeButton');
        const restartButton = document.getElementById('restartButton');
        const exitButton = document.getElementById('exitButton');

        if (resumeButton) {
            resumeButton.addEventListener('click', () => {
                this.togglePause();
            });
        }

        if (restartButton) {
            restartButton.addEventListener('click', () => {
                this.restartGame();
            });
        }

        // Mark as initialized
        this.initialized = true;
        
        // Don't try to play music immediately - it will start on first key press
        this.gameLoop();
    }

    gameLoop() {
        // Calculate time since last frame
        const now = Date.now();
        const deltaTime = now - (this.lastFrameTime || now);
        this.lastFrameTime = now;

        // Limit frame rate to 100 FPS (10ms per frame)
        if (deltaTime < 10) {
            setTimeout(() => {
                requestAnimationFrame(() => this.gameLoop());
            }, 10 - deltaTime);
            return;
        }

        // Update game state if not paused
        if (!this.isPaused) {
            this.update();
        }
        
        // Draw frame
        this.draw();
        
        // Update timer if not paused
        if (!this.isPaused) {
            this.timeRemaining--;
            if (this.timeRemaining <= 0) {
                this.gameOver = true;
                alert(`Time's up! Final Score: ${this.score}`);
            }
        }
        
        // Update timer display
        const minutes = Math.floor(this.timeRemaining / 3600).toString().padStart(2, '0');
        const seconds = Math.floor((this.timeRemaining % 3600) / 60).toString().padStart(2, '0');
        document.getElementById('timer').textContent = `${minutes}:${seconds}`;
        
        // Continue loop
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        // Update player
        this.player.update();
        
        // Update bullets
        this.bullets = this.bullets.filter(bullet => bullet.update());
        
        // Update enemies
        this.enemies = this.enemies.filter(enemy => enemy.update());
        
        // Update power-ups
        this.powerUps = this.powerUps.filter(powerUp => powerUp.update());
        
        // Update particles
        this.particles = this.particles.filter(particle => particle.update());
        
        // Spawn enemies
        this.enemySpawnTimer++;
        if (this.enemySpawnTimer >= 60) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }
        
        // Spawn power-ups
        this.powerUpSpawnTimer++;
        if (this.powerUpSpawnTimer >= 300) {
            this.spawnPowerUp();
            this.powerUpSpawnTimer = 0;
        }
        
        // Check collisions
        this.checkCollisions();
    }

    draw() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw player
        this.player.draw(this.ctx);
        
        // Draw bullets
        this.bullets.forEach(bullet => bullet.draw(this.ctx));
        
        // Draw enemies
        this.enemies.forEach(enemy => enemy.draw(this.ctx));
        
        // Draw power-ups
        this.powerUps.forEach(powerUp => powerUp.draw(this.ctx));
        
        // Draw particles
        this.particles.forEach(particle => particle.draw(this.ctx));
        
        // Update score and health
        document.getElementById('score').textContent = this.score;
        document.getElementById('health').textContent = this.player.health;
        
        // Draw pause menu if game is paused
        if (this.isPaused) {
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '36px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('Game Paused', this.canvas.width / 2, this.canvas.height / 2);
        }
    }

    checkCollisions() {
        // Check bullet-enemy collisions
        this.bullets = this.bullets.filter(bullet => {
            let hitEnemy = false;
            this.enemies = this.enemies.filter((enemy, enemyIndex) => {
                if (this.checkCollision(bullet, enemy)) {
                    hitEnemy = true;
                    // Check if enemy survives the hit
                    if (enemy.takeDamage()) {
                        return true;
                    } else {
                        // Enemy dies, remove it and increase score
                        this.score += 100;
                        // Create explosion particles
                        for (let i = 0; i < 20; i++) {
                            this.particles.push(new Particle(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, this));
                        }
                        return false;
                    }
                }
                return true;
            });
            // Remove bullet if it hit any enemy
            return !hitEnemy;
        });
        
        // Check player-enemy collisions
        this.enemies.forEach((enemy, enemyIndex) => {
            if (this.checkCollision(this.player, enemy)) {
                this.enemies.splice(enemyIndex, 1);
                this.player.takeDamage();
            }
        });
        
        // Check player-powerup collisions
        this.powerUps = this.powerUps.filter((powerUp, powerUpIndex) => {
            if (this.checkCollision(this.player, powerUp)) {
                powerUp.apply(this.player);
                return false;
            }
            return true;
        });
        
        // Check game over
        if (this.player.health <= 0) {
            this.gameOver = true;
            this.gameMusic.pause(); // Stop the music
            this.gameMusic.currentTime = 0; // Reset to start
            alert(`Game Over! Final Score: ${this.score}`);
        }
    }

    checkCollision(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }

    spawnEnemy() {
        const types = ['basic', 'fast', 'strong'];
        const type = types[Math.floor(Math.random() * types.length)];
        const x = Math.random() * (this.canvas.width - 50);
        this.enemies.push(new Enemy(x, -50, type, this));
    }

    spawnPowerUp() {
        const types = ['bulletSpeed', 'bulletPower', 'heal'];
        const type = types[Math.floor(Math.random() * types.length)];
        const x = Math.random() * (this.canvas.width - 30);
        this.powerUps.push(new PowerUp(x, -30, type));
    }

    handleKeyDown(e) {
        // Handle pause
        if (e.key === 'Escape') {
            this.togglePause();
            return;
        }
        
        // Handle arrow keys and WASD
        if (e.key === 'ArrowUp' || e.key === 'w') this.player.movingUp = true;
        if (e.key === 'ArrowDown' || e.key === 's') this.player.movingDown = true;
        if (e.key === 'ArrowLeft' || e.key === 'a') this.player.movingLeft = true;
        if (e.key === 'ArrowRight' || e.key === 'd') this.player.movingRight = true;
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseMenu = document.getElementById('pauseMenu');
        pauseMenu.classList.toggle('hidden');
        
        // Pause/unpause music
        if (this.isPaused) {
            this.gameMusic.pause();
        } else {
            this.gameMusic.play();
            // Focus the canvas when resuming
            this.canvas.focus();
        }
    }

    // Add restart and exit methods
    restartGame() {
        // Reset game state
        this.player = new Player();
        this.enemies = [];
        this.bullets = [];
        this.powerUps = [];
        this.particles = [];
        this.score = 0;
        this.gameOver = false;
        this.wave = 1;
        this.enemySpawnTimer = 0;
        this.powerUpSpawnTimer = 0;
        this.timeRemaining = 60 * 60;
        
        // Hide pause menu
        this.isPaused = false;
        document.getElementById('pauseMenu').classList.add('hidden');
        
        // Restart music
        this.gameMusic.currentTime = 0;
        this.gameMusic.play();
        
        // Focus the canvas
        this.canvas.focus();
        
        // Reinitialize the game
        this.init();
    }



    handleKeyUp(e) {
        // Handle arrow keys and WASD
        if (e.key === 'ArrowUp' || e.key === 'w') this.player.movingUp = false;
        if (e.key === 'ArrowDown' || e.key === 's') this.player.movingDown = false;
        if (e.key === 'ArrowLeft' || e.key === 'a') this.player.movingLeft = false;
        if (e.key === 'ArrowRight' || e.key === 'd') this.player.movingRight = false;
    }
}

class Particle {
    constructor(x, y, game) {
        this.x = x;
        this.y = y;
        this.game = game;
        this.size = Math.random() * 5 + 2; // Random size between 2-7
        this.speedX = Math.random() * 4 - 2; // Random horizontal speed
        this.speedY = Math.random() * 4 - 2; // Random vertical speed
        this.color = `hsl(${Math.random() * 360}, 100%, 50%)`; // Random color
        this.life = 60; // Particle lives for 60 frames
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.size *= 0.95; // Gradually shrink
        this.life--;
        return this.life > 0 && this.size > 1; // Remove if life is over or too small
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Player {
    constructor() {
        this.x = 400;
        this.y = 500;
        this.width = 50;
        this.height = 50;
        this.speed = 5;
        this.bulletSpeed = 5; // Reduced from 10 to 5
        this.bulletPower = 1;
        this.health = 100;
        this.movingUp = false;
        this.movingDown = false;
        this.movingLeft = false;
        this.movingRight = false;
        this.shootTimer = 0;
        
        // Load player image
        this.image = new Image();
        this.image.src = 'assets/sprites/player_plane.png';
        this.image.onload = () => {
            // Scale image to a reasonable size (50x50 pixels)
            const scale = 50 / Math.max(this.image.width, this.image.height);
            this.width = this.image.width * scale;
            this.height = this.image.height * scale;
            console.log('Player image loaded successfully');
            console.log('Image dimensions:', this.width, this.height);
        };
        this.image.onerror = () => {
            console.error('Failed to load player image');
        };
    }

    update() {
        // Move player based on key states
        if (this.movingUp) this.y = Math.max(0, this.y - this.speed);
        if (this.movingDown) this.y = Math.min(550, this.y + this.speed);
        if (this.movingLeft) this.x = Math.max(0, this.x - this.speed);
        if (this.movingRight) this.x = Math.min(750, this.x + this.speed);
        
        // Automatic shooting
        this.shootTimer++;
        if (this.shootTimer >= 20) { // Changed from 10 to 20 to halve the firing rate
            game.bullets.push(new Bullet(this.x + 25, this.y, this.bulletSpeed, this.bulletPower));
            this.shootTimer = 0;
        }
    }

    takeDamage() {
        this.health -= 20;
    }

    draw(ctx) {
        // Draw player ship
        if (this.image.complete && this.image.width !== 0) {
            // Draw scaled image
            ctx.drawImage(
                this.image,
                0, 0, this.image.width, this.image.height, // Source rectangle
                this.x, this.y, this.width, this.height    // Destination rectangle
            );
        } else {
            // Fallback to green rectangle if image isn't loaded yet
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // Add debug text
            ctx.fillStyle = '#FF0000';
            ctx.font = '12px Arial';
            ctx.fillText('Loading...', this.x + 5, this.y + 15);
        }
    }
}

class Bullet {
    constructor(x, y, speed, power) {
        this.x = x;
        this.y = y;
        this.width = power * 5;
        this.height = power * 5;
        this.speed = speed;
    }

    update() {
        this.y -= this.speed;
        return this.y > 0;
    }

    draw(ctx) {
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Enemy {
    constructor(x, y, type, game) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 50;
        this.speed = 2;
        this.type = type;
        this.game = game;
        
        // Random health between 1 and 3
        this.health = Math.floor(Math.random() * 3) + 1;
        
        // Adjust speed based on health
        if (type === 'fast') this.speed = 4;
        if (type === 'strong') {
            this.health = 3; // Strong enemies always have max health
            this.speed = 2;
        }
    }

    update() {
        this.y += this.speed;
        if (this.type === 'strong') {
            this.x += Math.sin(this.y / 100) * 3;
        }
        return this.y < 650;
    }

    draw(ctx) {
        // Determine color based on health
        let color;
        switch(this.health) {
            case 3:
                color = '#FFFFFF'; // White for full health
                break;
            case 2:
                color = '#FFFF00'; // Yellow for medium health
                break;
            case 1:
                color = '#FF0000'; // Red for low health
                break;
        }
        
        ctx.fillStyle = color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    takeDamage() {
        this.health--;
        if (this.health <= 0) {
            this.game.score += 100;
            // Play explosion sound
            this.game.explosionSound.currentTime = 0; // Reset audio to start
            this.game.explosionSound.play();
            return false;
        }
        return true;
    }
}

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.type = type;
        this.speed = 2;
    }

    update() {
        this.y += this.speed;
        return this.y < 650;
    }

    apply(player) {
        switch (this.type) {
            case 'bulletSpeed':
                player.bulletSpeed += 2;
                break;
            case 'bulletPower':
                player.bulletPower += 1;
                break;
            case 'heal':
                player.health = Math.min(100, player.health + 20);
                break;
        }
    }

    draw(ctx) {
        // Draw the power-up background
        ctx.fillStyle = this.type === 'bulletSpeed' ? '#00FFFF' :
                       this.type === 'bulletPower' ? '#FF00FF' :
                       '#00FF00';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw the letter
        ctx.fillStyle = '#000';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const letter = this.type === 'bulletSpeed' ? 'S' :
                      this.type === 'bulletPower' ? 'P' :
                      'H';
        
        ctx.fillText(letter, this.x + this.width/2, this.y + this.height/2);
    }
}

// Start the game
let game = new Game();
