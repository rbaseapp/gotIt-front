import { useEffect, useRef, useState } from "react";

/**
 * Tracks whether an element is on screen. With `once`, it stays true after the
 * first time it appears (for entrance reveals). Without IntersectionObserver it
 * reports true so content is never hidden.
 */
export function useInView<T extends Element>({
  once = false,
  rootMargin = "0px 0px -15% 0px",
}: { once?: boolean; rootMargin?: string } = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(
    () => typeof IntersectionObserver === "undefined",
  );
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) observer.disconnect();
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [once, rootMargin]);
  return [ref, inView] as const;
}
