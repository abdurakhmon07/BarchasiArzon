import { useRef, useState } from "react";
import { Photo } from "./ProductCard";

/** Swipeable photos (CSS scroll-snap) with dots. One photo = no dots. */
export default function Gallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  if (photos.length === 0) return <Photo url={null} alt={alt} />;

  const goTo = (i: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="gallery">
      <div
        className="gallery-track"
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {photos.map((url, i) => (
          <div className="gallery-slide" key={url + i}>
            <Photo url={url} alt={`${alt} ${i + 1}`} />
          </div>
        ))}
      </div>
      {photos.length > 1 && (
        <div className="gallery-dots">
          {photos.map((url, i) => (
            <button
              key={url + i}
              className={i === index ? "on" : ""}
              aria-label={`${i + 1} / ${photos.length}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
