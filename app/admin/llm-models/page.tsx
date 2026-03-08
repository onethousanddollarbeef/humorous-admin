import AdminCrudTable from "@/components/AdminCrudTable";

export default function Page() {
  return <AdminCrudTable title="LLM Models (CRUD)" table="llm_models" path="/admin/llm-models" />;
}
