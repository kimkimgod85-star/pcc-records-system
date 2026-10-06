// Sends a Web Push to every device the user turned notifications on for.
// Called by the notifications_push trigger (supabase/push.sql) with { id }.
// Each notification is pushed at most once, so repeated calls are harmless.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'https://www.pccsched.online',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

Deno.serve(async req => {
  const { id } = await req.json().catch(() => ({ id: null }));
  if (!id) return new Response('Missing id', { status: 400 });

  const { data: row, error } = await supabase
    .from('notifications')
    .update({ pushed_at: new Date().toISOString() })
    .eq('id', id)
    .is('pushed_at', null)
    .select('id, user_id, title, message, link')
    .maybeSingle();
  if (error) return new Response(error.message, { status: 500 });
  if (!row) return Response.json({ sent: 0 });

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', row.user_id);

  const payload = JSON.stringify({
    id: row.id,
    title: row.title || 'PCC Records',
    body: row.message || '',
    url: row.link || '/notifications',
  });

  let sent = 0;
  await Promise.all((subs ?? []).map(async sub => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 60 * 60 * 24, urgency: 'high' },
      );
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      } else {
        console.error('Push failed', status, err);
      }
    }
  }));

  return Response.json({ sent });
});
