export type Class = {
  id: string;
  name: string;
  created_at: string;
};

/** Ангийн багш. class_id байхгүй бол бүх ангийг хариуцна (админ). */
export type Teacher = {
  id: string;
  name: string;
  class_id: string | null;
  password_hash: string;
  created_at: string;
};

export type Student = {
  id: string;
  class_id: string;
  name: string;
  login_code: string;
  attendance_score: number | null;
  bonus_score: number | null;
  bonus_note: string;
  created_at: string;
};

export type Submission = {
  id: string;
  student_id: string;
  stage_id: string;
  title: string;
  body: string;
  images: string[];
  paste_chars: number;
  teacher_score: number | null;
  published: boolean;
  author_display: "short" | "full" | "anon"; // нийтлэл дээрх нэрийн хэлбэр
  view_count: number;
  submitted_at: string;
  updated_at: string;
  created_at: string;
};

/** Илгээх бүрт хадгалагдах хувилбар (засварын түүх) */
export type Version = {
  id: string;
  submission_id: string;
  version_no: number;
  title: string;
  body: string;
  images: string[];
  created_at: string;
};

/** Илгээгээгүй ноорог — бичих явцад серверт автоматаар хадгалагдана */
export type Draft = {
  id: string;
  student_id: string;
  stage_id: string;
  title: string;
  body: string;
  images: string[];
  updated_at: string;
};

export type CommentRole = "teacher" | "self" | "peer";

/** Шалгуурын хуудсаар өгсөн өөрийн / хөндлөнгийн үнэлгээ */
export type Review = {
  id: string;
  submission_id: string;
  reviewer_student_id: string;
  role: "self" | "peer";
  ratings: Record<string, number>;
  strength: string;
  suggestion: string;
  created_at: string;
  updated_at: string;
};

export type Comment = {
  id: string;
  submission_id: string;
  author_role: CommentRole;
  author_student_id: string | null;
  start_offset: number | null;
  end_offset: number | null;
  quote: string;
  body: string;
  score: number | null;
  version_no: number | null; // аль хувилбар дээр бичсэн
  created_at: string;
};

export type Extension = {
  id: string;
  student_id: string;
  stage_id: string;
  until: string;
};

export const ROLE_LABEL: Record<CommentRole, string> = {
  teacher: "👩‍🏫 Багш",
  self: "🙋 Өөрийн үнэлгээ",
  peer: "👥 Хөндлөнгийн үнэлгээ",
};
