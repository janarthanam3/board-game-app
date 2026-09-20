import { Redirect } from "expo-router";

import { Gallery } from "@/gallery/Gallery";

// Dev-only component gallery (gate B5). Not in docs/04; EXPO_PUBLIC_ENV gates it (docs/09).
export default function GalleryRoute() {
  if (process.env["EXPO_PUBLIC_ENV"] !== "development") {
    return <Redirect href="/modes" />;
  }
  return <Gallery />;
}
