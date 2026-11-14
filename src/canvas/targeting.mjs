/**
 * Populate user targets based from a measured template.  Only works for
 * templates on gridded scenes.
 * @param {foundry.documents.RegionDocument} region
 */
export function setTargets(region) {
  /** @type {Set<string>} */
  const targets = canvas.tokens.quadtree
    .getObjects(region.object.bounds, {
      collisionTest: ({ t: token }) => {
        return token.document.visible && token.document.testInsideRegion(region);
      },
    })
    .map(t => t.id);
  canvas.tokens.setTargets(targets);
}

import.meta.hot?.accept(({ setTargets }) => {
  hellpiercers.util.setTargets = setTargets;
});
