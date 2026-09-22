import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { t as sanityClient } from "./sanity_5gnZoIKL.mjs";
import { i as sanityWriteClient, n as calculateCredibilityIndex, r as distanceKm, t as GROQ_SIGHTINGS_SAME_CREATURE } from "./calculateCredibility_DGsyJ939.mjs";
//#region src/pages/api/submit-sighting.ts
var submit_sighting_exports = /* @__PURE__ */ __exportAll({
	POST: () => POST,
	prerender: () => false
});
var POST = async ({ request }) => {
	try {
		const body = await request.json();
		if (!body.creatureId || !body.regionId || !body.location || !body.freeformDescription) return new Response(JSON.stringify({ error: "Missing required fields: creatureId, regionId, location, freeformDescription" }), { status: 400 });
		const created = await sanityWriteClient.create({
			_type: "sighting",
			creature: {
				_type: "reference",
				_ref: body.creatureId
			},
			region: {
				_type: "reference",
				_ref: body.regionId
			},
			location: {
				_type: "geopoint",
				lat: body.location.lat,
				lng: body.location.lng
			},
			witness: {
				anonymous: body.witness?.anonymous ?? true,
				name: body.witness?.anonymous ? void 0 : body.witness?.name,
				occupation: body.witness?.occupation,
				baseCredibility: body.witness?.baseCredibility ?? 3,
				witnessState: body.witness?.witnessState ?? "unspecified"
			},
			date: body.date,
			timeOfDay: body.timeOfDay,
			freeformDescription: body.freeformDescription,
			observedTraits: body.observedTraits ?? [],
			environmentalConditions: body.environmentalConditions ?? {},
			status: "pending"
		});
		const creature = await sanityClient.fetch(`*[_type == "creature" && _id == $id][0]{distinctiveTraits}`, { id: body.creatureId });
		const region = await sanityClient.fetch(`*[_type == "region" && _id == $id][0]{centuriesOfTradition}`, { id: body.regionId });
		const nearbySightings = (await sanityClient.fetch(GROQ_SIGHTINGS_SAME_CREATURE, {
			creatureId: body.creatureId,
			currentSightingId: created._id
		})).filter((s) => s.location).map((s) => ({
			_id: s._id,
			observedTraits: s.observedTraits ?? [],
			date: s.date,
			distanceKm: distanceKm(body.location, s.location)
		}));
		const credibilityIndex = calculateCredibilityIndex({
			sighting: {
				_id: created._id,
				observedTraits: body.observedTraits ?? [],
				environmentalConditions: body.environmentalConditions,
				witness: {
					baseCredibility: body.witness?.baseCredibility ?? 3,
					witnessState: body.witness?.witnessState ?? "unspecified"
				},
				location: body.location,
				date: body.date
			},
			creature: { distinctiveTraits: creature?.distinctiveTraits ?? [] },
			region: { centuriesOfTradition: region?.centuriesOfTradition ?? 0 },
			nearbySightings
		});
		await sanityWriteClient.patch(created._id).set({ credibilityIndex }).commit();
		return new Response(JSON.stringify({
			sightingId: created._id,
			credibilityIndex
		}), {
			status: 201,
			headers: { "Content-Type": "application/json" }
		});
	} catch (error) {
		console.error("Error submitting sighting:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/submit-sighting@_@ts
var page = () => submit_sighting_exports;
//#endregion
export { page };
