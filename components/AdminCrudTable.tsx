import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { getCurrentAuditUserId, withCreateAuditFields, withUpdateAuditFields } from "@/lib/admin-audit";

type Props = {
  title: string;
  table: string;
  path: string;
  page?: number;
  pageSize?: number;
  primaryKey?: string;
  canCreate?: boolean;
  canDelete?: boolean;
};

function parsePayload(raw: FormDataEntryValue | null) {
  if (!raw) return null;
  const text = String(raw).trim();
  if (!text) return null;
  return JSON.parse(text) as Record<string, unknown>;
}

function displayValue(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default async function AdminCrudTable({
  title,
  table,
  path,
  page = 1,
  pageSize = 25,
  primaryKey = "id",
  canCreate = true,
  canDelete = true
}: Props) {
  async function createRow(formData: FormData) {
    "use server";
    const supabase = createClient();
    const userId = await getCurrentAuditUserId();
    const payload = parsePayload(formData.get("payload"));
    if (!payload || !userId) return;
    await supabase.from(table).insert(withCreateAuditFields(payload, userId));
    revalidatePath(path);
  }

  async function updateRow(formData: FormData) {
    "use server";
    const supabase = createClient();
    const userId = await getCurrentAuditUserId();
    const id = String(formData.get("id") ?? "").trim();
    const payload = parsePayload(formData.get("payload"));
    if (!id || !payload || !userId) return;
    await supabase.from(table).update(withUpdateAuditFields(payload, userId)).eq(primaryKey, id);
    revalidatePath(path);
  }

  async function deleteRow(formData: FormData) {
    "use server";
    const supabase = createClient();
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return;
    await supabase.from(table).delete().eq(primaryKey, id);
    revalidatePath(path);
  }

  const supabase = createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const [{ data, error }, { count }] = await Promise.all([
    supabase.from(table).select("*").range(from, to),
    supabase.from(table).select("*", { count: "exact", head: true })
  ]);

  const rows = (data ?? []) as Record<string, unknown>[];
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const safePage = Math.min(page, totalPages);

  return (
    <main className="grid">
      <section className="card">
        <h1>{title}</h1>
        {error ? <p style={{ color: "#ff8d8d" }}>Unable to load `{table}`: {error.message}</p> : null}
        <p className="form-note">Audit fields are attached automatically on create and update.</p>

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
        <div className="table-controls">
          <strong>
            Page {safePage} of {totalPages}
          </strong>
          <div className="pagination-links">
            <Link aria-disabled={safePage <= 1} href={`${path}?page=${Math.max(1, safePage - 1)}`}>
              Previous
            </Link>
            <Link aria-disabled={safePage >= totalPages} href={`${path}?page=${Math.min(totalPages, safePage + 1)}`}>
              Next
            </Link>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1}>No rows found.</td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const id = String(row[primaryKey] ?? "");
                return (
                  <tr key={id || String(index)}>
                    {columns.map((column) => (
                      <td key={`${id || index}-${column}`}>{displayValue(row[column])}</td>
                    ))}
                    <td style={{ minWidth: 280 }}>
                      {id ? (
                        <>
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
                        </>
                      ) : (
                        <p style={{ margin: 0, color: "#cdc6ad" }}>
                          No `{primaryKey}` value for this row; update/delete disabled.
                        </p>
                      )}
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
