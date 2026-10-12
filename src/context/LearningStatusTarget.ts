import { createContext } from "react";

// Page controllers supply live data; the shell owns the fixed header position.
export const LearningStatusTarget = createContext<HTMLElement | null>(null);
