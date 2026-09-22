import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { t as sanityClient } from "./sanity_5gnZoIKL.mjs";
import { i as sanityWriteClient, n as calculateCredibilityIndex, r as distanceKm, t as GROQ_SIGHTINGS_SAME_CREATURE } from "./calculateCredibility_DGsyJ939.mjs";
//#region src/pages/api/calculate-credibility.ts
var calculate_credibility_exports = /* @__PURE__ */ __exportAll({
	POST: () => POST,
	prerender: () => false
});
var POST = async ({ request }) => {
	try {
		const { sightingId } = await request.json();
		if (!sightingId) return new Response(JSON.stringify({ error: "sightingId is required" }), { status: 400 });
		const sighting = await sanityClient.fetch(`*[_type == "sighting" && _id == $sightingId][0]{
        _id,
        observedTraits,
        environmentalConditions,
        witness,
        location,
        date,
        "creatureRef": creature._ref,
        "creature": creature->{distinctiveTraits},
        "region": region->{centuriesOfTradition}
      }`, { sightingId });
		if (!sighting) return new Response(JSON.stringify({ error: "Sighting not found" }), { status: 404 });
		const nearbySightings = (await sanityClient.fetch(GROQ_SIGHTINGS_SAME_CREATURE, {
			creatureId: sighting.creatureRef,
			currentSightingId: sighting._id
		})).filter((s) => s.location).map((s) => ({
			_id: s._id,
			observedTraits: s.observedTraits ?? [],
			date: s.date,
			distanceKm: distanceKm(sighting.location, s.location)
		}));
		const credibilityIndex = calculateCredibilityIndex({
			sighting: {
				_id: sighting._id,
				observedTraits: sighting.observedTraits ?? [],
				environmentalConditions: sighting.environmentalConditions,
				witness: sighting.witness,
				location: sighting.location,
				date: sighting.date
			},
			creature: { distinctiveTraits: sighting.creature?.distinctiveTraits ?? [] },
			region: { centuriesOfTradition: sighting.region?.centuriesOfTradition ?? 0 },
			nearbySightings
		});
		await sanityWriteClient.patch(sighting._id).set({ credibilityIndex }).commit();
		return new Response(JSON.stringify({
			sightingId: sighting._id,
			credibilityIndex
		}), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (error) {
		console.error("Error calculating credibility index:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/calculate-credibility@_@ts
var page = () => calculate_credibility_exports;
//#endregion
export { page };
