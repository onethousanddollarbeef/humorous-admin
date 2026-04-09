import { createClient } from "@/lib/supabase-server";

type Row = Record<string, any>;

function pickDate(row: Row) {
  const value = row.created_at ?? row.created_datetime_utc ?? row.inserted_at ?? row.updated_at;
  return value ? new Date(value).toLocaleString() : "-";
}

function pickOwner(row: Row) {
  return row.user_id ?? row.profile_id ?? row.owner_id ?? "-";
}

function pickImageUrl(row: Row) {
  return row.url ?? row.image_url ?? row.src ?? row.path ?? "";
}

function pickTitle(row: Row) {
  return row.title ?? row.name ?? row.caption ?? "Untitled image";
}

function pickFlavor(row: Row) {
  return row.humor_flavor_name ?? row.humor_flavor_id ?? row.flavor_name ?? row.flavor_id ?? "Unassigned";
}

export default async function DashboardPage() {
  const supabase = createClient();

  const [
    { count: users },
    { count: images },
    { count: captions },
    { count: requests },
    { count: terms },
    { count: models },
    { count: domains },
    { data: recentImages }
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("images").select("id", { count: "exact", head: true }),
    supabase.from("captions").select("id", { count: "exact", head: true }),
    supabase.from("caption_requests").select("id", { count: "exact", head: true }),
    supabase.from("terms").select("id", { count: "exact", head: true }),
    supabase.from("llm_models").select("id", { count: "exact", head: true }),
    supabase.from("allowed_signup_domains").select("id", { count: "exact", head: true }),
    supabase.from("images").select("*").limit(12)
  ]);

  const sortedRecent = [...(recentImages ?? [])].sort((a: Row, b: Row) => {
    const ta = new Date(a.created_at ?? a.created_datetime_utc ?? 0).getTime();
    const tb = new Date(b.created_at ?? b.created_datetime_utc ?? 0).getTime();
    return tb - ta;
  });

  const burstiness = (sortedRecent.length ?? 0) >= 5 ? "🔥 Meme storm" : "🌱 Slow drip";

  return (
    <main className="grid" style={{ gap: 16 }}>
      <h1>Analytics</h1>
      <p className="admin-sidebar-subtitle" style={{ marginTop: -8 }}>Humor flavor performance</p>

      <section className="grid stats">
        <div className="card metric-card">
          <h3>Total Profiles</h3>
          <p>{users ?? 0}</p>
        </div>
        <div className="card metric-card">
          <h3>Total Images</h3>
          <p>{images ?? 0}</p>
        </div>
        <div className="card metric-card">
          <h3>Total Captions</h3>
          <p>{captions ?? 0}</p>
        </div>
        <div className="card metric-card">
          <h3>Caption Requests</h3>
          <p>{requests ?? 0}</p>
        </div>
        <div className="card metric-card">
          <h3>Terms</h3>
          <p>{terms ?? 0}</p>
        </div>
        <div className="card metric-card">
          <h3>LLM Models</h3>
          <p>{models ?? 0}</p>
        </div>
        <div className="card metric-card">
          <h3>Allowed Domains</h3>
          <p>{domains ?? 0}</p>
        </div>
        <div className="card metric-card">
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
              <th>Owner ID</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {sortedRecent.length === 0 ? (
              <tr>
                <td colSpan={3}>No images found.</td>
              </tr>
            ) : (
              sortedRecent.map((item: Row) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{pickOwner(item)}</td>
                  <td>{pickDate(item)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="grid image-gallery">
        {sortedRecent
          .filter((item: Row) => pickImageUrl(item))
          .slice(0, 6)
          .map((item: Row) => (
            <article className="card" key={`preview-${item.id}`}>
              <h3>{pickFlavor(item)}</h3>
              <img className="hero-image" src={pickImageUrl(item)} alt={pickTitle(item)} />
              <p style={{ margin: "8px 0 0" }}>{pickTitle(item)}</p>
            </article>
          ))}
      </section>
    </main>
  );
}
