import {
  waitForElement,
  getPrimaryClassIdentifier,
  getActorKnownSpellNames,
  decorateKnownSpells
} from "./browser-utils.js";

import { getCantripLearnCount } from "./spell-learning-rules.js";

export async function openCantripBrowser(actor) {
  const classId = getPrimaryClassIdentifier(actor);
  const maxPicks = getCantripLearnCount(actor);
  const knownNames = getActorKnownSpellNames(actor);

  const locked = {
    documentClass: "Item",
    types: new Set(["spell"]),
    additional: { level: { min: 0, max: 0 } }
  };

  const selectPromise = dnd5e.applications.CompendiumBrowser.select({
    filters: { locked },
    selection: { max: maxPicks }
  });

  const root = await waitForElement(".compendium-browser");
  await waitForElement("li.item", root);

  decorateKnownSpells(root, knownNames);

  const observer = new MutationObserver(() => {
    decorateKnownSpells(root, knownNames);
  });
  observer.observe(root, { childList: true, subtree: true });

  if (classId) {
    const selector = `filter-state[name="additional.spelllist.class:${classId}"]`;
    await waitForElement(selector, root);
    const el = root.querySelector(selector);
    if (el) el.click();
  }

  const selected = await selectPromise;
  if (!selected?.size) return;

  const spells = await Promise.all([...selected].map(uuid => fromUuid(uuid)));
  const created = spells.map(spell => game.items.fromCompendium(spell));
  await actor.createEmbeddedDocuments("Item", created);
}