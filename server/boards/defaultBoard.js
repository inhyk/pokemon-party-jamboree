import { TILE_TYPES } from 'shared';

/**
 * Default board layout - 30 tiles in a circular/rectangular path
 * Coordinates use grid positions (100-700 range) for visual layout
 */
export default [
  // Starting area (top-left corner)
  { id: 0, type: TILE_TYPES.START, x: 100, y: 100, next: [1], label: 'START' },
  { id: 1, type: TILE_TYPES.BLUE, x: 200, y: 100, next: [2] },
  { id: 2, type: TILE_TYPES.BLUE, x: 300, y: 100, next: [3] },
  { id: 3, type: TILE_TYPES.RED, x: 400, y: 100, next: [4] },

  // Top-right corner with junction
  { id: 4, type: TILE_TYPES.JUNCTION, x: 500, y: 100, next: [5, 15], label: 'Path Split' },

  // Upper path (right side going down)
  { id: 5, type: TILE_TYPES.BLUE, x: 600, y: 100, next: [6] },
  { id: 6, type: TILE_TYPES.ITEM, x: 700, y: 200, next: [7] },
  { id: 7, type: TILE_TYPES.BLUE, x: 700, y: 300, next: [8] },
  { id: 8, type: TILE_TYPES.EVENT, x: 700, y: 400, next: [9] },
  { id: 9, type: TILE_TYPES.BLUE, x: 700, y: 500, next: [10] },

  // Bottom-right corner
  { id: 10, type: TILE_TYPES.STAR, x: 700, y: 600, next: [11], label: 'STAR' },
  { id: 11, type: TILE_TYPES.BLUE, x: 600, y: 600, next: [12] },
  { id: 12, type: TILE_TYPES.RED, x: 500, y: 600, next: [13] },
  { id: 13, type: TILE_TYPES.SHOP, x: 400, y: 600, next: [14] },
  { id: 14, type: TILE_TYPES.BLUE, x: 300, y: 600, next: [22] },

  // Lower path (from junction - alternative route)
  { id: 15, type: TILE_TYPES.BLUE, x: 500, y: 200, next: [16] },
  { id: 16, type: TILE_TYPES.RED, x: 500, y: 300, next: [17] },
  { id: 17, type: TILE_TYPES.BOWSER, x: 500, y: 400, next: [18], label: 'BOWSER' },
  { id: 18, type: TILE_TYPES.BLUE, x: 400, y: 500, next: [19] },
  { id: 19, type: TILE_TYPES.EVENT, x: 300, y: 500, next: [22] },

  // Paths merge
  { id: 22, type: TILE_TYPES.JUNCTION, x: 200, y: 600, next: [23], label: 'Paths Merge' },

  // Bottom-left going up
  { id: 23, type: TILE_TYPES.BLUE, x: 100, y: 600, next: [24] },
  { id: 24, type: TILE_TYPES.RED, x: 100, y: 500, next: [25] },
  { id: 25, type: TILE_TYPES.BLUE, x: 100, y: 400, next: [26] },
  { id: 26, type: TILE_TYPES.EVENT, x: 100, y: 300, next: [27] },

  // Left side going back to start
  { id: 27, type: TILE_TYPES.ITEM, x: 100, y: 200, next: [28] },
  { id: 28, type: TILE_TYPES.BLUE, x: 150, y: 150, next: [29] },
  { id: 29, type: TILE_TYPES.SHOP, x: 200, y: 200, next: [30] },
  { id: 30, type: TILE_TYPES.RED, x: 150, y: 250, next: [31] },
  { id: 31, type: TILE_TYPES.BLUE, x: 100, y: 150, next: [0] }, // Loops back to start
];
