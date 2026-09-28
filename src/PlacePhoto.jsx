import { useEffect, useState } from "react";
import { getPlacePhoto } from "./photos";

// A photo banner for a place, falling back to a themed gradient while
// loading or when no Wikipedia photo exists for that name.
export function PlaceBanner({ placeName, height = 140, className = "", children }) {
  const [url, setUrl] = useState(undefined); // undefined = loading, null = no photo found

  useEffect(() => {
    let cancelled = false;
    setUrl(undefined);
    getPlacePhoto(placeName).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [placeName]);

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
