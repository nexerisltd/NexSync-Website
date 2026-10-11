// Optional links shown in the UI. Leave the env vars unset to hide them.
// NEXT_PUBLIC_DISCORD_URL / NEXT_PUBLIC_GITHUB_URL
export const SOCIAL_LINKS = {
  discord: process.env.NEXT_PUBLIC_DISCORD_URL || undefined,
  github: process.env.NEXT_PUBLIC_GITHUB_URL || undefined,
} as const;

// Who built NexSync (shown on the join page, in the room sidebar and in the page metadata)
export const CREDITS = {
  developers: [
    { name: "Arabi Islam", url: "https://nexeristm.vercel.app/arabiislam46ar" },
    { name: "MR. ARX", url: "https://nexeristm.vercel.app/mrarxme" },
  ],
  brands: [
    { name: "NexEris LTD", url: "https://nexeristm.vercel.app/nexerisltd" },
    { name: "NexApp OG", url: "https://nexappog.vercel.app/" },
  ],
} as const;

// Dev Collab: the two people behind NexSync. Profile pictures are pulled live from the NexEris Team Board
// (see /api/team); `avatarUrl` is the last known picture, used until/unless the live one loads.
export interface TeamMember {
  key: string;
  name: string;
  role: string;
  nexId: string;
  username: string;
  profileUrl: string;
  avatarUrl: string;
}

export const TEAM_BOARD_URL = "https://nexeristm.vercel.app";

export const TEAM: readonly TeamMember[] = [
  {
    key: "arabi",
    name: "Arabi Islam",
    role: "Founder · NexAR",
    nexId: "Nex120239065712",
    username: "arabiislam46ar",
    profileUrl: "https://nexeristm.vercel.app/arabiislam46ar",
    avatarUrl:
      "https://kkrglsaoivkbadlxllbp.supabase.co/storage/v1/object/public/avatars/80000a0b-90fd-429d-85c4-2d333b612b26/1784820960271.png",
  },
  {
    key: "arx",
    name: "MR. ARX",
    role: "Senior Developer • Founder · NexAR",
    nexId: "Nex382412048038",
    username: "mrarxme",
    profileUrl: "https://nexeristm.vercel.app/mrarxme",
    avatarUrl:
      "https://kkrglsaoivkbadlxllbp.supabase.co/storage/v1/object/public/avatars/cc2db264-407f-4d22-be8a-dfd4146497f7/1791632625170.png",
  },
];
