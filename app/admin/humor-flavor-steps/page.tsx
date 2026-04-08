import AdminReadOnlyTable from "@/components/AdminReadOnlyTable";

type Props = { searchParams?: { page?: string } };

export default function Page({ searchParams }: Props) {
  const page = Number(searchParams?.page ?? "1") > 0 ? Number(searchParams?.page ?? "1") : 1;
  return <AdminReadOnlyTable title="Humor Flavor Steps (Read Only)" table="humor_flavor_steps" path="/admin/humor-flavor-steps" page={page} />;
}
