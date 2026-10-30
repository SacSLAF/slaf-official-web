import Link from "next/link";
import type { AirBase } from "@/lib/api";
import type { Locale } from "@/lib/i18n";

/*
 * Sri Lanka drawn as a simple aeronautical chart: a stylised coastline from
 * ~30 coastal reference points, a 1° graticule, and the published bases
 * plotted from their real coordinates.
 */
const COAST: [number, number][] = [
  [9.82, 80.24], [9.47, 80.6], [9.27, 80.82], [8.95, 81.0], [8.57, 81.24], [8.25, 81.42],
  [7.72, 81.7], [7.41, 81.83], [6.87, 81.84], [6.52, 81.7], [6.21, 81.33], [6.12, 81.12],
  [6.02, 80.79], [5.92, 80.59], [6.03, 80.21], [6.42, 79.99], [6.93, 79.85], [7.21, 79.83],
  [7.58, 79.79], [8.05, 79.82], [8.23, 79.74], [8.45, 79.88], [8.78, 79.92], [8.98, 79.92],
  [9.06, 79.76], [9.11, 79.72], [9.08, 79.85], [9.0, 80.0], [9.28, 80.12], [9.5, 80.2], [9.66, 80.01], [9.81, 80.04],
];

const W0 = 79.35;
const N0 = 10.05;
const S = 100;
const project = (lat: number, lng: number) => [(lng - W0) * S, (N0 - lat) * S] as const;

const coastPath = COAST.map(([lat, lng], i) => {
  const [x, y] = project(lat, lng);
  return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
}).join(" ") + "Z";

export function IslandChart({ bases, locale, highlight }: { bases: AirBase[]; locale: Locale; highlight?: string }) {
  const plotted = bases.filter((b) => b.latitude && b.longitude);

  return (
    <svg viewBox="0 0 285 440" className="h-full w-full" role="group" aria-label="Map of Air Force bases in Sri Lanka">
      {[6, 7, 8, 9].map((lat) => {
        const [, y] = project(lat, 0);
        return (
          <g key={`lat${lat}`}>
            <line x1="0" x2="285" y1={y} y2={y} className="chart-grid" />
            <text x="3" y={y - 3} className="chart-grid-label">
              {lat}°N
            </text>
          </g>
        );
      })}
      {[80, 81, 82].map((lng) => {
        const [x] = project(0, lng);
        return (
          <g key={`lng${lng}`}>
            <line y1="0" y2="440" x1={x} x2={x} className="chart-grid" />
            <text x={x + 3} y="436" className="chart-grid-label">
              {lng}°E
            </text>
          </g>
        );
      })}

      <path d={coastPath} className="chart-coast" />

      {plotted.map((b, i) => {
        const [x, y] = project(b.latitude!, b.longitude!);
        const labelLeft = x > 190;
        return (
          <Link
            key={b.slug}
            href={`/${locale}/bases/${b.slug}`}
            className={`chart-base${highlight === b.slug ? " always" : ""}`}
            style={{ ["--i" as string]: i }}
          >
            <circle className="ring" cx={x} cy={y} r={highlight === b.slug ? 7 : 4.5} />
            <circle className="dot" cx={x} cy={y} r="1.8" />
            <text x={labelLeft ? x - 7 : x + 7} y={y + 2.5} textAnchor={labelLeft ? "end" : "start"} lang={locale}>
              {b.name}
            </text>
          </Link>
        );
      })}
    </svg>
  );
}
