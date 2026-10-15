"use client";

import { useState } from "react";

// Багш эцэг эхэд өгөх нууц холбоосыг хуулна (нэвтрэхгүйгээр зөвхөн энэ хүүхдийн тайлан нээгдэнэ)
export default function ParentLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? path : `${window.location.origin}${path}`;

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          } catch {
            prompt("Холбоосыг хуулж авна уу:", url);
          }
        }}
        className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50"
        title="Эцэг эхэд илгээх холбоос. Нэвтрэх шаардлагагүй, зөвхөн энэ хүүхдийн тайлан нээгдэнэ."
      >
        {copied ? "✅ Хуулсан" : "🔗 Эцэг эхийн холбоос"}
      </button>
      <a href={path} target="_blank" rel="noreferrer" className="text-xs text-slate-500 underline">
        нээж үзэх
      </a>
    </span>
  );
}
