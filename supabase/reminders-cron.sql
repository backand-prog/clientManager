-- Napi e-mailes emlékeztetők ütemezése (pg_cron + pg_net). Egyszer futtatandó az éles projekten, a helyőrzők kitöltése után.
-- A CRON_SECRET értéke egyezzen a send-reminders Edge Function secretjével:
--   supabase secrets set CRON_SECRET=<ugyanaz az érték> --yes
-- Ez a fájl a titkot nem tartalmazza; a titok ne kerüljön a repóba.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('<CRON_SECRET>', 'send_reminders_secret')
where not exists (select 1 from vault.secrets where name = 'send_reminders_secret');

select cron.unschedule('send-reminders') where exists (select 1 from cron.job where jobname = 'send-reminders');

-- 16:00 UTC = 17:00 (tél) / 18:00 (nyár) budapesti idő.
select cron.schedule(
  'send-reminders',
  '0 16 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'send_reminders_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
