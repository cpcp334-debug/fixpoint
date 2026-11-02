import assert from "node:assert/strict";
import { serviceChoiceLabels } from "../src/lib/catalog/service-choice-labels";

const choices = [
  { slug: "ac-gas-check", name: "التكييف الغاز", englishName: "AC Gas Check" },
  { slug: "ac-gas-recharge", name: "التكييف الغاز", englishName: "AC Gas Recharge" },
  { slug: "inspection", name: "فحص التكييف", englishName: "AC Inspection" },
];
const before = JSON.stringify(choices);
const labelled = serviceChoiceLabels(choices, "ar");
assert.deepEqual(labelled.map((item) => item.slug), choices.map((item) => item.slug));
assert.equal(new Set(labelled.map((item) => item.name)).size, 3);
assert.equal(labelled[0].name, "التكييف الغاز (AC Gas Check)");
assert.equal(labelled[1].name, "التكييف الغاز (AC Gas Recharge)");
assert.equal(labelled[2].name, choices[2].name);
assert.equal(JSON.stringify(choices), before);
assert.deepEqual(serviceChoiceLabels(labelled, "ar"), labelled);
for (const locale of ["en", "fr"]) {
  assert.deepEqual(serviceChoiceLabels(choices, locale), choices.map(({ slug, name }) => ({ slug, name })));
}
for (const englishName of [null, undefined, "", " REVIEW_REQUIRED: translation ", "متكرر"]) {
  const unresolved = [{ slug: "a", name: "متكرر", englishName }, { slug: "b", name: "متكرر", englishName }];
  assert.deepEqual(serviceChoiceLabels(unresolved, "ar"), unresolved.map(({ slug, name }) => ({ slug, name })));
}
const whitespace = choices.map((item, index) => ({ ...item, name: index === 0 ? ` ${item.name} ` : item.name }));
assert(serviceChoiceLabels(whitespace, "ar")[0].name.includes("AC Gas Check"));
assert.deepEqual(serviceChoiceLabels([], "ar"), []);
console.log("Service choices: Arabic collisions, unchanged unique/English labels, identifier/order preservation, missing/ambiguous fallback, whitespace, idempotency and immutability passed.");
