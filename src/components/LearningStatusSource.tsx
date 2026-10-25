import { useContext, useId, useLayoutEffect } from "react";
import { LearningStatusPublisher } from "../context/LearningStatusContext";
import {
  LearningStatusBar,
  type LearningStatusBarProps,
} from "./LearningStatusBar";

/** Publishes page-owned data/actions without owning the shell's visible bar. */
export function LearningStatusSource(props: LearningStatusBarProps) {
  const publisher = useContext(LearningStatusPublisher);
  const source = useId();
  useLayoutEffect(() => {
    if (!publisher) return;
    publisher.publish(source, props);
    return () => publisher.release(source);
  }, [publisher, source, props]);
  // Standalone page previews retain the same controlled UI.
  return publisher ? null : <LearningStatusBar {...props} />;
}
