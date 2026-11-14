/**
 * Place a measured template from a Range data model
 * @param {Range} range
 * @param {Object} [opts={}] options
 * @param {foundry.documents.Actor} [opts.actor=null] Actor that owns the template
 * @param {Record<string, unknown>} [opts.flags={}] Flag data. Can include module flags
 * @returns {Promise<foundry.documents.MeasuredTemplateDocument>}
 * @deprecated Use RegionLayer#placeRegion directly instead
 */
export async function placeTemplate(range, { actor = null, flags = {} } = {}) {
  foundry.utils.logCompatibilityWarning(
    "hellpiercers.util.placeTemplate is deprecated. Use RegionLayer#placeRegion directly instead.",
    { since: "14", once: true, until: "14" }
  );
  range.modifiers ??= {};
  range.modifiers.scale ??= actor?.system.scale;

  const originalLayer = canvas.activeLayer;
  const region = await canvas.regions.placeRegion({
    name: "Measured Template",
    shapes: range.getRegionShapes(),
    visibility: CONST.REGION_VISIBILITY.ALWAYS,
    color: game.user.color,
    flags,
  });
  originalLayer.activate();
  return region;
}

import.meta.hot?.accept(({ placeTemplate }) => {
  hellpiercers.util.placeTemplate = placeTemplate;
});
