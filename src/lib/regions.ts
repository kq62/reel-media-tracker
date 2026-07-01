// A short, deliberately curated list rather than all ~200 TMDB regions —
// enough to be genuinely useful without turning the dropdown into a
// scroll-fest. Easy to extend later if needed.
export const SUPPORTED_REGIONS = [
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "MY", label: "Malaysia" },
  { code: "SG", label: "Singapore" },
  { code: "IN", label: "India" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "JP", label: "Japan" },
] as const;

export type RegionCode = (typeof SUPPORTED_REGIONS)[number]["code"];

export const DEFAULT_REGION: RegionCode = "US";

export const REGION_COOKIE_NAME = "reel_region";

export function isSupportedRegion(value: string): value is RegionCode {
  return SUPPORTED_REGIONS.some((region) => region.code === value);
}
