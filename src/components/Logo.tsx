import { Sparkles } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="GotIt">
      <span className="brand-mark">
        <Sparkles size={compact ? 17 : 20} strokeWidth={2.6} />
      </span>
      {!compact && (
        <span className="brand-word">
          Got<span>It</span>
        </span>
      )}
    </div>
  );
}
