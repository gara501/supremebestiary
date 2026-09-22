import { createClient } from "@sanity/client";
//#region src/lib/sanityWriteClient.ts
var sanityWriteClient = createClient({
	projectId: "en0s05um",
	dataset: "bestiary",
	apiVersion: "2024-01-01",
	useCdn: false,
	token: "sk7vhJCvVyEZgGgmZxrw0kXrXYunB6cvvlM5R8LLFoivGhrA8nKX1dBmUc4mcJrMQEuYhHHrpknUB7dfcdATjxk4uAuia7JYRICJm0Cwgd45lhMvjjlHfLO60fmbWs3g1esb3iwzmsSJPQRjZmukwAR8XinNiDxk73uh1fnkHA3sZGN2cCw9"
});
//#endregion
//#region src/lib/calculateCredibility.ts
var WEIGHTS = {
	traitConsistency: .3,
	witnessCredibility: .2,
	witnessState: .1,
	corroboration: .25,
	folkloreDensity: .15
};
/** Haversine distance in km between two points. */
function distanceKm(a, b) {
	const R = 6371;
	const dLat = (b.lat - a.lat) * Math.PI / 180;
	const dLng = (b.lng - a.lng) * Math.PI / 180;
	const lat1 = a.lat * Math.PI / 180;
	const lat2 = b.lat * Math.PI / 180;
	const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
	return 2 * R * Math.asin(Math.sqrt(h));
}
/** % of observed traits that match the creature's canonical traits. */
function traitConsistency(observed, canonical) {
	if (observed.length === 0 || canonical.length === 0) return 0;
	const canonicalNorm = canonical.map((t) => t.toLowerCase().trim());
	return observed.filter((t) => canonicalNorm.includes(t.toLowerCase().trim())).length / canonical.length;
}
/** Penalizes or favors credibility based on the witness's state. */
function witnessStateFactor(state) {
	switch (state) {
		case "sober": return 1;
		case "stressed": return .75;
		case "impaired": return .35;
		default: return .6;
	}
}
/**
* Looks at other sightings of the same creature within a reasonable radius
* and time window, and measures how similar their observed traits are.
* (The actual "nearby" lookup is done via GROQ before calling this function;
* this only processes the result.)
*/
function corroborationFactor(current, nearby, maxRadiusKm = 50, maxDays = 365) {
	if (nearby.length === 0) return 0;
	const currentDate = new Date(current.date).getTime();
	let score = 0;
	for (const other of nearby) {
		if (other.distanceKm > maxRadiusKm) continue;
		const dayDiff = Math.abs(currentDate - new Date(other.date).getTime()) / 864e5;
		if (dayDiff > maxDays) continue;
		const overlap = traitConsistency(current.observedTraits, other.observedTraits);
		const distanceWeight = 1 - other.distanceKm / maxRadiusKm;
		const timeWeight = 1 - dayDiff / maxDays;
		score += overlap * distanceWeight * timeWeight;
	}
	return Math.min(score / Math.max(nearby.length, 1), 1);
}
/**
* Folklore density: a region with centuries of tradition doesn't "prove"
* anything on its own, but it's a legitimate signal — hence the relatively
* low weight.
*/
function folkloreDensityFactor(centuriesOfTradition) {
	return Math.min(centuriesOfTradition / 5, 1);
}
function calculateCredibilityIndex(params) {
	const { sighting, creature, region, nearbySightings } = params;
	const consistency = traitConsistency(sighting.observedTraits, creature.distinctiveTraits);
	const witnessCredibility = sighting.witness.baseCredibility / 5;
	const stateFactor = witnessStateFactor(sighting.witness.witnessState);
	const corroboration = corroborationFactor(sighting, nearbySightings);
	const folkloreDensity = folkloreDensityFactor(region.centuriesOfTradition);
	const rawScore = consistency * WEIGHTS.traitConsistency + witnessCredibility * WEIGHTS.witnessCredibility + stateFactor * WEIGHTS.witnessState + corroboration * WEIGHTS.corroboration + folkloreDensity * WEIGHTS.folkloreDensity;
	return Math.round(rawScore * 100);
}
/**
* Reference GROQ query to fetch "nearby" sightings before calling
* calculateCredibilityIndex. Adjust the radius by filtering in memory with
* distanceKm, since GROQ has no native geo-radius filter without a geo
* queries plugin.
*/
var GROQ_SIGHTINGS_SAME_CREATURE = `
*[_type == "sighting" && creature._ref == $creatureId && _id != $currentSightingId]{
  _id,
  observedTraits,
  date,
  location
}
`;
//#endregion
export { sanityWriteClient as i, calculateCredibilityIndex as n, distanceKm as r, GROQ_SIGHTINGS_SAME_CREATURE as t };
