import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentSuperadminUserId, withCreateAuditFields, withUpdateAuditFields } from "@/lib/admin-audit";
import { createAdminClient, createClient } from "@/lib/supabase-server";

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
  return row.image_description ?? row.title ?? row.name ?? row.caption ?? "";
}

function parseBoolean(value: FormDataEntryValue | null, fallback = false) {
  if (!value) return fallback;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "on" || normalized === "yes";
}

function parseMaybeJson(raw: string) {
  const value = raw.trim();
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
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

function isRlsError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("row-level security") || normalized.includes("permission denied");
}

async function uploadFileAndResolveUrl(file: File, preferredPathPrefix = "admin") {
  const supabase = createAdminClient();
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
    const userSupabase = createClient();
    const adminSupabase = createAdminClient();
    const userId = await getCurrentSuperadminUserId();
    const url = String(formData.get("url") ?? "").trim();
    const imageDescription = String(formData.get("image_description") ?? "").trim();
    const additionalContext = String(formData.get("additional_context") ?? "").trim();
    const profileId = String(formData.get("profile_id") ?? "").trim();
    const celebrityRecognition = String(formData.get("celebrity_recognition") ?? "").trim();
    const isPublic = parseBoolean(formData.get("is_public"), false);
    const isCommonUse = parseBoolean(formData.get("is_common_use"), false);
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

    const payload = withCreateAuditFields(
      {
        url: resolvedUrl,
        profile_id: profileId || userId,
        additional_context: additionalContext || null,
        is_public: isPublic,
        is_common_use: isCommonUse,
        image_description: imageDescription || null,
        celebrity_recognition: parseMaybeJson(celebrityRecognition)
      },
      userId
    ) as any;

    const { error: userError } = await userSupabase.from("images").insert(payload);
    if (userError && !isRlsError(userError.message)) {
      redirect(imageRouteWithStatus({ error: `Image row insert failed. ${userError.message}` }));
    }

    if (userError && isRlsError(userError.message)) {
      const { error: adminError } = await adminSupabase.from("images").insert(payload);
      if (adminError) {
        redirect(imageRouteWithStatus({ error: `Image row insert failed. ${adminError.message}` }));
      }
    }

    revalidatePath("/admin/images");
    redirect(imageRouteWithStatus({ success: "Image created successfully." }));
  } catch (error: any) {
    const signature = String(error?.digest ?? error?.message ?? "");
    if (signature.includes("NEXT_REDIRECT")) throw error;
    redirect(imageRouteWithStatus({ error: error?.message ?? "Unexpected server error while creating image." }));
  }
}

async function updateImage(formData: FormData) {
  "use server";

  try {
    const userSupabase = createClient();
    const adminSupabase = createAdminClient();
    const userId = await getCurrentSuperadminUserId();
    const id = String(formData.get("id"));
    const imageDescription = String(formData.get("image_description") ?? "").trim();
    const additionalContext = String(formData.get("additional_context") ?? "").trim();
    const profileId = String(formData.get("profile_id") ?? "").trim();
    const celebrityRecognition = String(formData.get("celebrity_recognition") ?? "").trim();
    const isPublic = parseBoolean(formData.get("is_public"), false);
    const isCommonUse = parseBoolean(formData.get("is_common_use"), false);
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

    const payload = withUpdateAuditFields(
      {
        url: resolvedUrl || null,
        profile_id: profileId || userId,
        additional_context: additionalContext || null,
        is_public: isPublic,
        is_common_use: isCommonUse,
        image_description: imageDescription || null,
        celebrity_recognition: parseMaybeJson(celebrityRecognition)
      },
      userId
    ) as any;

    const { error: userError } = await userSupabase.from("images").update(payload).eq("id", id);
    if (userError && !isRlsError(userError.message)) {
      redirect(imageRouteWithStatus({ error: `Image update failed. ${userError.message}` }));
    }

    if (userError && isRlsError(userError.message)) {
      const { error: adminError } = await adminSupabase.from("images").update(payload).eq("id", id);
      if (adminError) {
        redirect(imageRouteWithStatus({ error: `Image update failed. ${adminError.message}` }));
      }
    }

    revalidatePath("/admin/images");
    redirect(imageRouteWithStatus({ success: "Image updated successfully." }));
  } catch (error: any) {
    const signature = String(error?.digest ?? error?.message ?? "");
    if (signature.includes("NEXT_REDIRECT")) throw error;
    redirect(imageRouteWithStatus({ error: error?.message ?? "Unexpected server error while updating image." }));
  }
}

async function deleteImage(formData: FormData) {
  "use server";

  try {
    const userSupabase = createClient();
    const adminSupabase = createAdminClient();
    const userId = await getCurrentSuperadminUserId();
    const id = String(formData.get("id"));
    if (!userId) {
      redirect(imageRouteWithStatus({ error: "You must be signed in as superadmin to delete images." }));
    }
    const { error: userError } = await userSupabase.from("images").delete().eq("id", id);
    if (userError && !isRlsError(userError.message)) {
      redirect(imageRouteWithStatus({ error: `Image delete failed. ${userError.message}` }));
    }

    if (userError && isRlsError(userError.message)) {
      const { error: adminError } = await adminSupabase.from("images").delete().eq("id", id);
      if (adminError) {
        redirect(imageRouteWithStatus({ error: `Image delete failed. ${adminError.message}` }));
      }
    }
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
          Uses the images table columns directly: url, is_common_use, profile_id, additional_context, is_public,
          image_description, and celebrity_recognition.
        </p>
        <p className="form-note">Writes first use your signed-in Supabase session; if RLS blocks, superadmin fallback is used.</p>
        {errorMessage ? <p className="status-banner status-error">{errorMessage}</p> : null}
        {successMessage ? <p className="status-banner status-success">{successMessage}</p> : null}
        <form action={createImage} className="input-row">
          <input type="url" name="url" placeholder="https://... (optional if uploading file)" />
          <input name="image_description" placeholder="image_description" />
          <input name="additional_context" placeholder="additional_context (optional)" />
          <input name="profile_id" placeholder="profile_id (optional)" />
          <input name="celebrity_recognition" placeholder="celebrity_recognition (optional)" />
          <label>
            <input type="checkbox" name="is_public" defaultChecked /> is_public
          </label>
          <label>
            <input type="checkbox" name="is_common_use" /> is_common_use
          </label>
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
                        <a href={imageUrl(image)} target="_blank" rel="noreferrer">
                          <img className="image-preview" src={imageUrl(image)} alt={imageTitle(image) || "Uploaded image"} />
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <form action={updateImage} className="inline-edit-form">
                        <input type="hidden" name="id" value={image.id} />
                        <input name="image_description" defaultValue={image.image_description ?? ""} placeholder="image_description" />
                        <input name="additional_context" defaultValue={image.additional_context ?? ""} placeholder="additional_context" />
                        <input name="profile_id" defaultValue={image.profile_id ?? ""} placeholder="profile_id" />
                        <input
                          name="celebrity_recognition"
                          defaultValue={typeof image.celebrity_recognition === "string" ? image.celebrity_recognition : JSON.stringify(image.celebrity_recognition ?? "")}
                          placeholder="celebrity_recognition"
                        />
                        <input name="url" defaultValue={imageUrl(image)} placeholder="Image URL (or leave blank and upload file)" />
                        <label>
                          <input type="checkbox" name="is_public" defaultChecked={Boolean(image.is_public)} /> is_public
                        </label>
                        <label>
                          <input type="checkbox" name="is_common_use" defaultChecked={Boolean(image.is_common_use)} /> is_common_use
                        </label>
                        <input type="file" name="file" accept="image/*" />
                        <button type="submit">Save Changes</button>
                      </form>
                    </td>
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
