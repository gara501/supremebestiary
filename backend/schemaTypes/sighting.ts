import {defineArrayMember, defineField, defineType} from 'sanity'

export default defineType({
  name: 'sighting',
  title: 'Sighting',
  type: 'document',
  fields: [
    defineField({
      name: 'creature',
      title: 'Reported creature',
      type: 'reference',
      to: [{type: 'creature'}],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'region',
      title: 'Region',
      type: 'reference',
      to: [{type: 'region'}],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'location',
      title: 'Exact location',
      type: 'geopoint',
      description:
        'Exact point of the sighting, used for the real-time map and to calculate proximity to other reports.',
      validation: (Rule) => Rule.required(),
    }),

    // --- Witness ---
    defineField({
      name: 'witness',
      title: 'Witness',
      type: 'object',
      fields: [
        defineField({
          name: 'anonymous',
          title: 'Anonymous witness?',
          type: 'boolean',
          initialValue: true,
        }),
        defineField({
          name: 'name',
          title: 'Name',
          type: 'string',
          hidden: ({parent}) => parent?.anonymous,
        }),
        defineField({
          name: 'occupation',
          title: 'Occupation / role',
          type: 'string',
          description: 'E.g. "park ranger", "local police officer", "hiker". Feeds the base credibility score.',
        }),
        defineField({
          name: 'baseCredibility',
          title: 'Witness base credibility',
          type: 'number',
          description: '1 (very low) to 5 (very high). Editorial judgment by the archive team when validating the report.',
          validation: (Rule) => Rule.min(1).max(5).required(),
          initialValue: 3,
        }),
        defineField({
          name: 'witnessState',
          title: 'Witness state at the time of the sighting',
          type: 'string',
          options: {
            list: [
              {title: 'Sober / in control', value: 'sober'},
              {title: 'Under stress or intense fear', value: 'stressed'},
              {title: 'Reported alcohol or other substance use', value: 'impaired'},
              {title: 'Not specified', value: 'unspecified'},
            ],
          },
          initialValue: 'unspecified',
        }),
      ],
    }),

    defineField({
      name: 'date',
      title: 'Sighting date',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'timeOfDay',
      title: 'Time of day',
      type: 'string',
      options: {
        list: [
          {title: 'Dawn', value: 'dawn'},
          {title: 'Day', value: 'day'},
          {title: 'Dusk', value: 'dusk'},
          {title: 'Night', value: 'night'},
          {title: 'Late night / small hours', value: 'late_night'},
        ],
      },
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'freeformDescription',
      title: 'Witness account',
      type: 'text',
      description: 'The original, unedited text of what the witness reports having seen.',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'testimonyAudio',
      title: 'Witness audio testimony',
      type: 'file',
      options: {
        accept: 'audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/webm',
      },
      description:
        'Optional short field recording for this exact sighting. Keep clips concise; use a streaming service for long-form recordings.',
    }),

    defineField({
      name: 'observedTraits',
      title: 'Traits observed in this sighting',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      description:
        'Traits the witness described. Compared against the creature\'s "distinctiveTraits" to calculate consistency — this is what keeps the credibility index from being manual.',
    }),

    // --- Environmental conditions: key for "cross-referencing patterns" ---
    defineField({
      name: 'environmentalConditions',
      title: 'Environmental conditions',
      type: 'object',
      fields: [
        defineField({
          name: 'moonPhase',
          title: 'Moon phase',
          type: 'string',
          options: {
            list: [
              {title: 'New moon', value: 'new'},
              {title: 'Waxing', value: 'waxing'},
              {title: 'Full moon', value: 'full'},
              {title: 'Waning', value: 'waning'},
              {title: 'Unknown', value: 'unknown'},
            ],
          },
        }),
        defineField({
          name: 'weather',
          title: 'Weather',
          type: 'string',
          options: {
            list: [
              {title: 'Clear', value: 'clear'},
              {title: 'Fog', value: 'fog'},
              {title: 'Storm', value: 'storm'},
              {title: 'Light rain', value: 'light_rain'},
              {title: 'Snowing', value: 'snow'},
            ],
          },
        }),
        defineField({
          name: 'visibility',
          title: 'Estimated visibility',
          type: 'string',
          options: {
            list: [
              {title: 'Good', value: 'good'},
              {title: 'Fair', value: 'fair'},
              {title: 'Poor', value: 'poor'},
            ],
          },
        }),
      ],
    }),

    defineField({
      name: 'corroboratedBy',
      title: 'Corroborated by other sightings',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'sighting'}]})],
      description: 'References to other sightings nearby in time/space with similar descriptions.',
    }),

    // --- Computed field, not manually editable ---
    defineField({
      name: 'credibilityIndex',
      title: 'Credibility index (computed)',
      type: 'number',
      readOnly: true,
      description:
        'Automatically calculated by cross-referencing: trait consistency, witness credibility, corroboration with other sightings, and folkloric density of the region. Do not edit by hand — see lib/calculateCredibility.ts',
    }),

    defineField({
      name: 'status',
      title: 'File status',
      type: 'string',
      options: {
        list: [
          {title: 'Pending review', value: 'pending'},
          {title: 'Verified by team', value: 'verified'},
          {title: 'Dismissed', value: 'dismissed'},
        ],
      },
      initialValue: 'pending',
    }),
  ],
  preview: {
    select: {
      creatureName: 'creature.name',
      date: 'date',
      index: 'credibilityIndex',
    },
    prepare({creatureName, date, index}) {
      const formattedDate = date ? new Date(date).toLocaleDateString() : 'no date'
      return {
        title: creatureName ?? 'Sighting with no associated creature',
        subtitle: `${formattedDate} · credibility: ${index ?? 'not calculated'}`,
      }
    },
  },
})
