// Next.js has two ways to wrap route content: `layout.tsx` (persists
// across navigations, doesn't re-mount) and `template.tsx` (a fresh
// instance per navigation). Wrapping the app in a template lets us hook
// entrance animations onto every route change without adding a client-
// side library like Framer Motion — the template's DOM node re-mounts,
// so a plain CSS animation runs each time.
//
// The animation itself is defined in globals.css as `page-enter` — a
// subtle fade-up that respects `prefers-reduced-motion` (users with
// that setting won't see the movement, only the final position).

export default function RootTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="page-enter">{children}</div>;
}
