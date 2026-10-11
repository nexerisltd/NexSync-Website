import { describe, expect, it } from "bun:test";
import { extractAvatarUrl, isAllowedAvatarUrl } from "@/lib/teamProfiles";

const AVATAR = "https://kkrglsaoivkbadlxllbp.supabase.co/storage/v1/object/public/avatars/80000a0b/1784820960271.png";
const page = (nexId: string, imgUrl = AVATAR) =>
  `<html><body><img alt="logo" src="/_next/image?url=%2Flogo.png&amp;w=96&amp;q=75"/>` +
  `<img alt="Arabi Islam" srcSet="/_next/image?url=${encodeURIComponent(imgUrl)}&amp;w=3840&amp;q=75 1x"/>` +
  `<p>@arabiislam46ar</p><p>${nexId}</p></body></html>`;

describe("team board avatars", () => {
  it("finds the avatar URL on a profile page with the expected NexID", () => {
    expect(extractAvatarUrl(page("Nex120239065712"), "Nex120239065712")).toBe(AVATAR);
  });

  it("returns null when the page shows a different NexID", () => {
    expect(extractAvatarUrl(page("Nex999999999999"), "Nex120239065712")).toBeNull();
  });

  it("ignores images that are not hosted on the avatars bucket", () => {
    expect(extractAvatarUrl(page("Nex120239065712", "https://evil.example.com/a.png"), "Nex120239065712")).toBeNull();
  });

  it("only allows https avatars from Supabase storage or Google", () => {
    expect(isAllowedAvatarUrl(AVATAR)).toBe(true);
    expect(isAllowedAvatarUrl("https://lh3.googleusercontent.com/a/abc")).toBe(true);
    expect(isAllowedAvatarUrl("http://x.supabase.co/storage/v1/object/public/avatars/a.png")).toBe(false);
    expect(isAllowedAvatarUrl("https://x.supabase.co/storage/v1/object/public/covers/a.png")).toBe(false);
    expect(isAllowedAvatarUrl("javascript:alert(1)")).toBe(false);
  });
});
