import { createClient } from "@/lib/supabase-server";

export default async function UsersPage() {
  const supabase = createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, username, is_superadmin, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="card">
      <h1>Users / Profiles (Read Only)</h1>
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Superadmin</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {(users ?? []).map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.username ?? "-"}</td>
              <td>{user.is_superadmin ? "TRUE" : "FALSE"}</td>
              <td>{new Date(user.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
