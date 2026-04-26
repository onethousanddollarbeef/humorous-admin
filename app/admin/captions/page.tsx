import { createClient } from "@/lib/supabase-server";

type Row = Record<string, any>;

function captionText(row: Row) {
  return row.body ?? row.content ?? row.caption ?? "-";
}

function createdAt(row: Row) {
  const raw = row.created_at ?? row.created_datetime_utc;
  return raw ? new Date(raw).toLocaleString() : "-";
}

export default async function CaptionsPage() {
  const supabase = createClient();
  const { data: captions } = await supabase.from("captions").select("*").limit(200);

  return (
    <main className="card">
      <h1>Captions (Read Only)</h1>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Image ID</th>
              <th>Caption</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {(captions ?? []).length === 0 ? (
              <tr>
                <td colSpan={4}>No captions found.</td>
              </tr>
            ) : (
              (captions ?? []).map((caption: Row) => (
                <tr key={caption.id}>
                  <td>{caption.id}</td>
                  <td>{caption.image_id ?? "-"}</td>
                  <td>{captionText(caption)}</td>
                  <td>{createdAt(caption)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
