import { openPhysicalConfirmDialog } from "./PhysicalConfirmDialog.js";

export async function openPhysicalBrowser(actor) {
  if (!actor) return;

  Hooks.once("renderCompendiumBrowser", (app, html) => {
    html[0]?.classList.add("physical-browser-mode");
  });

  const selected = await dnd5e.applications.CompendiumBrowser.select({
    tab: "physical",
    filters: {
      documentClass: "Item",
      types: ["physical"]
    },
    selection: {
      enabled: true,
      max: Infinity
    }
  });

  if (!(selected instanceof Set) || selected.size === 0) return;

  const docs = await Promise.all(
    [...selected].map(async uuid => {
      try {
        return await fromUuid(uuid);
      } catch (err) {
        console.warn("dnd-sheet-tweaks | Failed to resolve UUID:", uuid, err);
        return null;
      }
    })
  );

  const items = docs.filter(Boolean);
  if (!items.length) return;

  openPhysicalConfirmDialog(actor, items);
}