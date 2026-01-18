import {
  waitForElement,
  getPrimaryClassIdentifier,
  getActorKnownSpellNames,
  decorateKnownSpells
} from "./browser-utils.js";

import { getLeveledSpellLearnCount } from "./spell-learning-rules.js";

export async function openLeveledSpellBrowser(actor) {
  const spellData = Object.values(actor.system.spells || {}).filter(i => i.max);
  if (!spellData.length) {
    ui.notifications.info(`${actor.name} doesn't have any spell slots.`);
    return;
  }

  const maxLevel = Math.max(...spellData.map(i => i.level));

  const classId = getPrimaryClassIdentifier(actor);
  const maxPicks = getLeveledSpellLearnCount(actor);
  const knownNames = getActorKnownSpellNames(actor);

  const filters = {
    locked: {
      documentClass: "Item",
      types: new Set(["spell"])
    },
    initial: {
      additional: {
        level: {
          min: 1,
          max: maxLevel
        }
      }
    }
  };

  const selectPromise = dnd5e.applications.CompendiumBrowser.select({
    filters,
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