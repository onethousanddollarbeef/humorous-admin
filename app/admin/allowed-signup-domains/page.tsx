import AdminCrudTable from "@/components/AdminCrudTable";

export default function Page() {
  return <AdminCrudTable title="Allowed Signup Domains (CRUD)" table="allowed_signup_domains" path="/admin/allowed-signup-domains" />;
}
