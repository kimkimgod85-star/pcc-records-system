import { requireSupabase } from './supabase';

function explain(message: string) {
  if (/avatar_url|schema cache|does not exist|bucket|avatars/i.test(message)) {
    return 'Profile photos are not set up yet. Open the Supabase SQL editor and run supabase/avatars.sql once, then try again.';
  }
  return message;
}

export async function saveAvatar(userId: string, blob: Blob) {
  const client = requireSupabase();
  const path = `${userId}/avatar.jpg`;
  const { error: uploadError } = await client.storage.from('avatars').upload(path, blob, {
    upsert: true,
    contentType: 'image/jpeg',
  });
  if (uploadError) throw new Error(explain(uploadError.message));
  const { data } = client.storage.from('avatars').getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  const { error } = await client.from('profiles').update({ avatar_url: url }).eq('id', userId);
  if (error) throw new Error(explain(error.message));
  return url;
}
