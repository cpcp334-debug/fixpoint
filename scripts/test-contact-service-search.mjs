import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Exercise the actual component and its handlers with deterministic React state.
const source = readFileSync(new URL("../src/components/forms/ServiceModeField.tsx", import.meta.url), "utf8");
let state = [], cursor = 0, checks = 0;
const runtime = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
const react = { useState: (initial) => {
  const index = cursor++;
  if (!(index in state)) state[index] = initial;
  return [state[index], (value) => { state[index] = typeof value === "function" ? value(state[index]) : value; }];
} };
const componentModule = { exports: {} };
new Function("require", "exports", ts.transpileModule(source, { compilerOptions: {
  jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS,
} }).outputText)((name) => name === "react" ? react : name === "react/jsx-runtime" ? runtime : { fieldControlClass: "field", fieldLabelClass: "label" }, componentModule.exports);
const component = componentModule.exports.ServiceModeField;
function nodes(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (typeof node.type === "function") return nodes(node.type(node.props));
  return [node, ...nodes(node.props?.children)];
}
const text = (node) => Array.isArray(node) ? node.map(text).join("") : typeof node === "object" && node ? text(node.props?.children) : node == null ? "" : String(node);
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const services = [{ slug: "ac-gas-check", name: "فحص غاز التكييف (AC Gas Check)" }, { slug: "wood-painting", name: "دهان الأخشاب (Wood Painting)" }, { slug: "circuit-installation", name: "تركيب الدائرة (Circuit Installation)" }];
for (const locale of ["en", "ar"]) {
  const messages = JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8")).Contact;
  const props = { idPrefix: "contact-lead", services, labels: { service: "Service", chooseOur: "Choose", writeOwn: "Custom", writePlaceholder: "Describe", pickOne: "Pick" }, search: { label: messages.serviceSearch, clear: messages.serviceSearchClear, empty: messages.serviceSearchEmpty, shown: messages.serviceSearchShown, selected: messages.serviceSearchSelected } };
  state = [];
  let tree;
  const render = () => { cursor = 0; tree = nodes(component(props)); };
  const search = () => tree.find(x => x.type === "input" && x.props.type === "search");
  const inputs = () => tree.filter(x => x.type === "input" && x.props.name === "serviceSlugs");
  const visible = () => tree.filter(x => x.type === "label" && x.props.className !== "hidden" && x.props.htmlFor?.includes("-svc-")).map(x => x.props.htmlFor);
  const change = (value) => { search().props.onChange({ target: { value } }); render(); };
  const select = (slug) => { inputs().find(x => x.props.value === slug).props.onChange(); render(); };
  const successfulValues = () => inputs().filter(x => x.props.checked && !x.props.disabled).map(x => x.props.value);
  const primary = () => tree.find(x => x.type === "input" && x.props.name === "serviceSlug").props.value;
  render();
  eq(visible().length, 3);
  eq(search().props.name, undefined);
  eq(search().props["aria-describedby"], "contact-lead-service-results");
  let prevented = false;
  search().props.onKeyDown({ key: "Enter", preventDefault() { prevented = true; } });
  eq(prevented, true);
  prevented = false;
  search().props.onKeyDown({ key: "a", preventDefault() { prevented = true; } });
  eq(prevented, false);
  change("  GAS CHECK  "); eq(visible(), ["contact-lead-svc-ac-gas-check"]);
  select("ac-gas-check");
  change("الأخشاب"); eq(visible(), ["contact-lead-svc-wood-painting"]);
  select("wood-painting");
  eq(successfulValues(), ["ac-gas-check", "wood-painting"]);
  eq(primary(), "ac-gas-check");
  eq(inputs().length, 3);
  change("no-such-service"); eq(visible(), []);
  eq(successfulValues(), ["ac-gas-check", "wood-painting"]);
  eq(tree.some(x => x.type === "p" && text(x) === messages.serviceSearchEmpty), true);
  const status = tree.find(x => x.props?.role === "status");
  eq(text(status), `0 ${messages.serviceSearchShown} · 2 ${messages.serviceSearchSelected}`);
  const clear = tree.find(x => x.type === "button" && text(x) === messages.serviceSearchClear);
  eq(clear.props.type, "button"); clear.props.onClick(); render();
  eq(visible().length, 3); eq(successfulValues(), ["ac-gas-check", "wood-painting"]);
  eq(inputs().map(x => x.props.value), services.map(x => x.slug));
  select("ac-gas-check"); eq(primary(), "wood-painting");
  change("gas");
  tree.find(x => x.type === "button" && text(x) === "Custom").props.onClick(); render();
  eq(search(), undefined); eq(inputs(), []); eq(primary(), "");
  const other = tree.find(x => x.type === "input" && x.props.name === "serviceOther");
  other.props.onChange({ target: { value: "A custom package" } }); render();
  eq(tree.find(x => x.props.name === "serviceOther").props.value, "A custom package");
  tree.find(x => x.type === "button" && text(x) === "Choose").props.onClick(); render();
  eq(search().props.value, ""); eq(visible().length, 3); eq(successfulValues(), []);
  state = []; props.search = undefined; props.defaultSlug = "circuit-installation"; render();
  eq(search(), undefined); eq(primary(), "circuit-installation"); eq(successfulValues(), ["circuit-installation"]);
}
const lead = readFileSync(new URL("../src/components/forms/LeadForm.tsx", import.meta.url), "utf8");
assert.match(lead, /search=\{mode === "contact" \?/); checks++;
console.log(`${checks} Contact service-search assertions passed`);
