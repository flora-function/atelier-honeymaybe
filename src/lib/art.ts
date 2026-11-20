// Fetches art from the backend API at build time.
// Returns the same { id, data } shape Astro content collections use,
// so pages only needed their import swapped.
const API = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:4000';

export type ArtPiece = {
  id: string;
  data: {
    title: string;
    date: string;
    medium: string;
    tags: string[];
    image: string;
    description?: string | null;
    featured: boolean;
  };
};

export async function getArt(): Promise<ArtPiece[]> {
  const res = await fetch(`${API}/api/art`);
  if (!res.ok) throw new Error(`Art API returned ${res.status} (is the server running at ${API}?)`);
  const rows: any[] = await res.json();
  return rows.map(({ id, ...data }) => ({ id, data }));
}
