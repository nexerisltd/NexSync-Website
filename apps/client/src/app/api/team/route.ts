import { TEAM } from "@/constants";
import { extractAvatarUrl } from "@/lib/teamProfiles";
import { NextResponse } from "next/server";

export const revalidate = 3600;

/**
 * GET /api/team -> { avatars: { [nexId]: avatarUrl } }
 * Pulls the Dev Collab profile pictures from the NexEris Team Board profile pages (cached for an hour).
 * Anything that can't be verified is simply left out; the UI falls back to the last known picture.
 */
export async function GET() {
  const entries = await Promise.all(
    TEAM.map(async (member) => {
      try {
        const res = await fetch(member.profileUrl, {
          headers: { accept: "text/html" },
          next: { revalidate: 3600 },
          signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) return [member.nexId, null] as const;
        return [member.nexId, extractAvatarUrl(await res.text(), member.nexId)] as const;
      } catch {
        return [member.nexId, null] as const;
      }
    })
  );

  const avatars: Record<string, string> = {};
  for (const [nexId, url] of entries) {
    if (url) avatars[nexId] = url;
  }

  return NextResponse.json(
    { avatars },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
  );
}
