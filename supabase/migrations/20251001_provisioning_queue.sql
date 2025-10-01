-- Provisioning queue for capacity guard
create table if not exists phone_provisioning_queue (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  status text not null default 'queued', -- queued|processing|done|error
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_phone_queue_status on phone_provisioning_queue(status);
create index if not exists idx_phone_queue_business on phone_provisioning_queue(business_id);


