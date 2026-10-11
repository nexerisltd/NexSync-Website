"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CREDITS, TEAM } from "@/constants";
import type { TeamMember } from "@/constants";
import { cn } from "@/lib/utils";
import { Check, Copy, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

// One request per page load, shared by every DevCollab on screen
let avatarRequest: Promise<Record<string, string>> | null = null;
const loadLiveAvatars = (): Promise<Record<string, string>> => {
  avatarRequest ??= fetch("/api/team")
    .then((res) => (res.ok ? (res.json() as Promise<{ avatars?: Record<string, string> }>) : { avatars: {} }))
    .then((data) => data.avatars ?? {})
    .catch(() => ({}));
  return avatarRequest;
};

/** The team with the freshest profile pictures from the NexEris Team Board (falls back to the last known ones). */
export function useTeam(): TeamMember[] {
  const [live, setLive] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    void loadLiveAvatars().then((avatars) => {
      if (!cancelled) setLive(avatars);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return TEAM.map((member) => ({ ...member, avatarUrl: live[member.nexId] ?? member.avatarUrl }));
}

const initials = (name: string) =>
  name
    .replace(/[^A-Za-z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export const Pfp = ({ member, size, className }: { member: TeamMember; size: number; className?: string }) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = failedUrl !== member.avatarUrl;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary-500 to-violet-500 font-semibold text-white ring-2 ring-white/20",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.avatarUrl}
          alt={member.name}
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          loading="lazy"
          draggable={false}
          onError={() => setFailedUrl(member.avatarUrl)}
          className="h-full w-full object-cover"
        />
      ) : (
        initials(member.name)
      )}
    </span>
  );
};

const NexIdChip = ({ nexId }: { nexId: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard
          ?.writeText(nexId)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => undefined);
      }}
      title="Copy NexID"
      className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
    >
      {nexId}
      {copied ? <Check className="size-3 text-green-400" /> : <Copy className="size-3 opacity-60" />}
    </button>
  );
};

const Member = ({ member }: { member: TeamMember }) => (
  <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
    <a
      href={member.profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col items-center gap-2"
    >
      <Pfp member={member} size={72} className="transition-transform duration-300 group-hover:scale-105" />
      <span className="text-sm font-semibold text-white group-hover:underline underline-offset-2">{member.name}</span>
    </a>
    <span className="text-[11px] leading-tight text-neutral-400">{member.role}</span>
    <NexIdChip nexId={member.nexId} />
  </div>
);

/** The highlighted Dev Collab card: both developers, their pictures, NexIDs and the brands behind NexSync. */
export const DevCollab = ({ className }: { className?: string }) => {
  const team = useTeam();
  return (
    <section className={cn("glass-strong nx-glow-border w-full rounded-3xl p-5", className)} aria-label="Dev Collab">
      <header className="mb-4 flex flex-col items-center gap-1">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-primary-200">
          <Sparkles className="size-3 text-cyan-300" />
          DEV COLLAB
        </span>
        <h3 className="nx-gradient-text text-base font-semibold">Built together</h3>
      </header>

      <div className="flex items-start justify-center gap-2">
        {team[0] && <Member member={team[0]} />}
        <span className="mt-6 select-none text-lg font-light text-neutral-500">×</span>
        {team[1] && <Member member={team[1]} />}
      </div>

      <footer className="mt-4 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 border-t border-white/10 pt-3 text-[11px] text-neutral-400">
        <span className="text-neutral-500">Brand</span>
        {CREDITS.brands.map((brand, i) => (
          <span key={brand.url} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-neutral-600">×</span>}
            <a
              href={brand.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/12 bg-white/5 px-2 py-0.5 text-neutral-200 transition-colors hover:bg-white/10 hover:text-white"
            >
              {brand.name}
            </a>
          </span>
        ))}
      </footer>
    </section>
  );
};

/** Small sidebar/top-bar entry: overlapping pictures that open the full Dev Collab card. */
export const DevCollabDialog = ({
  variant = "sidebar",
  className,
}: {
  variant?: "sidebar" | "bar";
  className?: string;
}) => {
  const team = useTeam();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Dev Collab"
          className={cn(
            variant === "sidebar"
              ? "glass glass-hover mx-2 mt-3 flex items-center gap-3 rounded-2xl px-3 py-2 text-left"
              : "flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 py-0.5 pr-2 pl-0.5 transition-colors hover:bg-white/10",
            className
          )}
        >
          <span className="flex -space-x-2">
            {team.map((member) => (
              <Pfp key={member.key} member={member} size={variant === "sidebar" ? 30 : 18} className="ring-1" />
            ))}
          </span>
          {variant === "sidebar" ? (
            <span className="min-w-0 leading-tight">
              <span className="block text-[10px] font-semibold tracking-[0.16em] text-primary-300">DEV COLLAB</span>
              <span className="block truncate text-xs text-neutral-200">{team.map((m) => m.name).join(" × ")}</span>
            </span>
          ) : (
            <span className="text-[10px] font-semibold tracking-[0.14em] text-primary-200">DEV COLLAB</span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md border-0 bg-transparent bg-none p-0 shadow-none backdrop-blur-none sm:max-w-md">
        <DialogTitle className="sr-only">Dev Collab</DialogTitle>
        <DialogDescription className="sr-only">The developers and brands behind NexSync</DialogDescription>
        <DevCollab />
      </DialogContent>
    </Dialog>
  );
};
