"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Илгээхээ мартсан хүүхдийн ноорогийг илгээсэнд тооцох
export default function AcceptDraftButton({ draftId, submissionExists }: { draftId: string; submissionExists: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    const text = submissionExists
      ? "Илгээсэн хувилбарыг энэ ноорогоор солих уу? (Өмнөх хувилбар түүхэнд үлдэнэ)"
      : "Энэ ноорогийг илгээсэнд тооцох уу?";
    if (!confirm(text)) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/drafts/${draftId}/accept`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Алдаа гарлаа");
    router.push(`/teacher/s/${data.id}`);
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button onClick={accept} disabled={busy} className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50">
        {busy ? "…" : "✔ Илгээсэнд тооцох"}
      </button>
      {error && <span className="mt-1 text-xs text-rose-600">{error}</span>}
    </span>
  );
}
