import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { b as createAstro, d as renderHead, f as addAttribute, i as renderComponent, l as renderTemplate } from "./server_BffztlUG.mjs";
import { t as createComponent } from "./compiler_Bkj3Nzyj.mjs";
import { t as SightingForm } from "./SightingForm_CDpCFuC5.mjs";
//#region src/pages/index.astro
var pages_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	url: () => ""
});
createAstro("https://astro.build");
var $$Index = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Index;
	return renderTemplate`<html lang="en"><head><meta charset="utf-8"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="icon" href="/favicon.ico"><meta name="viewport" content="width=device-width"><meta name="generator"${addAttribute(Astro.generator, "content")}><title>Archive Central · Sighting Report</title>${renderHead($$result)}</head><body>${renderComponent($$result, "SightingForm", SightingForm, {
		"client:load": true,
		"client:component-hydration": "load",
		"client:component-path": "T:/CODE/JSProjects/Bestiary/frontend/src/components/SightingForm.tsx",
		"client:component-export": "default"
	})}</body></html>`;
}, "T:/CODE/JSProjects/Bestiary/frontend/src/pages/index.astro", void 0);
var $$file = "T:/CODE/JSProjects/Bestiary/frontend/src/pages/index.astro";
//#endregion
//#region \0virtual:astro:page:src/pages/index@_@astro
var page = () => pages_exports;
//#endregion
export { page };
