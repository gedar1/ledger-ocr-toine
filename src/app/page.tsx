import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Thin root-path landing redirect — distinct from src/proxy.ts's route
 * protection (which gates /admin/* and /app/* themselves). This only
 * decides where "/" should send a visitor: no session -> /login,
 * ACCOUNTANT -> /admin, CLIENT -> /app.
 */
export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "ACCOUNTANT") {
    redirect("/admin");
  }

  redirect("/app");
}
