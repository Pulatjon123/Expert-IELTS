import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminLoginForm } from "./AdminLoginForm";

export const metadata = { title: "Admin sign-in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user?.role === "ADMIN") redirect("/admin");
  return <AdminLoginForm />;
}
