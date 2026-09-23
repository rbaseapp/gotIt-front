import type { MouseEventHandler } from "react";
import { Link } from "react-router-dom";
import iconUrl from "../assets/gotit-icon.svg";
import logoUrl from "../assets/gotit-logo.svg";

export function Logo({
  compact = false,
  onClick,
}: {
  compact?: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <Link
      to="/"
      className={`brand ${compact ? "brand-compact" : ""}`}
      aria-label="GotIt home"
      onClick={onClick}
    >
      <img
        className={compact ? "brand-icon" : "brand-logo"}
        src={compact ? iconUrl : logoUrl}
        alt=""
        draggable={false}
      />
    </Link>
  );
}
