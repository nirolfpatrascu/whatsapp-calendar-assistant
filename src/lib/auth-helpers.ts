import { createClient } from "@/lib/supabase/server";
import { getUserByAuthId } from "@/lib/supabase/queries";

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const dbUser = await getUserByAuthId(authUser.id);
  return dbUser;
}
