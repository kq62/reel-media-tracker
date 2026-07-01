import Image from "next/image";
import { tmdbImageUrl, type TmdbWatchProvidersByRegion } from "@/lib/tmdb";

const SECTIONS: {
  key: keyof Pick<TmdbWatchProvidersByRegion, "flatrate" | "rent" | "buy">;
  label: string;
}[] = [
  { key: "flatrate", label: "Stream" },
  { key: "rent", label: "Rent" },
  { key: "buy", label: "Buy" },
];

export function WatchProviders({
  providers,
}: {
  providers: TmdbWatchProvidersByRegion | undefined;
}) {
  const hasAnyProviders = SECTIONS.some(
    (section) => (providers?.[section.key]?.length ?? 0) > 0
  );

  if (!providers || !hasAnyProviders) {
    return (
      <p className="text-sm text-muted">
        No streaming, rental, or purchase options found for this region.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {SECTIONS.map((section) => {
        const items = providers[section.key];
        if (!items || items.length === 0) return null;

        return (
          <div key={section.key}>
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
              {section.label}
            </h3>
            <div className="mt-2 flex flex-wrap gap-3">
              {items.map((provider) => {
                const logoUrl = tmdbImageUrl(provider.logo_path, "w185");
                return (
                  <div
                    key={provider.provider_id}
                    className="flex flex-col items-center gap-1"
                    title={provider.provider_name}
                  >
                    {logoUrl ? (
                      <Image
                        src={logoUrl}
                        alt={provider.provider_name}
                        width={40}
                        height={40}
                        className="rounded-md"
                      />
                    ) : (
                      <div className="size-10 rounded-md bg-surface-raised" />
                    )}
                    <span className="max-w-[64px] truncate text-[10px] text-muted">
                      {provider.provider_name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {providers.link && (
        <a
          href={providers.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs text-accent hover:underline"
        >
          View all options on TMDB →
        </a>
      )}
    </div>
  );
}
