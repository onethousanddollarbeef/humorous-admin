import AdminCrudTable from "@/components/AdminCrudTable";

export default function Page() {
  return <AdminCrudTable title="LLM Providers (CRUD)" table="llm_providers" path="/admin/llm-providers" />;
}
