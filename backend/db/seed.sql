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
),
(
  'PRJ-02',
  'Tower B Facade',
  'Apex Development',
  'Kuala Lumpur',
  'Design',
  'M-01 Facade Mockup Review',
  35.00,
  9200000.00,
  3100000.00,
  'active'
),
(
  'PRJ-03',
  'Prime Estate Podium',
  'Prime Properties Ltd',
  'Penang',
  'Commissioning',
  'M-04 Final Integrated Commissioning',
  88.00,
  24000000.00,
  21500000.00,
  'active'
),
(
  'PRJ-04',
  'Metro Logistics Hub',
  'Metro Cargo Corp',
  'Johor Bahru',
  'Procurement',
  'M-02 Long-Lead Package Sourcing',
  48.00,
  16000000.00,
  7800000.00,
  'active'
),
(
  'PRJ-05',
  'Summit Bay Refinery',
  'National Petroleum',
  'Bintulu',
  'Commissioning',
  'M-05 Drive Pre-commissioning Gate',
  92.00,
  45000000.00,
  41200000.00,
  'active'
) on conflict (id) do nothing;

insert into project_phase (project_id, name, phase_order, status, start_date, end_date, progress_percent)
values
  ('PRJ-2401', 'Concept', 1, 'complete', '2025-06-01', '2025-09-30', 100),
  ('PRJ-2401', 'Feasibility', 2, 'complete', '2025-10-01', '2025-12-31', 100),
  ('PRJ-2401', 'Design', 3, 'complete', '2026-01-05', '2026-03-30', 100),
  ('PRJ-2401', 'Procurement', 4, 'complete', '2026-03-15', '2026-06-30', 100),
  ('PRJ-2401', 'Construction', 5, 'active', '2026-07-01', '2026-11-15', 58),
  ('PRJ-2401', 'Handover', 6, 'planned', '2026-11-16', '2027-01-20', 30)
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
from (
  values
    ('Concept', 'M-C01 Concept Alignment & Scoping', '2025-09-30', 'complete', 100, 8000000.00, 7800000.00),
    ('Feasibility', 'M-F01 Geotechnical Survey & EIA Clearance', '2025-12-31', 'complete', 100, 14000000.00, 14200000.00),
    ('Design', 'M-D01 Detailed Engineering & BIM LOD 350 Release', '2026-03-30', 'complete', 100, 24000000.00, 26500000.00),
    ('Procurement', 'M-P01 Long-lead Equipment & Structural Steel Award', '2026-06-30', 'complete', 100, 42000000.00, 44100000.00),
    ('Construction', 'M-01 Substructure & Foundation Release', '2026-08-14', 'complete', 100, 8400000.00, 8200000.00),
    ('Construction', 'M-02 Envelope & MEP Rough-in Release', '2026-09-18', 'active', 75, 14200000.00, 15100000.00),
    ('Construction', 'M-04 Work package release', '2026-09-30', 'active', 58, 9600000.00, 9400000.00),
    ('Construction', 'M-05 Life Safety & Commissioning Readiness', '2026-10-22', 'blocked', 20, 11000000.00, 4100000.00),
    ('Handover', 'M-H01 Operational Readiness & Statutory Handover', '2027-01-20', 'planned', 30, 8000000.00, 2400000.00)
) as m(phase_name, milestone_name, due_date, status, progress_percent, planned_amount, actual_amount)
join project_phase pp on pp.project_id = 'PRJ-2401' and pp.name = m.phase_name
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
    ('TSK-100A', 'M-F01 Geotechnical Survey & EIA Clearance', 'Geotechnical seabed core drilling & foundation survey', 'Geotechnical', 'Survey consultant', 'complete', 'high', '2025-10-01', '2025-11-10', 4200000.00, 4100000.00),
    ('TSK-100B', 'M-D01 Detailed Engineering & BIM LOD 350 Release', 'BIM LOD 350 structural 4D model & MEP clash detection', 'Design', 'Lead architect', 'complete', 'high', '2026-01-10', '2026-03-15', 11000000.00, 11500000.00),
    ('TSK-100C', 'M-P01 Long-lead Equipment & Structural Steel Award', 'Long-lead HVAC chillers & curtain wall procurement', 'Procurement', 'Supply chain lead', 'complete', 'high', '2026-03-20', '2026-06-20', 18000000.00, 18800000.00),
    ('TSK-101', 'M-01 Substructure & Foundation Release', 'Structural concrete & foundation slab inspection', 'Structural', 'Civil delivery team', 'complete', 'medium', '2026-07-01', '2026-08-14', 8400000.00, 8200000.00),
    ('TSK-102', 'M-02 Envelope & MEP Rough-in Release', 'Facade curtain wall sequencing and MEP rough-in', 'Facade', 'Envelope package team', 'in_progress', 'high', '2026-08-01', '2026-09-18', 14200000.00, 15100000.00),
    ('TSK-103', 'M-04 Work package release', 'Primary HVAC chiller and pump installation', 'MEP Services', 'Mechanical lead', 'in_progress', 'high', '2026-07-01', '2026-09-24', 9600000.00, 9400000.00),
    ('TSK-104', 'M-05 Life Safety & Commissioning Readiness', 'Fire safety suppression & smoke damper certification', 'Life Safety', 'Compliance review', 'blocked', 'high', '2026-09-01', '2026-10-22', 3800000.00, 4100000.00),
    ('TSK-105', 'M-05 Life Safety & Commissioning Readiness', 'Architectural finishes & concourse flooring', 'Architectural', 'Finishes contractor', 'not_started', 'medium', '2026-10-01', '2026-11-15', 7200000.00, 0.00),
    ('TSK-106', 'M-H01 Operational Readiness & Statutory Handover', 'BMS integrated controls & SCADA commissioning', 'Commissioning', 'Systems integration lead', 'planned', 'medium', '2026-11-20', '2026-12-05', 3200000.00, 1200000.00),
    ('TSK-107', 'M-H01 Operational Readiness & Statutory Handover', 'Statutory fire authority witness & acoustic sign-off', 'Life Safety', 'QA/QC authority liaison', 'planned', 'high', '2026-12-01', '2026-12-20', 2400000.00, 800000.00),
    ('TSK-108', 'M-H01 Operational Readiness & Statutory Handover', 'Digital twin asset register & operations handover', 'Handover', 'Digital delivery manager', 'planned', 'medium', '2026-12-15', '2027-01-10', 1800000.00, 400000.00),
    ('TSK-C01', 'M-C01 Concept Alignment & Scoping', 'Confirm project objectives and operational requirements', 'Project Controls', 'Project manager', 'complete', 'high', '2025-06-01', '2025-06-20', 250000.00, 240000.00),
    ('TSK-C02', 'M-C01 Concept Alignment & Scoping', 'Develop concept options and evaluation criteria', 'Engineering', 'Engineering manager', 'complete', 'high', '2025-06-15', '2025-07-31', 480000.00, 465000.00),
    ('TSK-C03', 'M-C01 Concept Alignment & Scoping', 'Complete preliminary cost and schedule estimate', 'Cost & Planning', 'Project controls lead', 'complete', 'medium', '2025-07-15', '2025-08-31', 180000.00, 175000.00),
    ('TSK-C04', 'M-C01 Concept Alignment & Scoping', 'Approve concept scope and project execution strategy', 'Governance', 'Project sponsor', 'complete', 'high', '2025-09-01', '2025-09-30', 90000.00, 85000.00),
    ('TSK-F01', 'M-F01 Geotechnical Survey & EIA Clearance', 'Complete environmental baseline and impact assessment', 'Environmental', 'Environmental consultant', 'complete', 'high', '2025-10-01', '2025-11-25', 1850000.00, 1920000.00),
    ('TSK-F02', 'M-F01 Geotechnical Survey & EIA Clearance', 'Verify utility interfaces and site access constraints', 'Civil', 'Interface manager', 'complete', 'medium', '2025-10-15', '2025-12-05', 620000.00, 600000.00),
    ('TSK-F03', 'M-F01 Geotechnical Survey & EIA Clearance', 'Issue feasibility report and risk-adjusted estimate', 'Project Controls', 'Planning manager', 'complete', 'high', '2025-11-15', '2025-12-31', 310000.00, 325000.00),
    ('TSK-D01', 'M-D01 Detailed Engineering & BIM LOD 350 Release', 'Freeze design basis and discipline design criteria', 'Engineering', 'Engineering manager', 'complete', 'high', '2026-01-05', '2026-01-31', 780000.00, 800000.00),
    ('TSK-D02', 'M-D01 Detailed Engineering & BIM LOD 350 Release', 'Close interdisciplinary model review comments', 'BIM Coordination', 'BIM manager', 'complete', 'high', '2026-02-01', '2026-03-10', 1450000.00, 1510000.00),
    ('TSK-D03', 'M-D01 Detailed Engineering & BIM LOD 350 Release', 'Approve issued-for-construction drawing package', 'Design Assurance', 'Lead engineer', 'complete', 'high', '2026-03-01', '2026-03-30', 920000.00, 960000.00),
    ('TSK-P01', 'M-P01 Long-lead Equipment & Structural Steel Award', 'Issue technical bid evaluation for long-lead equipment', 'Procurement', 'Package engineer', 'complete', 'high', '2026-03-15', '2026-04-20', 240000.00, 230000.00),
    ('TSK-P02', 'M-P01 Long-lead Equipment & Structural Steel Award', 'Complete vendor document and quality-plan review', 'Supplier Quality', 'Vendor quality lead', 'complete', 'medium', '2026-04-15', '2026-05-31', 360000.00, 375000.00),
    ('TSK-P03', 'M-P01 Long-lead Equipment & Structural Steel Award', 'Release fabrication and confirm delivery schedule', 'Supply Chain', 'Procurement manager', 'complete', 'high', '2026-05-15', '2026-06-30', 190000.00, 205000.00),
    ('TSK-101A', 'M-01 Substructure & Foundation Release', 'Complete piling integrity and load testing', 'Geotechnical', 'Geotechnical lead', 'complete', 'high', '2026-07-01', '2026-07-25', 1250000.00, 1210000.00),
    ('TSK-101B', 'M-01 Substructure & Foundation Release', 'Approve reinforcement and embedded-items inspection', 'Structural', 'QA/QC inspector', 'complete', 'high', '2026-07-20', '2026-08-05', 420000.00, 405000.00),
    ('TSK-101C', 'M-01 Substructure & Foundation Release', 'Close foundation survey and as-built records', 'Survey', 'Survey manager', 'complete', 'medium', '2026-08-01', '2026-08-14', 180000.00, 175000.00),
    ('TSK-102A', 'M-02 Envelope & MEP Rough-in Release', 'Complete facade anchor pull-out testing', 'Facade', 'Facade QA lead', 'complete', 'high', '2026-08-01', '2026-08-28', 540000.00, 565000.00),
    ('TSK-102B', 'M-02 Envelope & MEP Rough-in Release', 'Close MEP ceiling-zone clash actions', 'BIM Coordination', 'MEP coordinator', 'in_progress', 'high', '2026-08-10', '2026-09-12', 680000.00, 710000.00),
    ('TSK-102C', 'M-02 Envelope & MEP Rough-in Release', 'Inspect firestopping at service penetrations', 'Life Safety', 'Fire engineer', 'in_progress', 'high', '2026-09-01', '2026-09-18', 310000.00, 260000.00),
    ('TSK-103A', 'M-04 Work package release', 'Approve HVAC equipment installation method statement', 'Mechanical', 'Construction manager', 'complete', 'high', '2026-07-01', '2026-07-20', 120000.00, 115000.00),
    ('TSK-103B', 'M-04 Work package release', 'Complete chilled-water pipe pressure testing', 'Mechanical', 'Mechanical QA lead', 'in_progress', 'high', '2026-08-15', '2026-09-26', 460000.00, 390000.00),
    ('TSK-103C', 'M-04 Work package release', 'Release electrical power and controls interfaces', 'Electrical', 'Electrical lead', 'in_progress', 'medium', '2026-09-01', '2026-09-30', 280000.00, 210000.00),
    ('TSK-104A', 'M-05 Life Safety & Commissioning Readiness', 'Complete cause-and-effect testing for fire systems', 'Life Safety', 'Commissioning lead', 'blocked', 'high', '2026-09-20', '2026-10-18', 620000.00, 210000.00),
    ('TSK-104B', 'M-05 Life Safety & Commissioning Readiness', 'Close commissioning punch-list category A items', 'Commissioning', 'QA/QC manager', 'not_started', 'high', '2026-10-05', '2026-10-22', 350000.00, 0.00),
    ('TSK-H01', 'M-H01 Operational Readiness & Statutory Handover', 'Complete operator training and competency sign-off', 'Operations Readiness', 'Operations manager', 'planned', 'high', '2026-12-10', '2027-01-15', 650000.00, 0.00)
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

insert into expenditure (
  expenditure_id, project_id, phase_id, title, category, vendor,
  estimated_amount, actual_amount, status, expenditure_date
)
select
  md5(e.code)::uuid,
  'PRJ-2401',
  pp.phase_id,
  e.title,
  e.category,
  e.vendor,
  e.estimated_amount,
  e.actual_amount,
  e.status,
  e.expenditure_date::date
from (
  values
    ('EXP-C01', 'Concept', 'Topographical LIDAR scans & utility mapping', 'Subcontractors', 'Apex Geospatial Ltd', 1800000.00, 1700000.00, 'incurred', '2025-09-30'),
    ('EXP-C02', 'Concept', 'Concept architectural massing & 3D scale models', 'Materials', 'KPF Design Partners', 1200000.00, 1200000.00, 'incurred', '2025-09-30'),
    ('EXP-C03', 'Concept', 'Lead design architects & structural directors payroll', 'Salaries & Labor', 'In-house Core Engineering', 2600000.00, 2500000.00, 'incurred', '2025-09-30'),
    ('EXP-C04', 'Concept', 'Geotechnical testing rig & mobile sonic sounders lease', 'Equipment & Plant', 'Geotech Instruments Corp', 1300000.00, 1200000.00, 'incurred', '2025-09-30'),
    ('EXP-C05', 'Concept', 'Municipal zoning appraisal & pre-planning permit fees', 'Permits & Fees', 'City Development Authority', 1200000.00, 1200000.00, 'incurred', '2025-09-30'),
    ('EXP-F01', 'Feasibility', 'Borehole exploratory drilling & geotechnical core sampling', 'Subcontractors', 'Civic Ground Engineering', 3600000.00, 3700000.00, 'incurred', '2025-12-31'),
    ('EXP-F02', 'Feasibility', 'Core sample casings, bentonite slurry & field consumables', 'Materials', 'GeoSupply Industrial', 2000000.00, 2000000.00, 'incurred', '2025-12-31'),
    ('EXP-F03', 'Feasibility', 'Senior geotechnical analysts & cost QS team salaries', 'Salaries & Labor', 'In-house Project Controls', 3900000.00, 4000000.00, 'incurred', '2025-12-31'),
    ('EXP-F04', 'Feasibility', 'Hydraulic rotary drill rig & soil press equipment rental', 'Equipment & Plant', 'HeavyHire International', 2500000.00, 2600000.00, 'incurred', '2025-12-31'),
    ('EXP-F05', 'Feasibility', 'Environmental impact statutory filing & planning clearances', 'Permits & Fees', 'Metropolitan Planning Bureau', 2000000.00, 2000000.00, 'incurred', '2025-12-31'),
    ('EXP-D01', 'Design', 'Acoustic mockups, thermal glass & cladding test specimens', 'Materials', 'Saint-Gobain Architectural', 4300000.00, 4800000.00, 'incurred', '2026-03-30'),
    ('EXP-D02', 'Design', 'BIM coordinators, structural engineers & MEP staff payroll', 'Salaries & Labor', 'Foster & Partners Engineering', 8200000.00, 9000000.00, 'incurred', '2026-03-30'),
    ('EXP-D03', 'Design', 'Specialist boundary-layer wind tunnel testing contract', 'Subcontractors', 'RWDI Wind Engineers', 5800000.00, 6400000.00, 'incurred', '2026-03-30'),
    ('EXP-D04', 'Design', 'High-spec BIM modeling workstations & 3D scanner rentals', 'Equipment & Plant', 'TechLease Infrastructure', 2900000.00, 3200000.00, 'incurred', '2026-03-30'),
    ('EXP-D05', 'Design', 'Professional Engineer stamp certifications & building licenses', 'Permits & Fees', 'State Board of Engineers & City Licensing', 2900000.00, 3200000.00, 'incurred', '2026-03-30'),
    ('EXP-P01', 'Procurement', 'Structural steel mill order & rebar reinforcement supply', 'Materials', 'ArcelorMittal Industrial', 19300000.00, 20300000.00, 'incurred', '2026-06-30'),
    ('EXP-P02', 'Procurement', 'Procurement buyers, supply chain expeditors & QA payroll', 'Salaries & Labor', 'Global Sourcing Team', 7600000.00, 7900000.00, 'incurred', '2026-06-30'),
    ('EXP-P03', 'Procurement', 'International freight logistics forwarding & stevedoring', 'Subcontractors', 'Maersk Global Logistics', 6700000.00, 7100000.00, 'incurred', '2026-06-30'),
    ('EXP-P04', 'Procurement', 'Dockside gantry cranes & heavy flatbed transporter leasing', 'Equipment & Plant', 'Port Equipment Services', 5000000.00, 5300000.00, 'incurred', '2026-06-30'),
    ('EXP-P05', 'Procurement', 'Customs import duty tariffs & marine cargo insurance bonds', 'Permits & Fees', 'Customs Bureau & Lloyd''s Syndicate', 3400000.00, 3500000.00, 'incurred', '2026-06-30'),
    ('EXP-C10', 'Construction', 'High-strength C50 ready-mix concrete, rebar & structural steel', 'Materials', 'Titan Concrete & Steel Solutions', 16400000.00, 14000000.00, 'incurred', '2026-10-16'),
    ('EXP-C11', 'Construction', 'Site superintendents, safety engineers & trade crews payroll', 'Salaries & Labor', 'Direct Site Operations Payroll', 9500000.00, 8100000.00, 'incurred', '2026-10-16'),
    ('EXP-C12', 'Construction', 'Deep substructure excavation & diaphragm wall trade contract', 'Subcontractors', 'Keller Foundation Systems', 8600000.00, 7400000.00, 'incurred', '2026-10-16'),
    ('EXP-C13', 'Construction', 'Twin luffing-jib tower cranes & concrete boom pumps rental', 'Equipment & Plant', 'Select Plant Hire Ltd', 6000000.00, 5200000.00, 'incurred', '2026-10-16'),
    ('EXP-C14', 'Construction', 'Municipal street closure, heavy-haul permits & environmental monitoring', 'Permits & Fees', 'Department of Transportation & EPA', 2600000.00, 2200000.00, 'incurred', '2026-10-16'),
    ('EXP-H01', 'Handover', 'Final architectural touch-up finishes, hardware & wayfinding signs', 'Materials', 'Apex Interior Elements', 1200000.00, 400000.00, 'incurred', '2027-01-20'),
    ('EXP-H02', 'Handover', 'Closeout managers, QA/QC punchlist engineers & facilities team salaries', 'Salaries & Labor', 'Project Handover Management', 2000000.00, 600000.00, 'incurred', '2027-01-20'),
    ('EXP-H03', 'Handover', 'Testing, Adjusting & Balancing mechanical commissioning', 'Subcontractors', 'National Commissioning Bureau', 2600000.00, 800000.00, 'incurred', '2027-01-20'),
    ('EXP-H04', 'Handover', 'Thermal imaging cameras, airflow meters & load bank rentals', 'Equipment & Plant', 'Instrument Hire Co', 1100000.00, 300000.00, 'incurred', '2027-01-20'),
    ('EXP-H05', 'Handover', 'Certificate of Occupancy statutory approvals & fire marshal stamps', 'Permits & Fees', 'Bureau Veritas & Municipal Fire Dept', 1100000.00, 300000.00, 'incurred', '2027-01-20')
) as e(code, phase_name, title, category, vendor, estimated_amount, actual_amount, status, expenditure_date)
join project_phase pp on pp.project_id = 'PRJ-2401' and pp.name = e.phase_name
on conflict (expenditure_id) do update
set phase_id = excluded.phase_id,
    title = excluded.title,
    category = excluded.category,
    vendor = excluded.vendor,
    estimated_amount = excluded.estimated_amount,
    actual_amount = excluded.actual_amount,
    status = excluded.status,
    expenditure_date = excluded.expenditure_date,
    updated_at = now();


insert into activity_log (project_id, task_id, activity_type, title, source_type, source_path, summary, processing_state)
values
  ('PRJ-2401', 'TSK-103', 'drawing_reference', 'Drawing used for pump piping space requirement', 'drawing', 'pump-piping-layout.png', 'Drawing used to validate pump piping space requirement and installation progress.', 'applied'),
  ('PRJ-2401', 'TSK-103', 'technical_query', 'Pipe wall thickness below project class requirement', 'email', 'TQ-2026-0913', 'Engineer raised concern that detected wall thickness is 6 mm against 8 mm project requirement.', 'needs_review'),
  ('PRJ-2401', 'TSK-103', 'engineer_report', 'Pump piping access review', 'report', 'REP-MECH-014', 'Maintenance access and pipe rack clearance reviewed against latest layout.', 'applied');

insert into risk_register (
  project_id, risk_code, category, title, likelihood, impact, affected_areas, priority, status,
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
    array['Schedule', 'Cost'],
    'high',
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
    array['Schedule', 'Cost'],
    'high',
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
    array['Safety', 'Schedule'],
    'critical',
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
    array['Schedule', 'Cost', 'Technical'],
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

insert into lesson (lesson_id, project_id, title, knowledge_area, root_cause, description, business)
values
  ('LL-001', 'PRJ-2401', 'Pipe wall thickness was below the approved specification during receiving inspection.', 'Piping', 'Vendor certificate was accepted before the latest material requisition revision was checked.', 'Material acceptance needs a drawing, requisition and certificate match before release to site.', 'Add a receiving checklist step for wall thickness, heat number and revision match before installation release.'),
  ('LL-002', 'PRJ-2401', 'Pump package drawing arrived after civil foundation hold points were already planned.', 'Vendor Document', 'Vendor document schedule was not tied to the construction work pack baseline.', 'Long-lead package documents must drive field planning dates, not only purchase order dates.', 'Link vendor drawing approval dates to milestone readiness and flag late documents in weekly progress review.'),
  ('LL-003', 'PRJ-02', 'Cable tray route conflicted with access platform clearance.', 'Interface', 'Discipline models were reviewed separately without an interface freeze before fabrication.', 'Design review should focus on maintainability and access space before fabrication drawings are issued.', 'Run an interface review for access, lifting and maintenance clearance before construction release.'),
  ('LL-004', 'PRJ-03', 'Pressure test package was rejected because calibration certificates were expired.', 'Testing', 'Test equipment validity was checked at execution instead of during test pack preparation.', 'Test readiness must include tool and instrument validity, not only procedure approval.', 'Add calibration status to test pack readiness checks and assign QA verification before test day.'),
  ('LL-005', 'PRJ-2401', 'Skid anchor bolts misaligned by 25mm relative to base frame slots during equipment setting.', 'Structural', 'Survey grid line was referenced from preliminary civil mark instead of verified monument benchmark.', 'Equipment foundation bolt surveys must require independent surveyor sign-off prior to concrete pour.', 'Mandate joint civil/mechanical check sheet with photographic verification for all dynamic equipment pads.'),
  ('LL-006', 'PRJ-04', 'Transformer delivery delayed by 6 weeks due to factory testing failure.', 'Long Lead', 'Sub-supplier FAT was conducted without third-party inspector witnessing insulation resistance test.', 'Witness hold-points must be established for critical transformers and switchgear factory tests.', 'Implement mandatory QA inspection attendance for all critical-path power equipment FATs.'),
  ('LL-007', 'PRJ-05', 'VFD drive trip during motor no-load commissioning due to harmonic resonance.', 'Electrical', 'Cable length exceeded unshielded threshold without harmonic filter installation.', 'Ensure motor feeder length calculations include line reactor specs during initial engineering freeze.', 'Incorporate harmonic study verification into pre-commissioning mechanical completion dossiers.')
on conflict (lesson_id) do update set
  title = excluded.title,
  knowledge_area = excluded.knowledge_area,
  root_cause = excluded.root_cause,
  description = excluded.description,
  business = excluded.business;

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
