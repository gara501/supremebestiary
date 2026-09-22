import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'region',
  title: 'Region',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Region name',
      type: 'string',
      description: 'E.g. "Northern Sierra of Puebla", "Paraguayan Chaco"',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'country',
      title: 'Country',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'centroid',
      title: 'Geographic center',
      type: 'geopoint',
      description: 'Point used to center the map when navigating to this region',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'folkloreHistory',
      title: 'Folklore history',
      type: 'text',
      description:
        'How deeply rooted is the sighting tradition here? This feeds the credibility index: a sighting in an area with centuries of tradition weighs differently than one in an area with no precedent at all.',
    }),
    defineField({
      name: 'centuriesOfTradition',
      title: 'Estimated centuries of oral tradition',
      type: 'number',
      description: 'Rough estimate. 0 if there is no known folkloric precedent.',
      validation: (Rule) => Rule.min(0),
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'country',
    },
  },
})
