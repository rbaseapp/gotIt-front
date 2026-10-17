import { useState } from "react";

export function DashboardMoohi({ src, label }: { src: string; label: string }) {
  const [hop, setHop] = useState(0);
  return (
    <button
      className="nd-moohi"
      type="button"
      aria-label={label}
      onClick={() => setHop((value) => value + 1)}
    >
      <span className="nd-moohi-float">
        <span
          key={hop}
          className={`nd-moohi-body${hop ? " nd-moohi-hop" : ""}`}
          onAnimationEnd={(event) => {
            if (event.animationName === "nd-moohi-hop") setHop(0);
          }}
        >
          <img src={src} width={520} height={478} alt="" />
          <span className="nd-moohi-lid left" aria-hidden="true" />
          <span className="nd-moohi-lid right" aria-hidden="true" />
        </span>
      </span>
      <span className="nd-moohi-shadow" aria-hidden="true" />
    </button>
  );
}
