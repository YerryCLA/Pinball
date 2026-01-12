/**
 * Pinball Physics Engine
 * A complete physics system for a retro pinball game
 */

// Physics constants and configuration
const PHYSICS = {
    gravity: 0.3,
    friction: 0.99,
    bounciness: 0.7,
    maxSpeed: 20,
    minSpeed: 0.1  // Below this, velocity is zeroed to prevent micro-movements
};

// ============================================================================
// Vector Math Helpers
// ============================================================================

/**
 * Normalize a vector to unit length
 * @param {number} x - X component
 * @param {number} y - Y component
 * @returns {{x: number, y: number}} Unit vector
 */
function normalize(x, y) {
    const length = Math.sqrt(x * x + y * y);
    if (length === 0) {
        return { x: 0, y: 0 };
    }
    return {
        x: x / length,
        y: y / length
    };
}

/**
 * Calculate dot product of two vectors
 * @param {number} x1 - First vector X
 * @param {number} y1 - First vector Y
 * @param {number} x2 - Second vector X
 * @param {number} y2 - Second vector Y
 * @returns {number} Dot product
 */
function dot(x1, y1, x2, y2) {
    return x1 * x2 + y1 * y2;
}

/**
 * Reflect velocity vector off a surface normal
 * @param {number} vx - Velocity X
 * @param {number} vy - Velocity Y
 * @param {number} nx - Normal X (should be normalized)
 * @param {number} ny - Normal Y (should be normalized)
 * @returns {{x: number, y: number}} Reflected velocity
 */
function reflect(vx, vy, nx, ny) {
    // Reflection formula: v' = v - 2(v . n)n
    const dotProduct = dot(vx, vy, nx, ny);
    return {
        x: vx - 2 * dotProduct * nx,
        y: vy - 2 * dotProduct * ny
    };
}

/**
 * Calculate the magnitude (length) of a vector
 * @param {number} x - X component
 * @param {number} y - Y component
 * @returns {number} Vector magnitude
 */
function magnitude(x, y) {
    return Math.sqrt(x * x + y * y);
}

/**
 * Calculate distance between two points
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @returns {number} Distance
 */
function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// ============================================================================
// Ball Class
// ============================================================================

/**
 * Ball class with physics properties and methods
 */
class Ball {
    /**
     * Create a new ball
     * @param {number} x - Initial X position
     * @param {number} y - Initial Y position
     * @param {number} radius - Ball radius (default: 10)
     */
    constructor(x, y, radius = 10) {
        // Position
        this.x = x;
        this.y = y;

        // Velocity
        this.vx = 0;
        this.vy = 0;

        // Physical properties
        this.radius = radius;
        this.mass = radius * radius; // Mass proportional to area

        // State flags
        this.active = true;
        this.lastCollision = null; // Track last collision to prevent sticking
    }

    /**
     * Update ball physics - apply gravity, friction, and enforce speed limits
     * @param {Object} bounds - Optional bounds {width, height} for boundary checking
     */
    update(bounds = null) {
        if (!this.active) return;

        // Apply gravity (pulling down in screen coordinates)
        this.vy += PHYSICS.gravity;

        // Apply friction
        this.vx *= PHYSICS.friction;
        this.vy *= PHYSICS.friction;

        // Enforce speed limit to prevent physics glitches
        const speed = magnitude(this.vx, this.vy);
        if (speed > PHYSICS.maxSpeed) {
            const scale = PHYSICS.maxSpeed / speed;
            this.vx *= scale;
            this.vy *= scale;
        }

        // Zero out very small velocities to prevent micro-movements
        if (Math.abs(this.vx) < PHYSICS.minSpeed) this.vx = 0;
        if (Math.abs(this.vy) < PHYSICS.minSpeed) this.vy = 0;

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Bounds checking if bounds provided
        if (bounds) {
            this.checkBounds(bounds);
        }
    }

    /**
     * Apply a force to the ball
     * @param {number} fx - Force X component
     * @param {number} fy - Force Y component
     */
    applyForce(fx, fy) {
        // F = ma, so a = F/m, and we add to velocity
        this.vx += fx / this.mass;
        this.vy += fy / this.mass;
    }

    /**
     * Apply an impulse directly to velocity (ignores mass)
     * @param {number} ix - Impulse X component
     * @param {number} iy - Impulse Y component
     */
    applyImpulse(ix, iy) {
        this.vx += ix;
        this.vy += iy;
    }

    /**
     * Check and handle boundary collisions
     * @param {Object} bounds - Bounds object {width, height, x?, y?}
     */
    checkBounds(bounds) {
        const minX = (bounds.x || 0) + this.radius;
        const maxX = (bounds.x || 0) + bounds.width - this.radius;
        const minY = (bounds.y || 0) + this.radius;
        const maxY = (bounds.y || 0) + bounds.height - this.radius;

        // Left wall
        if (this.x < minX) {
            this.x = minX;
            this.vx = -this.vx * PHYSICS.bounciness;
        }

        // Right wall
        if (this.x > maxX) {
            this.x = maxX;
            this.vx = -this.vx * PHYSICS.bounciness;
        }

        // Top wall
        if (this.y < minY) {
            this.y = minY;
            this.vy = -this.vy * PHYSICS.bounciness;
        }

        // Bottom (ball lost - could trigger game event)
        if (this.y > maxY) {
            this.y = maxY;
            this.vy = -this.vy * PHYSICS.bounciness;
            // In a real game, you might set this.active = false here
        }
    }

    /**
     * Get current speed of the ball
     * @returns {number} Current speed
     */
    getSpeed() {
        return magnitude(this.vx, this.vy);
    }

    /**
     * Reset ball to a position with zero velocity
     * @param {number} x - New X position
     * @param {number} y - New Y position
     */
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.active = true;
        this.lastCollision = null;
    }
}

// ============================================================================
// Collision Detection Functions
// ============================================================================

/**
 * Detect collision between ball and a circular object (bumpers)
 * @param {Ball} ball - The ball object
 * @param {Object} circle - Circle object {x, y, radius}
 * @returns {Object|null} Collision info {point, normal, depth} or null if no collision
 */
function circleCircleCollision(ball, circle) {
    const dx = ball.x - circle.x;
    const dy = ball.y - circle.y;
    const dist = magnitude(dx, dy);
    const minDist = ball.radius + circle.radius;

    if (dist < minDist && dist > 0) {
        // Collision detected
        const normal = normalize(dx, dy);
        const depth = minDist - dist;

        return {
            point: {
                x: circle.x + normal.x * circle.radius,
                y: circle.y + normal.y * circle.radius
            },
            normal: normal,
            depth: depth
        };
    }

    return null;
}

/**
 * Detect collision between ball and rectangle (flippers, walls)
 * @param {Ball} ball - The ball object
 * @param {Object} rect - Rectangle {x, y, width, height, angle?}
 * @returns {Object|null} Collision info {point, normal, depth} or null if no collision
 */
function circleRectCollision(ball, rect) {
    // Handle rotated rectangles
    let localBallX = ball.x;
    let localBallY = ball.y;

    if (rect.angle) {
        // Transform ball position to rectangle's local space
        const cos = Math.cos(-rect.angle);
        const sin = Math.sin(-rect.angle);
        const dx = ball.x - (rect.x + rect.width / 2);
        const dy = ball.y - (rect.y + rect.height / 2);
        localBallX = (rect.x + rect.width / 2) + dx * cos - dy * sin;
        localBallY = (rect.y + rect.height / 2) + dx * sin + dy * cos;
    }

    // Find closest point on rectangle to ball center
    const closestX = clamp(localBallX, rect.x, rect.x + rect.width);
    const closestY = clamp(localBallY, rect.y, rect.y + rect.height);

    // Calculate distance from ball center to closest point
    let dx = localBallX - closestX;
    let dy = localBallY - closestY;
    const dist = magnitude(dx, dy);

    if (dist < ball.radius && dist > 0) {
        // Collision detected
        let normal = normalize(dx, dy);

        // Transform normal back to world space if rectangle is rotated
        if (rect.angle) {
            const cos = Math.cos(rect.angle);
            const sin = Math.sin(rect.angle);
            const nx = normal.x * cos - normal.y * sin;
            const ny = normal.x * sin + normal.y * cos;
            normal = { x: nx, y: ny };
        }

        return {
            point: {
                x: closestX,
                y: closestY
            },
            normal: normal,
            depth: ball.radius - dist
        };
    }

    // Special case: ball center is inside rectangle
    if (dist === 0) {
        // Find which edge is closest
        const distLeft = localBallX - rect.x;
        const distRight = rect.x + rect.width - localBallX;
        const distTop = localBallY - rect.y;
        const distBottom = rect.y + rect.height - localBallY;

        const minDist = Math.min(distLeft, distRight, distTop, distBottom);
        let normal;

        if (minDist === distLeft) {
            normal = { x: -1, y: 0 };
        } else if (minDist === distRight) {
            normal = { x: 1, y: 0 };
        } else if (minDist === distTop) {
            normal = { x: 0, y: -1 };
        } else {
            normal = { x: 0, y: 1 };
        }

        // Transform normal if rotated
        if (rect.angle) {
            const cos = Math.cos(rect.angle);
            const sin = Math.sin(rect.angle);
            const nx = normal.x * cos - normal.y * sin;
            const ny = normal.x * sin + normal.y * cos;
            normal = { x: nx, y: ny };
        }

        return {
            point: { x: localBallX, y: localBallY },
            normal: normal,
            depth: ball.radius + minDist
        };
    }

    return null;
}

/**
 * Detect collision between ball and a line segment (angled surfaces, walls)
 * @param {Ball} ball - The ball object
 * @param {number} x1 - Line start X
 * @param {number} y1 - Line start Y
 * @param {number} x2 - Line end X
 * @param {number} y2 - Line end Y
 * @returns {Object|null} Collision info {point, normal, depth} or null if no collision
 */
function circleLineCollision(ball, x1, y1, x2, y2) {
    // Vector from line start to end
    const lineX = x2 - x1;
    const lineY = y2 - y1;
    const lineLength = magnitude(lineX, lineY);

    if (lineLength === 0) return null;

    // Normalized line direction
    const lineDirX = lineX / lineLength;
    const lineDirY = lineY / lineLength;

    // Vector from line start to ball center
    const toBallX = ball.x - x1;
    const toBallY = ball.y - y1;

    // Project ball center onto line
    let projection = dot(toBallX, toBallY, lineDirX, lineDirY);

    // Clamp projection to line segment
    projection = clamp(projection, 0, lineLength);

    // Find closest point on line segment
    const closestX = x1 + lineDirX * projection;
    const closestY = y1 + lineDirY * projection;

    // Distance from ball center to closest point
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    const dist = magnitude(dx, dy);

    if (dist < ball.radius && dist > 0) {
        // Calculate normal (perpendicular to line, pointing toward ball)
        const normal = normalize(dx, dy);

        return {
            point: {
                x: closestX,
                y: closestY
            },
            normal: normal,
            depth: ball.radius - dist
        };
    }

    return null;
}

/**
 * Detect collision between ball and a polygon (defined by vertices)
 * @param {Ball} ball - The ball object
 * @param {Array} vertices - Array of {x, y} points defining polygon
 * @returns {Object|null} Collision info or null if no collision
 */
function circlePolygonCollision(ball, vertices) {
    let closestCollision = null;
    let minDepth = Infinity;

    // Check each edge of the polygon
    for (let i = 0; i < vertices.length; i++) {
        const v1 = vertices[i];
        const v2 = vertices[(i + 1) % vertices.length];

        const collision = circleLineCollision(ball, v1.x, v1.y, v2.x, v2.y);

        if (collision && collision.depth < minDepth) {
            minDepth = collision.depth;
            closestCollision = collision;
        }
    }

    return closestCollision;
}

// ============================================================================
// Collision Resolution
// ============================================================================

/**
 * Resolve a collision by updating ball velocity and position
 * @param {Ball} ball - The ball to update
 * @param {Object} normal - Collision normal {x, y}
 * @param {number} bounciness - Bounciness factor (0-1+, default uses PHYSICS.bounciness)
 * @param {number} depth - Penetration depth for position correction
 */
function resolveCollision(ball, normal, bounciness = PHYSICS.bounciness, depth = 0) {
    // Reflect velocity off the surface normal
    const reflected = reflect(ball.vx, ball.vy, normal.x, normal.y);

    // Apply bounciness
    ball.vx = reflected.x * bounciness;
    ball.vy = reflected.y * bounciness;

    // Position correction to prevent sinking into surfaces
    if (depth > 0) {
        ball.x += normal.x * depth;
        ball.y += normal.y * depth;
    }
}

/**
 * Resolve collision with a moving flipper (adds flipper velocity to bounce)
 * @param {Ball} ball - The ball to update
 * @param {Object} collision - Collision info from detection
 * @param {number} flipperAngularVelocity - Angular velocity of flipper (radians/frame)
 * @param {Object} flipperPivot - Pivot point of flipper {x, y}
 * @param {number} flipperBounciness - Bounciness of flipper
 */
function resolveFlipperCollision(ball, collision, flipperAngularVelocity, flipperPivot, flipperBounciness = 1.2) {
    // Calculate flipper velocity at collision point
    const dx = collision.point.x - flipperPivot.x;
    const dy = collision.point.y - flipperPivot.y;
    const dist = magnitude(dx, dy);

    // Tangential velocity from rotation
    const tangentX = -dy / dist;
    const tangentY = dx / dist;
    const flipperSpeed = flipperAngularVelocity * dist;

    // Add flipper velocity to ball
    ball.vx += tangentX * flipperSpeed;
    ball.vy += tangentY * flipperSpeed;

    // Then resolve as normal collision
    resolveCollision(ball, collision.normal, flipperBounciness, collision.depth);
}

/**
 * Full collision check and resolution against all game objects
 * @param {Ball} ball - The ball to check
 * @param {Object} gameObjects - Object containing arrays of collidables
 *        {circles: [], rects: [], lines: [], polygons: []}
 */
function processCollisions(ball, gameObjects) {
    // Process circle collisions (bumpers)
    if (gameObjects.circles) {
        for (const circle of gameObjects.circles) {
            const collision = circleCircleCollision(ball, circle);
            if (collision) {
                const bounciness = circle.bounciness || PHYSICS.bounciness;
                resolveCollision(ball, collision.normal, bounciness, collision.depth);

                // Trigger callback if defined
                if (circle.onCollision) {
                    circle.onCollision(ball, collision);
                }
            }
        }
    }

    // Process rectangle collisions (flippers, walls)
    if (gameObjects.rects) {
        for (const rect of gameObjects.rects) {
            const collision = circleRectCollision(ball, rect);
            if (collision) {
                if (rect.isFlipper && rect.angularVelocity && rect.pivot) {
                    resolveFlipperCollision(
                        ball,
                        collision,
                        rect.angularVelocity,
                        rect.pivot,
                        rect.bounciness || 1.2
                    );
                } else {
                    const bounciness = rect.bounciness || PHYSICS.bounciness;
                    resolveCollision(ball, collision.normal, bounciness, collision.depth);
                }

                if (rect.onCollision) {
                    rect.onCollision(ball, collision);
                }
            }
        }
    }

    // Process line collisions (walls, ramps)
    if (gameObjects.lines) {
        for (const line of gameObjects.lines) {
            const collision = circleLineCollision(ball, line.x1, line.y1, line.x2, line.y2);
            if (collision) {
                const bounciness = line.bounciness || PHYSICS.bounciness;
                resolveCollision(ball, collision.normal, bounciness, collision.depth);

                if (line.onCollision) {
                    line.onCollision(ball, collision);
                }
            }
        }
    }

    // Process polygon collisions
    if (gameObjects.polygons) {
        for (const polygon of gameObjects.polygons) {
            const collision = circlePolygonCollision(ball, polygon.vertices);
            if (collision) {
                const bounciness = polygon.bounciness || PHYSICS.bounciness;
                resolveCollision(ball, collision.normal, bounciness, collision.depth);

                if (polygon.onCollision) {
                    polygon.onCollision(ball, collision);
                }
            }
        }
    }
}

// ============================================================================
// Physics World Manager
// ============================================================================

/**
 * PhysicsWorld - Manages all physics objects and simulation
 */
class PhysicsWorld {
    constructor(width, height) {
        this.bounds = { x: 0, y: 0, width, height };
        this.balls = [];
        this.gameObjects = {
            circles: [],
            rects: [],
            lines: [],
            polygons: []
        };
        this.gravity = PHYSICS.gravity;
    }

    /**
     * Add a ball to the simulation
     * @param {Ball} ball - Ball instance to add
     */
    addBall(ball) {
        this.balls.push(ball);
    }

    /**
     * Add a circular bumper
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} radius - Bumper radius
     * @param {number} bounciness - Bounce factor
     * @param {Function} onCollision - Callback when hit
     */
    addBumper(x, y, radius, bounciness = 1.5, onCollision = null) {
        this.gameObjects.circles.push({
            x, y, radius, bounciness, onCollision
        });
    }

    /**
     * Add a wall (line segment)
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {number} bounciness - Bounce factor
     */
    addWall(x1, y1, x2, y2, bounciness = PHYSICS.bounciness) {
        this.gameObjects.lines.push({
            x1, y1, x2, y2, bounciness
        });
    }

    /**
     * Add a rectangular obstacle or flipper
     * @param {Object} rect - Rectangle definition
     */
    addRect(rect) {
        this.gameObjects.rects.push(rect);
    }

    /**
     * Update physics simulation for one frame
     */
    update() {
        for (const ball of this.balls) {
            if (ball.active) {
                ball.update(this.bounds);
                processCollisions(ball, this.gameObjects);
            }
        }
    }

    /**
     * Set world gravity
     * @param {number} g - Gravity value
     */
    setGravity(g) {
        this.gravity = g;
        PHYSICS.gravity = g;
    }
}

// ============================================================================
// Export everything via window.Physics
// ============================================================================

window.Physics = {
    // Constants
    PHYSICS,

    // Classes
    Ball,
    PhysicsWorld,

    // Vector math helpers
    normalize,
    dot,
    reflect,
    magnitude,
    distance,
    clamp,

    // Collision detection
    circleCircleCollision,
    circleRectCollision,
    circleLineCollision,
    circlePolygonCollision,

    // Collision resolution
    resolveCollision,
    resolveFlipperCollision,
    processCollisions
};

// Also export as globals for convenience
window.Ball = Ball;
window.PhysicsWorld = PhysicsWorld;
