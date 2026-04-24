import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAuditUserId, withCreateAuditFields, withUpdateAuditFields } from "@/lib/admin-audit";
import { createClient } from "@/lib/supabase-server";

type Row = Record<string, any>;

type PageProps = {
  searchParams?: {
    error?: string;
    success?: string;
  };
};

function imageUrl(row: Row) {
  return row.url ?? row.image_url ?? row.src ?? row.path ?? "";
}

function imageTitle(row: Row) {
  return row.title ?? row.name ?? row.caption ?? "";
}

function imageFlavor(row: Row) {
  return row.humor_flavor_name ?? row.humor_flavor_id ?? row.flavor_name ?? row.flavor_id ?? "-";
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function candidateBuckets() {
  const configured = process.env.SUPABASE_IMAGES_BUCKET;
  return [...new Set([configured, "images", "image_uploads", "uploads"].filter(Boolean) as string[])];
}

function imageRouteWithStatus(status: { success?: string; error?: string }) {
  const query = new URLSearchParams();
  if (status.success) query.set("success", status.success);
  if (status.error) query.set("error", status.error);
  const suffix = query.toString();
  return suffix ? `/admin/images?${suffix}` : "/admin/images";
}

async function uploadFileAndResolveUrl(file: File, preferredPathPrefix = "admin") {
  const supabase = createClient();
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const safeName = sanitizeFilename(file.name || `upload.${extension}`);
  const path = `${preferredPathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
  const bytes = await file.arrayBuffer();
  const attempted: string[] = [];

  for (const bucket of candidateBuckets()) {
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, bytes, {
      contentType: file.type || undefined,
      upsert: false,
      cacheControl: "3600"
    });

    if (uploadError) {
      attempted.push(`${bucket}: ${uploadError.message}`);
      continue;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    if (!data.publicUrl) {
      attempted.push(`${bucket}: public URL unavailable`);
      continue;
    }

    return data.publicUrl;
  }

  return { error: `Image upload failed for all buckets. ${attempted.join(" | ")}` } as const;
}

async function createImage(formData: FormData) {
  "use server";

  try {
    const supabase = createClient();
    const userId = await getCurrentAuditUserId();
    const url = String(formData.get("url") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const file = formData.get("file") as File | null;

    if (!userId) {
      redirect(imageRouteWithStatus({ error: "You must be signed in as superadmin to create images." }));
    }

    let resolvedUrl = url;

    if (!resolvedUrl && file && file.size > 0) {
      const uploadResult = await uploadFileAndResolveUrl(file);
      if (typeof uploadResult === "object" && "error" in uploadResult) {
        redirect(imageRouteWithStatus({ error: uploadResult.error }));
      }
      resolvedUrl = uploadResult;
    }

    if (!resolvedUrl) {
      redirect(imageRouteWithStatus({ error: "Provide either an image URL or a file to upload." }));
    }

    const payloads = [
      { url: resolvedUrl, title },
      { image_url: resolvedUrl, title },
      { src: resolvedUrl, title },
      { path: resolvedUrl, title }
    ];

    let lastError: string | null = null;
    for (const payload of payloads) {
      const { error } = await supabase.from("images").insert(withCreateAuditFields(payload, userId) as any);
      if (!error) {
        revalidatePath("/admin/images");
        redirect(imageRouteWithStatus({ success: "Image created successfully." }));
      }
      lastError = error.message;
    }

    redirect(imageRouteWithStatus({ error: `Image row insert failed. ${lastError ?? "Unknown error."}` }));
  } catch (error: any) {
    const signature = String(error?.digest ?? error?.message ?? "");
    if (signature.includes("NEXT_REDIRECT")) throw error;
    redirect(imageRouteWithStatus({ error: error?.message ?? "Unexpected server error while creating image." }));
  }
}

async function updateImage(formData: FormData) {
  "use server";

  try {
    const supabase = createClient();
    const userId = await getCurrentAuditUserId();
    const id = String(formData.get("id"));
    const title = String(formData.get("title") ?? "").trim();
    const url = String(formData.get("url") ?? "").trim();
    const file = formData.get("file") as File | null;

    if (!userId) {
      redirect(imageRouteWithStatus({ error: "You must be signed in as superadmin to update images." }));
    }

    let resolvedUrl = url;

    if (!resolvedUrl && file && file.size > 0) {
      const uploadResult = await uploadFileAndResolveUrl(file, "admin/updates");
      if (typeof uploadResult === "object" && "error" in uploadResult) {
        redirect(imageRouteWithStatus({ error: uploadResult.error }));
      }
      resolvedUrl = uploadResult;
    }

    const payloads = [{ title, url: resolvedUrl }, { title, image_url: resolvedUrl }, { title, src: resolvedUrl }, { title, path: resolvedUrl }];
    let lastError: string | null = null;
    for (const payload of payloads) {
      const { error } = await supabase.from("images").update(withUpdateAuditFields(payload, userId) as any).eq("id", id);
      if (!error) {
        revalidatePath("/admin/images");
        redirect(imageRouteWithStatus({ success: "Image updated successfully." }));
      }
      lastError = error.message;
    }

    redirect(imageRouteWithStatus({ error: `Image update failed. ${lastError ?? "Unknown error."}` }));
  } catch (error: any) {
    const signature = String(error?.digest ?? error?.message ?? "");
    if (signature.includes("NEXT_REDIRECT")) throw error;
    redirect(imageRouteWithStatus({ error: error?.message ?? "Unexpected server error while updating image." }));
  }
}

async function deleteImage(formData: FormData) {
  "use server";

  try {
    const supabase = createClient();
    const id = String(formData.get("id"));
    await supabase.from("images").delete().eq("id", id);
    revalidatePath("/admin/images");
    redirect(imageRouteWithStatus({ success: "Image deleted successfully." }));
  } catch (error: any) {
    const signature = String(error?.digest ?? error?.message ?? "");
    if (signature.includes("NEXT_REDIRECT")) throw error;
    redirect(imageRouteWithStatus({ error: error?.message ?? "Unexpected server error while deleting image." }));
  }
}

export default async function ImagesPage({ searchParams }: PageProps) {
  const supabase = createClient();
  const { data: images } = await supabase.from("images").select("*").limit(100);

  const errorMessage = searchParams?.error ? decodeURIComponent(String(searchParams.error)) : "";
  const successMessage = searchParams?.success ? decodeURIComponent(String(searchParams.success)) : "";

  return (
    <main className="grid">
      <section className="card">
        <h1>Images CRUD</h1>
        <p className="form-note">
          Audit fields are attached automatically when images are created or updated. Upload bucket defaults to
          `images`, and can be overridden with `SUPABASE_IMAGES_BUCKET`.
        </p>
        <p className="form-note">
          Update flow: edit title and URL inline, or upload a replacement file while leaving URL blank.
        </p>
        {errorMessage ? <p className="status-banner status-error">{errorMessage}</p> : null}
        {successMessage ? <p className="status-banner status-success">{successMessage}</p> : null}
        <form action={createImage} className="input-row">
          <input type="url" name="url" placeholder="https://... (optional if uploading file)" />
          <input name="title" placeholder="image title" />
          <input type="file" name="file" accept="image/*" />
          <button type="submit">Create</button>
        </form>
      </section>

      <section className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Preview</th>
                <th>Edit Image</th>
                <th>Flavor</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(images ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5}>No images found.</td>
                </tr>
              ) : (
                (images ?? []).map((image: Row) => (
                  <tr key={image.id}>
                    <td>{image.id}</td>
                    <td>
                      {imageUrl(image) ? (
                        <a href={imageUrl(image)} target="_blank" rel="noreferrer">
                          <img className="image-preview" src={imageUrl(image)} alt={imageTitle(image) || "Uploaded image"} />
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={{ minWidth: 360 }}>
                      <form action={updateImage} className="inline-edit-form">
                        <input type="hidden" name="id" value={image.id} />
                        <input name="title" defaultValue={imageTitle(image)} placeholder="Image title" />
                        <input name="url" defaultValue={imageUrl(image)} placeholder="Image URL (or leave blank and upload file)" />
                        <input type="file" name="file" accept="image/*" />
                        <button type="submit">Save Changes</button>
                      </form>
                    </td>
                    <td>{imageFlavor(image)}</td>
                    <td>
                      <form action={deleteImage} className="inline-edit-actions">
                        <input type="hidden" name="id" value={image.id} />
                        <button type="submit">Delete</button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
