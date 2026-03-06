import { createClient } from "@/lib/supabase-server";

export default async function CaptionsPage() {
  const supabase = createClient();
  const { data: captions } = await supabase
    .from("captions")
    .select("id, image_id, body, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <main className="card">
      <h1>Captions (Read Only)</h1>
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Image ID</th>
            <th>Caption</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {(captions ?? []).map((caption) => (
            <tr key={caption.id}>
              <td>{caption.id}</td>
              <td>{caption.image_id}</td>
              <td>{caption.body}</td>
              <td>{new Date(caption.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
