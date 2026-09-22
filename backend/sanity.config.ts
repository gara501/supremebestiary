import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'bestiary',

  projectId: 'en0s05um',
  dataset: 'bestiary',

  plugins: [structureTool(), visionTool()],

  schema: {
    types: schemaTypes,
  },
})
