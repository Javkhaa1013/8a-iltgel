import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center p-4 text-center">
      <div>
        <div className="text-6xl">🔍</div>
        <h1 className="mt-4 font-display text-2xl font-bold">Олдсонгүй</h1>
        <p className="mt-2 text-slate-500">Хуудас байхгүй, эсвэл танд харах эрх алга.</p>
        <Link href="/" className="mt-4 inline-block rounded-xl bg-violet-600 px-5 py-2 font-bold text-white">
          Нүүр хуудас руу
        </Link>
      </div>
    </div>
  );
}
