import type { ReactNode } from "react";

/**
 * A card styled like a torn ticket stub — a small nod to the "media
 * tracker" subject matter without overdoing it. The perforation divider
 * separates the branded header from the actual form.
 */
export function AuthCard({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="px-6 pt-6 pb-5 text-center">
        <p className="font-mono text-xs tracking-[0.2em] text-accent uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>

      {/* Perforation divider, ticket-stub style */}
      <div className="relative border-t border-dashed border-border">
        <span className="absolute -top-2.5 -left-2.5 size-5 rounded-full bg-background" />
        <span className="absolute -top-2.5 -right-2.5 size-5 rounded-full bg-background" />
      </div>

      <div className="px-6 pt-6 pb-7">{children}</div>
    </div>
  );
}
