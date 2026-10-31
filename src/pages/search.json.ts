import { getPosts } from '../posts';

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

const toText = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(\w+);/g, (m, name) => ENTITIES[name] ?? m)
    .replace(/\s+/g, ' ')
    .trim();

export async function GET() {
  const posts = await getPosts();
  return Response.json(
    posts.map((post) => ({
      url: `/yazilar/${post.id}/`,
      title: post.data.title,
      description: post.data.description,
      body: toText(post.rendered?.html ?? ''),
    })),
  );
}
