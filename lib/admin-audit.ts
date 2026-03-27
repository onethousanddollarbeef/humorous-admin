import { createClient } from "@/lib/supabase-server";

export async function getCurrentProfileId() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}
