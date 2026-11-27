import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "../AuthForm";

export const metadata = { title: "Create account" };

export default async function Page() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  );
}
