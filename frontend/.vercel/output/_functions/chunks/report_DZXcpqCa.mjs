import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { d as renderHead, i as renderComponent, l as renderTemplate } from "./server_BffztlUG.mjs";
import { t as createComponent } from "./compiler_Bkj3Nzyj.mjs";
import { t as SightingForm } from "./SightingForm_CDpCFuC5.mjs";
//#region src/pages/report.astro
var report_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Report,
	file: () => $$file,
	url: () => $$url
});
var $$Report = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`<html lang="en" data-astro-cid-sdn7xbvw><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Archive Central · Sighting Report</title>${renderHead($$result)}</head><body data-astro-cid-sdn7xbvw>${renderComponent($$result, "SightingForm", SightingForm, {
		"client:load": true,
		"data-astro-cid-sdn7xbvw": true,
		"client:component-hydration": "load",
		"client:component-path": "T:/CODE/JSProjects/Bestiary/frontend/src/components/SightingForm.tsx",
		"client:component-export": "default"
	})}</body></html>`;
}, "T:/CODE/JSProjects/Bestiary/frontend/src/pages/report.astro", void 0);
var $$file = "T:/CODE/JSProjects/Bestiary/frontend/src/pages/report.astro";
var $$url = "/report";
//#endregion
//#region \0virtual:astro:page:src/pages/report@_@astro
var page = () => report_exports;
//#endregion
export { page };
