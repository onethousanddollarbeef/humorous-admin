import { createClient } from "@/lib/supabase-server";

type Row = Record<string, any>;

function fullName(row: Row) {
  const first = row.first_name ?? "";
  const last = row.last_name ?? "";
  const combined = `${first} ${last}`.trim();
  return combined || row.username || "-";
}

function createdAt(row: Row) {
  const raw = row.created_at ?? row.created_datetime_utc;
  return raw ? new Date(raw).toLocaleString() : "-";
}

export default async function UsersPage() {
  const supabase = createClient();
  const { data: users } = await supabase.from("profiles").select("*").limit(100);

  return (
    <main className="card">
      <h1>Users / Profiles (Read Only)</h1>
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Superadmin</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {(users ?? []).length === 0 ? (
            <tr>
              <td colSpan={5}>No profiles found.</td>
            </tr>
          ) : (
            (users ?? []).map((user: Row) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{fullName(user)}</td>
                <td>{user.email ?? "-"}</td>
                <td>{user.is_superadmin ? "TRUE" : "FALSE"}</td>
                <td>{createdAt(user)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </main>
  );
}
