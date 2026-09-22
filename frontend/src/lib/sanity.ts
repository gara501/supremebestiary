import {createClient} from '@sanity/client'

export const sanityClient = createClient({
  projectId: 'en0s05um',
  dataset: 'bestiary',
  apiVersion: '2024-01-01',
  useCdn: false, // false porque necesitas datos en tiempo real, no cacheados
})
