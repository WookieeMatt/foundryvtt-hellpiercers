/** @import * as hookEvents from "@client/hooks.mjs"; */

/** @type {typeof hookEvents.canvasReady} */
export function fixDerivedTokenBars(canvas) {
  for (const token of canvas.scene.tokens) token._prepareBars();
}

import.meta.hot?.accept(({ fixDerivedTokenBars }) => Hooks.on("canvasReady", fixDerivedTokenBars));
import.meta.hot?.dispose(() => Hooks.off("canvasReady", fixDerivedTokenBars));
