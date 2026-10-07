"use client";

import { useState } from "react";
import type { Stage } from "@/lib/stages";
import type { Extension, Student } from "@/lib/types";
import DeadlineAlerts from "./DeadlineAlerts";
import Gradebook from "./Gradebook";
import Integrity from "./Integrity";
import PeerOverview from "./PeerOverview";
import PublishList from "./PublishList";
import Roster from "./Roster";
import Schedule from "./Schedule";

export type SubSummary = {
  id: string;
  student_id: string;
  stage_id: string;
  title: string;
  words: number;
  images: number;
  paste_chars: number;
  body_chars: number;
  teacher_score: number | null;
  published: boolean;
  author_display: "short" | "full" | "anon";
  view_count: number;
  updated_at: string;
};

export type StudentRow = Student & {
  totals: { stageScores: (number | null)[]; works: number; attendance: number | null; bonus: number; total: number };
};

export type PeerStage = {
  stage_id: string;
  open: boolean; // хөндлөнгийн үнэлгээний хугацаа нээлттэй
  ends: string;
  rows: {
    student_id: string;
    targets: { submission_id: string; author_id: string; done: boolean }[];
    received: number;
    selfDone: boolean;
    submitted: boolean;
  }[];
};

export type TeacherData = {
  now: string;
  stages: Stage[];
  students: StudentRow[];
  submissions: SubSummary[];
  extensions: Extension[];
  drafts: { id: string; student_id: string; stage_id: string; updated_at: string }[];
  peer: PeerStage[];
  flags: { a: string; b: string; percent: number }[];
};

const TABS = [
  { id: "grades", label: "📊 Явц ба оноо" },
  { id: "peer", label: "👥 Хөндлөнгийн үнэлгээ" },
  { id: "publish", label: "📰 Нийтлэх" },
  { id: "integrity", label: "🔍 Хуулбар шалгах" },
  { id: "roster", label: "👥 Сурагчид ба код" },
  { id: "schedule", label: "🗓 Хуваарь" },
] as const;

export default function TeacherHome(data: TeacherData) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>(data.students.length ? "grades" : "roster");

  // Нээлттэй хөндлөнгийн үнэлгээнд үнэлээгүй хүүхдийн тоо
  const peerPending = data.peer
    .filter((p) => p.open)
    .reduce((n, p) => n + p.rows.filter((r) => r.targets.some((t) => !t.done)).length, 0);

  return (
    <div className="mx-auto max-w-[1400px] px-4">
      <h1 className="font-display text-2xl font-bold">👩‍🏫 Багшийн самбар</h1>
      {data.students.length > 0 && <DeadlineAlerts {...data} onOpenPeer={() => setTab("peer")} />}
      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${tab === t.id ? "bg-violet-600 text-white shadow" : "bg-white text-slate-600 hover:bg-violet-50"}`}
          >
            {t.label}
            {t.id === "integrity" && data.flags.length > 0 && <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 text-xs text-white">{data.flags.length}</span>}
            {t.id === "peer" && peerPending > 0 && <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 text-xs text-white">{peerPending}</span>}
          </button>
        ))}
      </div>
      <div className="mt-5">
        {tab === "grades" && <Gradebook {...data} />}
        {tab === "peer" && <PeerOverview {...data} />}
        {tab === "publish" && <PublishList {...data} />}
        {tab === "integrity" && <Integrity {...data} />}
        {tab === "roster" && <Roster students={data.students} />}
        {tab === "schedule" && <Schedule stages={data.stages} />}
      </div>
    </div>
  );
}
