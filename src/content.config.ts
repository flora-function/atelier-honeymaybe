import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const art = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/art' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    medium: z.string(),
    tags: z.array(z.string()),
    image: z.string(),
    description: z.string().optional(),
    featured: z.boolean().optional().default(false),
  }),
});

export const collections = { art };
