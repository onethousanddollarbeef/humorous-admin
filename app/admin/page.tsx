import { createClient } from "@/lib/supabase-server";

export default async function DashboardPage() {
  const supabase = createClient();

  const [{ count: users }, { count: images }, { count: captions }, { data: recentImages }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("images").select("id", { count: "exact", head: true }),
    supabase.from("captions").select("id", { count: "exact", head: true }),
    supabase
      .from("images")
      .select("id, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(8)
  ]);

  const burstiness = (recentImages?.length ?? 0) >= 5 ? "🔥 Meme storm" : "🌱 Slow drip";

  return (
    <main className="grid" style={{ gap: 16 }}>
      <h1>Admin Analytics</h1>
      <section className="grid stats">
        <div className="card">
          <h3>Total Profiles</h3>
          <p>{users ?? 0}</p>
        </div>
        <div className="card">
          <h3>Total Images</h3>
          <p>{images ?? 0}</p>
        </div>
        <div className="card">
          <h3>Total Captions</h3>
          <p>{captions ?? 0}</p>
        </div>
        <div className="card">
          <h3>Upload Tempo</h3>
          <p>{burstiness}</p>
        </div>
      </section>

      <section className="card">
        <h3>Latest Image Uploads</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Image ID</th>
              <th>User ID</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {(recentImages ?? []).map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.user_id ?? "-"}</td>
                <td>{new Date(item.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
