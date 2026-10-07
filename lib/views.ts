import { listComments, listReviews, listStudents, listVersions, type Access } from "./data";
import { ratingsToScore } from "./rubric";
import type { Comment, CommentRole } from "./types";

// Сэтгэгдлийг хэн харж байгаагаас хамаарч бэлтгэнэ (ангийн найзын нэрийг нууна)

export type CommentView = {
  id: string;
  role: CommentRole;
  author: string;
  start: number | null;
  end: number | null;
  quote: string;
  body: string;
  score: number | null;
  version: number | null;
  created_at: string;
  canDelete: boolean;
};

export type ReviewView = {
  id: string;
  role: "self" | "peer";
  author: string;
  ratings: Record<string, number>;
  strength: string;
  suggestion: string;
  score: number | null; // шалгуурын дунджаас тооцсон оноо
  updated_at: string;
};

/** Шалгуурын үнэлгээ: багш бүгдийг нэртэй, зохиогч найзуудын үнэлгээг нэргүй, найз зөвхөн өөрийнхийг харна */
export async function reviewViews(submissionId: string, access: Access, viewerStudentId: string | null, max: number): Promise<ReviewView[]> {
  if (!access) return [];
  let rows = await listReviews({ submission_id: submissionId });
  if (access === "peer") rows = rows.filter((r) => r.role === "peer" && r.reviewer_student_id === viewerStudentId);
  const names = access === "teacher" ? new Map((await listStudents()).map((s) => [s.id, s.name])) : new Map<string, string>();
  let peerNo = 0;
  return rows
    .sort((a, b) => (a.role === b.role ? a.created_at.localeCompare(b.created_at) : a.role === "self" ? -1 : 1))
    .map((r) => ({
      id: r.id,
      role: r.role,
      author:
        access === "teacher"
          ? `${r.role === "self" ? "🙋" : "👥"} ${names.get(r.reviewer_student_id) ?? "Сурагч"}${r.role === "self" ? " (өөрөө)" : ""}`
          : r.role === "self"
            ? "🙋 Өөрийн үнэлгээ"
            : access === "peer"
              ? "👥 Таны үнэлгээ"
              : `👥 Ангийн найз ${++peerNo}`,
      ratings: r.ratings,
      strength: r.strength,
      suggestion: r.suggestion,
      score: ratingsToScore(r.ratings, max),
      updated_at: r.updated_at,
    }));
}

export type VersionView ={ no: number; title: string; body: string; images: string[]; created_at: string };

/** Засварын түүх (багш ба зохиогч л харна) */
export async function versionViews(submissionId: string): Promise<VersionView[]> {
  return (await listVersions(submissionId)).map((v) => ({ no: v.version_no, title: v.title, body: v.body, images: v.images, created_at: v.created_at }));
}

export async function commentViews(submissionId: string, access: Access, viewerStudentId: string | null): Promise<CommentView[]> {
  if (!access) return [];
  let comments: Comment[] = await listComments(submissionId);
  // Ангийн найз зөвхөн өөрийн бичсэнийг харна — бусдын үнэлгээнд автахгүй
  if (access === "peer") comments = comments.filter((c) => c.author_student_id === viewerStudentId && c.author_role === "peer");

  const names = access === "teacher" ? new Map((await listStudents()).map((s) => [s.id, s.name])) : new Map<string, string>();
  const peerNo = new Map<string, number>();

  return comments.map((c) => {
    let author = "👩‍🏫 Багш";
    if (c.author_role === "self") author = access === "teacher" ? `🙋 ${names.get(c.author_student_id!) ?? "Сурагч"} (өөрөө)` : "🙋 Та (өөрийн үнэлгээ)";
    if (c.author_role === "peer") {
      if (access === "teacher") author = `👥 ${names.get(c.author_student_id!) ?? "Сурагч"}`;
      else if (access === "peer") author = "👥 Таны үнэлгээ";
      else {
        if (!peerNo.has(c.author_student_id!)) peerNo.set(c.author_student_id!, peerNo.size + 1);
        author = `👥 Ангийн найз ${peerNo.get(c.author_student_id!)}`;
      }
    }
    return {
      id: c.id,
      role: c.author_role,
      author,
      start: c.start_offset,
      end: c.end_offset,
      quote: c.quote,
      body: c.body,
      score: c.score,
      version: c.version_no,
      created_at: c.created_at,
      canDelete: access === "teacher" || (c.author_student_id === viewerStudentId && c.author_role === access),
    };
  });
}
