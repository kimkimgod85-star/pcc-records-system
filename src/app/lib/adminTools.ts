import { requireSupabase } from './supabase';

function explain(error: { message?: string; code?: string } | null, fallback: string) {
  const message = error?.message || fallback;
  if (error?.code === 'PGRST202' || /could not find the function/i.test(message)) {
    return 'This tool is not set up yet. Open the Supabase SQL editor and run supabase/admin_tools.sql once, then try again.';
  }
  return message;
}

export async function deleteStudentAccount(userId: string) {
  const { error } = await requireSupabase().rpc('admin_delete_user', { target: userId });
  if (error) throw new Error(explain(error, 'Could not delete the account.'));
}

export async function resetAllRecords() {
  const { error } = await requireSupabase().rpc('admin_reset_records');
  if (error) throw new Error(explain(error, 'Could not reset the records.'));
}
