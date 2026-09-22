import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { d as renderHead, i as renderComponent, l as renderTemplate } from "./server_BffztlUG.mjs";
import { t as createComponent } from "./compiler_Bkj3Nzyj.mjs";
//#region src/pages/map.astro
var map_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Map,
	file: () => $$file,
	url: () => $$url
});
var $$Map = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`<html lang="en" data-astro-cid-lcobthjc><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Live Sighting Map — The Apex Bestiary</title>${renderHead($$result)}</head><body data-astro-cid-lcobthjc>${renderComponent($$result, "BestiaryMap", null, {
		"client:only": "react",
		"data-astro-cid-lcobthjc": true,
		"client:component-hydration": "only",
		"client:component-path": "T:/CODE/JSProjects/Bestiary/frontend/src/components/BestiaryMap.tsx",
		"client:component-export": "default"
	})}</body></html>`;
}, "T:/CODE/JSProjects/Bestiary/frontend/src/pages/map.astro", void 0);
var $$file = "T:/CODE/JSProjects/Bestiary/frontend/src/pages/map.astro";
var $$url = "/map";
//#endregion
//#region \0virtual:astro:page:src/pages/map@_@astro
var page = () => map_exports;
//#endregion
export { page };
