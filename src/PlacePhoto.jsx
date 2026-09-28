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
      style={{
        height,
        background: url
          ? `linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.05) 60%), url("${url}")`
          : "linear-gradient(135deg, var(--stamp), var(--primary-bg))",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {children}
    </div>
  );
}
