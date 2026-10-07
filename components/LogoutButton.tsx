"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton({ who }: { who: "teacher" | "student" }) {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch(who === "teacher" ? "/api/teacher" : "/api/student", { method: "DELETE" });
        router.push("/");
        router.refresh();
      }}
      className="rounded-xl px-3 py-2 text-slate-500 hover:bg-white"
    >
      Гарах
    </button>
  );
}
