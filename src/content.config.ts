import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    description: z.string(),
    author: z.string(),
    tags: z.array(z.string()).default([]),
    image: z.object({
      url: z.string().url(),
      alt: z.string(),
      credit: z.string().optional(),
      creditUrl: z.string().url().optional(),
    }).optional(),
  }),
});

export const collections = { posts };
