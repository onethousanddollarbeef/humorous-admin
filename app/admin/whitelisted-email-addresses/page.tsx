import AdminCrudTable from "@/components/AdminCrudTable";

type Props = { searchParams?: { page?: string } };

export default function Page({ searchParams }: Props) {
  const page = Number(searchParams?.page ?? "1") > 0 ? Number(searchParams?.page ?? "1") : 1;
  return <AdminCrudTable title="Whitelisted E-mail Addresses (CRUD)" table="whitelisted_email_addresses" path="/admin/whitelisted-email-addresses" page={page} />;
}
