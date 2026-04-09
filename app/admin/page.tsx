import { createClient } from "@/lib/supabase-server";

type Row = Record<string, any>;

function pickImageUrl(row: Row) {
  return row.url ?? row.image_url ?? row.src ?? row.path ?? "";
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function pickCaptionText(row: Row) {
  return (
    normalizeText(row.generated_caption) ||
    normalizeText(row.body) ||
    normalizeText(row.content) ||
    normalizeText(row.caption) ||
    normalizeText(row.description) ||
    normalizeText(row.text)
  );
}

function pickImageTitle(row: Row, generatedCaption: string) {
  return normalizeText(row.title) || normalizeText(row.name) || generatedCaption || "No generated caption yet";
}

function ellipsize(text: string, max = 120) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
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
    { data: recentImages },
    { data: flavors },
    { data: captionRows }
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("images").select("id", { count: "exact", head: true }),
    supabase.from("captions").select("id", { count: "exact", head: true }),
    supabase.from("caption_requests").select("id", { count: "exact", head: true }),
    supabase.from("terms").select("id", { count: "exact", head: true }),
    supabase.from("llm_models").select("id", { count: "exact", head: true }),
    supabase.from("allowed_signup_domains").select("id", { count: "exact", head: true }),
    supabase.from("images").select("*").limit(24),
    supabase.from("humor_flavors").select("*"),
    supabase.from("captions").select("*").limit(400)
  ]);

  const sortedRecent = [...(recentImages ?? [])].sort((a: Row, b: Row) => {
    const ta = new Date(a.created_at ?? a.created_datetime_utc ?? 0).getTime();
    const tb = new Date(b.created_at ?? b.created_datetime_utc ?? 0).getTime();
    return tb - ta;
  });

  const flavorById = new Map<string, string>();
  for (const flavor of flavors ?? []) {
    const id = normalizeText((flavor as Row).id);
    const name =
      normalizeText((flavor as Row).name) ||
      normalizeText((flavor as Row).flavor_name) ||
      normalizeText((flavor as Row).title);
    if (id && name) flavorById.set(id, name);
  }

  const captionByImageId = new Map<string, string>();
  for (const caption of captionRows ?? []) {
    const row = caption as Row;
    const imageId = normalizeText(row.image_id ?? row.source_image_id ?? row.parent_image_id);
    const text = pickCaptionText(row);
    if (imageId && text && !captionByImageId.has(imageId)) {
      captionByImageId.set(imageId, text);
    }
  }

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

      <section className="grid image-gallery">
        {sortedRecent
          .filter((item: Row) => pickImageUrl(item))
          .slice(0, 12)
          .map((item: Row) => {
            const imageId = normalizeText(item.id);
            const generatedCaption = imageId ? captionByImageId.get(imageId) ?? "" : "";
            const flavorName =
              normalizeText(item.humor_flavor_name) ||
              normalizeText(item.flavor_name) ||
              flavorById.get(normalizeText(item.humor_flavor_id ?? item.flavor_id)) ||
              "Flavor not set";
            const title = pickImageTitle(item, generatedCaption);
            const description = generatedCaption || normalizeText(item.description) || "No generated description yet";

            return (
              <article className="card" key={`preview-${item.id}`}>
                <h3>{flavorName}</h3>
                <img className="hero-image" src={pickImageUrl(item)} alt={title} />
                <p className="image-title">{ellipsize(title, 88)}</p>
                <p className="image-description">{ellipsize(description, 180)}</p>
              </article>
            );
          })}
      </section>
    </main>
  );
}
