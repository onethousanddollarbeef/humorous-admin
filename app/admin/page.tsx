import { createClient } from "@/lib/supabase-server";

type Row = Record<string, any>;

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function pickImageUrl(row: Row) {
  return (
    row.url ??
    row.image_url ??
    row.src ??
    row.path ??
    row.storage_url ??
    row.public_url ??
    row.original_url ??
    row.source_url ??
    ""
  );
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
    { data: captionRows },
    { data: flavorMixRows }
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
    supabase.from("captions").select("*").limit(500),
    supabase.from("humor_flavor_mix").select("*").limit(500)
  ]);

  const flavors = (flavorRows ?? []) as Row[];
  const imagesByFlavor = new Map<string, Row>();
  const imagesById = new Map<string, Row>();
  const imageCounts = new Map<string, number>();
  const captionCounts = new Map<string, number>();
  const flavorLookup = new Map<string, string>();

  for (const flavor of flavors) {
    const id = normalizeText(flavor.id);
    const name = pickFlavorName(flavor);
    if (id) flavorLookup.set(id, name);
    if (name) flavorLookup.set(name.toLowerCase(), id || name);
  }

  for (const image of imageRows ?? []) {
    const row = image as Row;
    const imageId = normalizeText(row.id);
    if (imageId) imagesById.set(imageId, row);

    const flavorId = normalizeText(row.humor_flavor_id ?? row.flavor_id ?? row.humor_flavor_slug ?? row.flavor_slug);
    if (!flavorId) continue;
    if (!imagesByFlavor.has(flavorId) && pickImageUrl(row)) imagesByFlavor.set(flavorId, row);
    imageCounts.set(flavorId, (imageCounts.get(flavorId) ?? 0) + 1);
  }

  // Bridge table fallback: humor_flavor_mix often links flavor<->image when images table doesn't include direct flavor_id.
  for (const mix of flavorMixRows ?? []) {
    const row = mix as Row;
    const flavorId = normalizeText(row.humor_flavor_id ?? row.flavor_id);
    const imageId = normalizeText(row.image_id ?? row.source_image_id);
    const image = imagesById.get(imageId);
    if (flavorId && image && pickImageUrl(image) && !imagesByFlavor.has(flavorId)) {
      imagesByFlavor.set(flavorId, image);
    }
    if (flavorId) imageCounts.set(flavorId, Math.max(imageCounts.get(flavorId) ?? 0, 1));
  }

  for (const caption of captionRows ?? []) {
    const row = caption as Row;
    const flavorId = normalizeText(row.humor_flavor_id ?? row.flavor_id ?? row.humor_flavor_slug ?? row.flavor_slug);
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
                <div className="hero-image placeholder-image">No image mapped to this flavor</div>
              )}
              <p className="image-description">{ellipsize(description, 220)}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
