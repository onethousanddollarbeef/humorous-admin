import { createClient } from "@/lib/supabase-server";

type Props = {
  title: string;
  table: string;
  limit?: number;
};

export default async function AdminReadOnlyTable({ title, table, limit = 200 }: Props) {
  const supabase = createClient();
  const { data, error } = await supabase.from(table).select("*").limit(limit);

  return (
    <main className="card">
      <h1>{title}</h1>
      {error ? <p style={{ color: "#ff8d8d" }}>Unable to load `{table}`: {error.message}</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th>Record</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).length === 0 ? (
            <tr>
              <td>No rows found.</td>
            </tr>
          ) : (
            (data ?? []).map((row: Record<string, unknown>, index: number) => (
              <tr key={String((row.id as string | undefined) ?? index)}>
                <td>
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(row, null, 2)}</pre>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </main>
  );
}
