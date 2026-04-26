import { createClient } from "@/lib/supabase-server";

type Row = Record<string, any>;

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function pickImageUrl(row: Row) {
  return (
    row.url ??
    row.image_url ??
    row.src ??
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

function pickCaptionBody(row: Row) {
  return (
    normalizeText(row.generated_caption) ||
    normalizeText(row.body) ||
    normalizeText(row.content) ||
    normalizeText(row.caption) ||
    "(empty caption)"
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
    { data: flavorMixRows },
    { data: flavorStepRows },
    { data: flavorThemeRows },
    captionScoresQuery,
    captionVotesQuery,
    captionRatingsQuery
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
    supabase.from("humor_flavor_mix").select("*").limit(500),
    supabase.from("humor_flavor_steps").select("*").limit(500),
    supabase.from("humor_flavor_theme_mappings").select("*").limit(500),
    supabase.from("caption_scores").select("*").limit(5000),
    supabase.from("caption_votes").select("*").limit(5000),
    supabase.from("caption_ratings").select("*").limit(5000)
  ]);

  const flavors = (flavorRows ?? []) as Row[];
  const captionData = (captionRows ?? []) as Row[];
  const ratingRows = !captionVotesQuery?.error
    ? ((captionVotesQuery?.data ?? []) as Row[])
    : !captionScoresQuery?.error
      ? ((captionScoresQuery?.data ?? []) as Row[])
      : !captionRatingsQuery?.error
        ? ((captionRatingsQuery?.data ?? []) as Row[])
        : [];
  const imagesByFlavor = new Map<string, Row>();
  const imagesById = new Map<string, Row>();
  const imageCounts = new Map<string, number>();
  const captionCounts = new Map<string, number>();
  const flavorAliasToId = new Map<string, string>();

  for (const flavor of flavors) {
    const flavorId = normalizeText(flavor.id);
    if (!flavorId) continue;
    for (const alias of [flavor.id, flavor.slug, flavor.name, flavor.flavor_name, flavor.title]) {
      const key = normalizeText(alias);
      if (key) flavorAliasToId.set(key, flavorId);
    }
  }

  const resolveFlavorId = (raw: unknown) => {
    const key = normalizeText(raw);
    if (!key) return "";
    return flavorAliasToId.get(key) ?? key;
  };

  for (const image of imageRows ?? []) {
    const row = image as Row;
    const imageId = normalizeText(row.id);
    if (imageId) imagesById.set(imageId, row);

    const flavorId = resolveFlavorId(row.humor_flavor_id ?? row.flavor_id ?? row.humor_flavor_slug ?? row.flavor_slug);
    if (!flavorId) continue;
    if (!imagesByFlavor.has(flavorId) && pickImageUrl(row)) imagesByFlavor.set(flavorId, row);
    imageCounts.set(flavorId, (imageCounts.get(flavorId) ?? 0) + 1);
  }

  for (const mix of flavorMixRows ?? []) {
    const row = mix as Row;
    const flavorId = resolveFlavorId(row.humor_flavor_id ?? row.flavor_id ?? row.humor_flavor_slug ?? row.flavor_slug);
    const imageId = normalizeText(row.image_id ?? row.source_image_id);
    const image = imagesById.get(imageId);
    if (flavorId && image && pickImageUrl(image) && !imagesByFlavor.has(flavorId)) {
      imagesByFlavor.set(flavorId, image);
    }
    if (flavorId) imageCounts.set(flavorId, Math.max(imageCounts.get(flavorId) ?? 0, 1));
  }

  for (const step of flavorStepRows ?? []) {
    const row = step as Row;
    const flavorId = resolveFlavorId(
      row.humor_flavor_id ?? row.flavor_id ?? row.humor_flavor_slug ?? row.flavor_slug ?? row.parent_flavor_id
    );
    const imageId = normalizeText(row.image_id ?? row.source_image_id ?? row.reference_image_id ?? row.primary_image_id);
    const image = imagesById.get(imageId);
    if (flavorId && image && pickImageUrl(image) && !imagesByFlavor.has(flavorId)) {
      imagesByFlavor.set(flavorId, image);
    }
    if (flavorId) imageCounts.set(flavorId, Math.max(imageCounts.get(flavorId) ?? 0, 1));
  }

  for (const theme of flavorThemeRows ?? []) {
    const row = theme as Row;
    const flavorId = resolveFlavorId(
      row.humor_flavor_id ?? row.flavor_id ?? row.humor_flavor_slug ?? row.flavor_slug ?? row.parent_flavor_id
    );
    const imageId = normalizeText(row.image_id ?? row.source_image_id ?? row.reference_image_id ?? row.primary_image_id);
    const image = imagesById.get(imageId);
    if (flavorId && image && pickImageUrl(image) && !imagesByFlavor.has(flavorId)) {
      imagesByFlavor.set(flavorId, image);
    }
    if (flavorId) imageCounts.set(flavorId, Math.max(imageCounts.get(flavorId) ?? 0, 1));
  }

  for (const caption of captionData) {
    const flavorId = resolveFlavorId(
      caption.humor_flavor_id ?? caption.flavor_id ?? caption.humor_flavor_slug ?? caption.flavor_slug
    );
    if (!flavorId) continue;
    captionCounts.set(flavorId, (captionCounts.get(flavorId) ?? 0) + 1);
  }

  // Caption rating aggregates
  let totalUpvotes = 0;
  let totalDownvotes = 0;
  let totalRatings = 0;
  let weightedScoreSum = 0;

  const captionTextById = new Map<string, string>();
  for (const caption of captionData) {
    const captionId = normalizeText(caption.id);
    if (captionId) captionTextById.set(captionId, pickCaptionBody(caption));
  }

  const voteByCaptionId = new Map<string, { upvotes: number; downvotes: number; votes: number; scoreSum: number }>();
  const scoreRowsByText: Array<{ id: string; text: string; totalVotes: number }> = [];

  for (const rating of ratingRows) {
    const displayText = normalizeText(rating.display_text);
    const totalVotesFromScoreTable = toNumber(rating.total_votes ?? rating.vote_total);
    if (displayText) {
      scoreRowsByText.push({
        id: normalizeText(rating.id) || displayText.slice(0, 16),
        text: displayText,
        totalVotes: totalVotesFromScoreTable
      });
      continue;
    }
    const captionId = normalizeText(
      rating.caption_id ?? rating.target_caption_id ?? rating.captions_id ?? rating.caption_example_id
    );
    if (!captionId) continue;
    const existing = voteByCaptionId.get(captionId) ?? { upvotes: 0, downvotes: 0, votes: 0, scoreSum: 0 };
    const vote = toNumber(
      rating.vote ??
        rating.vote_value ??
        rating.score ??
        rating.rating ??
        rating.score_value ??
        rating.value ??
        (rating.is_upvote === true ? 1 : rating.is_upvote === false ? -1 : 0)
    );

    if (vote > 0) existing.upvotes += 1;
    else if (vote < 0) existing.downvotes += 1;

    if (vote !== 0) {
      existing.votes += 1;
      existing.scoreSum += vote;
    }

    voteByCaptionId.set(captionId, existing);
  }

  // If caption_scores has display_text/total_votes, build top list directly from it.
  let topRatedCaptions = scoreRowsByText
    .map((row) => {
      const upvotes = row.totalVotes > 0 ? row.totalVotes : 0;
      const downvotes = row.totalVotes < 0 ? Math.abs(row.totalVotes) : 0;
      const votes = Math.abs(row.totalVotes);
      const score = row.totalVotes;

      totalUpvotes += upvotes;
      totalDownvotes += downvotes;
      totalRatings += votes;
      weightedScoreSum += score;

      return {
        id: row.id,
        text: row.text,
        score,
        votes,
        upvotes,
        downvotes
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.votes - a.votes;
    })
    .slice(0, 8);

  if (topRatedCaptions.length === 0) {
    topRatedCaptions = Array.from(voteByCaptionId.entries())
      .map(([captionId, agg]) => {
        const score = agg.votes > 0 ? agg.scoreSum / agg.votes : 0;
        const text = captionTextById.get(captionId) ?? `Caption ID: ${captionId}`;

        totalUpvotes += agg.upvotes;
        totalDownvotes += agg.downvotes;
        totalRatings += agg.votes;
        weightedScoreSum += score * Math.max(1, agg.votes);

        return {
          id: captionId,
          text,
          score,
          votes: agg.votes,
          upvotes: agg.upvotes,
          downvotes: agg.downvotes
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.votes - a.votes;
      })
      .slice(0, 8);
  }

  // Fallback path when rating rows are missing: use denormalized caption columns.
  if (topRatedCaptions.length === 0) {
    topRatedCaptions = [...captionData]
      .map((row) => {
        const upvotes = toNumber(row.upvotes ?? row.likes ?? row.positive_votes);
        const downvotes = toNumber(row.downvotes ?? row.dislikes ?? row.negative_votes);
        const votes = toNumber(row.vote_count ?? row.rating_count ?? upvotes + downvotes);
        const score = toNumber(row.avg_vote ?? row.average_vote ?? row.score ?? row.rating);
        const resolvedVotes = votes || upvotes + downvotes;

        totalUpvotes += upvotes;
        totalDownvotes += downvotes;
        totalRatings += resolvedVotes;
        weightedScoreSum += score * Math.max(1, resolvedVotes);

        return {
          id: normalizeText(row.id),
          text: pickCaptionBody(row),
          score,
          votes: resolvedVotes,
          upvotes,
          downvotes
        };
      })
      .filter((row) => row.votes > 0 || row.score !== 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.votes - a.votes;
      })
      .slice(0, 8);
  }

  const netVotes = totalUpvotes - totalDownvotes;
  const weightedAvgScore = totalRatings > 0 ? weightedScoreSum / totalRatings : 0;

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
          <h3>Caption Rating Snapshot</h3>
          <div className="rating-summary-grid">
            <div>
              <span>Total Upvotes</span>
              <strong>{totalUpvotes}</strong>
            </div>
            <div>
              <span>Total Downvotes</span>
              <strong>{totalDownvotes}</strong>
            </div>
            <div>
              <span>Net Votes</span>
              <strong>{netVotes}</strong>
            </div>
            <div>
              <span>Weighted Avg Score</span>
              <strong>{weightedAvgScore.toFixed(2)}</strong>
            </div>
          </div>
        </article>

        <article className="card">
          <h3>Top Rated Captions</h3>
          <div className="table-wrap">
            <table className="table compact-table">
              <thead>
                <tr>
                  <th>Caption</th>
                  <th>Score</th>
                  <th>Votes</th>
                </tr>
              </thead>
              <tbody>
                {topRatedCaptions.length === 0 ? (
                  <tr>
                    <td colSpan={3}>No rated captions found yet.</td>
                  </tr>
                ) : (
                  topRatedCaptions.map((caption) => (
                    <tr key={caption.id || caption.text.slice(0, 12)}>
                      <td>{ellipsize(caption.text, 100)}</td>
                      <td>{caption.score.toFixed(2)}</td>
                      <td>{caption.votes}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
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
