-- Stores why the Registrar rejected a request or a payment, so the student can see it.
-- Run once in Supabase > SQL Editor. Safe to run more than once.

alter table public.document_requests add column if not exists rejection_reason text;
alter table public.document_requests add column if not exists payment_rejection_reason text;
