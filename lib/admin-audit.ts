import { createClient } from "@/lib/supabase-server";

export async function getCurrentAuditUserId() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export function withCreateAuditFields(payload: Record<string, unknown>, userId: string) {
  return {
    ...payload,
    created_by_user_id: userId,
    modified_by_user_id: userId
  };
}

export function withUpdateAuditFields(payload: Record<string, unknown>, userId: string) {
  const nextPayload = { ...payload };
  delete nextPayload.created_datetime_utc;
  delete nextPayload.modified_datetime_utc;
  delete nextPayload.created_by_user_id;

  return {
    ...nextPayload,
    modified_by_user_id: userId
  };
}
