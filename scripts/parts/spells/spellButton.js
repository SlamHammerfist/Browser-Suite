import { openCantripBrowser } from "./cantrip-browser.js";
import { openLeveledSpellBrowser } from "./leveled-browser.js";
import { isPreparedCaster, getPrimaryClassId } from "./spell-learning-rules.js";

export function injectSpellBrowserButtons(sheet, html) {
  const actor = sheet.actor;
  if (!actor || actor.type !== "character") return;

  const header = html.find(".spellcasting.card.primary .header");
  if (!header.length) return;

  if (header.find(".open-cantrip-browser, .open-leveled-browser").length) return;

  const classId = getPrimaryClassId(actor);
  const prepared = isPreparedCaster(classId);

  const radio = header.find(".radio-button");

  const cantripBtn = $(`
    <button type="button" class="open-cantrip-browser" data-tooltip="Learn Cantrip">
      <i class="fas fa-sparkles"></i>
    </button>
  `);

  let leveledBtn;

  if (prepared) {
    const maxPrepared = actor.system?.spells?.prepared?.max ?? 0;

    leveledBtn = $(`
      <button type="button" class="open-leveled-browser" data-tooltip="Prepare Spells">
        <i class="fas fa-book"></i> Prepare (${maxPrepared})
      </button>
    `);
  } else {
    leveledBtn = $(`
      <button type="button" class="open-leveled-browser" data-tooltip="Learn Spell">
        <i class="fas fa-book"></i>
      </button>
    `);
  }

  if (radio.length) {
    cantripBtn.insertBefore(radio);
    leveledBtn.insertBefore(radio);
  } else {
    header.append(cantripBtn);
    header.append(leveledBtn);
  }

  cantripBtn.on("click", () => openCantripBrowser(actor));
  leveledBtn.on("click", () => openLeveledSpellBrowser(actor));
}