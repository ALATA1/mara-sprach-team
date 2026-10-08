alter table public.admin_refund_actions
  drop constraint if exists admin_refund_actions_status_check;

alter table public.admin_refund_actions
  add constraint admin_refund_actions_status_check
  check (status in ('pending', 'succeeded', 'failed'));
