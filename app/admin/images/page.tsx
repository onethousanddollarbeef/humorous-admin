import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";

async function createImage(formData: FormData) {
  "use server";
  const supabase = createClient();
  const url = String(formData.get("url") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  if (!url) return;

  await supabase.from("images").insert({ url, title });
  revalidatePath("/admin/images");
}

async function updateImage(formData: FormData) {
  "use server";
  const supabase = createClient();
  const id = String(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();

  await supabase.from("images").update({ title, url }).eq("id", id);
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
  const { data: images } = await supabase
    .from("images")
    .select("id, title, url, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="grid">
      <section className="card">
        <h1>Images CRUD</h1>
        <form action={createImage} className="grid" style={{ gridTemplateColumns: "2fr 2fr auto" }}>
          <input type="url" name="url" placeholder="https://..." required />
          <input name="title" placeholder="image title" />
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
            {(images ?? []).map((image) => (
              <tr key={image.id}>
                <td>{image.id}</td>
                <td>
                  <a href={image.url} target="_blank">
                    {image.url}
                  </a>
                </td>
                <td>
                  <form action={updateImage} style={{ display: "flex", gap: 8 }}>
                    <input type="hidden" name="id" value={image.id} />
                    <input name="title" defaultValue={image.title ?? ""} />
                    <input name="url" defaultValue={image.url} />
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
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
