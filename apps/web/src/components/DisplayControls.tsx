"use client";

import { useEffect, useState } from "react";

type Prefs = { contrast: "normal" | "high"; fontsize: "base" | "lg" | "xl" };

const KEY = "slaf-display";
const SIZES: Prefs["fontsize"][] = ["base", "lg", "xl"];

function read(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return { contrast: p.contrast === "high" ? "high" : "normal", fontsize: SIZES.includes(p.fontsize) ? p.fontsize : "base" };
  } catch {
    return { contrast: "normal", fontsize: "base" };
  }
}

function apply(p: Prefs) {
  const html = document.documentElement;
  if (p.contrast === "high") html.dataset.contrast = "high";
  else delete html.dataset.contrast;
  if (p.fontsize === "base") delete html.dataset.fontsize;
  else html.dataset.fontsize = p.fontsize;
}

/** High-contrast and text-size toggles. Preference is kept per browser. */
export function DisplayControls({ labels }: { labels: { label: string; contrast: string; text: string } }) {
  const [prefs, setPrefs] = useState<Prefs>({ contrast: "normal", fontsize: "base" });

  useEffect(() => {
    const p = read();
    apply(p);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with stored preference after hydration
    setPrefs(p);
  }, []);

  function update(next: Prefs) {
    setPrefs(next);
    apply(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable: preference lasts for this page only */
    }
  }

  return (
    <div className="flex items-center gap-1" role="group" aria-label={labels.label}>
      <button
        type="button"
        aria-pressed={prefs.contrast === "high"}
        onClick={() => update({ ...prefs, contrast: prefs.contrast === "high" ? "normal" : "high" })}
        className="rounded px-2 py-1 hover:bg-white/10 aria-pressed:bg-white/15 aria-pressed:text-white"
        title={labels.contrast}
      >
        <span aria-hidden>◐</span>
        <span className="sr-only">{labels.contrast}</span>
      </button>
      <button
        type="button"
        onClick={() => update({ ...prefs, fontsize: SIZES[(SIZES.indexOf(prefs.fontsize) + 1) % SIZES.length] })}
        className="rounded px-2 py-1 hover:bg-white/10"
        title={labels.text}
      >
        <span aria-hidden>
          A<span className="text-[0.8em]">A</span>
        </span>
        <span className="sr-only">
          {labels.text}: {prefs.fontsize}
        </span>
      </button>
    </div>
  );
}
