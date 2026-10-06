import asset0 from "../assets/learning-map/map-ChevronDown.svg";
import asset1 from "../assets/learning-map/map-Circle.svg";
import asset2 from "../assets/learning-map/map-ChevronDown1.svg";
import asset3 from "../assets/learning-map/map-Circle1.svg";
import asset4 from "../assets/learning-map/map-Mic.svg";
import asset5 from "../assets/learning-map/map-Circle2.svg";
import asset6 from "../assets/learning-map/map-Check.svg";
import asset7 from "../assets/learning-map/map-Circle3.svg";
import asset8 from "../assets/learning-map/map-ChevronDown2.svg";
import asset9 from "../assets/learning-map/map-Circle4.svg";
import asset10 from "../assets/learning-map/map-BookOpen1.svg";
import asset11 from "../assets/learning-map/map-Circle5.svg";
import asset12 from "../assets/learning-map/map-GlyphChevronRight.svg";
import asset13 from "../assets/learning-map/map-Circle6.svg";
import asset14 from "../assets/learning-map/map-Mic1.svg";
import asset15 from "../assets/learning-map/map-ChevronDown3.svg";
import asset16 from "../assets/learning-map/map-ChevronLeft.svg";
import asset17 from "../assets/learning-map/levels-ChevronLeft.svg";
import asset18 from "../assets/learning-map/levels-ChevronDown.svg";
import asset19 from "../assets/learning-map/levels-Circle.svg";
import asset20 from "../assets/learning-map/levels-BookOpen1.svg";
import asset21 from "../assets/learning-map/levels-Circle1.svg";
import asset22 from "../assets/learning-map/levels-MessageCircle1.svg";
import asset23 from "../assets/learning-map/levels-Globe.svg";
import asset24 from "../assets/learning-map/levels-Search.svg";
import asset25 from "../assets/learning-map/levels-Mic.svg";
import asset26 from "../assets/learning-map/levels-Circle2.svg";
import asset27 from "../assets/learning-map/levels-Check.svg";
import asset28 from "../assets/learning-map/levels-BookOpen2.svg";
import asset29 from "../assets/learning-map/levels-Circle3.svg";
import asset30 from "../assets/learning-map/levels-ChevronLeft1.svg";

const artwork = {
  "map-ChevronDown": asset0,
  "map-Circle": asset1,
  "map-ChevronDown1": asset2,
  "map-Circle1": asset3,
  "map-Mic": asset4,
  "map-Circle2": asset5,
  "map-Check": asset6,
  "map-Circle3": asset7,
  "map-ChevronDown2": asset8,
  "map-Circle4": asset9,
  "map-BookOpen1": asset10,
  "map-Circle5": asset11,
  "map-GlyphChevronRight": asset12,
  "map-Circle6": asset13,
  "map-Mic1": asset14,
  "map-ChevronDown3": asset15,
  "map-ChevronLeft": asset16,
  "levels-ChevronLeft": asset17,
  "levels-ChevronDown": asset18,
  "levels-Circle": asset19,
  "levels-BookOpen1": asset20,
  "levels-Circle1": asset21,
  "levels-MessageCircle1": asset22,
  "levels-Globe": asset23,
  "levels-Search": asset24,
  "levels-Mic": asset25,
  "levels-Circle2": asset26,
  "levels-Check": asset27,
  "levels-BookOpen2": asset28,
  "levels-Circle3": asset29,
  "levels-ChevronLeft1": asset30,
} as const;

export function PathArtwork({
  name,
  circle,
}: {
  name: keyof typeof artwork;
  circle?: keyof typeof artwork;
}) {
  return (
    <span className="path-artwork" aria-hidden="true">
      {circle && <img src={artwork[circle]} alt="" />}
      <img src={artwork[name]} alt="" />
    </span>
  );
}
