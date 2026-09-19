insert into project (
  id, name, client, location, current_phase, current_milestone,
  progress_percent, budget_amount, spent_amount, status
) values (
  'PRJ-2401',
  'Harbor Link Station',
  'Metro Infrastructure Authority',
  'Port Klang',
  'Construction',
  'M-04 Work package release',
  62.00,
  18500000.00,
  11470000.00,
  'active'
) on conflict (id) do nothing;

insert into project_phase (project_id, name, phase_order, status, start_date, end_date, progress_percent)
values
  ('PRJ-2401', 'Design', 1, 'complete', '2026-01-05', '2026-03-30', 100),
  ('PRJ-2401', 'Procurement', 2, 'complete', '2026-03-15', '2026-06-30', 100),
  ('PRJ-2401', 'Construction', 3, 'active', '2026-07-01', '2026-11-15', 58),
  ('PRJ-2401', 'Commissioning', 4, 'planned', '2026-11-16', '2026-12-20', 0)
on conflict (project_id, name) do nothing;

insert into milestone (project_id, phase_id, milestone_name, due_date, status, progress_percent, planned_amount, actual_amount)
select
  'PRJ-2401',
  pp.phase_id,
  m.milestone_name,
  m.due_date::date,
  m.status,
  m.progress_percent,
  m.planned_amount,
  m.actual_amount
from project_phase pp
cross join (
  values
    ('M-01 Substructure & Foundation Release', '2026-08-14', 'complete', 100, 8400000.00, 8200000.00),
    ('M-02 Envelope & MEP Rough-in Release', '2026-09-18', 'active', 75, 14200000.00, 15100000.00),
    ('M-04 Work package release', '2026-09-30', 'active', 58, 9600000.00, 9400000.00),
    ('M-05 Life Safety & Commissioning Readiness', '2026-10-22', 'blocked', 20, 11000000.00, 4100000.00)
) as m(milestone_name, due_date, status, progress_percent, planned_amount, actual_amount)
where pp.project_id = 'PRJ-2401' and pp.name = 'Construction'
on conflict (project_id, milestone_name) do update
set status = excluded.status,
    progress_percent = excluded.progress_percent,
    due_date = excluded.due_date,
    planned_amount = excluded.planned_amount,
    actual_amount = excluded.actual_amount;

insert into project_task (task_id, project_id, milestone_id, task_name, discipline, owner, status, priority, planned_start_date, planned_end_date, cost_estimate, cost_actual)
select
  t.task_id,
  'PRJ-2401',
  m.milestone_id,
  t.task_name,
  t.discipline,
  t.owner,
  t.status,
  t.priority,
  t.planned_start_date::date,
  t.planned_end_date::date,
  t.cost_estimate,
  t.cost_actual
from (
  values
    ('TSK-101', 'M-01 Substructure & Foundation Release', 'Structural concrete & foundation slab inspection', 'Structural', 'Civil delivery team', 'complete', 'medium', '2026-07-01', '2026-08-14', 8400000.00, 8200000.00),
    ('TSK-102', 'M-02 Envelope & MEP Rough-in Release', 'Facade curtain wall sequencing and MEP rough-in', 'Facade', 'Envelope package team', 'in_progress', 'high', '2026-08-01', '2026-09-18', 14200000.00, 15100000.00),
    ('TSK-103', 'M-04 Work package release', 'Primary HVAC chiller and pump installation', 'MEP Services', 'Mechanical lead', 'in_progress', 'high', '2026-07-01', '2026-09-24', 9600000.00, 9400000.00),
    ('TSK-104', 'M-05 Life Safety & Commissioning Readiness', 'Fire safety suppression & smoke damper certification', 'Life Safety', 'Compliance review', 'blocked', 'high', '2026-09-01', '2026-10-22', 3800000.00, 4100000.00),
    ('TSK-105', 'M-05 Life Safety & Commissioning Readiness', 'Architectural finishes & concourse flooring', 'Architectural', 'Finishes contractor', 'not_started', 'medium', '2026-10-01', '2026-11-15', 7200000.00, 0.00)
) as t(task_id, milestone_name, task_name, discipline, owner, status, priority, planned_start_date, planned_end_date, cost_estimate, cost_actual)
join milestone m on m.project_id = 'PRJ-2401' and m.milestone_name = t.milestone_name
on conflict (task_id) do update
set milestone_id = excluded.milestone_id,
    task_name = excluded.task_name,
    discipline = excluded.discipline,
    owner = excluded.owner,
    status = excluded.status,
    priority = excluded.priority,
    planned_start_date = excluded.planned_start_date,
    planned_end_date = excluded.planned_end_date,
    cost_estimate = excluded.cost_estimate,
    cost_actual = excluded.cost_actual;


insert into activity_log (project_id, task_id, activity_type, title, source_type, source_path, summary)
values
  ('PRJ-2401', 'TSK-103', 'drawing_reference', 'Drawing used for pump piping space requirement', 'drawing', 'pump-piping-layout.png', 'Drawing used to validate pump piping space requirement and installation progress.'),
  ('PRJ-2401', 'TSK-103', 'technical_query', 'Pipe wall thickness below project class requirement', 'email', 'TQ-2026-0913', 'Engineer raised concern that detected wall thickness is 6 mm against 8 mm project requirement.'),
  ('PRJ-2401', 'TSK-103', 'engineer_report', 'Pump piping access review', 'report', 'REP-MECH-014', 'Maintenance access and pipe rack clearance reviewed against latest layout.');

insert into risk_register (
  project_id, risk_code, category, title, likelihood, impact, status,
  mitigation, owner, due_date, affected_milestone, trigger_event,
  reasoning, evidence_source, confidence
)
values
  (
    'PRJ-2401',
    'RSK-01',
    'Procurement & Delivery',
    'Late equipment release',
    'Likely',
    '3-day installation delay',
    'open',
    'Expedite inspection and confirm dispatch',
    'Procurement lead',
    '2026-09-15',
    'Critical equipment installation',
    'Vendor inspection date moved outside the install window',
    'Vendor inspection release is not confirmed against the installation window.',
    'Procurement email + inspection tracker',
    'Medium'
  ),
  (
    'PRJ-2401',
    'RSK-02',
    'Workforce & Staffing',
    'Specialist workforce gap',
    'Possible',
    '5-day commissioning delay',
    'open',
    'Confirm certified crew availability',
    'Construction manager',
    '2026-09-16',
    'Commissioning readiness review',
    'Crew booking is below the planned resource curve',
    'Certified commissioning crew availability is below the planned resource curve.',
    'Workforce planner + subcontractor message',
    'Medium'
  ),
  (
    'PRJ-2401',
    'RSK-03',
    'Quality & Safety',
    'Incomplete safety-review evidence',
    'Possible',
    'Readiness gate may be held',
    'open',
    'Close overdue review action with signed evidence',
    'Process safety lead',
    '2026-09-11',
    'Safety review action',
    'Readiness evidence package is missing one signed hazard-review item',
    'Hazard-review evidence is still missing from the readiness gate package.',
    'Safety review minutes',
    'High'
  ),
  (
    'PRJ-2401',
    'RSK-04',
    'Construction delay',
    'Pump installation may slip if pipe class is not clarified',
    'Likely',
    'high',
    'open',
    'Hold installation and close technical query before fabrication release.',
    'Mechanical lead',
    '2026-09-20',
    'Pump skid installation',
    'Pipe wall thickness discrepancy detected against class requirement',
    'Piping wall thickness detected is 6 mm instead of 8 mm requirement.',
    'TQ-2026-0913 + technical review',
    'High'
  );

insert into request (request_id, project_id, title, request_type, description, status)
values
  (
    'TQ-2026-0913',
    'PRJ-2401',
    'Pipe wall thickness below project class requirement',
    'technical_query',
    'Engineer raised concern that detected wall thickness is 6 mm against 8 mm project requirement.',
    'open'
  ),
  (
    'COM-001',
    'PRJ-2401',
    'Change material thickness from 8 mm to 6 mm',
    'change_order',
    'Contractor requests reducing CW-014 pipe wall thickness from the project class requirement of 8 mm to 6 mm.',
    'open'
  ),
  (
    'COF-001',
    'PRJ-2401',
    'Change foundation support detail near pump skid',
    'change_order',
    'Site team requests changing the pump skid foundation support detail due to access constraint found during installation.',
    'review'
  )
on conflict (request_id) do nothing;

insert into analysis (request_id, agent_type, result, reasoning, recommendation)
values
  (
    'TQ-2026-0913',
    'technical',
    'needs_review',
    'The measured thickness differs from the project pipe class and requires an engineering assessment.',
    'Verify the allowable mill tolerance and obtain mechanical discipline approval before fabrication.'
  ),
  (
    'COM-001',
    'technical',
    'non_compliant',
    'The proposed 6 mm thickness is below the current 8 mm project requirement.',
    'Retain 8 mm thickness unless a documented design calculation and formal deviation are approved.'
  ),
  (
    'COF-001',
    'constructability',
    'needs_review',
    'The revised support may resolve the access constraint but could alter load transfer to the foundation.',
    'Complete structural verification and issue an approved revised detail before installation.'
  );

insert into lesson (project_id, title, knowledge_area, root_cause, description, business)
values
  ('PRJ-2401', 'Pipe wall thickness below project class requirement', 'Piping', 'Vendor drawing revision did not reflect latest project pipe class.', 'Always cross-check uploaded layout drawings against pipe class specification before installation release.', 'Add pipe class verification to work package release checklist.');

insert into workforce (worker_type, specification, total_headcount)
values ('Pipe fitter', 'CS piping, pump tie-in, permit-to-work trained', 3);

insert into workforce_requirement (project_id, phase_id, worker_type, specification, workforce_id, required_count)
select
  'PRJ-2401',
  pp.phase_id,
  'Pipe fitter',
  'CS piping, pump tie-in, permit-to-work trained',
  w.workforce_id,
  6
from project_phase pp
join workforce w on w.worker_type = 'Pipe fitter'
where pp.project_id = 'PRJ-2401' and pp.name = 'Construction';

insert into "user" (user_id, email, status)
values
  ('11111111-1111-1111-1111-111111111111', 'project.engineer@example.com', 'active')
on conflict (email) do nothing;

insert into session (
  session_id, user_id, project_id, title, agent_persona, status,
  summary_text, entities_json, current_goal, open_threads, last_summarized_turn
)
values
  (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'PRJ-2401',
    'Pipe Wall Thickness Evaluation',
    'Project Engineering Specialist',
    'active',
    'Reviewed pump piping wall thickness specifications against project requirements.',
    '{"standards": ["API 570", "CW-014"], "component": "chiller pump"}'::jsonb,
    'Resolve wall thickness discrepancy for milestone M-04 release',
    'Awaiting structural stress calculation confirmation',
    2
  )
on conflict (session_id) do nothing;

insert into message (session_id, index, role, content)
values
  (
    '22222222-2222-2222-2222-222222222222',
    1,
    'user',
    'Pipe thickness is not enough and may delay installation'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    2,
    'assistant',
    'Reconciliation and compliance checks indicate that detected wall thickness is 6 mm against the 8 mm project requirement for pipe class CW-014.'
  );
