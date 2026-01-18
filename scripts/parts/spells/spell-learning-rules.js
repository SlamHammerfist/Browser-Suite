export function getSpellcastingClasses(actor) {
  const classes = actor.classes;
  if (!classes) return [];

  return Object.values(classes)
    .filter(cls => {
      const prog = cls.system?.spellcasting?.progression;
      return prog && prog !== "none";
    })
    .map(cls => ({
      id: cls.system.identifier?.toLowerCase() ?? null,
      level: cls.system.levels ?? 1,
      progression: cls.system.spellcasting.progression
    }));
}

export function getPrimaryClassId(actor) {
  const classes = getSpellcastingClasses(actor);
  if (!classes.length) return null;
  return classes[0].id;
}

export function isPreparedCaster(classId) {
  if (!classId) return false;
  return ["cleric", "druid", "paladin", "ranger"].includes(classId);
}

const LeveledSpellLearnTable = {
  wizard:    { 1: 6, default: 2 },
  sorcerer:  { 1: 2, default: 1 },
  bard:      { 1: 4, default: 2 },
  warlock:   { 1: 2, default: 1 },
  artificer: { 1: 2, default: 2 },

  cleric:    { default: 0 },
  druid:     { default: 0 },
  paladin:   { default: 0 },
  ranger:    { default: 0 }
};

const CantripLearnTable = {
  wizard:    { 1: 3, 4: 1, 10: 1, default: 0 },
  sorcerer:  { 1: 4, 4: 1, 10: 1, default: 0 },
  bard:      { 1: 2, 4: 1, 10: 1, default: 0 },
  warlock:   { 1: 2, 4: 1, 10: 1, default: 0 },
  artificer: { 1: 2, 10: 1, default: 0 },

  cleric:    { 1: 3, 4: 1, default: 0 },
  druid:     { 1: 2, 4: 1, default: 0 },

  paladin:   { default: 0 },
  ranger:    { default: 0 }
};

export function getCantripLearnCount(actor) {
  const classes = getSpellcastingClasses(actor);
  if (!classes.length) return 0;

  let total = 0;

  for (const cls of classes) {
    const rules = CantripLearnTable[cls.id];
    if (!rules) continue;

    const gained = rules[cls.level] ?? rules.default ?? 0;

    total += Math.max(1, gained);
  }

  return total;
}

export function getLeveledSpellLearnCount(actor) {
  const classes = getSpellcastingClasses(actor);
  if (!classes.length) return 0;

  let total = 0;

  for (const cls of classes) {
    
    if (isPreparedCaster(cls.id)) continue;

    const rules = LeveledSpellLearnTable[cls.id];
    if (!rules) continue;

    const gained = rules[cls.level] ?? rules.default ?? 0;
    total += gained;
  }

  return total;
}