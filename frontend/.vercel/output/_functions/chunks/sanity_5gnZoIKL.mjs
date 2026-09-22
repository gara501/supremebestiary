import { createClient } from "@sanity/client";
//#region src/lib/sanity.ts
var sanityClient = createClient({
	projectId: "en0s05um",
	dataset: "bestiary",
	apiVersion: "2024-01-01",
	useCdn: false
});
//#endregion
export { sanityClient as t };
