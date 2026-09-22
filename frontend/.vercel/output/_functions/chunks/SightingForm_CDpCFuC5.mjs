import { t as sanityClient } from "./sanity_5gnZoIKL.mjs";
import { useEffect, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/SightingForm.tsx
var TIME_OF_DAY_OPTIONS = [
	{
		value: "dawn",
		label: "Dawn"
	},
	{
		value: "day",
		label: "Day"
	},
	{
		value: "dusk",
		label: "Dusk"
	},
	{
		value: "night",
		label: "Night"
	},
	{
		value: "late_night",
		label: "Late night / small hours"
	}
];
var WITNESS_STATE_OPTIONS = [
	{
		value: "sober",
		label: "Sober / in control"
	},
	{
		value: "stressed",
		label: "Under stress or intense fear"
	},
	{
		value: "impaired",
		label: "Alcohol or other substance use reported"
	},
	{
		value: "unspecified",
		label: "Not specified"
	}
];
var MOON_PHASE_OPTIONS = [
	{
		value: "new",
		label: "New moon"
	},
	{
		value: "waxing",
		label: "Waxing"
	},
	{
		value: "full",
		label: "Full moon"
	},
	{
		value: "waning",
		label: "Waning"
	},
	{
		value: "unknown",
		label: "Unknown"
	}
];
var WEATHER_OPTIONS = [
	{
		value: "clear",
		label: "Clear"
	},
	{
		value: "fog",
		label: "Fog"
	},
	{
		value: "storm",
		label: "Storm"
	},
	{
		value: "light_rain",
		label: "Light rain"
	},
	{
		value: "snow",
		label: "Snowing"
	}
];
var VISIBILITY_OPTIONS = [
	{
		value: "good",
		label: "Good"
	},
	{
		value: "fair",
		label: "Fair"
	},
	{
		value: "poor",
		label: "Poor"
	}
];
function SightingForm() {
	const [creatures, setCreatures] = useState([]);
	const [regions, setRegions] = useState([]);
	const [loadingOptions, setLoadingOptions] = useState(true);
	const [creatureId, setCreatureId] = useState("");
	const [regionId, setRegionId] = useState("");
	const [lat, setLat] = useState("");
	const [lng, setLng] = useState("");
	const [anonymous, setAnonymous] = useState(true);
	const [witnessName, setWitnessName] = useState("");
	const [occupation, setOccupation] = useState("");
	const [baseCredibility, setBaseCredibility] = useState(3);
	const [witnessState, setWitnessState] = useState("unspecified");
	const [date, setDate] = useState("");
	const [timeOfDay, setTimeOfDay] = useState("night");
	const [freeformDescription, setFreeformDescription] = useState("");
	const [observedTraits, setObservedTraits] = useState([]);
	const [traitDraft, setTraitDraft] = useState("");
	const [moonPhase, setMoonPhase] = useState("unknown");
	const [weather, setWeather] = useState("clear");
	const [visibility, setVisibility] = useState("good");
	const [submitting, setSubmitting] = useState(false);
	const [result, setResult] = useState(null);
	const [error, setError] = useState(null);
	useEffect(() => {
		async function loadOptions() {
			try {
				const [creatureList, regionList] = await Promise.all([sanityClient.fetch(`*[_type == "creature"]{_id, name} | order(name asc)`), sanityClient.fetch(`*[_type == "region"]{_id, name} | order(name asc)`)]);
				setCreatures(creatureList);
				setRegions(regionList);
			} catch (err) {
				console.error("Failed to load creatures/regions:", err);
				setError("Could not load the creature and region archive. Check your Sanity connection.");
			} finally {
				setLoadingOptions(false);
			}
		}
		loadOptions();
	}, []);
	function addTrait() {
		const trimmed = traitDraft.trim();
		if (trimmed && !observedTraits.includes(trimmed)) setObservedTraits([...observedTraits, trimmed]);
		setTraitDraft("");
	}
	function removeTrait(trait) {
		setObservedTraits(observedTraits.filter((t) => t !== trait));
	}
	function handleTraitKeyDown(e) {
		if (e.key === "Enter") {
			e.preventDefault();
			addTrait();
		}
	}
	async function handleSubmit(e) {
		e.preventDefault();
		setError(null);
		setResult(null);
		if (!creatureId || !regionId || !lat || !lng || !date || !freeformDescription) {
			setError("Fill in the creature, region, location, date, and account before filing the report.");
			return;
		}
		setSubmitting(true);
		try {
			const response = await fetch("/api/submit-sighting", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					creatureId,
					regionId,
					location: {
						lat: parseFloat(lat),
						lng: parseFloat(lng)
					},
					witness: {
						anonymous,
						name: anonymous ? void 0 : witnessName,
						occupation,
						baseCredibility,
						witnessState
					},
					date: new Date(date).toISOString(),
					timeOfDay,
					freeformDescription,
					observedTraits,
					environmentalConditions: {
						moonPhase,
						weather,
						visibility
					}
				})
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data?.error ?? "Unknown error filing the report");
			setResult(data);
			setFreeformDescription("");
			setObservedTraits([]);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong filing this report.");
		} finally {
			setSubmitting(false);
		}
	}
	return /* @__PURE__ */ jsxs("form", {
		className: "dossier",
		onSubmit: handleSubmit,
		children: [
			/* @__PURE__ */ jsx("div", { className: "dossier__redacted-bar" }),
			/* @__PURE__ */ jsx("h2", {
				className: "dossier__title",
				children: "Field Report — New Sighting"
			}),
			/* @__PURE__ */ jsx("p", {
				className: "dossier__subtitle",
				children: "File everything you observed as precisely as possible. Vague reports lower the credibility score; specific, consistent detail raises it."
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "dossier__field",
				children: [/* @__PURE__ */ jsx("label", {
					className: "dossier__label",
					htmlFor: "creature",
					children: "Creature"
				}), /* @__PURE__ */ jsxs("select", {
					id: "creature",
					className: "dossier__select",
					value: creatureId,
					onChange: (e) => setCreatureId(e.target.value),
					disabled: loadingOptions,
					children: [/* @__PURE__ */ jsx("option", {
						value: "",
						children: loadingOptions ? "Loading archive…" : "Select a creature"
					}), creatures.map((c) => /* @__PURE__ */ jsx("option", {
						value: c._id,
						children: c.name
					}, c._id))]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "dossier__field",
				children: [/* @__PURE__ */ jsx("label", {
					className: "dossier__label",
					htmlFor: "region",
					children: "Region"
				}), /* @__PURE__ */ jsxs("select", {
					id: "region",
					className: "dossier__select",
					value: regionId,
					onChange: (e) => setRegionId(e.target.value),
					disabled: loadingOptions,
					children: [/* @__PURE__ */ jsx("option", {
						value: "",
						children: loadingOptions ? "Loading archive…" : "Select a region"
					}), regions.map((r) => /* @__PURE__ */ jsx("option", {
						value: r._id,
						children: r.name
					}, r._id))]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "dossier__field",
				children: [
					/* @__PURE__ */ jsx("label", {
						className: "dossier__label",
						children: "Exact location"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "dossier__row",
						children: [/* @__PURE__ */ jsx("input", {
							className: "dossier__input",
							type: "number",
							step: "any",
							placeholder: "Latitude",
							value: lat,
							onChange: (e) => setLat(e.target.value)
						}), /* @__PURE__ */ jsx("input", {
							className: "dossier__input",
							type: "number",
							step: "any",
							placeholder: "Longitude",
							value: lng,
							onChange: (e) => setLng(e.target.value)
						})]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "dossier__hint",
						children: "Use your phone's GPS coordinates, or drop a pin later in the map view."
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "dossier__row",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "dossier__field",
					children: [/* @__PURE__ */ jsx("label", {
						className: "dossier__label",
						htmlFor: "date",
						children: "Date"
					}), /* @__PURE__ */ jsx("input", {
						id: "date",
						className: "dossier__input",
						type: "date",
						value: date,
						onChange: (e) => setDate(e.target.value)
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "dossier__field",
					children: [/* @__PURE__ */ jsx("label", {
						className: "dossier__label",
						htmlFor: "timeOfDay",
						children: "Time of day"
					}), /* @__PURE__ */ jsx("select", {
						id: "timeOfDay",
						className: "dossier__select",
						value: timeOfDay,
						onChange: (e) => setTimeOfDay(e.target.value),
						children: TIME_OF_DAY_OPTIONS.map((opt) => /* @__PURE__ */ jsx("option", {
							value: opt.value,
							children: opt.label
						}, opt.value))
					})]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "dossier__field",
				children: [/* @__PURE__ */ jsx("label", {
					className: "dossier__label",
					htmlFor: "description",
					children: "Witness account"
				}), /* @__PURE__ */ jsx("textarea", {
					id: "description",
					className: "dossier__textarea",
					placeholder: "Describe exactly what happened, in your own words…",
					value: freeformDescription,
					onChange: (e) => setFreeformDescription(e.target.value)
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "dossier__field",
				children: [
					/* @__PURE__ */ jsx("label", {
						className: "dossier__label",
						children: "Traits observed"
					}),
					/* @__PURE__ */ jsx("div", {
						className: "dossier__traits",
						children: observedTraits.map((trait) => /* @__PURE__ */ jsxs("span", {
							className: "dossier__trait-chip",
							children: [trait, /* @__PURE__ */ jsx("button", {
								type: "button",
								onClick: () => removeTrait(trait),
								"aria-label": `Remove ${trait}`,
								children: "×"
							})]
						}, trait))
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "dossier__trait-input-row",
						children: [/* @__PURE__ */ jsx("input", {
							className: "dossier__input",
							type: "text",
							placeholder: "e.g. glowing red eyes",
							value: traitDraft,
							onChange: (e) => setTraitDraft(e.target.value),
							onKeyDown: handleTraitKeyDown
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "dossier__add-btn",
							onClick: addTrait,
							children: "Add"
						})]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "dossier__hint",
						children: "Match the creature's canonical traits exactly to raise consistency."
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "dossier__field",
				children: [
					/* @__PURE__ */ jsx("label", {
						className: "dossier__label",
						children: "Environmental conditions"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "dossier__row",
						children: [/* @__PURE__ */ jsx("select", {
							className: "dossier__select",
							value: moonPhase,
							onChange: (e) => setMoonPhase(e.target.value),
							children: MOON_PHASE_OPTIONS.map((opt) => /* @__PURE__ */ jsx("option", {
								value: opt.value,
								children: opt.label
							}, opt.value))
						}), /* @__PURE__ */ jsx("select", {
							className: "dossier__select",
							value: weather,
							onChange: (e) => setWeather(e.target.value),
							children: WEATHER_OPTIONS.map((opt) => /* @__PURE__ */ jsx("option", {
								value: opt.value,
								children: opt.label
							}, opt.value))
						})]
					}),
					/* @__PURE__ */ jsx("div", {
						style: { marginTop: "0.7rem" },
						children: /* @__PURE__ */ jsx("select", {
							className: "dossier__select",
							value: visibility,
							onChange: (e) => setVisibility(e.target.value),
							children: VISIBILITY_OPTIONS.map((opt) => /* @__PURE__ */ jsxs("option", {
								value: opt.value,
								children: ["Visibility: ", opt.label]
							}, opt.value))
						})
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "dossier__field",
				children: [
					/* @__PURE__ */ jsx("label", {
						className: "dossier__label",
						children: "Witness"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "dossier__checkbox-row",
						style: { marginBottom: "0.8rem" },
						children: [/* @__PURE__ */ jsx("input", {
							id: "anonymous",
							type: "checkbox",
							checked: anonymous,
							onChange: (e) => setAnonymous(e.target.checked)
						}), /* @__PURE__ */ jsx("label", {
							htmlFor: "anonymous",
							style: { fontSize: "0.85rem" },
							children: "File anonymously"
						})]
					}),
					!anonymous && /* @__PURE__ */ jsx("input", {
						className: "dossier__input",
						type: "text",
						placeholder: "Witness name",
						value: witnessName,
						onChange: (e) => setWitnessName(e.target.value),
						style: { marginBottom: "0.7rem" }
					}),
					/* @__PURE__ */ jsx("input", {
						className: "dossier__input",
						type: "text",
						placeholder: "Occupation / role (e.g. park ranger)",
						value: occupation,
						onChange: (e) => setOccupation(e.target.value),
						style: { marginBottom: "0.9rem" }
					}),
					/* @__PURE__ */ jsx("label", {
						className: "dossier__hint",
						children: "Witness state at the time"
					}),
					/* @__PURE__ */ jsx("select", {
						className: "dossier__select",
						value: witnessState,
						onChange: (e) => setWitnessState(e.target.value),
						style: {
							marginTop: "0.4rem",
							marginBottom: "0.9rem"
						},
						children: WITNESS_STATE_OPTIONS.map((opt) => /* @__PURE__ */ jsx("option", {
							value: opt.value,
							children: opt.label
						}, opt.value))
					}),
					/* @__PURE__ */ jsx("label", {
						className: "dossier__hint",
						children: "Base credibility (editorial judgment)"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "dossier__slider-row",
						style: { marginTop: "0.4rem" },
						children: [/* @__PURE__ */ jsx("input", {
							type: "range",
							min: "1",
							max: "5",
							value: baseCredibility,
							onChange: (e) => setBaseCredibility(parseInt(e.target.value, 10))
						}), /* @__PURE__ */ jsx("span", {
							className: "dossier__slider-value",
							children: baseCredibility
						})]
					})
				]
			}),
			/* @__PURE__ */ jsx("button", {
				type: "submit",
				className: "dossier__submit",
				disabled: submitting || loadingOptions,
				children: submitting ? "Filing report…" : "File report"
			}),
			result && /* @__PURE__ */ jsxs("div", {
				className: "dossier__status",
				children: [
					"Report filed. Case ID ",
					/* @__PURE__ */ jsx("strong", { children: result.sightingId }),
					" — computed credibility index:",
					" ",
					/* @__PURE__ */ jsx("strong", { children: result.credibilityIndex }),
					" / 100."
				]
			}),
			error && /* @__PURE__ */ jsx("div", {
				className: "dossier__status dossier__status--error",
				children: error
			})
		]
	});
}
//#endregion
export { SightingForm as t };
