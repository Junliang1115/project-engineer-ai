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

-- Phases, milestones, expenditures and risks use readable IDs numbered per project and zero-padded
-- (P-01, M-001, EXP-001, RSK-001). Past the padded width numbers keep counting (M-1000).
create table if not exists project_entity_counter (
  project_id text not null references project(id) on delete cascade,
  entity_type text not null check (entity_type in ('phase', 'milestone', 'expenditure', 'risk')),
  last_number integer not null check (last_number > 0),
  primary key (project_id, entity_type)
);

create or replace function project_entity_prefix(p_entity_type text)
returns text as $$
  select case p_entity_type
    when 'phase' then 'P'
    when 'milestone' then 'M'
    when 'expenditure' then 'EXP'
    when 'risk' then 'RSK'
  end;
$$ language sql immutable;

-- The canonical ID for a number: phases pad to 2 digits, everything else to 3 (P-01, M-007).
create or replace function format_project_entity_id(p_entity_type text, p_number integer)
returns text as $$
  select project_entity_prefix(p_entity_type) || '-' || lpad(
    p_number::text,
    greatest(case p_entity_type when 'phase' then 2 else 3 end, length(p_number::text)),
    '0'
  );
$$ language sql immutable;

-- Atomically allocates the next ID; the counter row lock serialises concurrent creates.
create or replace function next_project_entity_id(p_project_id text, p_entity_type text)
returns text as $$
declare
  prefix text := project_entity_prefix(p_entity_type);
  allocated integer;
begin
  if prefix is null then
    raise exception 'Unknown project entity type: %', p_entity_type;
  end if;
  insert into project_entity_counter (project_id, entity_type, last_number)
  values (p_project_id, p_entity_type, 1)
  on conflict (project_id, entity_type)
  do update set last_number = project_entity_counter.last_number + 1
  returning last_number into allocated;
  return format_project_entity_id(p_entity_type, allocated);
end;
$$ language plpgsql;

-- Insert trigger: fills a missing ID from the counter, or advances the counter past an explicit ID
-- so later allocations never collide with it. Arguments: id column name, entity type.
create or replace function trg_assign_project_entity_id()
returns trigger as $$
declare
  v_id_column text := tg_argv[0];
  v_entity_type text := tg_argv[1];
  v_prefix text := project_entity_prefix(tg_argv[1]);
  v_current_id text := to_jsonb(new) ->> tg_argv[0];
  v_number integer;
begin
  if v_current_id is null then
    return jsonb_populate_record(new, jsonb_build_object(v_id_column, next_project_entity_id(new.project_id, v_entity_type)));
  end if;
  if v_current_id ~ ('^' || v_prefix || '-[0-9]{1,9}$') then
    v_number := substring(v_current_id from '[0-9]+$')::integer;
  end if;
  if v_number is null or v_number < 1 or v_current_id <> format_project_entity_id(v_entity_type, v_number) then
    raise exception '% must look like %, got %', v_id_column, format_project_entity_id(v_entity_type, 1), v_current_id;
  end if;
  insert into project_entity_counter (project_id, entity_type, last_number)
  values (new.project_id, v_entity_type, v_number)
  on conflict (project_id, entity_type)
  do update set last_number = greatest(project_entity_counter.last_number, excluded.last_number);
  return new;
end;
$$ language plpgsql;

create table if not exists project_phase (
  phase_id text not null check (phase_id ~ '^P-((?!0+$)[0-9]{2}|[1-9][0-9]{2,})$'),
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
  primary key (project_id, phase_id),
  constraint uq_project_phase_project_name unique (project_id, name)
);

create table if not exists milestone (
  milestone_id text not null check (milestone_id ~ '^M-((?!0+$)[0-9]{3}|[1-9][0-9]{3,})$'),
  project_id text not null references project(id) on delete cascade,
  phase_id text,
  milestone_name text not null,
  status text not null default 'planned',
  progress_percent numeric(5,2) not null default 0 check (progress_percent between 0 and 100),
  due_date date,
  planned_amount numeric(14,2) not null default 0,
  actual_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, milestone_id),
  constraint milestone_status_check check (status in ('planned', 'in_progress', 'completed', 'blocked')),
  constraint uq_milestone_project_milestone_name unique (project_id, milestone_name),
  constraint milestone_phase_fkey foreign key (project_id, phase_id)
    references project_phase(project_id, phase_id) on delete set null (phase_id) on update cascade
);

create table if not exists project_task (
  task_id text primary key,
  project_id text not null references project(id) on delete cascade,
  milestone_id text,
  task_name text not null,
  discipline text not null,
  owner text not null,
  status text not null default 'planned',
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
  updated_at timestamptz not null default now(),
  constraint project_task_status_check check (status in ('planned', 'in_progress', 'completed', 'blocked')),
  constraint project_task_milestone_fkey foreign key (project_id, milestone_id)
    references milestone(project_id, milestone_id) on delete set null (milestone_id) on update cascade
);

create table if not exists expenditure (
  expenditure_id text not null check (expenditure_id ~ '^EXP-((?!0+$)[0-9]{3}|[1-9][0-9]{3,})$'),
  project_id text not null references project(id) on delete cascade,
  phase_id text not null,
  milestone_id text,
  task_id text references project_task(task_id) on delete set null,
  title text not null,
  category text not null,
  vendor text,
  estimated_amount numeric(14,2) not null default 0 check (estimated_amount >= 0),
  actual_amount numeric(14,2) not null default 0 check (actual_amount >= 0),
  status text not null default 'forecast' check (status in ('forecast', 'committed', 'incurred', 'invoiced', 'paid', 'cancelled')),
  expenditure_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, expenditure_id),
  constraint expenditure_phase_fkey foreign key (project_id, phase_id)
    references project_phase(project_id, phase_id) on update cascade,
  constraint expenditure_milestone_fkey foreign key (project_id, milestone_id)
    references milestone(project_id, milestone_id) on delete set null (milestone_id) on update cascade
);

create index if not exists idx_expenditure_project_phase on expenditure(project_id, phase_id);
create index if not exists idx_expenditure_project_milestone on expenditure(project_id, milestone_id);
create index if not exists idx_expenditure_task_id on expenditure(task_id);
create index if not exists idx_expenditure_date on expenditure(expenditure_date);

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
  risk_id text not null check (risk_id ~ '^RSK-((?!0+$)[0-9]{3}|[1-9][0-9]{3,})$'),
  project_id text not null references project(id) on delete cascade,
  category text not null,
  title text not null,
  likelihood text not null default 'Possible',
  impact text not null default 'medium',
  affected_areas text[] not null default '{}'::text[],
  priority text not null default 'medium'
    check (priority in ('critical', 'high', 'medium', 'low')),
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
  updated_at timestamptz not null default now(),
  primary key (project_id, risk_id)
);

create table if not exists lesson (
  lesson_id text primary key,
  project_id text not null references project(id) on delete cascade,
  phase_id text,
  title text not null,
  knowledge_area text not null,
  root_cause text not null,
  expected_outcome text,
  difference text,
  description text,
  business text,
  created_at timestamptz not null default now(),
  constraint lesson_phase_fkey foreign key (project_id, phase_id)
    references project_phase(project_id, phase_id) on delete set null (phase_id) on update cascade
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

-- PDFs saved locally by backend/document_store.py (content-addressed by sha256), then parsed per page.
create table if not exists document (
  document_id uuid primary key default gen_random_uuid(),
  project_id text references project(id) on delete set null,
  sha256 text not null unique check (sha256 ~ '^[0-9a-f]{64}$'),
  filename text not null,
  size_bytes bigint not null check (size_bytes > 0),
  page_count integer,
  metadata jsonb not null default '{}'::jsonb,
  storage_path text not null,
  status text not null default 'stored' check (status in ('stored', 'parsed', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  parsed_at timestamptz
);

-- Where each document came from: a Gmail message (source_ref = message id, matching
-- activity_log.source_path) or a SharePoint path. The same file can arrive from several places.
create table if not exists document_source (
  document_id uuid not null references document(document_id) on delete cascade,
  source_type text not null check (source_type in ('gmail', 'sharepoint')),
  source_ref text not null,
  attachment_name text not null default '',
  created_at timestamptz not null default now(),
  primary key (document_id, source_type, source_ref, attachment_name)
);

create table if not exists document_page (
  document_id uuid not null references document(document_id) on delete cascade,
  page_number integer not null check (page_number > 0),
  text text not null default '',
  tables jsonb not null default '[]'::jsonb,
  has_text boolean not null default false,
  primary key (document_id, page_number)
);

create index if not exists idx_document_project_id on document(project_id);
create index if not exists idx_document_source_ref on document_source(source_type, source_ref);

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

create or replace trigger assign_project_phase_id before insert on project_phase
for each row execute function trg_assign_project_entity_id('phase_id', 'phase');
create or replace trigger assign_milestone_id before insert on milestone
for each row execute function trg_assign_project_entity_id('milestone_id', 'milestone');
create or replace trigger assign_expenditure_id before insert on expenditure
for each row execute function trg_assign_project_entity_id('expenditure_id', 'expenditure');
create or replace trigger assign_risk_id before insert on risk_register
for each row execute function trg_assign_project_entity_id('risk_id', 'risk');
