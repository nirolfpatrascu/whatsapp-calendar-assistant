import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/");
  }

  return <DashboardClient user={user} />;
}
