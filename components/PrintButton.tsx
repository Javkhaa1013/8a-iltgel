"use client";

export default function PrintButton({ label = "🖨️ Хэвлэх / PDF" }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className="no-print ml-auto rounded-xl bg-violet-600 px-4 py-2 font-bold text-white hover:bg-violet-700">
      {label}
    </button>
  );
}
