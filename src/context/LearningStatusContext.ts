import { createContext } from "react";
import type { LearningStatusBarProps } from "../components/LearningStatusBar";

// Keep the publisher stable so header updates do not rerender page controllers.
export const LearningStatusPublisher = createContext<{
  publish: (source: string, status: LearningStatusBarProps) => void;
  release: (source: string) => void;
} | null>(null);

export const LearningStatusSnapshot =
  createContext<LearningStatusBarProps | null>(null);
