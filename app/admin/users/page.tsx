import { createClient } from "@/lib/supabase-server";
export default async function UsersPage() {
  const supabase = createClient();
  const { data } = await supabase.from("profiles").select("id, username, is_superadmin, created_at").order("created_at", { ascending: false }).limit(100);
  return <main className="card"><h1>Users / Profiles (Read Only)</h1><pre>{JSON.stringify(data ?? [], null, 2)}</pre></main>;
}
