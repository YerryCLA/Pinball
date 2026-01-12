// Renderer class for retro pinball game
// Handles all visual rendering with neon glow effects and particle system

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 1.0;
        this.decay = 0.02 + Math.random() * 0.03;
        this.size = 2 + Math.random() * 4;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // gravity
        this.life -= this.decay;
        this.size *= 0.98;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.particles = [];
        this.screenShake = 0;
        this.shakeDecay = 0.9;

        // Color palette
        this.colors = {
            background: '#1a0a2e',
            backgroundGradientEnd: '#0d0518',
            neonPink: '#ff00ff',
            neonCyan: '#00ffff',
            neonYellow: '#ffff00',
            neonOrange: '#ff6600',
            neonGreen: '#00ff66',
            white: '#ffffff',
            silver: '#c0c0c0',
            darkPurple: '#2a1a4e'
        };
    }

    clear() {
        const ctx = this.ctx;

        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, this.colors.background);
        gradient.addColorStop(1, this.colors.backgroundGradientEnd);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        // Add subtle grid pattern for retro feel
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.05)';
        ctx.lineWidth = 1;
        const gridSize = 40;

        for (let x = 0; x < this.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }

        for (let y = 0; y < this.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }
    }

    drawBall(ball) {
        if (!ball || !ball.active) return;

        const ctx = this.ctx;
        const x = ball.x;
        const y = ball.y;
        const radius = ball.radius || 10;

        ctx.save();

        // Outer glow
        ctx.shadowColor = this.colors.neonCyan;
        ctx.shadowBlur = 20;

        // Metallic gradient
        const gradient = ctx.createRadialGradient(
            x - radius * 0.3, y - radius * 0.3, 0,
            x, y, radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, '#e0e0e0');
        gradient.addColorStop(0.7, '#a0a0a0');
        gradient.addColorStop(1, '#606060');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Specular highlight
        ctx.shadowBlur = 0;
        const highlightGradient = ctx.createRadialGradient(
            x - radius * 0.4, y - radius * 0.4, 0,
            x - radius * 0.4, y - radius * 0.4, radius * 0.5
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = highlightGradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Edge rim light
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    drawFlipper(flipper) {
        if (!flipper) return;

        const ctx = this.ctx;
        const x = flipper.x;
        const y = flipper.y;
        const length = flipper.length || 60;
        const width = flipper.width || 15;
        const angle = flipper.angle || 0;
        const isLeft = flipper.side === 'left';

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Neon glow
        ctx.shadowColor = this.colors.neonPink;
        ctx.shadowBlur = 15;

        // Flipper body gradient
        const gradient = ctx.createLinearGradient(0, -width/2, 0, width/2);
        gradient.addColorStop(0, '#ff66ff');
        gradient.addColorStop(0.5, '#cc00cc');
        gradient.addColorStop(1, '#990099');

        ctx.fillStyle = gradient;
        ctx.beginPath();

        // Tapered flipper shape
        const tipWidth = width * 0.5;
        ctx.moveTo(0, -width/2);
        ctx.lineTo(length, -tipWidth/2);
        ctx.quadraticCurveTo(length + 5, 0, length, tipWidth/2);
        ctx.lineTo(0, width/2);
        ctx.quadraticCurveTo(-8, 0, 0, -width/2);
        ctx.closePath();
        ctx.fill();

        // Neon outline
        ctx.strokeStyle = this.colors.neonPink;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Pivot point
        ctx.shadowBlur = 10;
        ctx.fillStyle = this.colors.white;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawBumper(bumper) {
        if (!bumper) return;

        const ctx = this.ctx;
        const x = bumper.x;
        const y = bumper.y;
        const radius = bumper.radius || 25;
        const isLit = bumper.lit || bumper.hitTimer > 0;
        const intensity = isLit ? 1 : 0.5;

        ctx.save();

        // Determine color based on bumper type or default
        const baseColor = bumper.color || this.colors.neonYellow;

        // Outer glow ring
        ctx.shadowColor = baseColor;
        ctx.shadowBlur = isLit ? 30 : 15;

        // Outer ring
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 4;
        ctx.globalAlpha = intensity;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner fill gradient
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        if (isLit) {
            gradient.addColorStop(0, baseColor);
            gradient.addColorStop(0.5, baseColor);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
        } else {
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(0.5, 'rgba(100, 100, 100, 0.2)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
        }

        ctx.globalAlpha = 1;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius - 2, 0, Math.PI * 2);
        ctx.fill();

        // Center cap
        ctx.shadowBlur = isLit ? 20 : 10;
        ctx.fillStyle = isLit ? this.colors.white : this.colors.silver;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Score multiplier text
        if (bumper.multiplier) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = isLit ? '#000' : '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(bumper.multiplier + 'x', x, y);
        }

        ctx.restore();
    }

    drawSlingshot(slingshot) {
        if (!slingshot) return;

        const ctx = this.ctx;
        const points = slingshot.points;
        const isLit = slingshot.lit || slingshot.hitTimer > 0;

        if (!points || points.length < 3) return;

        ctx.save();

        const color = this.colors.neonOrange;

        // Neon glow
        ctx.shadowColor = color;
        ctx.shadowBlur = isLit ? 25 : 12;

        // Fill
        ctx.fillStyle = isLit ? 'rgba(255, 102, 0, 0.4)' : 'rgba(255, 102, 0, 0.15)';
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        ctx.fill();

        // Neon outline
        ctx.strokeStyle = color;
        ctx.lineWidth = isLit ? 4 : 2;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        // Corner accents
        ctx.fillStyle = this.colors.white;
        for (const point of points) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    drawTarget(target) {
        if (!target) return;

        const ctx = this.ctx;
        const x = target.x;
        const y = target.y;
        const width = target.width || 30;
        const height = target.height || 10;
        const isLit = target.lit || target.active;

        ctx.save();

        const color = isLit ? this.colors.neonGreen : this.colors.neonCyan;

        // Neon glow
        ctx.shadowColor = color;
        ctx.shadowBlur = isLit ? 20 : 8;

        // Target body
        ctx.fillStyle = isLit ? color : 'rgba(0, 255, 255, 0.3)';
        ctx.fillRect(x - width/2, y - height/2, width, height);

        // Border
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - width/2, y - height/2, width, height);

        // Indicator light
        ctx.shadowBlur = isLit ? 15 : 5;
        ctx.fillStyle = isLit ? this.colors.white : 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawPlunger(plunger) {
        if (!plunger) return;

        const ctx = this.ctx;
        const x = plunger.x;
        const y = plunger.y;
        const width = plunger.width || 20;
        const maxHeight = plunger.maxHeight || 100;
        const power = plunger.power || 0;
        const compression = power * 50; // How much spring is compressed

        ctx.save();

        // Plunger lane background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x - width/2 - 5, y - maxHeight, width + 10, maxHeight + 30);

        // Spring coils
        ctx.strokeStyle = this.colors.silver;
        ctx.lineWidth = 3;
        ctx.shadowColor = this.colors.neonCyan;
        ctx.shadowBlur = 5;

        const coilCount = 8;
        const springHeight = maxHeight - compression;
        const coilSpacing = springHeight / coilCount;

        ctx.beginPath();
        for (let i = 0; i <= coilCount; i++) {
            const coilY = y - i * coilSpacing;
            const offset = (i % 2 === 0) ? -width/3 : width/3;
            if (i === 0) {
                ctx.moveTo(x + offset, coilY);
            } else {
                ctx.lineTo(x + offset, coilY);
            }
        }
        ctx.stroke();

        // Plunger head
        ctx.shadowColor = this.colors.neonPink;
        ctx.shadowBlur = power > 0 ? 20 : 10;

        const headY = y + compression;
        const gradient = ctx.createLinearGradient(x - width/2, 0, x + width/2, 0);
        gradient.addColorStop(0, '#666');
        gradient.addColorStop(0.5, '#ccc');
        gradient.addColorStop(1, '#666');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x - width/2, headY - 15, width, 30, 5);
        ctx.fill();

        ctx.strokeStyle = this.colors.neonPink;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Power indicator bar
        if (power > 0) {
            const indicatorHeight = 80;
            const indicatorX = x + width/2 + 15;

            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(indicatorX - 5, y - indicatorHeight, 10, indicatorHeight);

            // Power level
            const powerHeight = indicatorHeight * power;
            const powerGradient = ctx.createLinearGradient(0, y, 0, y - indicatorHeight);
            powerGradient.addColorStop(0, this.colors.neonGreen);
            powerGradient.addColorStop(0.5, this.colors.neonYellow);
            powerGradient.addColorStop(1, this.colors.neonPink);

            ctx.fillStyle = powerGradient;
            ctx.shadowColor = this.colors.neonYellow;
            ctx.shadowBlur = 10;
            ctx.fillRect(indicatorX - 4, y - powerHeight, 8, powerHeight);

            // Border
            ctx.strokeStyle = this.colors.white;
            ctx.lineWidth = 1;
            ctx.shadowBlur = 0;
            ctx.strokeRect(indicatorX - 5, y - indicatorHeight, 10, indicatorHeight);
        }

        ctx.restore();
    }

    drawWalls(walls) {
        if (!walls || walls.length === 0) return;

        const ctx = this.ctx;

        ctx.save();

        for (const wall of walls) {
            const color = wall.color || this.colors.neonCyan;

            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
            ctx.strokeStyle = color;
            ctx.lineWidth = wall.width || 3;
            ctx.lineCap = 'round';

            if (wall.type === 'arc') {
                // Curved wall
                ctx.beginPath();
                ctx.arc(wall.x, wall.y, wall.radius, wall.startAngle, wall.endAngle);
                ctx.stroke();
            } else if (wall.points && wall.points.length >= 2) {
                // Multi-point wall
                ctx.beginPath();
                ctx.moveTo(wall.points[0].x, wall.points[0].y);
                for (let i = 1; i < wall.points.length; i++) {
                    ctx.lineTo(wall.points[i].x, wall.points[i].y);
                }
                if (wall.closed) {
                    ctx.closePath();
                }
                ctx.stroke();
            } else {
                // Simple line wall
                ctx.beginPath();
                ctx.moveTo(wall.x1, wall.y1);
                ctx.lineTo(wall.x2, wall.y2);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    drawTable() {
        const ctx = this.ctx;

        ctx.save();

        // Table border with double neon line
        ctx.shadowColor = this.colors.neonPink;
        ctx.shadowBlur = 20;
        ctx.strokeStyle = this.colors.neonPink;
        ctx.lineWidth = 4;

        // Outer border
        ctx.beginPath();
        ctx.roundRect(10, 10, this.width - 20, this.height - 20, 15);
        ctx.stroke();

        // Inner border
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(20, 20, this.width - 40, this.height - 40, 10);
        ctx.stroke();

        // Lane markings - center lane dividers
        ctx.shadowColor = this.colors.neonCyan;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);

        // Center vertical line
        ctx.beginPath();
        ctx.moveTo(this.width / 2, 100);
        ctx.lineTo(this.width / 2, 300);
        ctx.stroke();

        ctx.setLineDash([]);

        // Decorative corner accents
        const corners = [
            { x: 30, y: 30 },
            { x: this.width - 30, y: 30 },
            { x: 30, y: this.height - 30 },
            { x: this.width - 30, y: this.height - 30 }
        ];

        ctx.shadowColor = this.colors.neonYellow;
        ctx.shadowBlur = 10;
        ctx.fillStyle = this.colors.neonYellow;

        for (const corner of corners) {
            ctx.beginPath();
            ctx.arc(corner.x, corner.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Score zone markings at top
        ctx.shadowColor = this.colors.neonPink;
        ctx.shadowBlur = 5;
        ctx.fillStyle = 'rgba(255, 0, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(50, 30);
        ctx.lineTo(this.width - 50, 30);
        ctx.lineTo(this.width - 80, 80);
        ctx.lineTo(80, 80);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = this.colors.neonPink;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Drain zone warning stripes at bottom
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        const stripeWidth = 20;
        for (let i = 0; i < 8; i++) {
            if (i % 2 === 0) {
                ctx.fillRect(50 + i * stripeWidth, this.height - 60, stripeWidth, 40);
            }
        }

        // "DRAIN" text
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('DRAIN', this.width / 2, this.height - 35);

        ctx.restore();
    }

    addParticles(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    updateParticles() {
        const ctx = this.ctx;

        // Update and filter dead particles
        this.particles = this.particles.filter(particle => {
            const alive = particle.update();
            if (alive) {
                particle.draw(ctx);
            }
            return alive;
        });
    }

    applyScreenShake(intensity) {
        this.screenShake = Math.max(this.screenShake, intensity);
    }

    drawScore(score, highScore) {
        const ctx = this.ctx;

        ctx.save();

        // Score background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(this.width / 2 - 80, 5, 160, 25);

        // Score text
        ctx.shadowColor = this.colors.neonYellow;
        ctx.shadowBlur = 10;
        ctx.fillStyle = this.colors.neonYellow;
        ctx.font = 'bold 16px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(score.toString().padStart(8, '0'), this.width / 2, 18);

        // High score
        if (highScore !== undefined) {
            ctx.shadowBlur = 5;
            ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.font = '10px "Courier New", monospace';
            ctx.fillText('HI: ' + highScore.toString().padStart(8, '0'), this.width / 2, 38);
        }

        ctx.restore();
    }

    drawBallCount(balls) {
        const ctx = this.ctx;

        ctx.save();

        ctx.shadowColor = this.colors.neonCyan;
        ctx.shadowBlur = 10;
        ctx.fillStyle = this.colors.neonCyan;
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('BALLS:', 30, 55);

        // Ball indicators
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(85 + i * 18, 52, 6, 0, Math.PI * 2);
            if (i < balls) {
                ctx.fillStyle = this.colors.silver;
                ctx.fill();
            } else {
                ctx.strokeStyle = 'rgba(192, 192, 192, 0.3)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    drawMultiplier(multiplier) {
        if (!multiplier || multiplier <= 1) return;

        const ctx = this.ctx;

        ctx.save();

        ctx.shadowColor = this.colors.neonPink;
        ctx.shadowBlur = 15;
        ctx.fillStyle = this.colors.neonPink;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(multiplier + 'x MULTIPLIER', this.width - 30, 55);

        ctx.restore();
    }

    drawGameOver() {
        const ctx = this.ctx;

        ctx.save();

        // Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.width, this.height);

        // Game Over text
        ctx.shadowColor = this.colors.neonPink;
        ctx.shadowBlur = 30;
        ctx.fillStyle = this.colors.neonPink;
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GAME', this.width / 2, this.height / 2 - 30);
        ctx.fillText('OVER', this.width / 2, this.height / 2 + 30);

        // Press space prompt
        ctx.shadowColor = this.colors.neonCyan;
        ctx.shadowBlur = 10;
        ctx.fillStyle = this.colors.neonCyan;
        ctx.font = '16px Arial';
        ctx.fillText('Press SPACE to play again', this.width / 2, this.height / 2 + 100);

        ctx.restore();
    }

    drawPaused() {
        const ctx = this.ctx;

        ctx.save();

        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, this.width, this.height);

        // Paused text
        ctx.shadowColor = this.colors.neonYellow;
        ctx.shadowBlur = 20;
        ctx.fillStyle = this.colors.neonYellow;
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PAUSED', this.width / 2, this.height / 2);

        ctx.restore();
    }

    render(gameState) {
        const ctx = this.ctx;

        ctx.save();

        // Apply screen shake
        if (this.screenShake > 0.5) {
            const shakeX = (Math.random() - 0.5) * this.screenShake;
            const shakeY = (Math.random() - 0.5) * this.screenShake;
            ctx.translate(shakeX, shakeY);
            this.screenShake *= this.shakeDecay;
        } else {
            this.screenShake = 0;
        }

        // Clear and draw background
        this.clear();

        // Draw table decorations
        this.drawTable();

        // Draw walls
        if (gameState.walls) {
            this.drawWalls(gameState.walls);
        }

        // Draw targets
        if (gameState.targets) {
            for (const target of gameState.targets) {
                this.drawTarget(target);
            }
        }

        // Draw slingshots
        if (gameState.slingshots) {
            for (const slingshot of gameState.slingshots) {
                this.drawSlingshot(slingshot);
            }
        }

        // Draw bumpers
        if (gameState.bumpers) {
            for (const bumper of gameState.bumpers) {
                this.drawBumper(bumper);
            }
        }

        // Draw flippers
        if (gameState.flippers) {
            for (const flipper of gameState.flippers) {
                this.drawFlipper(flipper);
            }
        }

        // Draw plunger
        if (gameState.plunger) {
            this.drawPlunger(gameState.plunger);
        }

        // Draw ball
        if (gameState.ball) {
            this.drawBall(gameState.ball);
        }

        // Update and draw particles
        this.updateParticles();

        // Draw UI elements
        if (gameState.score !== undefined) {
            this.drawScore(gameState.score, gameState.highScore);
        }

        if (gameState.balls !== undefined) {
            this.drawBallCount(gameState.balls);
        }

        if (gameState.multiplier) {
            this.drawMultiplier(gameState.multiplier);
        }

        // Draw game states
        if (gameState.gameOver) {
            this.drawGameOver();
        } else if (gameState.paused) {
            this.drawPaused();
        }

        ctx.restore();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Renderer, Particle };
}
