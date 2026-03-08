import AdminCrudTable from "@/components/AdminCrudTable";

export default function Page() {
  return <AdminCrudTable title="Humor Mix (Read / Update)" table="humor_mix" path="/admin/humor-mix" canCreate={false} canDelete={false} />;
}
