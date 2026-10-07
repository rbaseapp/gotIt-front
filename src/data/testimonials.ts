/**
 * Real quotes from GotIt learners, published with their permission.
 * The landing page hides the section while this list is empty.
 */
export type Testimonial = {
  quote: string;
  /** Star rating out of 5. */
  rating?: number;
  /** BCP 47 tag of the quote text when it differs from the UI language. */
  lang?: string;
};

const realTestimonials: Testimonial[] = [];

/**
 * Layout placeholders so the section can be designed before real quotes are in.
 * These are invented: they render only in the Vite dev server and are never part
 * of a production build. Delete them once realTestimonials has entries.
 */
const devPlaceholders: Testimonial[] = [
  {
    quote:
      "אני קוראת כתבות באנגלית כל בוקר. עכשיו כל מילה שאני לא מכירה נשמרת בלחיצה, ותוך שבוע היא כבר שלי.",
    rating: 5,
    lang: "he",
  },
  {
    quote:
      "השיחה עם המורה היא החלק שהכי עזר לי. הדוח בסוף מראה בדיוק מה לתקן, בלי להרגיש מבוכה.",
    rating: 5,
    lang: "he",
  },
  {
    quote:
      "המאמרים שנכתבים מהמילים שלי גאוניים. פתאום אני פוגש את אותן מילים בהקשר אחר ומבין שאני זוכר אותן.",
    rating: 5,
    lang: "he",
  },
  {
    quote:
      "ניסיתי הרבה אפליקציות. זו הראשונה שמלמדת אותי מילים מתוך מה שאני באמת קוראת ולא מרשימה מוכנה.",
    rating: 5,
    lang: "he",
  },
  {
    quote:
      "חמש דקות של משחקים ביום, והמילים חוזרות בדיוק כשאני מתחיל לשכוח. זה פשוט עובד.",
    rating: 5,
    lang: "he",
  },
];

export const testimonials: Testimonial[] =
  realTestimonials.length || !import.meta.env.DEV
    ? realTestimonials
    : devPlaceholders;
