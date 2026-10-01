import { useEffect, useState } from "react";
import { getPlacePhoto } from "./photos";

// A photo banner for a place. `savedUrl` is the trip's own persisted
// photo_url: null means never looked up (look it up now and report back
// via onResolved so the caller can save it forever), "" means already
// looked up with nothing found (don't retry), and a string is the cached
// photo to use directly — so a trip only ever costs one API call, ever.
export function PlaceBanner({ placeName, savedUrl, onResolved, height = 140, className = "", children }) {
  const [url, setUrl] = useState(savedUrl || null);

  useEffect(() => {
    if (savedUrl) {
      setUrl(savedUrl);
      return;
    }
    if (savedUrl === "") {
      setUrl(null);
      return;
    }
    let cancelled = false;
    setUrl(undefined);
    getPlacePhoto(placeName).then((found) => {
      if (cancelled) return;
      setUrl(found);
      onResolved?.(found || "");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeName, savedUrl]);

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{ height, background: url ? "var(--border)" : "linear-gradient(135deg, var(--stamp), var(--primary-bg))" }}
    >
      {url && (
        // A real <img> (not a CSS background-image swapped in after the
        // fact) so the browser sizes it correctly from the first paint —
        // background-image: cover can measure wrong the first time it's
        // set dynamically and not recompute until something forces a
        // repaint, which read as the photo being "zoomed in" until refresh.
        <img
          src={url}
          alt=""
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
      )}
      {url && (
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.05) 60%)" }}
        />
      )}
      {children}
    </div>
  );
}
