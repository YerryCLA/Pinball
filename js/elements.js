/**
 * Pinball Table Elements
 * Contains all game elements: Flippers, Bumpers, Slingshots, Targets, Plunger, Walls
 */

// ============================================================================
// FLIPPER CLASS
// ============================================================================
class Flipper {
    constructor(x, y, width, height, side) {
        // Position is the pivot point
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.side = side; // 'left' or 'right'

        // Angle properties (in radians)
        this.angle = 0;
        this.angularVelocity = 0;
        this.maxAngularVelocity = 0.5; // radians per frame

        // Rest and active angles depend on side
        // Left flipper: rest points down-right, active points up-right
        // Right flipper: rest points down-left, active points up-left
        if (side === 'left') {
            this.restAngle = Math.PI / 6;      // 30 degrees down
            this.activeAngle = -Math.PI / 6;   // 30 degrees up
        } else {
            this.restAngle = Math.PI - Math.PI / 6;  // 150 degrees (pointing down-left)
            this.activeAngle = Math.PI + Math.PI / 6; // 210 degrees (pointing up-left)
        }

        this.angle = this.restAngle;
        this.isActivated = false;

        // Physics properties
        this.flipSpeed = 0.4;      // How fast flipper moves
        this.returnSpeed = 0.2;    // How fast flipper returns to rest
        this.bounceFactor = 1.5;   // How much force applied to ball on hit
    }

    activate() {
        this.isActivated = true;
    }

    deactivate() {
        this.isActivated = false;
    }

    update() {
        const targetAngle = this.isActivated ? this.activeAngle : this.restAngle;
        const speed = this.isActivated ? this.flipSpeed : this.returnSpeed;

        // Calculate angle difference
        let angleDiff = targetAngle - this.angle;

        // Smoothly interpolate towards target angle
        if (Math.abs(angleDiff) > 0.01) {
            this.angularVelocity = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), speed);
            this.angle += this.angularVelocity;
        } else {
            this.angle = targetAngle;
            this.angularVelocity = 0;
        }
    }

    getCorners() {
        // Calculate the four corners of the flipper rectangle
        // Flipper is a rectangle with pivot at one end
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        const halfHeight = this.height / 2;

        // Corners relative to pivot point
        let corners;
        if (this.side === 'left') {
            corners = [
                { x: 0, y: -halfHeight },              // Pivot top
                { x: 0, y: halfHeight },               // Pivot bottom
                { x: this.width, y: halfHeight },      // End bottom
                { x: this.width, y: -halfHeight }      // End top
            ];
        } else {
            corners = [
                { x: 0, y: -halfHeight },              // Pivot top
                { x: 0, y: halfHeight },               // Pivot bottom
                { x: -this.width, y: halfHeight },     // End bottom
                { x: -this.width, y: -halfHeight }     // End top
            ];
        }

        // Rotate and translate corners
        return corners.map(corner => ({
            x: this.x + corner.x * cos - corner.y * sin,
            y: this.y + corner.x * sin + corner.y * cos
        }));
    }

    getTipPosition() {
        // Get the position of the flipper tip (far end from pivot)
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        const tipOffset = this.side === 'left' ? this.width : -this.width;

        return {
            x: this.x + tipOffset * cos,
            y: this.y + tipOffset * sin
        };
    }

    checkCollision(ball) {
        // Get flipper corners for collision detection
        const corners = this.getCorners();

        // Check collision with each edge of the flipper
        for (let i = 0; i < corners.length; i++) {
            const p1 = corners[i];
            const p2 = corners[(i + 1) % corners.length];

            // Calculate closest point on line segment to ball center
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const length = Math.sqrt(dx * dx + dy * dy);

            if (length === 0) continue;

            const nx = dx / length;
            const ny = dy / length;

            // Project ball center onto line
            const t = Math.max(0, Math.min(1,
                ((ball.x - p1.x) * dx + (ball.y - p1.y) * dy) / (length * length)
            ));

            const closestX = p1.x + t * dx;
            const closestY = p1.y + t * dy;

            // Distance from ball center to closest point
            const distX = ball.x - closestX;
            const distY = ball.y - closestY;
            const dist = Math.sqrt(distX * distX + distY * distY);

            if (dist < ball.radius) {
                // Collision detected!
                // Calculate normal (perpendicular to edge, pointing outward)
                let normalX = -dy / length;
                let normalY = dx / length;

                // Ensure normal points away from flipper center
                const centerX = (corners[0].x + corners[2].x) / 2;
                const centerY = (corners[0].y + corners[2].y) / 2;
                const toCenterX = centerX - closestX;
                const toCenterY = centerY - closestY;

                if (normalX * toCenterX + normalY * toCenterY > 0) {
                    normalX = -normalX;
                    normalY = -normalY;
                }

                // Separate ball from flipper
                const overlap = ball.radius - dist;
                ball.x += normalX * overlap;
                ball.y += normalY * overlap;

                // Calculate collision response
                // Add flipper's angular velocity contribution
                const tipVelocity = this.angularVelocity * this.width;

                // Reflect ball velocity
                const dotProduct = ball.vx * normalX + ball.vy * normalY;
                ball.vx = ball.vx - 2 * dotProduct * normalX;
                ball.vy = ball.vy - 2 * dotProduct * normalY;

                // Add flipper force if activated
                if (this.isActivated && Math.abs(this.angularVelocity) > 0.1) {
                    const flipperForce = tipVelocity * this.bounceFactor;
                    ball.vx += normalX * Math.abs(flipperForce);
                    ball.vy += normalY * Math.abs(flipperForce) - Math.abs(flipperForce) * 0.5;
                }

                // Apply some energy loss
                ball.vx *= 0.9;
                ball.vy *= 0.9;

                return true;
            }
        }

        return false;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Draw flipper body
        const gradient = ctx.createLinearGradient(0, -this.height/2, 0, this.height/2);
        gradient.addColorStop(0, '#ff6600');
        gradient.addColorStop(0.5, '#ffaa00');
        gradient.addColorStop(1, '#ff6600');

        ctx.fillStyle = gradient;
        ctx.strokeStyle = '#cc4400';
        ctx.lineWidth = 2;

        // Draw tapered flipper shape
        ctx.beginPath();
        if (this.side === 'left') {
            ctx.moveTo(0, -this.height / 2);
            ctx.lineTo(this.width, -this.height / 4);
            ctx.lineTo(this.width, this.height / 4);
            ctx.lineTo(0, this.height / 2);
            ctx.closePath();
        } else {
            ctx.moveTo(0, -this.height / 2);
            ctx.lineTo(-this.width, -this.height / 4);
            ctx.lineTo(-this.width, this.height / 4);
            ctx.lineTo(0, this.height / 2);
            ctx.closePath();
        }
        ctx.fill();
        ctx.stroke();

        // Draw pivot point
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(0, 0, this.height / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#cc9900';
        ctx.stroke();

        ctx.restore();
    }
}

// ============================================================================
// BUMPER CLASS
// ============================================================================
class Bumper {
    constructor(x, y, radius, points = 100) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.points = points;

        // Visual state
        this.isLit = false;
        this.hitTimer = 0;
        this.hitDuration = 10; // frames to stay lit

        // Physics
        this.bounceForce = 15;

        // Animation
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.pulseSpeed = 0.1;
    }

    hit(ball) {
        // Calculate direction from bumper to ball
        const dx = ball.x - this.x;
        const dy = ball.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist === 0) return 0;

        // Normalize direction
        const nx = dx / dist;
        const ny = dy / dist;

        // Push ball away
        ball.vx = nx * this.bounceForce;
        ball.vy = ny * this.bounceForce;

        // Separate ball from bumper
        const overlap = this.radius + ball.radius - dist;
        if (overlap > 0) {
            ball.x += nx * overlap;
            ball.y += ny * overlap;
        }

        // Light up
        this.isLit = true;
        this.hitTimer = this.hitDuration;

        return this.points;
    }

    update() {
        // Update hit animation
        if (this.hitTimer > 0) {
            this.hitTimer--;
            if (this.hitTimer === 0) {
                this.isLit = false;
            }
        }

        // Update pulse animation
        this.pulsePhase += this.pulseSpeed;
    }

    checkCollision(ball) {
        const dx = ball.x - this.x;
        const dy = ball.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.radius + ball.radius) {
            return this.hit(ball);
        }

        return 0;
    }

    draw(ctx) {
        const pulse = Math.sin(this.pulsePhase) * 0.1 + 1;
        const displayRadius = this.radius * pulse;

        // Outer ring
        ctx.beginPath();
        ctx.arc(this.x, this.y, displayRadius, 0, Math.PI * 2);

        if (this.isLit) {
            // Lit state - bright glow
            const gradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, displayRadius
            );
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.3, '#ffff00');
            gradient.addColorStop(0.7, '#ff6600');
            gradient.addColorStop(1, '#ff0000');
            ctx.fillStyle = gradient;

            // Draw glow
            ctx.shadowColor = '#ffff00';
            ctx.shadowBlur = 20;
        } else {
            // Normal state
            const gradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, displayRadius
            );
            gradient.addColorStop(0, '#ff4444');
            gradient.addColorStop(0.5, '#cc0000');
            gradient.addColorStop(1, '#880000');
            ctx.fillStyle = gradient;
            ctx.shadowBlur = 0;
        }

        ctx.fill();

        // Reset shadow
        ctx.shadowBlur = 0;

        // Inner ring
        ctx.beginPath();
        ctx.arc(this.x, this.y, displayRadius * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = this.isLit ? '#ffffff' : '#ffcc00';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Center dot
        ctx.beginPath();
        ctx.arc(this.x, this.y, displayRadius * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = this.isLit ? '#ffffff' : '#ffcc00';
        ctx.fill();
    }
}

// ============================================================================
// SLINGSHOT CLASS
// ============================================================================
class Slingshot {
    constructor(x, y, width, height, side) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.side = side; // 'left' or 'right'

        this.points = 10;
        this.bounceForce = 12;

        // Visual state
        this.isLit = false;
        this.hitTimer = 0;
        this.hitDuration = 5;

        // Calculate vertices based on side
        // Creates a triangular shape that deflects ball outward
        if (side === 'left') {
            this.vertices = [
                { x: x, y: y },
                { x: x + width, y: y + height },
                { x: x, y: y + height }
            ];
        } else {
            this.vertices = [
                { x: x, y: y },
                { x: x - width, y: y + height },
                { x: x, y: y + height }
            ];
        }

        // Calculate edges and normals
        this.edges = [];
        for (let i = 0; i < this.vertices.length; i++) {
            const p1 = this.vertices[i];
            const p2 = this.vertices[(i + 1) % this.vertices.length];

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const length = Math.sqrt(dx * dx + dy * dy);

            this.edges.push({
                p1: p1,
                p2: p2,
                normal: { x: -dy / length, y: dx / length },
                length: length
            });
        }
    }

    checkCollision(ball) {
        // Check collision with each edge
        for (const edge of this.edges) {
            const result = this.lineCircleCollision(
                edge.p1.x, edge.p1.y,
                edge.p2.x, edge.p2.y,
                ball.x, ball.y, ball.radius
            );

            if (result) {
                // Collision detected
                this.deflect(ball, edge.normal);
                this.hit();
                return this.points;
            }
        }

        return 0;
    }

    lineCircleCollision(x1, y1, x2, y2, cx, cy, r) {
        // Vector from p1 to p2
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSq = dx * dx + dy * dy;

        // Project circle center onto line
        const t = Math.max(0, Math.min(1,
            ((cx - x1) * dx + (cy - y1) * dy) / lengthSq
        ));

        // Closest point on line segment
        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;

        // Distance from circle center to closest point
        const distX = cx - closestX;
        const distY = cy - closestY;
        const distSq = distX * distX + distY * distY;

        return distSq < r * r;
    }

    deflect(ball, normal) {
        // Reflect velocity
        const dot = ball.vx * normal.x + ball.vy * normal.y;
        ball.vx = ball.vx - 2 * dot * normal.x;
        ball.vy = ball.vy - 2 * dot * normal.y;

        // Add bounce force in normal direction
        ball.vx += normal.x * this.bounceForce;
        ball.vy += normal.y * this.bounceForce;

        // Push ball away to prevent sticking
        ball.x += normal.x * 5;
        ball.y += normal.y * 5;
    }

    hit() {
        this.isLit = true;
        this.hitTimer = this.hitDuration;
    }

    update() {
        if (this.hitTimer > 0) {
            this.hitTimer--;
            if (this.hitTimer === 0) {
                this.isLit = false;
            }
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        ctx.closePath();

        // Fill
        if (this.isLit) {
            ctx.fillStyle = '#ffff00';
            ctx.shadowColor = '#ffff00';
            ctx.shadowBlur = 15;
        } else {
            ctx.fillStyle = '#00aa00';
            ctx.shadowBlur = 0;
        }
        ctx.fill();

        // Reset shadow
        ctx.shadowBlur = 0;

        // Outline
        ctx.strokeStyle = this.isLit ? '#ffffff' : '#00ff00';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw rubber band (the active edge)
        ctx.beginPath();
        if (this.side === 'left') {
            ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
            ctx.lineTo(this.vertices[1].x, this.vertices[1].y);
        } else {
            ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
            ctx.lineTo(this.vertices[1].x, this.vertices[1].y);
        }
        ctx.strokeStyle = this.isLit ? '#ff0000' : '#cc0000';
        ctx.lineWidth = 4;
        ctx.stroke();
    }
}

// ============================================================================
// TARGET CLASS
// ============================================================================
class Target {
    constructor(x, y, width, height, points = 50) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.points = points;

        // State
        this.isLit = false;
        this.wasHit = false;
        this.hitTimer = 0;
        this.hitDuration = 8;

        // Animation
        this.glowIntensity = 0;
    }

    hit() {
        // Toggle lit state
        this.isLit = !this.isLit;
        this.wasHit = true;
        this.hitTimer = this.hitDuration;

        return this.points;
    }

    reset() {
        this.wasHit = false;
        this.isLit = false;
        this.hitTimer = 0;
        this.glowIntensity = 0;
    }

    update() {
        if (this.hitTimer > 0) {
            this.hitTimer--;
            this.glowIntensity = this.hitTimer / this.hitDuration;
        }
    }

    checkCollision(ball) {
        // Simple AABB collision with circle
        const closestX = Math.max(this.x, Math.min(ball.x, this.x + this.width));
        const closestY = Math.max(this.y, Math.min(ball.y, this.y + this.height));

        const distX = ball.x - closestX;
        const distY = ball.y - closestY;
        const distSq = distX * distX + distY * distY;

        if (distSq < ball.radius * ball.radius) {
            // Collision - determine which side was hit
            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;

            const dx = ball.x - centerX;
            const dy = ball.y - centerY;

            // Reflect ball
            if (Math.abs(dx) > Math.abs(dy)) {
                ball.vx = -ball.vx * 0.8;
                ball.x += Math.sign(dx) * (ball.radius - Math.abs(distX) + 1);
            } else {
                ball.vy = -ball.vy * 0.8;
                ball.y += Math.sign(dy) * (ball.radius - Math.abs(distY) + 1);
            }

            return this.hit();
        }

        return 0;
    }

    draw(ctx) {
        // Draw target base
        ctx.fillStyle = this.isLit ? '#00ff00' : '#004400';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Draw border
        ctx.strokeStyle = this.isLit ? '#00ff00' : '#008800';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        // Draw hit effect
        if (this.glowIntensity > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.glowIntensity * 0.5})`;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        // Draw indicator light
        const indicatorX = this.x + this.width / 2;
        const indicatorY = this.y + this.height / 2;
        const indicatorRadius = Math.min(this.width, this.height) / 4;

        ctx.beginPath();
        ctx.arc(indicatorX, indicatorY, indicatorRadius, 0, Math.PI * 2);

        if (this.isLit) {
            const gradient = ctx.createRadialGradient(
                indicatorX, indicatorY, 0,
                indicatorX, indicatorY, indicatorRadius
            );
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.5, '#00ff00');
            gradient.addColorStop(1, '#008800');
            ctx.fillStyle = gradient;
            ctx.shadowColor = '#00ff00';
            ctx.shadowBlur = 10;
        } else {
            ctx.fillStyle = '#002200';
            ctx.shadowBlur = 0;
        }

        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// ============================================================================
// PLUNGER CLASS
// ============================================================================
class Plunger {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        // State
        this.power = 0;
        this.maxPower = 1;
        this.isCharging = false;
        this.chargeSpeed = 0.02;

        // Physics
        this.minLaunchVelocity = 10;
        this.maxLaunchVelocity = 30;

        // Visual
        this.compressionOffset = 0;
        this.maxCompression = this.height * 0.4;
    }

    startCharge() {
        this.isCharging = true;
        this.power = 0;
    }

    release() {
        if (!this.isCharging) return 0;

        this.isCharging = false;

        // Calculate launch velocity based on charge
        const velocity = this.minLaunchVelocity +
            (this.maxLaunchVelocity - this.minLaunchVelocity) * this.power;

        // Reset power
        const launchPower = this.power;
        this.power = 0;

        return {
            velocity: -velocity, // Negative because launching upward
            power: launchPower
        };
    }

    update() {
        if (this.isCharging) {
            // Increase power while charging
            this.power = Math.min(this.maxPower, this.power + this.chargeSpeed);
        }

        // Update visual compression
        this.compressionOffset = this.power * this.maxCompression;
    }

    getLaunchPosition() {
        // Return position where ball should be placed for launch
        return {
            x: this.x + this.width / 2,
            y: this.y - 10 + this.compressionOffset
        };
    }

    draw(ctx) {
        // Draw plunger channel
        ctx.fillStyle = '#333333';
        ctx.fillRect(this.x - 5, this.y - this.height, this.width + 10, this.height + 20);

        // Draw plunger body (compressed based on power)
        const plungerTop = this.y - this.height + this.compressionOffset;
        const plungerHeight = this.height - this.compressionOffset;

        // Plunger gradient
        const gradient = ctx.createLinearGradient(this.x, 0, this.x + this.width, 0);
        gradient.addColorStop(0, '#888888');
        gradient.addColorStop(0.3, '#cccccc');
        gradient.addColorStop(0.5, '#ffffff');
        gradient.addColorStop(0.7, '#cccccc');
        gradient.addColorStop(1, '#888888');

        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, plungerTop, this.width, plungerHeight);

        // Draw plunger head
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(this.x - 2, plungerTop, this.width + 4, 15);

        // Draw power indicator
        const indicatorHeight = 50;
        const indicatorY = this.y + 25;

        // Background
        ctx.fillStyle = '#222222';
        ctx.fillRect(this.x, indicatorY, this.width, indicatorHeight);

        // Power level
        const powerHeight = indicatorHeight * this.power;
        const powerGradient = ctx.createLinearGradient(0, indicatorY + indicatorHeight, 0, indicatorY);
        powerGradient.addColorStop(0, '#00ff00');
        powerGradient.addColorStop(0.5, '#ffff00');
        powerGradient.addColorStop(1, '#ff0000');

        ctx.fillStyle = powerGradient;
        ctx.fillRect(this.x, indicatorY + indicatorHeight - powerHeight, this.width, powerHeight);

        // Border
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, indicatorY, this.width, indicatorHeight);

        // Spring effect
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 2;
        const springSegments = 8;
        const springWidth = this.width * 0.6;
        const springHeight = this.compressionOffset + 20;

        ctx.beginPath();
        for (let i = 0; i <= springSegments; i++) {
            const t = i / springSegments;
            const sx = this.x + this.width / 2 + (i % 2 === 0 ? -springWidth / 2 : springWidth / 2);
            const sy = this.y + t * springHeight;

            if (i === 0) {
                ctx.moveTo(this.x + this.width / 2, sy);
            } else {
                ctx.lineTo(sx, sy);
            }
        }
        ctx.stroke();
    }
}

// ============================================================================
// WALL CLASS
// ============================================================================
class Wall {
    constructor(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;

        // Pre-calculate properties
        this.dx = x2 - x1;
        this.dy = y2 - y1;
        this.length = Math.sqrt(this.dx * this.dx + this.dy * this.dy);

        // Normal vector (perpendicular to wall)
        this.normalX = -this.dy / this.length;
        this.normalY = this.dx / this.length;

        // Visual properties
        this.color = '#4444ff';
        this.thickness = 4;
    }

    checkCollision(ball) {
        // Project ball center onto line
        const t = Math.max(0, Math.min(1,
            ((ball.x - this.x1) * this.dx + (ball.y - this.y1) * this.dy) /
            (this.length * this.length)
        ));

        // Closest point on wall to ball
        const closestX = this.x1 + t * this.dx;
        const closestY = this.y1 + t * this.dy;

        // Distance from ball to closest point
        const distX = ball.x - closestX;
        const distY = ball.y - closestY;
        const dist = Math.sqrt(distX * distX + distY * distY);

        if (dist < ball.radius) {
            // Collision detected
            // Determine which side of the wall the ball is on
            let nx = distX / dist;
            let ny = distY / dist;

            // Separate ball from wall
            const overlap = ball.radius - dist;
            ball.x += nx * overlap;
            ball.y += ny * overlap;

            // Reflect velocity
            const dot = ball.vx * nx + ball.vy * ny;
            ball.vx = ball.vx - 2 * dot * nx;
            ball.vy = ball.vy - 2 * dot * ny;

            // Apply some energy loss
            ball.vx *= 0.95;
            ball.vy *= 0.95;

            return true;
        }

        return false;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
        ctx.lineTo(this.x2, this.y2);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.thickness;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Draw end caps
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x1, this.y1, this.thickness / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x2, this.y2, this.thickness / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ============================================================================
// SPINNER CLASS (Bonus element)
// ============================================================================
class Spinner {
    constructor(x, y, width, height, points = 25) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.points = points;

        // Rotation state
        this.angle = 0;
        this.angularVelocity = 0;
        this.friction = 0.98;

        // Scoring
        this.spinsCount = 0;
        this.lastAngle = 0;
    }

    checkCollision(ball) {
        // Simplified collision - check if ball passes through spinner area
        const dx = ball.x - this.x;
        const dy = ball.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.width / 2 + ball.radius) {
            // Ball hit spinner - transfer momentum
            const impactForce = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            this.angularVelocity += impactForce * 0.1;

            // Slightly deflect ball
            ball.vx *= 0.9;
            ball.vy *= 0.9;

            return this.points;
        }

        return 0;
    }

    update() {
        // Update rotation
        this.angle += this.angularVelocity;
        this.angularVelocity *= this.friction;

        // Count full rotations for bonus
        const fullRotations = Math.floor(this.angle / (Math.PI * 2));
        if (fullRotations > this.spinsCount) {
            this.spinsCount = fullRotations;
        }

        // Normalize angle
        if (this.angle > Math.PI * 2) {
            this.angle -= Math.PI * 2;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Draw spinner blade
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Draw center hub
        ctx.fillStyle = '#888888';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Draw mounting posts
        ctx.fillStyle = '#666666';
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.width / 2 - 5, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x, this.y + this.width / 2 + 5, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ============================================================================
// ROLLOVER CLASS (Lane triggers)
// ============================================================================
class Rollover {
    constructor(x, y, width, height, points = 100, label = '') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.points = points;
        this.label = label;

        // State
        this.isLit = false;
        this.wasTriggered = false;
        this.triggerTimer = 0;
        this.triggerDuration = 15;
    }

    checkCollision(ball) {
        // Check if ball is over the rollover
        if (ball.x > this.x && ball.x < this.x + this.width &&
            ball.y > this.y && ball.y < this.y + this.height) {

            if (!this.wasTriggered) {
                this.wasTriggered = true;
                this.isLit = true;
                this.triggerTimer = this.triggerDuration;
                return this.points;
            }
        } else {
            this.wasTriggered = false;
        }

        return 0;
    }

    update() {
        if (this.triggerTimer > 0) {
            this.triggerTimer--;
        }
    }

    reset() {
        this.isLit = false;
        this.wasTriggered = false;
    }

    draw(ctx) {
        // Draw lane background
        ctx.fillStyle = this.isLit ? '#003300' : '#001100';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Draw trigger indicator
        const indicatorSize = Math.min(this.width, this.height) * 0.6;
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        ctx.beginPath();
        ctx.arc(centerX, centerY, indicatorSize / 2, 0, Math.PI * 2);

        if (this.isLit) {
            ctx.fillStyle = '#00ff00';
            ctx.shadowColor = '#00ff00';
            ctx.shadowBlur = 10;
        } else {
            ctx.fillStyle = '#004400';
            ctx.shadowBlur = 0;
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw label
        if (this.label) {
            ctx.fillStyle = this.isLit ? '#ffffff' : '#888888';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.label, centerX, centerY);
        }

        // Draw border
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
}

// ============================================================================
// KICKER CLASS (Hole that ejects ball)
// ============================================================================
class Kicker {
    constructor(x, y, radius, ejectAngle = -Math.PI / 2, ejectForce = 15, points = 500) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.ejectAngle = ejectAngle;
        this.ejectForce = ejectForce;
        this.points = points;

        // State
        this.hasBall = false;
        this.holdTimer = 0;
        this.holdDuration = 60; // Frames to hold ball
        this.capturedBall = null;

        // Animation
        this.pulsePhase = 0;
    }

    checkCollision(ball) {
        if (this.hasBall) return 0;

        const dx = ball.x - this.x;
        const dy = ball.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.radius) {
            // Capture ball
            this.hasBall = true;
            this.holdTimer = this.holdDuration;
            this.capturedBall = ball;

            // Stop ball and center it
            ball.vx = 0;
            ball.vy = 0;
            ball.x = this.x;
            ball.y = this.y;
            ball.isHeld = true;

            return this.points;
        }

        return 0;
    }

    update() {
        this.pulsePhase += 0.1;

        if (this.hasBall && this.holdTimer > 0) {
            this.holdTimer--;

            if (this.holdTimer === 0) {
                // Eject ball
                this.ejectBall();
            }
        }
    }

    ejectBall() {
        if (this.capturedBall) {
            this.capturedBall.vx = Math.cos(this.ejectAngle) * this.ejectForce;
            this.capturedBall.vy = Math.sin(this.ejectAngle) * this.ejectForce;
            this.capturedBall.isHeld = false;
            this.capturedBall = null;
        }
        this.hasBall = false;
    }

    draw(ctx) {
        const pulse = Math.sin(this.pulsePhase) * 0.1 + 1;

        // Draw hole
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * pulse, 0, Math.PI * 2);

        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius
        );
        gradient.addColorStop(0, '#000000');
        gradient.addColorStop(0.7, '#220022');
        gradient.addColorStop(1, '#440044');

        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw ring
        ctx.strokeStyle = this.hasBall ? '#ff00ff' : '#880088';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw eject direction indicator
        if (!this.hasBall) {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.x + Math.cos(this.ejectAngle) * this.radius * 1.5,
                this.y + Math.sin(this.ejectAngle) * this.radius * 1.5
            );
            ctx.strokeStyle = '#660066';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
}

// Make all classes available globally
window.Flipper = Flipper;
window.Bumper = Bumper;
window.Slingshot = Slingshot;
window.Target = Target;
window.Plunger = Plunger;
window.Wall = Wall;
window.Spinner = Spinner;
window.Rollover = Rollover;
window.Kicker = Kicker;
