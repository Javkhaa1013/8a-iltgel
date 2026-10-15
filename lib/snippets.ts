// Багшийн байнга бичдэг сэтгэгдлүүд. Нэг товшилтоор маягтад орно.
// Багш өөрийн хэллэгээ нэмбэл тухайн браузерт нь хадгалагдана.

export const SNIPPET_KEY = "teacher-snippets-v1";

export const DEFAULT_SNIPPETS: Record<"text" | "image", string[]> = {
  text: [
    "Энд жишээ, баримт нэмбэл илүү итгэмээр болно.",
    "Энэ хэсгийг догол мөр болгон тусгаарлаарай.",
    "Өгүүлбэр хэт урт байна — хоёр болгон хуваа.",
    "Энэ санаа сайн байна, арай дэлгэрүүлж бичээрэй.",
    "Дүгнэлт дутуу байна. Юу хэлэх гэснээ 2-3 өгүүлбэрээр нэгтгэ.",
    "Зөв бичих дүрмийн алдаа байна, дахин уншиж шалгаарай.",
    "Гарчиг агуулгатайгаа бүрэн тохирохгүй байна.",
    "Өөрийн бодол, сэтгэгдлээ нэмбэл илүү амьд болно.",
  ],
  image: [
    "Бичиг тод, уншигдахуйц байна. Сайн байна!",
    "Зураг бүдэг байна — гэрэлтэй газар дахин зурагдаарай.",
    "Төлөвлөгөө тодорхой харагдаж байна.",
    "Хуудсаа бүтнээр нь багтаан зурагдаарай.",
  ],
};

export function loadSnippets(kind: "text" | "image"): string[] {
  const base = DEFAULT_SNIPPETS[kind];
  try {
    const saved = JSON.parse(localStorage.getItem(SNIPPET_KEY) || "[]");
    return Array.isArray(saved) ? [...base, ...saved.filter((s: unknown) => typeof s === "string")] : base;
  } catch {
    return base;
  }
}

export function saveSnippet(text: string) {
  try {
    const saved = JSON.parse(localStorage.getItem(SNIPPET_KEY) || "[]");
    const list = Array.isArray(saved) ? saved : [];
    if (text.trim() && !list.includes(text.trim())) {
      localStorage.setItem(SNIPPET_KEY, JSON.stringify([...list, text.trim()].slice(-30)));
      return true;
    }
  } catch {
    /* хадгалах боломжгүй браузер */
  }
  return false;
}
