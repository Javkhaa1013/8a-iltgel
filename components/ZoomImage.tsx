"use client";

import { useEffect, useState } from "react";

// Дарахад бүтэн дэлгэцээр томорч харагдах зураг. Дахин дарах эсвэл Esc дарахад хаагдана.
export default function ZoomImage({ src, alt = "", className = "" }: { src: string; alt?: string; className?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} onClick={() => setOpen(true)} className={`cursor-zoom-in ${className}`} />
      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Хаах"
          className="fixed inset-0 z-50 grid cursor-zoom-out place-items-center bg-black/80 p-4 print:hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-h-full max-w-full rounded-lg" />
        </button>
      )}
    </>
  );
}
