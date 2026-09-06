import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_DESCRIPTION, SITE_TITLE } from '@/lib/site';

export async function GET(context) {
  const posts = (await getCollection('posts')).sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
  const feedRoot = new URL(import.meta.env.BASE_URL, context.site);

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: feedRoot,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `${post.id}/`,
    })),
  });
}
