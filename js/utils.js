// Game constants
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 700;

// Table layout constants (positions for elements)
const TABLE = {
    // Flipper positions
    leftFlipper: { x: 110, y: 620 },
    rightFlipper: { x: 210, y: 620 },
    flipperWidth: 80,
    flipperHeight: 15,

    // Bumper positions (3 bumpers in triangle formation)
    bumpers: [
        { x: 200, y: 200, radius: 30 },
        { x: 130, y: 280, radius: 25 },
        { x: 270, y: 280, radius: 25 }
    ],

    // Slingshot positions
    leftSlingshot: { x: 70, y: 520 },
    rightSlingshot: { x: 330, y: 520 },

    // Target positions
    targets: [
        { x: 80, y: 150, w: 15, h: 40 },
        { x: 305, y: 150, w: 15, h: 40 },
        { x: 140, y: 100, w: 40, h: 15 },
        { x: 220, y: 100, w: 40, h: 15 }
    ],

    // Plunger position
    plunger: { x: 375, y: 600 },

    // Ball spawn position
    ballSpawn: { x: 370, y: 550 },

    // Drain area
    drainY: 680,

    // Wall segments defining the table shape
    walls: [
        // Left wall
        { x1: 20, y1: 0, x2: 20, y2: 550 },
        { x1: 20, y1: 550, x2: 60, y2: 600 },
        { x1: 60, y1: 600, x2: 60, y2: 650 },

        // Right wall - STOPS at y:120 to create opening for ball to enter from plunger lane
        { x1: 340, y1: 120, x2: 340, y2: 550 },
        { x1: 340, y1: 550, x2: 310, y2: 600 },
        { x1: 310, y1: 600, x2: 310, y2: 650 },

        // Plunger lane outer wall (right side of plunger)
        { x1: 380, y1: 50, x2: 380, y2: 650 },

        // Top deflector curve - guides ball LEFT into play area
        // Ball launches up, hits this curve, deflects down-left into main area
        { x1: 380, y1: 50, x2: 370, y2: 30 },     // Start curving left
        { x1: 370, y1: 30, x2: 350, y2: 15 },     // Continue curve
        { x1: 350, y1: 15, x2: 320, y2: 10 },     // Apex of curve
        { x1: 320, y1: 10, x2: 280, y2: 20 },     // Deflect down-left into play area

        // Top wall
        { x1: 20, y1: 0, x2: 280, y2: 0 },
        { x1: 280, y1: 0, x2: 280, y2: 20 },      // Connects top wall to deflector curve

        // Inner plunger lane wall - creates the lane but STOPS at y:120
        // This leaves a gap at top for ball to exit into main area
        { x1: 350, y1: 120, x2: 350, y2: 650 }
    ]
};

// Utility functions

/**
 * Constrain a value to a given range
 * @param {number} value - The value to constrain
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} The clamped value
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Calculate Euclidean distance between two points
 * @param {number} x1 - First point x coordinate
 * @param {number} y1 - First point y coordinate
 * @param {number} x2 - Second point x coordinate
 * @param {number} y2 - Second point y coordinate
 * @returns {number} Distance between the points
 */
function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Generate a random float within a range
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (exclusive)
 * @returns {number} Random float in range
 */
function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Generate a random integer within a range
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {number} Random integer in range
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 * @param {number} radians - Angle in radians
 * @returns {number} Angle in degrees
 */
function radToDeg(radians) {
    return radians * (180 / Math.PI);
}

// Local storage helpers for high score

/**
 * Save high score to local storage
 * @param {number} score - The high score to save
 */
function saveHighScore(score) {
    try {
        localStorage.setItem('pinball_highscore', score.toString());
    } catch (e) {
        // Local storage may be unavailable in some contexts
        console.warn('Unable to save high score:', e);
    }
}

/**
 * Load high score from local storage
 * @returns {number} The saved high score, or 0 if none exists
 */
function loadHighScore() {
    try {
        const saved = localStorage.getItem('pinball_highscore');
        return saved ? parseInt(saved, 10) : 0;
    } catch (e) {
        // Local storage may be unavailable in some contexts
        console.warn('Unable to load high score:', e);
        return 0;
    }
}

/**
 * Format a score number with commas for display
 * @param {number} score - The score to format
 * @returns {string} Formatted score string (e.g., "1,234,567")
 */
function formatScore(score) {
    return score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
