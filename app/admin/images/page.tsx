import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { getCurrentProfileId } from "@/lib/admin-audit";

type Row = Record<string, any>;

function imageUrl(row: Row) {
  return row.url ?? row.image_url ?? row.src ?? row.path ?? "";
}

function imageTitle(row: Row) {
  return row.title ?? row.name ?? row.caption ?? "";
}

async function createImage(formData: FormData) {
  "use server";
  const supabase = createClient();
  const profileId = await getCurrentProfileId();
  const url = String(formData.get("url") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("file") as File | null;

  let resolvedUrl = url;

  if (!resolvedUrl && file && file.size > 0) {
    const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("images").upload(path, file, {
      contentType: file.type || undefined
    });

    if (!uploadError) {
      const { data } = supabase.storage.from("images").getPublicUrl(path);
      resolvedUrl = data.publicUrl;
    }
  }

  if (!resolvedUrl || !profileId) return;

  const payloads = [
    { url: resolvedUrl, title },
    { image_url: resolvedUrl, title },
    { src: resolvedUrl, title },
    { path: resolvedUrl, title }
  ];
  for (const payload of payloads) {
    const { error } = await supabase.from("images").insert({
      ...payload,
      created_by_user_id: profileId,
      modified_by_user_id: profileId
    } as any);
    if (!error) break;
  }

  revalidatePath("/admin/images");
}

async function updateImage(formData: FormData) {
  "use server";
  const supabase = createClient();
  const profileId = await getCurrentProfileId();
  const id = String(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!profileId) return;

  const payloads = [{ title, url }, { title, image_url: url }, { title, src: url }, { title, path: url }];
  for (const payload of payloads) {
    const { error } = await supabase
      .from("images")
      .update({ ...payload, modified_by_user_id: profileId } as any)
      .eq("id", id);
    if (!error) break;
  }

  revalidatePath("/admin/images");
}

async function deleteImage(formData: FormData) {
  "use server";
  const supabase = createClient();
  const id = String(formData.get("id"));
  await supabase.from("images").delete().eq("id", id);
  revalidatePath("/admin/images");
}

export default async function ImagesPage() {
  const supabase = createClient();
  const { data: images } = await supabase.from("images").select("*").limit(100);

  return (
    <main className="grid">
      <section className="card">
        <h1>Images CRUD</h1>
        <form action={createImage} className="grid" style={{ gridTemplateColumns: "2fr 2fr 2fr auto" }}>
          <input type="url" name="url" placeholder="https://... (optional if uploading file)" />
          <input name="title" placeholder="image title" />
          <input type="file" name="file" accept="image/*" />
          <button type="submit">Create</button>
        </form>
      </section>

      <section className="card">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>URL</th>
              <th>Title</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(images ?? []).length === 0 ? (
              <tr>
                <td colSpan={4}>No images found.</td>
              </tr>
            ) : (
              (images ?? []).map((image: Row) => (
                <tr key={image.id}>
                  <td>{image.id}</td>
                  <td>
                    {imageUrl(image) ? (
                      <a href={imageUrl(image)} target="_blank">
                        {imageUrl(image)}
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    <form action={updateImage} style={{ display: "flex", gap: 8 }}>
                      <input type="hidden" name="id" value={image.id} />
                      <input name="title" defaultValue={imageTitle(image)} />
                      <input name="url" defaultValue={imageUrl(image)} />
                      <button type="submit">Update</button>
                    </form>
                  </td>
                  <td>
                    <form action={deleteImage}>
                      <input type="hidden" name="id" value={image.id} />
                      <button type="submit">Delete</button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
