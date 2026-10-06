// Full alphabets, not a bank built from the hidden expected answer. Keys can repeat.
// Languages with IME composition keep the normal input instead of a misleading alphabet.
const alphabets: Record<string, string> = {
  en: "abcdefghijklmnopqrstuvwxyz",
  he: "אבגדהוזחטיכךלמםנןסעפףצץקרשת",
  ar: "ابتثجحخدذرزسشصضطظعغفقكلمنهويءأإآؤئىة",
  ru: "абвгдеёжзийклмнопрстуфхцчшщъыьэюя",
  de: "abcdefghijklmnopqrstuvwxyzäöüß",
  fr: "abcdefghijklmnopqrstuvwxyzàâæçéèêëîïôœùûüÿ",
  es: "abcdefghijklmnñopqrstuvwxyzáéíóúü",
  it: "abcdefghijklmnopqrstuvwxyzàèéìíîòóùú",
  pt: "abcdefghijklmnopqrstuvwxyzáâãàçéêíóôõú",
  tr: "abcçdefgğhıijklmnoöprsştuüvyz",
};
export function letterKeyboard(language: string | undefined) {
  if (!language) return [];
  const code = language.toLowerCase().split("-")[0];
  return Array.from(alphabets[code] ?? "");
}
