export const openPhysicalConfirmDialog = async (actor, items) => {

  // ---------------------------------------------------------
  // GROUP ITEMS BY CATEGORY
  // ---------------------------------------------------------
  const groups = {};

  function addToGroup(key, item) {
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }

  for (const item of items) {
    const type = item.type;
    const sys = item.system ?? {};
    let key = "misc";

    if (type === "weapon") key = "weapons";
    else if (type === "equipment") {
      const cat = sys.armor?.type ?? sys.type?.value;
      if (["light", "medium", "heavy", "shield"].includes(cat)) key = "armor";
      else key = "gear";
    }
    else if (type === "tool") key = "tools";
    else if (type === "consumable") key = "consumables";
    else if (type === "ammo") key = "ammo";
    else if (type === "container") key = "containers";

    addToGroup(key, item);
  }

  const groupLabels = {
    weapons: "Weapons",
    armor: "Armor",
    tools: "Tools",
    gear: "Adventuring Gear",
    consumables: "Consumables",
    ammo: "Ammunition",
    containers: "Containers",
    misc: "Miscellaneous"
  };

  // ---------------------------------------------------------
  // RENDER TEMPLATE
  // ---------------------------------------------------------
  const html = await foundry.applications.handlebars.renderTemplate(
    "modules/item-browser/templates/physical-confirm.hbs",
    {
      actorName: actor.name,
      groups,
      groupLabels
    }
  );

  const selectedUUIDs = items.map(i => i.uuid);

  // ---------------------------------------------------------
  // OPEN DIALOG
  // ---------------------------------------------------------
  const result = await foundry.applications.api.Dialog.prompt({
    id: "physical-confirm-dialog",
    content: html,

    buttons: [
      { label: "Add Items", value: "add", type: "submit", action: "add" },
      { label: "Cancel", value: "cancel", action: "ok" }
    ],

    window: { title: `Add Items to ${actor.name}` },

    options: {
      closeOnSubmit: true,
      submitOnChange: false,
      classes: ["physical-confirm-dialog", "dnd5e2"]
    },

    render: async () => {
      const root = document.querySelector("#physical-confirm-dialog");
      if (!root) return;

      const totalEl = root.querySelector(".physical-total-value");
      const freeToggle = root.querySelector(".slide-toggle.free-mode-toggle");
      const modeLabel = root.querySelector(".mode-label");

      // -----------------------------
      // MODE LABEL
      // -----------------------------
      function updateModeLabel() {
        modeLabel.textContent = freeToggle.classList.contains("checked")
          ? "Free Mode"
          : "Buy Mode";
      }

      // -----------------------------
      // APPLY MODE
      // -----------------------------
      function applyMode() {
        const free = freeToggle.classList.contains("checked");

        root.querySelectorAll(".price-badge").forEach(b => {
          b.style.display = free ? "none" : "";
        });

        totalEl.closest(".physical-total")?.style.setProperty(
          "display",
          free ? "none" : ""
        );
      }

      // -----------------------------
      // TOTAL CALCULATION
      // -----------------------------
      function updateTotal() {
        if (freeToggle.classList.contains("checked")) {
          totalEl.textContent = "";
          return;
        }

        let total = 0;

        root.querySelectorAll(".physical-row").forEach(row => {
          const check = row.querySelector(".physical-check");
          if (!check?.checked) return;

          const qty = Number(row.querySelector(".qty-input")?.value || 1);
          const badge = row.querySelector(".price-badge");
          const price = Number(badge.dataset.price || 0);

          total += price * qty;
        });

        totalEl.textContent = `${total} gp`;
      }

      // -----------------------------
      // CHECKBOX SELECTION
      // -----------------------------
      root.querySelectorAll(".physical-check").forEach(check => {
        check.addEventListener("click", event => {
          event.stopPropagation();

          const row = check.closest(".physical-row");
          const uuid = row.dataset.uuid;

          if (check.checked) {
            if (!selectedUUIDs.includes(uuid)) selectedUUIDs.push(uuid);
          } else {
            const idx = selectedUUIDs.indexOf(uuid);
            if (idx !== -1) selectedUUIDs.splice(idx, 1);
          }

          updateTotal();
        });
      });

      // -----------------------------
      // QUANTITY INPUT (typing)
      // -----------------------------
      root.querySelectorAll(".qty-input").forEach(input => {
        input.addEventListener("input", () => updateTotal());
      });

      // -----------------------------
      // PLUS / MINUS BUTTONS
      // -----------------------------
      root.querySelectorAll(".physical-qty .adjustment-button").forEach(btn => {
        btn.addEventListener("click", event => {
          event.stopPropagation();

          const action = btn.dataset.action;
          const wrapper = btn.closest(".physical-qty");
          const input = wrapper.querySelector(".qty-input");

          let value = Number(input.value) || 1;

          if (action === "increase") value++;
          if (action === "decrease") value = Math.max(1, value - 1);

          input.value = value;

          updateTotal();
        });
      });

      // -----------------------------
      // OPEN ITEM SHEET
      // -----------------------------
      root.querySelectorAll(".physical-item").forEach(li => {
        li.addEventListener("click", async () => {
          const item = await fromUuid(li.dataset.uuid);
          item?.sheet?.render(true);
        });
      });

      // -----------------------------
      // INITIALIZE CHECKBOXES
      // -----------------------------
      root.querySelectorAll(".physical-check").forEach(check => {
        check.checked = true;
      });

      // -----------------------------
      // MODE TOGGLE
      // -----------------------------
      freeToggle.addEventListener("click", () => {
        freeToggle.classList.toggle("checked");
        applyMode();
        updateTotal();
        updateModeLabel();
      });

      applyMode();
      updateTotal();
      updateModeLabel();

      // -----------------------------
      // FORM SUBMIT VALIDATION
      // -----------------------------
      setTimeout(() => {
        const app = root.closest(".app");
        if (!app) return;

        const form = app.querySelector("form");
        if (!form) return;

        form.addEventListener("submit", async event => {
          if (freeToggle.classList.contains("checked")) return;

          let totalCostCp = 0;

          for (const uuid of selectedUUIDs) {
            const item = await fromUuid(uuid);
            if (!item) continue;

            const row = root.querySelector(`.physical-row[data-uuid="${uuid}"]`);
            const qty = Number(row.querySelector(".qty-input")?.value || 1);

            const price = item.system.price?.value ?? 0;
            const denom = item.system.price?.denomination ?? "gp";

            const multipliers = { pp: 1000, gp: 100, ep: 50, sp: 10, cp: 1 };
            const factor = multipliers[denom] ?? 100;

            totalCostCp += (price * factor) * qty;
          }

          const c = actor.system.currency;
          const actorCp =
            (c.pp * 1000) +
            (c.gp * 100) +
            (c.ep * 50) +
            (c.sp * 10) +
            c.cp;

          if (actorCp < totalCostCp) {
            event.preventDefault();
            event.stopImmediatePropagation();
            ui.notifications.warn(`${actor.name} cannot afford these items.`);
            return false;
          }
        });
      }, 0);
    }
  });

  if (result !== "add") return;

  // ---------------------------------------------------------
  // DETERMINE MODE
  // ---------------------------------------------------------
  const root = document.querySelector("#physical-confirm-dialog");
  const freeToggle = root?.querySelector(".slide-toggle.free-mode-toggle");
  const freeMode = freeToggle?.classList.contains("checked");

  // ---------------------------------------------------------
  // FREE MODE
  // ---------------------------------------------------------
  if (freeMode) {
    const docs = [];

    for (const uuid of selectedUUIDs) {
      const item = await fromUuid(uuid);
      if (!item) continue;

      const row = document.querySelector(
        `#physical-confirm-dialog .physical-row[data-uuid="${uuid}"]`
      );
      const qty = Number(row?.querySelector(".qty-input")?.value || 1);

      const data = item.toObject();
      data.system.quantity = qty;

      docs.push(data);
    }

    if (docs.length) {
      await actor.createEmbeddedDocuments("Item", docs);
    }

    return;
  }

  // ---------------------------------------------------------
  // BUY MODE
  // ---------------------------------------------------------
  let totalCostCp = 0;

  for (const uuid of selectedUUIDs) {
    const item = await fromUuid(uuid);
    if (!item) continue;

    const row = document.querySelector(
      `#physical-confirm-dialog .physical-row[data-uuid="${uuid}"]`
    );
    const qty = Number(row?.querySelector(".qty-input")?.value || 1);

    const price = item.system.price?.value ?? 0;
    const denom = item.system.price?.denomination ?? "gp";

    const multipliers = { pp: 1000, gp: 100, ep: 50, sp: 10, cp: 1 };
    const factor = multipliers[denom] ?? 100;

    totalCostCp += (price * factor) * qty;
  }

  const c = actor.system.currency;
  const actorCp =
    (c.pp * 1000) +
    (c.gp * 100) +
    (c.ep * 50) +
    (c.sp * 10) +
    c.cp;

  if (actorCp < totalCostCp) {
    ui.notifications.warn(`${actor.name} cannot afford these items.`);
    return;
  }

  let remaining = actorCp - totalCostCp;

  const newCurrency = {
    pp: Math.floor(remaining / 1000),
    gp: Math.floor((remaining % 1000) / 100),
    ep: Math.floor((remaining % 100) / 50),
    sp: Math.floor((remaining % 50) / 10),
    cp: Math.floor(remaining % 10)
  };

  await actor.update({ "system.currency": newCurrency });

  const docs = [];

  for (const uuid of selectedUUIDs) {
    const item = await fromUuid(uuid);
    if (!item) continue;

    const row = document.querySelector(
      `#physical-confirm-dialog .physical-row[data-uuid="${uuid}"]`
    );
    const qty = Number(row?.querySelector(".qty-input")?.value || 1);

    const data = item.toObject();
    data.system.quantity = qty;

    docs.push(data);
  }

  if (docs.length) {
    await actor.createEmbeddedDocuments("Item", docs);
  }
};