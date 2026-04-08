import AdminCrudTable from "@/components/AdminCrudTable";

type Props = { searchParams?: { page?: string } };

export default function Page({ searchParams }: Props) {
  const page = Number(searchParams?.page ?? "1") > 0 ? Number(searchParams?.page ?? "1") : 1;
  return <AdminCrudTable title="Example Captions (CRUD)" table="example_captions" path="/admin/example-captions" page={page} />;
}
