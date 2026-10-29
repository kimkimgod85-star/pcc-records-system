import { createIsolatedClient, requireSupabase } from './supabase';

function explain(error: { message?: string; code?: string } | null, fallback: string) {
  const message = error?.message || fallback;
  if (error?.code === 'PGRST202' || /could not find the function/i.test(message)) {
    return 'This tool is not set up yet. Open the Supabase SQL editor and run supabase/admin_tools.sql once, then try again.';
  }
  return message;
}

export async function createStudentAccount(input: {
  fullName: string;
  email: string;
  studentId: string;
  role: 'student' | 'alumni';
  password: string;
}) {
  const client = createIsolatedClient();
  const { data, error } = await client.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: {
        registered: true,
        full_name: input.fullName.trim(),
        student_id: input.studentId.trim(),
        role: input.role,
      },
    },
  });
  if (error) throw new Error(explain(error, 'Could not create the account.'));
  if (data.user && !data.session && (data.user.identities?.length ?? 0) === 0) {
    throw new Error('This email is already registered.');
  }
  return { needsEmailConfirm: !data.session };
}

export async function deleteStudentAccount(userId: string) {
  const { error } = await requireSupabase().rpc('admin_delete_user', { target: userId });
  if (error) throw new Error(explain(error, 'Could not delete the account.'));
}

export async function resetAllRecords() {
  const { error } = await requireSupabase().rpc('admin_reset_records');
  if (error) throw new Error(explain(error, 'Could not reset the records.'));
}
