create extension if not exists pgcrypto;

create table if not exists project (
  id text primary key,
  name text not null,
  client text,
  location text,
  current_phase text not null,
  current_milestone text not null,
  progress_percent numeric(5,2) not null default 0 check (progress_percent between 0 and 100),
  budget_amount numeric(14,2),
  spent_amount numeric(14,2),
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists project_phase (
  phase_id uuid primary key default gen_random_uuid(),
  project_id text not null references project(id) on delete cascade,
  name text not null,
  phase_order integer not null,
  status text not null default 'planned',
  progress_percent numeric(5,2) not null default 0 check (progress_percent between 0 and 100),
  start_date date,
  end_date date,
  planned_budget numeric(14,2) not null default 0,
  actual_cost numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  constraint uq_project_phase_project_name unique (project_id, name)
);

create table if not exists milestone (
  milestone_id uuid primary key default gen_random_uuid(),
  project_id text not null references project(id) on delete cascade,
  phase_id uuid references project_phase(phase_id) on delete set null,
  milestone_name text not null,
  status text not null default 'planned',
  progress_percent numeric(5,2) not null default 0 check (progress_percent between 0 and 100),
  due_date date,
  planned_amount numeric(14,2) not null default 0,
  actual_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_milestone_project_milestone_name unique (project_id, milestone_name)
);

create table if not exists project_task (
  task_id text primary key,
  project_id text not null references project(id) on delete cascade,
  milestone_id uuid references milestone(milestone_id) on delete set null,
  task_name text not null,
  discipline text not null,
  owner text not null,
  status text not null default 'not_started',
  priority text not null default 'medium',
  planned_start_date date not null default current_date,
  planned_end_date date not null,
  start_date date,
  end_date date,
  duration_days integer,
  cost_estimate numeric(14,2) not null default 0,
  cost_actual numeric(14,2) not null default 0,
  remark text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activity_log (
  activity_id uuid primary key default gen_random_uuid(),
  project_id text references project(id) on delete cascade,
  task_id text references project_task(task_id) on delete set null,
  activity_type text not null,
  title text not null,
  source_type text not null default 'system',
  source_path text,
  summary text,
  processing_state text,
  processing_details jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_activity_log_source
  on activity_log (source_type, source_path);

create table if not exists risk_register (
  risk_id uuid primary key default gen_random_uuid(),
  project_id text not null references project(id) on delete cascade,
  risk_code text,
  category text not null,
  title text not null,
  likelihood text not null default 'Possible',
  impact text not null default 'medium',
  status text not null default 'open',
  mitigation text,
  owner text not null,
  due_date date,
  affected_milestone text,
  trigger_event text,
  reasoning text,
  evidence_source text,
  confidence text not null default 'Medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lesson (
  lesson_id uuid primary key default gen_random_uuid(),
  project_id text not null references project(id) on delete cascade,
  phase_id uuid references project_phase(phase_id) on delete set null,
  title text not null,
  knowledge_area text not null,
  root_cause text not null,
  expected_outcome text,
  difference text,
  description text,
  business text
);

create table if not exists request (
  request_id text primary key,
  project_id text not null references project(id) on delete cascade,
  title text not null,
  request_type text not null,
  description text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists analysis (
  analysis_id uuid primary key default gen_random_uuid(),
  request_id text not null references request(request_id) on delete cascade,
  agent_type text not null,
  result text not null default 'needs_review',
  reasoning text not null,
  recommendation text,
  created_at timestamptz not null default now()
);

create table if not exists "user" (
  user_id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

create table if not exists session (
  session_id uuid primary key default gen_random_uuid(),
  user_id uuid references "user"(user_id) on delete set null,
  project_id text references project(id) on delete cascade,
  title text not null default 'Untitled',
  agent_persona text,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  summary_text text,
  entities_json jsonb default '{}'::jsonb,
  current_goal text,
  open_threads text,
  last_summarized_turn integer not null default 0,
  state_updated_at timestamptz not null default now()
);

create table if not exists message (
  message_id uuid primary key default gen_random_uuid(),
  session_id uuid not null references session(session_id) on delete cascade,
  index integer not null default 0,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_session_user_id on session(user_id);
create index if not exists idx_session_project_id on session(project_id);
create index if not exists idx_message_session_id on message(session_id);
create index if not exists idx_message_session_index on message(session_id, index asc);

-- Trigger: Automatically update project.current_phase when a phase becomes active
create or replace function trg_sync_project_current_phase()
returns trigger as $$
begin
  if new.status = 'active' then
    update project
    set current_phase = new.name
    where id = new.project_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists sync_phase_to_project on project_phase;
create trigger sync_phase_to_project
after update of status or insert on project_phase
for each row
execute function trg_sync_project_current_phase();
