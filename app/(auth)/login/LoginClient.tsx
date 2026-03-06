"use client";

import { createClient } from "@/lib/supabase-browser";

export default function LoginClient({ error }: { error?: string }) {
  const signIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/admin`
      }
    });
  };

  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 460, margin: "96px auto" }}>
        <h1>Humor Admin Login</h1>
        <p>Access is limited to users where profiles.is_superadmin = TRUE.</p>
        {error === "not_superadmin" ? (
          <p style={{ color: "#ff8d8d" }}>You are authenticated but not a superadmin.</p>
        ) : null}
        <button onClick={signIn}>Continue with Google</button>
      </div>
    </main>
  );
}
