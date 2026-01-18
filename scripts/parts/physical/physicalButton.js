import { openPhysicalBrowser } from "./physicalBrowser.js";

export function injectPhysicalBrowserButton(sheet, html) {
  const actor = sheet.actor;
  if (!actor || actor.type !== "character") return;

  const currencyEl = html[0].querySelector("section.currency");
  if (!currencyEl) return;

  if (currencyEl.querySelector(".open-physical-browser")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "open-physical-browser item-action unbutton always-interactive";
  btn.dataset.tooltip = "Buy Items";
  btn.innerHTML = `<i class="fa-solid fa-bag-shopping"></i>`;

  const firstButton = currencyEl.querySelector("button");
  if (firstButton) {
    currencyEl.insertBefore(btn, firstButton);
  } else {
    currencyEl.prepend(btn);
  }

  btn.addEventListener("click", () => openPhysicalBrowser(actor));
}