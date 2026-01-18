import { injectSpellBrowserButtons } from "./parts/spells/spellButton.js";
import { injectPhysicalBrowserButton } from "./parts/physical/physicalButton.js";

Hooks.on("renderCharacterActorSheet", (sheet, html) => {
  const jq = $(html);
  injectSpellBrowserButtons(sheet, jq);
  injectPhysicalBrowserButton(sheet, jq);
});