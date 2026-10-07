import { redirect } from "next/navigation";
import StudentLogin from "@/components/StudentLogin";
import { currentStudent } from "@/lib/auth";

export const metadata = { title: "Нэвтрэх · 8А Нийтлэл" };

export default async function LoginPage() {
  if (await currentStudent()) redirect("/me");
  return <StudentLogin />;
}
