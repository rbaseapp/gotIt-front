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

// One order and one set of labels throughout the application header.
const byRoute = new Map(navItems.map((item) => [item.to, item]));
export const topbarNavigation = [
  "/dashboard",
  "/courses",
  "/private-lesson?practice=free",
  "/learn",
  "/vocabulary",
].flatMap((route) => {
  const item = byRoute.get(route);
  return item ? [item] : [];
});
