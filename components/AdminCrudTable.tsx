import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";

type Props = {
  title: string;
  table: string;
  path: string;
  limit?: number;
  canCreate?: boolean;
  canDelete?: boolean;
};

function parsePayload(raw: FormDataEntryValue | null) {
  if (!raw) return null;
  const text = String(raw).trim();
  if (!text) return null;
  return JSON.parse(text) as Record<string, unknown>;
}

export default async function AdminCrudTable({
  title,
  table,
  path,
  limit = 200,
  canCreate = true,
  canDelete = true
}: Props) {
  async function createRow(formData: FormData) {
    "use server";
    const supabase = createClient();
    const payload = parsePayload(formData.get("payload"));
    if (!payload) return;
    await supabase.from(table).insert(payload);
    revalidatePath(path);
  }

  async function updateRow(formData: FormData) {
    "use server";
    const supabase = createClient();
    const id = String(formData.get("id") ?? "").trim();
    const payload = parsePayload(formData.get("payload"));
    if (!id || !payload) return;
    await supabase.from(table).update(payload).eq("id", id);
    revalidatePath(path);
  }

  async function deleteRow(formData: FormData) {
    "use server";
    const supabase = createClient();
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return;
    await supabase.from(table).delete().eq("id", id);
    revalidatePath(path);
  }

  const supabase = createClient();
  const { data, error } = await supabase.from(table).select("*").limit(limit);

  return (
    <main className="grid">
      <section className="card">
        <h1>{title}</h1>
        {error ? <p style={{ color: "#ff8d8d" }}>Unable to load `{table}`: {error.message}</p> : null}

        {canCreate ? (
          <form action={createRow} className="grid">
            <label>Create row JSON</label>
            <textarea
              name="payload"
              rows={5}
              placeholder='{"example_column":"value"}'
              style={{ width: "100%" }}
            />
            <button type="submit">Create</button>
          </form>
        ) : null}
      </section>

      <section className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Record</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).length === 0 ? (
              <tr>
                <td colSpan={2}>No rows found.</td>
              </tr>
            ) : (
              (data ?? []).map((row: Record<string, unknown>, index: number) => {
                const id = String((row.id as string | undefined) ?? "");
                return (
                  <tr key={id || String(index)}>
                    <td>
                      <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(row, null, 2)}</pre>
                    </td>
                    <td style={{ minWidth: 280 }}>
                      <form action={updateRow} className="grid" style={{ marginBottom: 12 }}>
                        <input type="hidden" name="id" value={id} />
                        <textarea
                          name="payload"
                          rows={6}
                          defaultValue={JSON.stringify(row, null, 2)}
                          style={{ width: "100%" }}
                        />
                        <button type="submit">Update</button>
                      </form>
                      {canDelete ? (
                        <form action={deleteRow}>
                          <input type="hidden" name="id" value={id} />
                          <button type="submit">Delete</button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
