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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("is_superadmin").eq("id", user.id).single();
<<<<<<< HEAD
  if (!profile?.is_superadmin) redirect("/login?error=not_superadmin");

  return (
    <div className="container">
      <nav style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/users">Users</Link>
          <Link href="/admin/images">Images</Link>
          <Link href="/admin/captions">Captions</Link>
=======

  if (!profile?.is_superadmin) {
    redirect("/login?error=not_superadmin");
  }

  return (
    <div className="container">
      <nav>
        <div className="links" style={{ flexWrap: "wrap" }}>
          {links.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
>>>>>>> 1c3b408 (Add broad admin coverage for humor, LLM, terms, and domain/email tables)
        </div>
        <form action={signOut}><button type="submit">Sign out</button></form>
      </nav>
      {children}
    </div>
  );
}
