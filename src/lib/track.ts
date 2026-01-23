// src/lib/track.ts
export type TrackParams = Record<string, any>;

export function track(event: string, params: TrackParams = {}) {
  if (typeof window === "undefined") return;

  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).dataLayer.push({
    event,
    ...params,
  });
}

export function slugifyCourseName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s/]+/g, "_")
    .replace(/[^\w_]+/g, "");
}
