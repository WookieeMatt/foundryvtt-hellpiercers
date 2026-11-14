/**
 * Grid adjacency helpers for TACCOM rules that depend on neighbouring units (Blazing, Pain Aura,
 * Provoke, Swarms). All of these assume a square grid, which is what the rules are written for.
 */

/**
 * @param {foundry.canvas.placeables.Token | foundry.documents.TokenDocument} token
 * @returns {foundry.canvas.placeables.Token | null}
 */
function toPlaceable(token) {
  const placeable = token?.object ?? token;
  return placeable?.bounds ? placeable : null;
}

/** True if the canvas is ready and uses a square grid. */
export function hasSquareGrid() {
  return !!canvas?.ready && canvas.grid?.isSquare === true;
}

/**
 * The size in whole grid squares between two token rectangles, measured per axis.
 * `0` on both axes means the tokens touch (including at a corner); `{x: 0, y: 1}` means there is a
 * one-square gap vertically while the tokens overlap horizontally.
 * @param {foundry.canvas.placeables.Token} a
 * @param {foundry.canvas.placeables.Token} b
 * @returns {{ x: number, y: number }}
 */
export function squareGap(a, b) {
  const { sizeX, sizeY } = canvas.grid;
  const ra = a.bounds;
  const rb = b.bounds;
  const gapX = Math.max(rb.left - ra.right, ra.left - rb.right, 0);
  const gapY = Math.max(rb.top - ra.bottom, ra.top - rb.bottom, 0);
  return { x: Math.round(gapX / sizeX), y: Math.round(gapY / sizeY) };
}

/**
 * Chebyshev distance in squares between the nearest edges of two tokens. `0` = touching.
 * @param {foundry.canvas.placeables.Token | foundry.documents.TokenDocument} a
 * @param {foundry.canvas.placeables.Token | foundry.documents.TokenDocument} b
 * @returns {number}
 */
export function gapDistance(a, b) {
  const pa = toPlaceable(a);
  const pb = toPlaceable(b);
  if (!pa || !pb || !hasSquareGrid()) return Number.POSITIVE_INFINITY;
  const gap = squareGap(pa, pb);
  return Math.max(gap.x, gap.y);
}

/**
 * Tokens that share an edge with the given token. Diagonal neighbours are not adjacent (p. 94).
 * @param {foundry.canvas.placeables.Token | foundry.documents.TokenDocument} token
 * @param {object} [options]
 * @param {boolean} [options.diagonal=false]  Also include tokens that only touch at a corner.
 * @param {(token: foundry.canvas.placeables.Token) => boolean} [options.filter]
 * @returns {foundry.canvas.placeables.Token[]}
 */
export function getAdjacentTokens(token, { diagonal = false, filter } = {}) {
  const origin = toPlaceable(token);
  if (!origin || !hasSquareGrid()) return [];
  const result = [];
  for (const other of canvas.tokens.placeables) {
    if (other === origin || (other.document.hidden && !game.user.isGM)) continue;
    const gap = squareGap(origin, other);
    if (gap.x > 0 || gap.y > 0) continue;
    if (!diagonal) {
      // Overlap on one axis and touching on the other = shared edge
      const a = origin.bounds;
      const b = other.bounds;
      const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (overlapX <= 0 && overlapY <= 0) continue; // corner contact only
    }
    if (filter && !filter(other)) continue;
    result.push(other);
  }
  return result;
}
