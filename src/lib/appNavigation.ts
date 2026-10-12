import {
  House,
  BookOpen,
  Bookmark,
  Gamepad2,
  MessageCircle,
  BookOpenText,
  History,
  Settings,
} from "lucide-react";

export type TopbarVariant = "standard" | "dashboard" | "practice" | "mywords";

export const navItems = [
  { to: "/dashboard", labelKey: "ux.today", icon: House },
  { to: "/courses", labelKey: "ux.programs", icon: BookOpen, liveOnly: true },
  { to: "/vocabulary", labelKey: "ux.words", icon: Bookmark },
  { to: "/learn", labelKey: "ux.practice", icon: Gamepad2 },
  {
    to: "/private-lesson?practice=free",
    labelKey: "ux.freeChat",
    icon: MessageCircle,
    liveOnly: true,
  },
  { to: "/reading", labelKey: "ux.reading", icon: BookOpenText },
  { to: "/history", labelKey: "ux.history", icon: History, liveOnly: true },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
];

const byRoute = new Map(navItems.map((item) => [item.to, item]));
const headerOrder = {
  dashboard: [
    "/dashboard",
    "/courses",
    "/private-lesson?practice=free",
    "/learn",
    "/vocabulary",
  ],
  practice: [
    "/dashboard",
    "/courses",
    "/learn",
    "/vocabulary",
    "/private-lesson?practice=free",
  ],
  mywords: [
    "/dashboard",
    "/vocabulary",
    "/learn",
    "/private-lesson?practice=free",
    "/courses",
  ],
} satisfies Record<Exclude<TopbarVariant, "standard">, string[]>;

export function topbarNavigation(variant: TopbarVariant) {
  if (variant === "standard") return [];
  return headerOrder[variant].flatMap((route) => {
    const item = byRoute.get(route);
    if (!item) return [];
    const labelKey =
      variant !== "dashboard" && route === "/courses"
        ? variant === "mywords"
          ? "myWords.navPrograms"
          : "practiceDesign.navPrograms"
        : variant !== "dashboard" && route.startsWith("/private-lesson")
          ? "practiceDesign.navTeacher"
          : item.labelKey;
    return [{ to: item.to, labelKey }];
  });
}
