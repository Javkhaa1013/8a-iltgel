import Link from "next/link";
import LogoutButton from "./LogoutButton";

type Props = { studentName?: string | null; teacher?: boolean };

export default function Nav({ studentName, teacher }: Props) {
  return (
    <nav className="no-print mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-4">
      <Link href="/" className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-lg text-white">✍️</span>
        <span className="font-display text-lg font-bold">8А Нийтлэл</span>
      </Link>
      <div className="ml-auto flex flex-wrap items-center gap-2 text-sm font-semibold">
        {teacher && (
          <>
            <Link href="/teacher" className="rounded-xl bg-amber-100 px-3 py-2 text-amber-800 hover:bg-amber-200">
              👩‍🏫 Багшийн самбар
            </Link>
            <LogoutButton who="teacher" />
          </>
        )}
        {studentName && (
          <>
            <Link href="/me" className="rounded-xl bg-violet-100 px-3 py-2 text-violet-800 hover:bg-violet-200">
              🙋 {studentName}
            </Link>
            <LogoutButton who="student" />
          </>
        )}
        {!teacher && !studentName && (
          <>
            <Link href="/login" className="rounded-xl bg-violet-600 px-3 py-2 text-white hover:bg-violet-700">
              Сурагч нэвтрэх
            </Link>
            <Link href="/teacher" className="rounded-xl px-3 py-2 text-slate-600 hover:bg-white">
              Багш
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
