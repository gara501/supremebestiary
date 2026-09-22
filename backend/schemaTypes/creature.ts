import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'creature',
  title: 'Creature',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Canonical name',
      type: 'string',
      description: 'The name under which it is filed in the central archive. E.g. "Chupacabras"',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'regionalNames',
      title: 'Regional names',
      type: 'array',
      of: [{type: 'string'}],
      description: 'The same entity may have different names depending on the region where it is reported.',
    }),
    defineField({
      name: 'regions',
      title: 'Associated regions',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'region'}]}],
      description: 'Regions where this creature has folkloric tradition or reported sightings.',
    }),
    defineField({
      name: 'physicalDescription',
      title: 'Physical description',
      type: 'text',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'distinctiveTraits',
      title: 'Canonical distinctive traits',
      type: 'array',
      of: [{type: 'string'}],
      description:
        'List of "official" traits for this creature (e.g. "glowing red eyes", "backward feet"). Each sighting is compared against this list to calculate consistency.',
      validation: (Rule) =>
        Rule.min(1).error('You need at least one distinctive trait to be able to calculate consistency.'),
    }),
    defineField({
      name: 'archiveIllustration',
      title: 'Archive illustration',
      type: 'image',
      options: {hotspot: true},
      description: 'The retrofuturist classified-archive-style illustration.',
    }),
    defineField({
      name: 'threatLevel',
      title: 'Threat level',
      type: 'string',
      options: {
        list: [
          {title: 'Harmless', value: 'harmless'},
          {title: 'Caution', value: 'caution'},
          {title: 'Dangerous', value: 'dangerous'},
          {title: 'Unknown', value: 'unknown'},
        ],
        layout: 'radio',
      },
      initialValue: 'unknown',
    }),
    defineField({
      name: 'folkloreOrigin',
      title: 'Folklore origin',
      type: 'text',
      description: 'Historical/cultural context of the legend.',
    }),
  ],
  preview: {
    select: {
      title: 'name',
      media: 'archiveIllustration',
      threatLevel: 'threatLevel',
    },
    prepare({title, media, threatLevel}) {
      return {
        title,
        subtitle: threatLevel ? `Threat: ${threatLevel}` : undefined,
        media,
      }
    },
  },
})
