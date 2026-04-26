import { createClient } from "@/lib/supabase-server";

type Props = {
  title: string;
  table: string;
  path: string;
  page?: number;
  pageSize?: number;
};

function displayValue(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default async function AdminReadOnlyTable({ title, table, path, page = 1, pageSize = 25 }: Props) {
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
    <main className="card">
      <h1>{title}</h1>
      {error ? <p style={{ color: "#ff8d8d" }}>Unable to load `{table}`: {error.message}</p> : null}
      <p className="form-note">Read-only table view with pagination. Scroll horizontally for wide schemas.</p>

      <div className="table-controls">
        <strong>
          Page {safePage} of {totalPages}
        </strong>
        <div className="pagination-links">
          <a aria-disabled={safePage <= 1} href={`${path}?page=${Math.max(1, safePage - 1)}`}>
            Previous
          </a>
          <a aria-disabled={safePage >= totalPages} href={`${path}?page=${Math.min(totalPages, safePage + 1)}`}>
            Next
          </a>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(columns.length, 1)}>No rows found.</td>
              </tr>
            ) : (
              rows.map((row: Record<string, unknown>, index: number) => (
                <tr key={String((row.id as string | undefined) ?? index)}>
                  {columns.map((column) => (
                    <td key={`${String((row.id as string | undefined) ?? index)}-${column}`}>{displayValue(row[column])}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
