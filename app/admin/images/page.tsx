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

export default async function ImagesPage() {
  const supabase = createClient();
  const { data } = await supabase.from("images").select("id, title, url, created_at").order("created_at", { ascending: false }).limit(100);

  return (
    <main className="card">
      <h1>Images CRUD</h1>
      <form action={createImage} style={{ display: "flex", gap: 8 }}>
        <input type="url" name="url" placeholder="https://..." required />
        <input name="title" placeholder="image title" />
        <button type="submit">Create</button>
      </form>
      <pre>{JSON.stringify(data ?? [], null, 2)}</pre>
    </main>
  );
}
