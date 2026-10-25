/** Use the dominant script so a quoted word at the start cannot flip a message. */
export function textDirection(text: string): "rtl" | "ltr" | "auto" {
  let rtl = 0;
  let ltr = 0;
  for (const letter of text.match(/\p{Letter}/gu) ?? []) {
    if (/[\p{Script=Hebrew}\p{Script=Arabic}]/u.test(letter)) rtl++;
    else ltr++;
  }
  return rtl === ltr ? "auto" : rtl > ltr ? "rtl" : "ltr";
}
