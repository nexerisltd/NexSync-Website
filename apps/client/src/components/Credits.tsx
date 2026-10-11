import { CREDITS } from "@/constants";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Person = { name: string; url: string };

const Links = ({ items }: { items: readonly Person[] }) => (
  <>
    {items.map((item, i) => (
      <span key={item.url}>
        {i > 0 && <span className="px-1 text-neutral-500">×</span>}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-300 hover:text-white underline-offset-2 hover:underline transition-colors"
        >
          {item.name}
        </a>
      </span>
    ))}
  </>
);

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="leading-relaxed">
    <span className="text-neutral-400">{label}: </span>
    {children}
  </div>
);

/** Developer / brand credits for NexSync. `compact` is the small left-aligned version used in the room sidebar. */
export const Credits = ({ compact = false, className }: { compact?: boolean; className?: string }) => (
  <div
    className={cn(
      "text-neutral-400",
      compact ? "px-4 pt-3 pb-1 text-[11px] border-t border-white/10" : "text-center text-xs",
      className
    )}
  >
    <Row label="Developer">
      <Links items={CREDITS.developers} />
    </Row>
    <Row label="Brand">
      <Links items={CREDITS.brands} />
    </Row>
  </div>
);
