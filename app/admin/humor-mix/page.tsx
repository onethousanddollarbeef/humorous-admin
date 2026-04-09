import AdminCrudTable from "@/components/AdminCrudTable";

type Props = { searchParams?: { page?: string } };

export default function Page({ searchParams }: Props) {
  const page = Number(searchParams?.page ?? "1") > 0 ? Number(searchParams?.page ?? "1") : 1;
  return <AdminCrudTable title="Humor Mix (Read / Update)" table="humor_flavor_mix" path="/admin/humor-mix" canCreate={false} canDelete={false} page={page} primaryKey="id" />;
}
