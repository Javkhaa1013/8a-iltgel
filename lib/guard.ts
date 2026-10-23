import { activeClassId, canAccessClass, currentTeacher, type TeacherSession } from "./auth";
import { getStudent, listStudents } from "./data";

// Багшийн эрх ба ангийн хамрах хүрээг шалгах нийтлэг хэрэгслүүд.
// Ангийн багш зөвхөн өөрийн ангийн сурагч, бүтээлд хүрнэ. Админ бүх ангид хүрнэ.

export type Guard = { session: TeacherSession; classId: string };

export async function teacherGuard(): Promise<Guard | null> {
  const session = await currentTeacher();
  if (!session) return null;
  return { session, classId: await activeClassId(session) };
}

/** Тухайн сурагч багшийн ангид харьяалагдаж байвал буцаана */
export async function canTouchStudent(session: TeacherSession, studentId: string) {
  const student = await getStudent(studentId);
  return student && canAccessClass(session, student.class_id) ? student : null;
}

/** Багшийн харах ёстой сурагчид (ангийн багш → өөрийн анги, админ → идэвхтэй анги) */
export async function scopedStudents(guard: Guard) {
  return listStudents(guard.classId);
}
