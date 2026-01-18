export function waitForElement(selector, root = document) {
  return new Promise(resolve => {
    const existing = root.querySelector(selector);
    if (existing) return resolve(existing);

    const observer = new MutationObserver(() => {
      const el = root.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(root, { childList: true, subtree: true });
  });
}

export function getPrimaryClassIdentifier(actor) {
  const ids = Object.keys(actor.classes || {});
  if (!ids.length) return null;

  const classItem = actor.classes[ids[0]];
  return classItem?.system?.identifier || null;
}

export function getActorKnownSpellNames(actor) {
  return new Set(
    actor.items
      .filter(i => i.type === "spell")
      .map(i => i.name.trim().toLowerCase())
  );
}

export function decorateKnownSpells(root, knownNames) {
  const rows = root.querySelectorAll("li.item");

  for (const row of rows) {
    const checkbox = row.querySelector("dnd5e-checkbox[name='selected']");
    if (!checkbox) continue;

    const nameEl = row.querySelector(".item-name .title");
    if (!nameEl) continue;

    const spellName = nameEl.textContent.trim().toLowerCase();
    if (!knownNames.has(spellName)) continue;

    // Tint row
    row.classList.add("dndst-known-spell");

    // Remove checkbox
    checkbox.remove();

    // Add badge
    if (!row.querySelector(".known-badge")) {
      const badge = document.createElement("span");
      badge.classList.add("known-badge");
      badge.textContent = "Known";

      const controls = row.querySelector(".item-controls");
      if (controls) controls.appendChild(badge);
    }
  }
}