import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

async function signOut() {
  "use server";
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const navSections = [
  {
    title: "Overview",
    links: [["Dashboard", "/admin"]] as const
  },
  {
    title: "Content",
    links: [
      ["Users", "/admin/users"],
      ["Images", "/admin/images"],
      ["Captions", "/admin/captions"],
      ["Caption Requests", "/admin/caption-requests"],
      ["Caption Examples", "/admin/caption-examples"],
      ["Example Captions", "/admin/example-captions"]
    ] as const
  },
  {
    title: "Config",
    links: [
      ["Humor Flavors", "/admin/humor-flavors"],
      ["Flavor Steps", "/admin/humor-flavor-steps"],
      ["Humor Mix", "/admin/humor-mix"],
      ["Terms", "/admin/terms"],
      ["Allowed Domains", "/admin/allowed-signup-domains"],
      ["Whitelisted Emails", "/admin/whitelisted-email-addresses"]
    ] as const
  },
  {
    title: "LLMs",
    links: [
      ["LLM Models", "/admin/llm-models"],
      ["LLM Providers", "/admin/llm-providers"],
      ["Prompt Chains", "/admin/llm-prompt-chains"],
      ["LLM Responses", "/admin/llm-responses"]
    ] as const
  }
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
      <aside className="admin-sidebar card" aria-label="Admin navigation sidebar">
        <h2>Humorous Admin</h2>
        <p className="admin-sidebar-subtitle">Choose a section to manage data quickly.</p>
        <div className="admin-nav-groups">
          {navSections.map((section) => (
            <section key={section.title}>
              <h3 className="nav-group-title">{section.title}</h3>
              <div className="links">
                {section.links.map(([label, href]) => (
                  <Link key={href} href={href}>
                    {label}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
        <form action={signOut}>
          <button type="submit">Sign out</button>
        </form>
      </aside>
      <div className="admin-content">{children}</div>
    </div>
  );
}
