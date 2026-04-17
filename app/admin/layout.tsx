import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

async function signOut() {
  "use server";
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const menuGroups = [
  { label: "Users", href: "/admin/users" },
  { label: "Images", href: "/admin/images" },
  {
    label: "Captions",
    items: [
      ["Captions", "/admin/captions"],
      ["Caption Requests", "/admin/caption-requests"],
      ["Caption Examples", "/admin/caption-examples"]
    ] as const
  },
  {
    label: "Flavors",
    items: [
      ["Humor Flavors", "/admin/humor-flavors"],
      ["Flavor Steps", "/admin/humor-flavor-steps"],
      ["Humor Mix", "/admin/humor-mix"]
    ] as const
  },
  {
    label: "Logistics",
    items: [
      ["Allowed Domains", "/admin/allowed-signup-domains"],
      ["Whitelisted Emails", "/admin/whitelisted-email-addresses"]
    ] as const
  },
  {
    label: "LLMs",
    items: [
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
    <div className="container admin-top-shell">
      <header className="topbar card">
        <Link className="brand" href="/admin">
          Humorous Admin
        </Link>

        <nav className="topbar-nav" aria-label="Admin navigation">
          {menuGroups.map((group) =>
            "href" in group ? (
              <Link key={group.label} href={group.href} className="topbar-link">
                {group.label}
              </Link>
            ) : (
              <div key={group.label} className="topbar-dropdown">
                <button type="button" className="topbar-link">
                  {group.label}
                </button>
                <div className="topbar-dropdown-menu">
                  {group.items.map(([label, href]) => (
                    <Link key={href} href={href}>
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            )
          )}
        </nav>

        <form action={signOut}>
          <button type="submit">Sign out</button>
        </form>
      </header>

      <div className="admin-content">{children}</div>
    </div>
  );
}
