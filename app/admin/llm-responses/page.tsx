import AdminReadOnlyTable from "@/components/AdminReadOnlyTable";

type Props = { searchParams?: { page?: string } };

export default function Page({ searchParams }: Props) {
  const page = Number(searchParams?.page ?? "1") > 0 ? Number(searchParams?.page ?? "1") : 1;
  return <AdminReadOnlyTable title="LLM Responses (Read Only)" table="llm_model_responses" path="/admin/llm-responses" page={page} />;
}
