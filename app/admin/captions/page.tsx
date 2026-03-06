import { createClient } from "@/lib/supabase-server";
export default async function CaptionsPage() {
  const supabase = createClient();
  const { data } = await supabase.from("captions").select("id, image_id, body, created_at").order("created_at", { ascending: false }).limit(200);
  return <main className="card"><h1>Captions (Read Only)</h1><pre>{JSON.stringify(data ?? [], null, 2)}</pre></main>;
}
