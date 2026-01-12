// Game states
const GameState = {
    START: 'start',
    PLAYING: 'playing',
    BALL_LOST: 'ball_lost',
    GAME_OVER: 'game_over',
    PAUSED: 'paused'
};

// Main Game class
class Game {
    constructor() {
        this.canvas = document.getElementById('pinball-canvas');
        this.canvas.width = CANVAS_WIDTH;  // 400
        this.canvas.height = CANVAS_HEIGHT; // 700

        this.renderer = new Renderer(this.canvas);
        this.state = GameState.START;

        // Game objects
        this.ball = null;
        this.leftFlipper = null;
        this.rightFlipper = null;
        this.bumpers = [];
        this.slingshots = [];
        this.targets = [];
        this.walls = [];
        this.plunger = null;

        // Score and lives
        this.score = 0;
        this.highScore = loadHighScore();
        this.balls = 3;
        this.multiplier = 1;

        // Timing
        this.lastTime = 0;
        this.deltaTime = 0;

        // Audio initialization flag
        this.audioInitialized = false;

        // Particles for visual effects
        this.particles = [];

        // Plunger charging state
        this.plungerCharging = false;
        this.plungerPower = 0;

        // Ball launch state
        this.ballInPlunger = false;

        this.setupTable();
        this.setupControls();
        this.updateUI();
    }

    /**
     * Create all table elements using TABLE constants from utils.js
     */
    setupTable() {
        // Create flippers
        this.leftFlipper = new Flipper(
            TABLE.leftFlipper.x,
            TABLE.leftFlipper.y,
            TABLE.flipperWidth,
            TABLE.flipperHeight,
            'left'
        );

        this.rightFlipper = new Flipper(
            TABLE.rightFlipper.x,
            TABLE.rightFlipper.y,
            TABLE.flipperWidth,
            TABLE.flipperHeight,
            'right'
        );

        // Create bumpers (points as 3rd param)
        this.bumpers = TABLE.bumpers.map((b) =>
            new Bumper(b.x, b.y, b.radius, 100)
        );

        // Create slingshots (x, y, width, height, side)
        this.slingshots = [
            new Slingshot(
                TABLE.leftSlingshot.x,
                TABLE.leftSlingshot.y,
                40,
                80,
                'left'
            ),
            new Slingshot(
                TABLE.rightSlingshot.x,
                TABLE.rightSlingshot.y,
                40,
                80,
                'right'
            )
        ];

        // Create targets (points as 5th param)
        this.targets = TABLE.targets.map((t) =>
            new Target(t.x, t.y, t.w, t.h, 50)
        );

        // Create walls
        this.walls = TABLE.walls.map(w =>
            new Wall(w.x1, w.y1, w.x2, w.y2)
        );

        // Create plunger (x, y, width, height)
        this.plunger = new Plunger(
            TABLE.plunger.x - 10,
            TABLE.plunger.y,
            20,
            80
        );
    }

    /**
     * Setup keyboard controls
     */
    setupControls() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            // Initialize audio on first user interaction
            if (!this.audioInitialized) {
                Audio.init();
                this.audioInitialized = true;
            }

            switch (e.key.toLowerCase()) {
                case 'a':
                case 'arrowleft':
                    e.preventDefault();
                    if (this.state === GameState.PLAYING) {
                        this.leftFlipper.activate();
                        Audio.playFlipperSound();
                    }
                    break;

                case 'd':
                case 'arrowright':
                    e.preventDefault();
                    if (this.state === GameState.PLAYING) {
                        this.rightFlipper.activate();
                        Audio.playFlipperSound();
                    }
                    break;

                case ' ':
                case 'arrowdown':
                    e.preventDefault();
                    this.handleSpacePress();
                    break;

                case 'p':
                    e.preventDefault();
                    this.togglePause();
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            switch (e.key.toLowerCase()) {
                case 'a':
                case 'arrowleft':
                    e.preventDefault();
                    if (this.leftFlipper) {
                        this.leftFlipper.deactivate();
                    }
                    break;

                case 'd':
                case 'arrowright':
                    e.preventDefault();
                    if (this.rightFlipper) {
                        this.rightFlipper.deactivate();
                    }
                    break;

                case ' ':
                case 'arrowdown':
                    e.preventDefault();
                    if (this.state === GameState.PLAYING && this.ballInPlunger) {
                        this.launchBall();
                    }
                    break;
            }
        });

        // Also handle touch/click for mobile and audio init
        this.canvas.addEventListener('click', () => {
            if (!this.audioInitialized) {
                Audio.init();
                this.audioInitialized = true;
            }
        });
    }

    /**
     * Handle space bar press based on current state
     */
    handleSpacePress() {
        switch (this.state) {
            case GameState.START:
                this.start();
                break;

            case GameState.PLAYING:
                if (this.ballInPlunger) {
                    // Start charging plunger
                    this.plungerCharging = true;
                    this.plunger.startCharge();
                }
                break;

            case GameState.GAME_OVER:
                this.reset();
                this.start();
                break;
        }
    }

    /**
     * Initialize new game
     */
    start() {
        this.state = GameState.PLAYING;
        this.score = 0;
        this.balls = 3;
        this.multiplier = 1;
        this.particles = [];

        // Reset all targets
        this.targets.forEach(t => t.reset());

        // Hide start screen
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');

        // Spawn the first ball
        this.spawnBall();
        this.updateUI();

        Audio.playStartSound();
    }

    /**
     * Create new ball at plunger position
     */
    spawnBall() {
        this.ball = new Ball(
            TABLE.ballSpawn.x,
            TABLE.ballSpawn.y,
            8
        );
        this.ballInPlunger = true;
        this.plungerCharging = false;
        this.plungerPower = 0;
    }

    /**
     * Release ball from plunger
     */
    launchBall() {
        if (!this.ballInPlunger || !this.ball) return;

        // Get launch velocity from plunger
        const launchResult = this.plunger.release();
        const launchVelocity = typeof launchResult === 'object' ? launchResult.velocity : launchResult;

        this.ball.vy = launchVelocity || -15;
        this.ball.vx = randomRange(-0.5, 0.5);

        this.ballInPlunger = false;
        this.plungerCharging = false;
        this.plungerPower = 0;

        Audio.playLaunchSound();
    }

    /**
     * Main game loop logic
     */
    update(deltaTime) {
        if (this.state !== GameState.PLAYING) return;

        // Update plunger if charging
        if (this.plungerCharging && this.ballInPlunger) {
            this.plunger.update();
            this.plungerPower = this.plunger.power;
        }

        // Update ball physics (only if not in plunger)
        if (this.ball && !this.ballInPlunger) {
            this.ball.update();

            // Check collisions
            this.checkCollisions();

            // Check if ball is lost
            if (this.ball.y > TABLE.drainY) {
                this.ballLost();
            }
        }

        // Update flippers
        this.leftFlipper.update();
        this.rightFlipper.update();

        // Update bumper animations
        this.bumpers.forEach(b => b.update());

        // Update slingshot animations
        this.slingshots.forEach(s => s.update());

        // Update target animations
        this.targets.forEach(t => t.update());

        // Update particles
        this.updateParticles();
    }

    /**
     * Check ball against all collidable elements
     */
    checkCollisions() {
        if (!this.ball) return;

        // Check walls
        this.walls.forEach(wall => {
            if (wall.checkCollision(this.ball)) {
                // Wall handles collision resolution internally
            }
        });

        // Check flippers
        if (this.leftFlipper.checkCollision(this.ball)) {
            Audio.playFlipperSound();
        }
        if (this.rightFlipper.checkCollision(this.ball)) {
            Audio.playFlipperSound();
        }

        // Check bumpers
        this.bumpers.forEach(bumper => {
            const points = bumper.checkCollision(this.ball);
            if (points > 0) {
                this.addScore(points);
                this.spawnParticles(bumper.x, bumper.y, 8, '#ff00ff');
                Audio.playBumperSound();
            }
        });

        // Check slingshots
        this.slingshots.forEach(slingshot => {
            const points = slingshot.checkCollision(this.ball);
            if (points > 0) {
                this.addScore(points);
                this.spawnParticles(this.ball.x, this.ball.y, 5, '#00ffff');
                Audio.playSlingshotSound();
            }
        });

        // Check targets
        this.targets.forEach(target => {
            const points = target.checkCollision(this.ball);
            if (points > 0) {
                this.addScore(points);
                this.spawnParticles(target.x + target.width / 2, target.y + target.height / 2, 6, '#ffff00');
                Audio.playTargetSound();

                // Check if all targets hit (bonus)
                if (this.targets.every(t => t.isLit)) {
                    this.addScore(1000);
                    this.targets.forEach(t => t.reset());
                    Audio.playMultiplierSound();
                }
            }
        });
    }

    /**
     * Add points with multiplier
     * @param {number} points - Base points to add
     */
    addScore(points) {
        const totalPoints = points * this.multiplier;
        this.score += totalPoints;

        // Check for multiplier increase (every 5000 points)
        const newMultiplier = Math.floor(this.score / 5000) + 1;
        if (newMultiplier > this.multiplier && this.multiplier < 10) {
            this.multiplier = Math.min(newMultiplier, 10);
            Audio.playMultiplierSound();
        }

        // Update high score if needed
        if (this.score > this.highScore) {
            this.highScore = this.score;
        }

        this.updateUI();
    }

    /**
     * Handle ball lost (fell into drain)
     */
    ballLost() {
        this.balls--;
        this.ball = null;

        Audio.playBallLostSound();

        if (this.balls <= 0) {
            this.gameOver();
        } else {
            // Brief pause before spawning new ball
            this.state = GameState.BALL_LOST;
            setTimeout(() => {
                if (this.state === GameState.BALL_LOST) {
                    this.state = GameState.PLAYING;
                    this.spawnBall();
                    this.updateUI();
                }
            }, 1500);
        }

        this.updateUI();
    }

    /**
     * Handle game over
     */
    gameOver() {
        this.state = GameState.GAME_OVER;

        // Save high score
        saveHighScore(this.highScore);

        // Show game over screen
        document.getElementById('final-score').textContent = formatScore(this.score);
        document.getElementById('game-over-screen').classList.remove('hidden');

        Audio.playGameOverSound();
    }

    /**
     * Update DOM UI elements
     */
    updateUI() {
        document.getElementById('score').textContent = formatScore(this.score);
        document.getElementById('highscore').textContent = formatScore(this.highScore);
        document.getElementById('balls').textContent = this.balls;
        document.getElementById('multiplier').textContent = this.multiplier + 'x';
    }

    /**
     * Spawn particle effects
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} count - Number of particles
     * @param {string} color - Particle color
     */
    spawnParticles(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    /**
     * Update all particles
     */
    updateParticles() {
        this.particles = this.particles.filter(p => p.update());
    }

    /**
     * Render all game elements
     */
    render() {
        this.renderer.clear();

        // Draw walls
        this.walls.forEach(wall => wall.draw(this.renderer.ctx));

        // Draw targets
        this.targets.forEach(target => target.draw(this.renderer.ctx));

        // Draw bumpers
        this.bumpers.forEach(bumper => bumper.draw(this.renderer.ctx));

        // Draw slingshots
        this.slingshots.forEach(slingshot => slingshot.draw(this.renderer.ctx));

        // Draw flippers
        this.leftFlipper.draw(this.renderer.ctx);
        this.rightFlipper.draw(this.renderer.ctx);

        // Draw plunger
        this.plunger.draw(this.renderer.ctx);

        // Draw ball
        if (this.ball) {
            this.renderer.drawBall(this.ball);
        }

        // Draw particles
        this.particles.forEach(p => p.draw(this.renderer.ctx));
    }

    /**
     * Main game loop
     * @param {number} timestamp - Current timestamp from requestAnimationFrame
     */
    gameLoop(timestamp = 0) {
        // Calculate delta time
        this.deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // Cap delta time to prevent physics issues
        if (this.deltaTime > 50) {
            this.deltaTime = 50;
        }

        // Update game state
        if (this.state === GameState.PLAYING || this.state === GameState.BALL_LOST) {
            this.update(this.deltaTime);
        }

        // Render
        this.render();

        // Continue loop
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    /**
     * Toggle pause state
     */
    togglePause() {
        if (this.state === GameState.PLAYING) {
            this.pause();
        } else if (this.state === GameState.PAUSED) {
            this.resume();
        }
    }

    /**
     * Pause the game
     */
    pause() {
        if (this.state !== GameState.PLAYING) return;

        this.state = GameState.PAUSED;
        document.getElementById('pause-screen').classList.remove('hidden');
    }

    /**
     * Resume the game
     */
    resume() {
        if (this.state !== GameState.PAUSED) return;

        this.state = GameState.PLAYING;
        document.getElementById('pause-screen').classList.add('hidden');
        this.lastTime = performance.now();
    }

    /**
     * Reset game for new play
     */
    reset() {
        this.score = 0;
        this.balls = 3;
        this.multiplier = 1;
        this.ball = null;
        this.particles = [];
        this.plungerCharging = false;
        this.plungerPower = 0;
        this.ballInPlunger = false;

        // Reset all targets
        this.targets.forEach(t => t.reset());

        // Hide overlays
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('pause-screen').classList.add('hidden');

        this.updateUI();
    }
}

// Initialize game on load
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.gameLoop();
});
