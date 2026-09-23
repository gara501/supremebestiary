import {createClient} from '@sanity/client'

export const sanityClient = createClient({
  projectId: 'en0s05um',
  dataset: 'bestiary',
  apiVersion: '2024-01-01',
  useCdn: false, // Read the latest archive data, including live sightings.
})
