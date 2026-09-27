// The KedahKu mark: Gunung Jerai rising over paddy rows, with the sun behind.
// Kept in step with src/app/icon.svg (the favicon), which draws the same shapes.
// Fixed colours so the mark reads the same in light and dark mode and in share cards.

export const MARK = {
  bg: "#123a26",
  sun: "#f2c14e",
  peak: "#e6efe8",
  paddy: "#7cc98f",
  peakPath:
    "M3 20.5 C6.5 19.8 8.6 17.6 10.4 15.2 C11.8 13.3 12.8 11.2 14.4 10.4 C15.6 9.8 16.6 10.6 17.6 12 C18.6 13.4 19.4 14.2 20.6 15.4 C22.8 17.6 25.6 19.8 29 20.5 Z",
};

/** `bare` drops the rounded tile, for use on a background that is already paddy green. */
export default function BrandMark({ size = 26, bare = false, className }: { size?: number; bare?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      {!bare && <rect width="32" height="32" rx="7" fill={MARK.bg} />}
      <circle cx="23.5" cy="8.6" r="3.2" fill={MARK.sun} />
      <path d={MARK.peakPath} fill={MARK.peak} />
      <rect x="4.5" y="22.8" width="23" height="2" rx="1" fill={MARK.paddy} />
      <rect x="7.5" y="26.2" width="17" height="2" rx="1" fill={MARK.paddy} />
    </svg>
  );
}

/** "Kedah" + "Ku", the way the name is always set. */
export function Wordmark() {
  return (
    <span className="wordmark">
      Kedah<span className="brand-ku">Ku</span>
    </span>
  );
}
