/**
 * Pulling profile pictures from the NexEris Team Board (https://nexeristm.vercel.app).
 * The public profile page of a member renders the avatar through next/image, so the real picture URL sits in
 * `/_next/image?url=<encoded url>`. We only trust the page if it shows the expected NexID, and we only accept
 * pictures hosted on Supabase storage (avatars bucket) or Google, so a bad page can't inject arbitrary images.
 */

export function isAllowedAvatarUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    if (url.hostname === "lh3.googleusercontent.com") return true;
    return url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/storage/v1/object/public/avatars/");
  } catch {
    return false;
  }
}

/** Finds the member's avatar URL in the HTML of their public profile page, or null (also if the NexID doesn't match). */
export function extractAvatarUrl(html: string, nexId: string): string | null {
  if (!html.includes(nexId)) return null;

  for (const match of html.matchAll(/\/_next\/image\?url=([^&"'\s<>]+)/g)) {
    const encoded = match[1];
    if (!encoded) continue;
    try {
      const candidate = decodeURIComponent(encoded);
      if (isAllowedAvatarUrl(candidate)) return candidate;
    } catch {
      // malformed escape sequence: ignore this candidate
    }
  }
  return null;
}
