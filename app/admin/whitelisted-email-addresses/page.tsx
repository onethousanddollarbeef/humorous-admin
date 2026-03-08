import AdminCrudTable from "@/components/AdminCrudTable";

export default function Page() {
  return <AdminCrudTable title="Whitelisted E-mail Addresses (CRUD)" table="whitelisted_email_addresses" path="/admin/whitelisted-email-addresses" />;
}
