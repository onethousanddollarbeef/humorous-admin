import { createClient } from "@/lib/supabase-server";

type Row = Record<string, any>;

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function pickImageUrl(row: Row) {
  return row.url ?? row.image_url ?? row.src ?? row.path ?? "";
}

function pickFlavorName(row: Row) {
  return normalizeText(row.slug) || normalizeText(row.name) || normalizeText(row.flavor_name) || normalizeText(row.title);
}

function pickFlavorDescription(row: Row) {
  return (
    normalizeText(row.description) ||
    normalizeText(row.details) ||
    normalizeText(row.summary) ||
    normalizeText(row.prompt) ||
    "No flavor description provided."
  );
}

function ellipsize(text: string, max = 140) {
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
    { data: flavorRows },
    { data: imageRows },
    { data: captionRows }
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("images").select("id", { count: "exact", head: true }),
    supabase.from("captions").select("id", { count: "exact", head: true }),
    supabase.from("caption_requests").select("id", { count: "exact", head: true }),
    supabase.from("terms").select("id", { count: "exact", head: true }),
    supabase.from("llm_models").select("id", { count: "exact", head: true }),
    supabase.from("allowed_signup_domains").select("id", { count: "exact", head: true }),
    supabase.from("humor_flavors").select("*").limit(50),
    supabase.from("images").select("*").limit(500),
    supabase.from("captions").select("*").limit(500)
  ]);

  const flavors = (flavorRows ?? []) as Row[];
  const imagesByFlavor = new Map<string, Row>();
  const imageCounts = new Map<string, number>();
  const captionCounts = new Map<string, number>();

  for (const image of imageRows ?? []) {
    const row = image as Row;
    const flavorId = normalizeText(row.humor_flavor_id ?? row.flavor_id);
    if (!flavorId) continue;
    if (!imagesByFlavor.has(flavorId) && pickImageUrl(row)) imagesByFlavor.set(flavorId, row);
    imageCounts.set(flavorId, (imageCounts.get(flavorId) ?? 0) + 1);
  }

  for (const caption of captionRows ?? []) {
    const row = caption as Row;
    const flavorId = normalizeText(row.humor_flavor_id ?? row.flavor_id);
    if (!flavorId) continue;
    captionCounts.set(flavorId, (captionCounts.get(flavorId) ?? 0) + 1);
  }

  const maxImageCount = Math.max(1, ...Array.from(imageCounts.values()));
  const maxCaptionCount = Math.max(1, ...Array.from(captionCounts.values()));

  return (
    <main className="grid" style={{ gap: 16 }}>
      <h1>Analytics</h1>
      <p className="admin-sidebar-subtitle" style={{ marginTop: -8 }}>Flavor overview with image previews</p>

      <section className="grid stats">
        <div className="card metric-card">
          <h3>Users</h3>
          <p>{users ?? 0}</p>
        </div>
        <div className="card metric-card">
          <h3>Images</h3>
          <p>{images ?? 0}</p>
        </div>
        <div className="card metric-card">
          <h3>Captions</h3>
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
      </section>

      <section className="grid quick-graphs">
        <article className="card">
          <h3>Images by Flavor</h3>
          <div className="graph-list">
            {flavors.map((flavor) => {
              const id = normalizeText(flavor.id);
              const name = pickFlavorName(flavor) || "Unnamed flavor";
              const count = imageCounts.get(id) ?? 0;
              const widthPct = Math.max(6, Math.round((count / maxImageCount) * 100));
              return (
                <div className="bar-row" key={`img-${id}`}>
                  <span>{name}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${widthPct}%` }} />
                  </div>
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
        </article>

        <article className="card">
          <h3>Captions by Flavor</h3>
          <div className="graph-list">
            {flavors.map((flavor) => {
              const id = normalizeText(flavor.id);
              const name = pickFlavorName(flavor) || "Unnamed flavor";
              const count = captionCounts.get(id) ?? 0;
              const widthPct = Math.max(6, Math.round((count / maxCaptionCount) * 100));
              return (
                <div className="bar-row" key={`cap-${id}`}>
                  <span>{name}</span>
                  <div className="bar-track">
                    <div className="bar-fill bar-fill-alt" style={{ width: `${widthPct}%` }} />
                  </div>
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="grid image-gallery">
        {flavors.map((flavor) => {
          const flavorId = normalizeText(flavor.id);
          const flavorName = pickFlavorName(flavor) || "Unnamed flavor";
          const description = pickFlavorDescription(flavor);
          const image = imagesByFlavor.get(flavorId);
          const imageUrl = image ? pickImageUrl(image) : "";

          return (
            <article className="card" key={`flavor-${flavorId || flavorName}`}>
              <h3>{flavorName}</h3>
              {imageUrl ? (
                <img className="hero-image" src={imageUrl} alt={flavorName} />
              ) : (
                <div className="hero-image placeholder-image">No image yet</div>
              )}
              <p className="image-description">{ellipsize(description, 220)}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
