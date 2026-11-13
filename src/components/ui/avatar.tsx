"use client";

import { useState } from "react";

function initials(label: string) {
  const parts = label.trim().split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** Shows the Google photo when present and loadable; otherwise initials. */
export function Avatar({ src, label, size = 56 }: { src?: string | null; label: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };

  if (src && !failed) {
    return (
      // Plain <img>: Google avatar hosts are third-party, and no-referrer avoids Google's hotlink 403s.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        style={style}
        className="rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={style}
      className="inline-flex items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper"
    >
      {initials(label)}
    </span>
  );
}
