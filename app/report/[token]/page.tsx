import { notFound } from "next/navigation";
import Report from "@/components/Report";
import { verifyReportToken } from "@/lib/auth";
import { getStudent } from "@/lib/data";
import { UUID_RE } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Явцын тайлан · 8А", robots: { index: false, follow: false } };

// Эцэг эхийн нууц холбоос: /report/<сурагчийн id>.<токен>
export default async function ParentReportPage({ params }: { params: Promise<{ token: string }> }) {
  const [id, token] = decodeURIComponent((await params).token).split(".");
  if (!id || !UUID_RE.test(id) || !verifyReportToken(id, token ?? "")) notFound();
  if (!(await getStudent(id))) notFound();
  return <Report id={id} forParent />;
}
