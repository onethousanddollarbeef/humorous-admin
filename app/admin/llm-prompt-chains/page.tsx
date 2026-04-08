import AdminReadOnlyTable from "@/components/AdminReadOnlyTable";

type Props = { searchParams?: { page?: string } };

export default function Page({ searchParams }: Props) {
  const page = Number(searchParams?.page ?? "1") > 0 ? Number(searchParams?.page ?? "1") : 1;
  return <AdminReadOnlyTable title="LLM Prompt Chains (Read Only)" table="llm_prompt_chains" path="/admin/llm-prompt-chains" page={page} />;
}
