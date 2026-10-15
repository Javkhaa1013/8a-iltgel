import { redirect } from "next/navigation";
import Report from "@/components/Report";
import { isTeacher } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Явцын тайлан · 8А" };

export default async function TeacherReportPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isTeacher())) redirect("/teacher");
  return <Report id={(await params).id} />;
}
