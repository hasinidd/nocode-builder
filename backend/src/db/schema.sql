-- NoCode Builder — PostgreSQL Schema
-- Run this against your Supabase project

-- ── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Users ─────────────────────────────────────────────────────────────────────
create table if not exists users (
  id           uuid primary key default uuid_generate_v4(),
  email        text unique not null,
  password_hash text not null,
  name         text not null,
  role         text not null default 'user' check (role in ('user', 'admin')),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── Refresh tokens ────────────────────────────────────────────────────────────
create table if not exists refresh_tokens (
  id        uuid primary key default uuid_generate_v4(),
  user_id   uuid not null references users(id) on delete cascade,
  token     text not null,
  created_at timestamptz default now(),
  unique(user_id)
);

-- ── Auth events ───────────────────────────────────────────────────────────────
create table if not exists auth_events (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references users(id) on delete cascade,
  event      text not null,
  ip         text,
  created_at timestamptz default now()
);

-- ── Agents ────────────────────────────────────────────────────────────────────
create table if not exists agents (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references users(id) on delete cascade,
  name          text not null,
  description   text,
  system_prompt text,
  config        jsonb default '{}',
  language      text not null default 'en',
  tone          text not null default 'professional',
  features      text[] default '{}',
  published     boolean not null default false,
  public_url    text,
  published_at  timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists agents_user_id_idx on agents(user_id);

-- ── Knowledge base ────────────────────────────────────────────────────────────
create table if not exists knowledge_base (
  id          uuid primary key default uuid_generate_v4(),
  agent_id    uuid not null references agents(id) on delete cascade,
  source_url  text,
  source_file text,
  content     text not null,
  chunk_index int not null default 0,
  file_type   text,
  indexed_at  timestamptz default now()
);
create index if not exists kb_agent_id_idx on knowledge_base(agent_id);

-- ── Uploaded files ────────────────────────────────────────────────────────────
create table if not exists uploaded_files (
  id         uuid primary key default uuid_generate_v4(),
  agent_id   uuid not null references agents(id) on delete cascade,
  filename   text not null,
  mime_type  text,
  size_bytes int,
  chunks     int,
  created_at timestamptz default now()
);

-- ── Services ──────────────────────────────────────────────────────────────────
create table if not exists services (
  id                uuid primary key default uuid_generate_v4(),
  agent_id          uuid not null references agents(id) on delete cascade,
  name              text not null,
  description       text,
  price             numeric(10,2),
  duration_minutes  int,
  active            boolean default true,
  created_at        timestamptz default now()
);

-- ── Availability slots ────────────────────────────────────────────────────────
create table if not exists availability_slots (
  id          uuid primary key default uuid_generate_v4(),
  agent_id    uuid not null references agents(id) on delete cascade,
  date        date not null,
  start_time  time not null,
  end_time    time not null,
  is_booked   boolean default false,
  created_at  timestamptz default now(),
  unique (agent_id, date, start_time)
);

-- ── Bookings ──────────────────────────────────────────────────────────────────
create table if not exists bookings (
  id              uuid primary key default uuid_generate_v4(),
  agent_id        uuid not null references agents(id) on delete cascade,
  slot_id         uuid references availability_slots(id),
  service_id      uuid references services(id),
  customer_name   text not null,
  customer_email  text not null,
  customer_phone  text,
  notes           text,
  status          text not null default 'confirmed' check (status in ('confirmed','pending','cancelled','completed')),
  reference       text unique,
  cancel_reason   text,
  created_at      timestamptz default now()
);
create index if not exists bookings_agent_id_idx on bookings(agent_id);
create index if not exists bookings_slot_id_idx on bookings(slot_id);

-- ── Products ──────────────────────────────────────────────────────────────────
create table if not exists products (
  id          uuid primary key default uuid_generate_v4(),
  agent_id    uuid not null references agents(id) on delete cascade,
  name        text not null,
  description text,
  price       numeric(10,2) not null,
  inventory   int default 0,
  active      boolean default true,
  created_at  timestamptz default now()
);

-- ── Variants ──────────────────────────────────────────────────────────────────
create table if not exists variants (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid not null references products(id) on delete cascade,
  name        text not null,
  value       text not null,
  price_delta numeric(10,2) default 0,
  inventory   int default 0
);

-- ── Orders ────────────────────────────────────────────────────────────────────
create table if not exists orders (
  id             uuid primary key default uuid_generate_v4(),
  agent_id       uuid not null references agents(id) on delete cascade,
  product_id     uuid references products(id),
  variant_id     uuid references variants(id),
  quantity       int not null default 1,
  customer_info  jsonb default '{}',
  status         text not null default 'pending' check (status in ('pending','paid','shipped','delivered','cancelled')),
  total_amount   numeric(10,2),
  created_at     timestamptz default now()
);
create index if not exists orders_agent_id_idx on orders(agent_id);

-- ── Inquiries (leads) ─────────────────────────────────────────────────────────
create table if not exists inquiries (
  id          uuid primary key default uuid_generate_v4(),
  agent_id    uuid not null references agents(id) on delete cascade,
  session_id  text,
  fields      jsonb default '{}',
  created_at  timestamptz default now()
);
create index if not exists inquiries_agent_id_idx on inquiries(agent_id);

-- ── Chat logs ─────────────────────────────────────────────────────────────────
create table if not exists chat_logs (
  id               uuid primary key default uuid_generate_v4(),
  agent_id         uuid not null references agents(id) on delete cascade,
  session_id       text,
  user_message     text,
  agent_reply      text,
  language         text,
  response_ms      int,
  success          boolean default true,
  action_triggered text,
  error            text,
  created_at       timestamptz default now()
);
create index if not exists chat_logs_agent_id_idx on chat_logs(agent_id);
create index if not exists chat_logs_session_id_idx on chat_logs(session_id);
