import { createClient } from "@/lib/supabase-server";
export default async function DashboardPage() {
  const supabase = createClient();
  const [{ count: users }, { count: images }, { count: captions }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("images").select("id", { count: "exact", head: true }),
    supabase.from("captions").select("id", { count: "exact", head: true })
  ]);
  return <main className="card"><h1>Admin Analytics</h1><p>Profiles: {users ?? 0}</p><p>Images: {images ?? 0}</p><p>Captions: {captions ?? 0}</p></main>;
}
