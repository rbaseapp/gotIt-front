import { useEffect, useState } from "react";

/** True once the window has scrolled past `offset` pixels. */
export function useScrolled(offset = 4) {
  const [scrolled, setScrolled] = useState(() => window.scrollY > offset);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScrolled(window.scrollY > offset));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, [offset]);
  return scrolled;
}
