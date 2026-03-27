import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

async function signOut() {
  "use server";
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const links = [
  ["Dashboard", "/admin"],
  ["Users", "/admin/users"],
  ["Images", "/admin/images"],
  ["Captions", "/admin/captions"],
  ["Humor Flavors", "/admin/humor-flavors"],
  ["Flavor Steps", "/admin/humor-flavor-steps"],
  ["Humor Mix", "/admin/humor-mix"],
  ["Example Captions", "/admin/example-captions"],
  ["Terms", "/admin/terms"],
  ["Caption Requests", "/admin/caption-requests"],
  ["Caption Examples", "/admin/caption-examples"],
  ["LLM Models", "/admin/llm-models"],
  ["LLM Providers", "/admin/llm-providers"],
  ["Prompt Chains", "/admin/llm-prompt-chains"],
  ["LLM Responses", "/admin/llm-responses"],
  ["Allowed Domains", "/admin/allowed-signup-domains"],
  ["Whitelisted Emails", "/admin/whitelisted-email-addresses"]
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("is_superadmin").eq("id", user.id).single();

  if (!profile?.is_superadmin) {
    redirect("/login?error=not_superadmin");
  }

  return (
    <div className="container admin-shell">
      <aside className="admin-sidebar">
        <nav className="admin-nav">
          {links.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <form action={signOut}>
          <button type="submit">Sign out</button>
        </form>
      </aside>
      <section className="admin-content">{children}</section>
    </div>
  );
}
