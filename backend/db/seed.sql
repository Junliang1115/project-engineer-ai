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
  80.00,
  145000000.00,
  131800000.00,
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

-- planned_budget = the phase's milestone planned amounts; actual_cost = its incurred expenditures.
insert into project_phase (phase_id, project_id, name, phase_order, status, start_date, end_date, progress_percent, planned_budget, actual_cost)
values
  ('P-01', 'PRJ-2401', 'Concept', 1, 'completed', '2025-06-01', '2025-09-30', 100, 8000000.00, 7800000.00),
  ('P-02', 'PRJ-2401', 'Feasibility', 2, 'completed', '2025-10-01', '2025-12-31', 100, 14000000.00, 14200000.00),
  ('P-03', 'PRJ-2401', 'Design', 3, 'completed', '2026-01-05', '2026-03-30', 100, 24000000.00, 26500000.00),
  ('P-04', 'PRJ-2401', 'Procurement', 4, 'completed', '2026-03-15', '2026-06-30', 100, 42000000.00, 44100000.00),
  ('P-05', 'PRJ-2401', 'Construction', 5, 'active', '2026-07-01', '2026-11-15', 58, 43200000.00, 36800000.00),
  ('P-06', 'PRJ-2401', 'Handover', 6, 'planned', '2026-11-16', '2027-01-20', 30, 8000000.00, 2400000.00),
  ('P-01', 'PRJ-02', 'Concept', 1, 'completed', '2026-02-02', '2026-03-31', 100, 600000.00, 560000.00),
  ('P-02', 'PRJ-02', 'Design', 2, 'active', '2026-04-01', '2026-11-30', 55, 2900000.00, 2540000.00),
  ('P-03', 'PRJ-02', 'Procurement', 3, 'planned', '2026-12-01', '2027-03-31', 0, 2800000.00, 0.00),
  ('P-04', 'PRJ-02', 'Installation', 4, 'planned', '2027-04-01', '2027-10-29', 0, 2600000.00, 0.00),
  ('P-05', 'PRJ-02', 'Handover', 5, 'planned', '2027-11-01', '2027-12-15', 0, 300000.00, 0.00),
  ('P-01', 'PRJ-03', 'Design', 1, 'completed', '2025-01-06', '2025-05-30', 100, 2000000.00, 2100000.00),
  ('P-02', 'PRJ-03', 'Procurement', 2, 'completed', '2025-04-01', '2025-08-29', 100, 5000000.00, 5200000.00),
  ('P-03', 'PRJ-03', 'Construction', 3, 'completed', '2025-09-01', '2026-07-31', 100, 12500000.00, 13000000.00),
  ('P-04', 'PRJ-03', 'Commissioning', 4, 'active', '2026-08-03', '2026-11-27', 60, 3200000.00, 1200000.00),
  ('P-05', 'PRJ-03', 'Handover', 5, 'planned', '2026-11-30', '2026-12-31', 0, 800000.00, 0.00),
  ('P-01', 'PRJ-04', 'Design', 1, 'completed', '2025-11-03', '2026-04-30', 100, 2400000.00, 2500000.00),
  ('P-02', 'PRJ-04', 'Procurement', 2, 'active', '2026-05-04', '2026-12-18', 65, 6000000.00, 5300000.00),
  ('P-03', 'PRJ-04', 'Construction', 3, 'planned', '2027-01-04', '2027-08-27', 0, 6000000.00, 0.00),
  ('P-04', 'PRJ-04', 'Commissioning', 4, 'planned', '2027-09-27', '2027-11-26', 0, 1000000.00, 0.00),
  ('P-01', 'PRJ-05', 'FEED', 1, 'completed', '2024-03-04', '2024-09-27', 100, 3000000.00, 2900000.00),
  ('P-02', 'PRJ-05', 'Detailed Engineering', 2, 'completed', '2024-09-30', '2025-04-25', 100, 5500000.00, 5800000.00),
  ('P-03', 'PRJ-05', 'Procurement', 3, 'completed', '2025-02-03', '2025-09-26', 100, 12000000.00, 12400000.00),
  ('P-04', 'PRJ-05', 'Construction', 4, 'completed', '2025-08-04', '2026-08-28', 100, 19500000.00, 19900000.00),
  ('P-05', 'PRJ-05', 'Commissioning', 5, 'active', '2026-08-31', '2026-12-11', 55, 4000000.00, 200000.00)
on conflict (project_id, name) do nothing;

insert into milestone (milestone_id, project_id, phase_id, milestone_name, due_date, status, progress_percent, planned_amount, actual_amount)
select
  m.milestone_id,
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
    ('M-001', 'Concept', 'M-C01 Concept Alignment & Scoping', '2025-09-30', 'completed', 100, 8000000.00, 7800000.00),
    ('M-002', 'Feasibility', 'M-F01 Geotechnical Survey & EIA Clearance', '2025-12-31', 'completed', 100, 14000000.00, 14200000.00),
    ('M-003', 'Design', 'M-D01 Detailed Engineering & BIM LOD 350 Release', '2026-03-30', 'completed', 100, 24000000.00, 26500000.00),
    ('M-004', 'Procurement', 'M-P01 Long-lead Equipment & Structural Steel Award', '2026-06-30', 'completed', 100, 42000000.00, 44100000.00),
    ('M-005', 'Construction', 'M-01 Substructure & Foundation Release', '2026-08-14', 'completed', 100, 8400000.00, 8200000.00),
    ('M-006', 'Construction', 'M-02 Envelope & MEP Rough-in Release', '2026-09-18', 'in_progress', 75, 14200000.00, 15100000.00),
    ('M-007', 'Construction', 'M-04 Work package release', '2026-09-30', 'in_progress', 58, 9600000.00, 9400000.00),
    ('M-008', 'Construction', 'M-05 Life Safety & Commissioning Readiness', '2026-10-22', 'blocked', 20, 11000000.00, 4100000.00),
    ('M-009', 'Handover', 'M-H01 Operational Readiness & Statutory Handover', '2027-01-20', 'planned', 30, 8000000.00, 2400000.00)
) as m(milestone_id, phase_name, milestone_name, due_date, status, progress_percent, planned_amount, actual_amount)
join project_phase pp on pp.project_id = 'PRJ-2401' and pp.name = m.phase_name
on conflict (project_id, milestone_name) do update
set status = excluded.status,
    progress_percent = excluded.progress_percent,
    due_date = excluded.due_date,
    planned_amount = excluded.planned_amount,
    actual_amount = excluded.actual_amount;

insert into project_task (task_id, project_id, milestone_id, task_name, discipline, owner, status, priority, planned_start_date, planned_end_date, start_date, end_date, duration_days, cost_estimate, cost_actual, remark)
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
  t.start_date::date,
  t.end_date::date,
  t.end_date::date - t.start_date::date,
  t.cost_estimate,
  t.cost_actual,
  t.remark
from (
  values
    ('TSK-100A', 'M-F01 Geotechnical Survey & EIA Clearance', 'Geotechnical seabed core drilling & foundation survey', 'Geotechnical', 'Survey consultant', 'completed', 'high', '2025-10-01', '2025-11-10', 4200000.00, 4100000.00, '2025-10-01', '2025-11-14', null),
    ('TSK-100B', 'M-D01 Detailed Engineering & BIM LOD 350 Release', 'BIM LOD 350 structural 4D model & MEP clash detection', 'Design', 'Lead architect', 'completed', 'high', '2026-01-10', '2026-03-15', 11000000.00, 11500000.00, '2026-01-12', '2026-03-20', null),
    ('TSK-100C', 'M-P01 Long-lead Equipment & Structural Steel Award', 'Long-lead HVAC chillers & curtain wall procurement', 'Procurement', 'Supply chain lead', 'completed', 'high', '2026-03-20', '2026-06-20', 18000000.00, 18800000.00, '2026-03-23', '2026-06-26', 'Curtain wall award slipped six days after a re-tender of the bracket package.'),
    ('TSK-101', 'M-01 Substructure & Foundation Release', 'Structural concrete & foundation slab inspection', 'Structural', 'Civil delivery team', 'completed', 'medium', '2026-07-01', '2026-08-14', 8400000.00, 8200000.00, '2026-07-01', '2026-08-14', null),
    ('TSK-102', 'M-02 Envelope & MEP Rough-in Release', 'Facade curtain wall sequencing and MEP rough-in', 'Facade', 'Envelope package team', 'in_progress', 'high', '2026-08-01', '2026-09-18', 14200000.00, 15100000.00, '2026-08-03', null, 'Curtain wall unit sequence held until the MEP ceiling-zone clashes are closed.'),
    ('TSK-103', 'M-04 Work package release', 'Primary HVAC chiller and pump installation', 'MEP Services', 'Mechanical lead', 'in_progress', 'high', '2026-07-01', '2026-09-24', 9600000.00, 9400000.00, '2026-07-06', null, 'Pump installation held pending TQ-2026-0913 pipe wall thickness clarification.'),
    ('TSK-104', 'M-05 Life Safety & Commissioning Readiness', 'Fire safety suppression & smoke damper certification', 'Life Safety', 'Compliance review', 'blocked', 'high', '2026-09-01', '2026-10-22', 3800000.00, 4100000.00, '2026-09-07', null, 'Smoke damper certificates rejected by the fire authority; resubmission awaited from the supplier.'),
    ('TSK-105', 'M-05 Life Safety & Commissioning Readiness', 'Architectural finishes & concourse flooring', 'Architectural', 'Finishes contractor', 'planned', 'medium', '2026-10-01', '2026-11-15', 7200000.00, 0.00, null, null, null),
    ('TSK-106', 'M-H01 Operational Readiness & Statutory Handover', 'BMS integrated controls & SCADA commissioning', 'Commissioning', 'Systems integration lead', 'planned', 'medium', '2026-11-20', '2026-12-05', 3200000.00, 1200000.00, null, null, null),
    ('TSK-107', 'M-H01 Operational Readiness & Statutory Handover', 'Statutory fire authority witness & acoustic sign-off', 'Life Safety', 'QA/QC authority liaison', 'planned', 'high', '2026-12-01', '2026-12-20', 2400000.00, 800000.00, null, null, null),
    ('TSK-108', 'M-H01 Operational Readiness & Statutory Handover', 'Digital twin asset register & operations handover', 'Handover', 'Digital delivery manager', 'planned', 'medium', '2026-12-15', '2027-01-10', 1800000.00, 400000.00, null, null, null),
    ('TSK-C01', 'M-C01 Concept Alignment & Scoping', 'Confirm project objectives and operational requirements', 'Project Controls', 'Project manager', 'completed', 'high', '2025-06-01', '2025-06-20', 250000.00, 240000.00, '2025-06-02', '2025-06-20', null),
    ('TSK-C02', 'M-C01 Concept Alignment & Scoping', 'Develop concept options and evaluation criteria', 'Engineering', 'Engineering manager', 'completed', 'high', '2025-06-15', '2025-07-31', 480000.00, 465000.00, '2025-06-16', '2025-08-06', null),
    ('TSK-C03', 'M-C01 Concept Alignment & Scoping', 'Complete preliminary cost and schedule estimate', 'Cost & Planning', 'Project controls lead', 'completed', 'medium', '2025-07-15', '2025-08-31', 180000.00, 175000.00, '2025-07-15', '2025-08-29', null),
    ('TSK-C04', 'M-C01 Concept Alignment & Scoping', 'Approve concept scope and project execution strategy', 'Governance', 'Project sponsor', 'completed', 'high', '2025-09-01', '2025-09-30', 90000.00, 85000.00, '2025-09-01', '2025-09-30', null),
    ('TSK-F01', 'M-F01 Geotechnical Survey & EIA Clearance', 'Complete environmental baseline and impact assessment', 'Environmental', 'Environmental consultant', 'completed', 'high', '2025-10-01', '2025-11-25', 1850000.00, 1920000.00, '2025-10-01', '2025-12-09', 'DOE review comments on the EIA added two weeks.'),
    ('TSK-F02', 'M-F01 Geotechnical Survey & EIA Clearance', 'Verify utility interfaces and site access constraints', 'Civil', 'Interface manager', 'completed', 'medium', '2025-10-15', '2025-12-05', 620000.00, 600000.00, '2025-10-15', '2025-12-03', null),
    ('TSK-F03', 'M-F01 Geotechnical Survey & EIA Clearance', 'Issue feasibility report and risk-adjusted estimate', 'Project Controls', 'Planning manager', 'completed', 'high', '2025-11-15', '2025-12-31', 310000.00, 325000.00, '2025-11-17', '2026-01-07', 'Report issue waited for the late EIA clearance.'),
    ('TSK-D01', 'M-D01 Detailed Engineering & BIM LOD 350 Release', 'Freeze design basis and discipline design criteria', 'Engineering', 'Engineering manager', 'completed', 'high', '2026-01-05', '2026-01-31', 780000.00, 800000.00, '2026-01-05', '2026-02-04', null),
    ('TSK-D02', 'M-D01 Detailed Engineering & BIM LOD 350 Release', 'Close interdisciplinary model review comments', 'BIM Coordination', 'BIM manager', 'completed', 'high', '2026-02-01', '2026-03-10', 1450000.00, 1510000.00, '2026-02-02', '2026-03-20', null),
    ('TSK-D03', 'M-D01 Detailed Engineering & BIM LOD 350 Release', 'Approve issued-for-construction drawing package', 'Design Assurance', 'Lead engineer', 'completed', 'high', '2026-03-01', '2026-03-30', 920000.00, 960000.00, '2026-03-02', '2026-04-03', null),
    ('TSK-P01', 'M-P01 Long-lead Equipment & Structural Steel Award', 'Issue technical bid evaluation for long-lead equipment', 'Procurement', 'Package engineer', 'completed', 'high', '2026-03-15', '2026-04-20', 240000.00, 230000.00, '2026-03-16', '2026-04-24', null),
    ('TSK-P02', 'M-P01 Long-lead Equipment & Structural Steel Award', 'Complete vendor document and quality-plan review', 'Supplier Quality', 'Vendor quality lead', 'completed', 'medium', '2026-04-15', '2026-05-31', 360000.00, 375000.00, '2026-04-15', '2026-06-05', null),
    ('TSK-P03', 'M-P01 Long-lead Equipment & Structural Steel Award', 'Release fabrication and confirm delivery schedule', 'Supply Chain', 'Procurement manager', 'completed', 'high', '2026-05-15', '2026-06-30', 190000.00, 205000.00, '2026-05-18', '2026-07-08', 'Chiller fabrication slot confirmed one week late by the vendor.'),
    ('TSK-101A', 'M-01 Substructure & Foundation Release', 'Complete piling integrity and load testing', 'Geotechnical', 'Geotechnical lead', 'completed', 'high', '2026-07-01', '2026-07-25', 1250000.00, 1210000.00, '2026-07-01', '2026-07-24', null),
    ('TSK-101B', 'M-01 Substructure & Foundation Release', 'Approve reinforcement and embedded-items inspection', 'Structural', 'QA/QC inspector', 'completed', 'high', '2026-07-20', '2026-08-05', 420000.00, 405000.00, '2026-07-21', '2026-08-06', null),
    ('TSK-101C', 'M-01 Substructure & Foundation Release', 'Close foundation survey and as-built records', 'Survey', 'Survey manager', 'completed', 'medium', '2026-08-01', '2026-08-14', 180000.00, 175000.00, '2026-08-03', '2026-08-14', null),
    ('TSK-102A', 'M-02 Envelope & MEP Rough-in Release', 'Complete facade anchor pull-out testing', 'Facade', 'Facade QA lead', 'completed', 'high', '2026-08-01', '2026-08-28', 540000.00, 565000.00, '2026-08-03', '2026-09-02', null),
    ('TSK-102B', 'M-02 Envelope & MEP Rough-in Release', 'Close MEP ceiling-zone clash actions', 'BIM Coordination', 'MEP coordinator', 'in_progress', 'high', '2026-08-10', '2026-09-12', 680000.00, 710000.00, '2026-08-10', null, '14 ceiling-zone clashes still open at the last coordination meeting.'),
    ('TSK-102C', 'M-02 Envelope & MEP Rough-in Release', 'Inspect firestopping at service penetrations', 'Life Safety', 'Fire engineer', 'in_progress', 'high', '2026-09-01', '2026-09-18', 310000.00, 260000.00, '2026-09-02', null, null),
    ('TSK-103A', 'M-04 Work package release', 'Approve HVAC equipment installation method statement', 'Mechanical', 'Construction manager', 'completed', 'high', '2026-07-01', '2026-07-20', 120000.00, 115000.00, '2026-07-01', '2026-07-22', null),
    ('TSK-103B', 'M-04 Work package release', 'Complete chilled-water pipe pressure testing', 'Mechanical', 'Mechanical QA lead', 'in_progress', 'high', '2026-08-15', '2026-09-26', 460000.00, 390000.00, '2026-08-17', null, 'CW-014 line pressure test on hold until the pipe class decision.'),
    ('TSK-103C', 'M-04 Work package release', 'Release electrical power and controls interfaces', 'Electrical', 'Electrical lead', 'in_progress', 'medium', '2026-09-01', '2026-09-30', 280000.00, 210000.00, '2026-09-03', null, null),
    ('TSK-104A', 'M-05 Life Safety & Commissioning Readiness', 'Complete cause-and-effect testing for fire systems', 'Life Safety', 'Commissioning lead', 'blocked', 'high', '2026-09-20', '2026-10-18', 620000.00, 210000.00, '2026-09-21', null, 'Blocked by the smoke damper certification on TSK-104.'),
    ('TSK-104B', 'M-05 Life Safety & Commissioning Readiness', 'Close commissioning punch-list category A items', 'Commissioning', 'QA/QC manager', 'planned', 'high', '2026-10-05', '2026-10-22', 350000.00, 0.00, null, null, null),
    ('TSK-H01', 'M-H01 Operational Readiness & Statutory Handover', 'Complete operator training and competency sign-off', 'Operations Readiness', 'Operations manager', 'planned', 'high', '2026-12-10', '2027-01-15', 650000.00, 0.00, null, null, null)
) as t(task_id, milestone_name, task_name, discipline, owner, status, priority, planned_start_date, planned_end_date, cost_estimate, cost_actual, start_date, end_date, remark)
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
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    duration_days = excluded.duration_days,
    cost_estimate = excluded.cost_estimate,
    cost_actual = excluded.cost_actual,
    remark = excluded.remark;

insert into expenditure (
  expenditure_id, project_id, phase_id, milestone_id, task_id, title, category, vendor,
  estimated_amount, actual_amount, status, expenditure_date
)
select
  e.expenditure_id,
  'PRJ-2401',
  pp.phase_id,
  e.milestone_id,
  e.task_id,
  e.title,
  e.category,
  e.vendor,
  e.estimated_amount,
  e.actual_amount,
  e.status,
  e.expenditure_date::date
from (
  values
    ('EXP-001', 'Concept', 'Topographical LIDAR scans & utility mapping', 'Subcontractors', 'Apex Geospatial Ltd', 1800000.00, 1700000.00, 'incurred', '2025-09-30', 'M-001', null),
    ('EXP-002', 'Concept', 'Concept architectural massing & 3D scale models', 'Materials', 'KPF Design Partners', 1200000.00, 1200000.00, 'incurred', '2025-09-30', 'M-001', null),
    ('EXP-003', 'Concept', 'Lead design architects & structural directors payroll', 'Salaries & Labor', 'In-house Core Engineering', 2600000.00, 2500000.00, 'incurred', '2025-09-30', 'M-001', null),
    ('EXP-004', 'Concept', 'Geotechnical testing rig & mobile sonic sounders lease', 'Equipment & Plant', 'Geotech Instruments Corp', 1300000.00, 1200000.00, 'incurred', '2025-09-30', 'M-001', null),
    ('EXP-005', 'Concept', 'Municipal zoning appraisal & pre-planning permit fees', 'Permits & Fees', 'City Development Authority', 1200000.00, 1200000.00, 'incurred', '2025-09-30', 'M-001', null),
    ('EXP-006', 'Feasibility', 'Borehole exploratory drilling & geotechnical core sampling', 'Subcontractors', 'Civic Ground Engineering', 3600000.00, 3700000.00, 'incurred', '2025-12-31', 'M-002', 'TSK-100A'),
    ('EXP-007', 'Feasibility', 'Core sample casings, bentonite slurry & field consumables', 'Materials', 'GeoSupply Industrial', 2000000.00, 2000000.00, 'incurred', '2025-12-31', 'M-002', null),
    ('EXP-008', 'Feasibility', 'Senior geotechnical analysts & cost QS team salaries', 'Salaries & Labor', 'In-house Project Controls', 3900000.00, 3900000.00, 'incurred', '2025-12-31', 'M-002', null),
    ('EXP-009', 'Feasibility', 'Hydraulic rotary drill rig & soil press equipment rental', 'Equipment & Plant', 'HeavyHire International', 2500000.00, 2600000.00, 'incurred', '2025-12-31', 'M-002', null),
    ('EXP-010', 'Feasibility', 'Environmental impact statutory filing & planning clearances', 'Permits & Fees', 'Metropolitan Planning Bureau', 2000000.00, 2000000.00, 'incurred', '2025-12-31', 'M-002', 'TSK-F01'),
    ('EXP-011', 'Design', 'Acoustic mockups, thermal glass & cladding test specimens', 'Materials', 'Saint-Gobain Architectural', 4300000.00, 4800000.00, 'incurred', '2026-03-30', 'M-003', null),
    ('EXP-012', 'Design', 'BIM coordinators, structural engineers & MEP staff payroll', 'Salaries & Labor', 'Foster & Partners Engineering', 8200000.00, 8900000.00, 'incurred', '2026-03-30', 'M-003', null),
    ('EXP-013', 'Design', 'Specialist boundary-layer wind tunnel testing contract', 'Subcontractors', 'RWDI Wind Engineers', 5800000.00, 6400000.00, 'incurred', '2026-03-30', 'M-003', 'TSK-100B'),
    ('EXP-014', 'Design', 'High-spec BIM modeling workstations & 3D scanner rentals', 'Equipment & Plant', 'TechLease Infrastructure', 2900000.00, 3200000.00, 'incurred', '2026-03-30', 'M-003', null),
    ('EXP-015', 'Design', 'Professional Engineer stamp certifications & building licenses', 'Permits & Fees', 'State Board of Engineers & City Licensing', 2900000.00, 3200000.00, 'incurred', '2026-03-30', 'M-003', null),
    ('EXP-016', 'Procurement', 'Structural steel mill order & rebar reinforcement supply', 'Materials', 'ArcelorMittal Industrial', 19300000.00, 20300000.00, 'incurred', '2026-06-30', 'M-004', null),
    ('EXP-017', 'Procurement', 'Procurement buyers, supply chain expeditors & QA payroll', 'Salaries & Labor', 'Global Sourcing Team', 7600000.00, 7900000.00, 'incurred', '2026-06-30', 'M-004', null),
    ('EXP-018', 'Procurement', 'International freight logistics forwarding & stevedoring', 'Subcontractors', 'Maersk Global Logistics', 6700000.00, 7100000.00, 'incurred', '2026-06-30', 'M-004', null),
    ('EXP-019', 'Procurement', 'Dockside gantry cranes & heavy flatbed transporter leasing', 'Equipment & Plant', 'Port Equipment Services', 5000000.00, 5300000.00, 'incurred', '2026-06-30', 'M-004', null),
    ('EXP-020', 'Procurement', 'Customs import duty tariffs & marine cargo insurance bonds', 'Permits & Fees', 'Customs Bureau & Lloyd''s Syndicate', 3400000.00, 3500000.00, 'incurred', '2026-06-30', 'M-004', null),
    ('EXP-021', 'Construction', 'High-strength C50 ready-mix concrete, rebar & structural steel', 'Materials', 'Titan Concrete & Steel Solutions', 16400000.00, 14000000.00, 'incurred', '2026-10-16', 'M-005', null),
    ('EXP-022', 'Construction', 'Site superintendents, safety engineers & trade crews payroll', 'Salaries & Labor', 'Direct Site Operations Payroll', 9500000.00, 8000000.00, 'incurred', '2026-10-16', 'M-006', null),
    ('EXP-023', 'Construction', 'Deep substructure excavation & diaphragm wall trade contract', 'Subcontractors', 'Keller Foundation Systems', 8600000.00, 7400000.00, 'incurred', '2026-10-16', 'M-005', 'TSK-101'),
    ('EXP-024', 'Construction', 'Twin luffing-jib tower cranes & concrete boom pumps rental', 'Equipment & Plant', 'Select Plant Hire Ltd', 6000000.00, 5200000.00, 'incurred', '2026-10-16', 'M-006', null),
    ('EXP-025', 'Construction', 'Municipal street closure, heavy-haul permits & environmental monitoring', 'Permits & Fees', 'Department of Transportation & EPA', 2600000.00, 2200000.00, 'incurred', '2026-10-16', 'M-007', null),
    ('EXP-026', 'Handover', 'Final architectural touch-up finishes, hardware & wayfinding signs', 'Materials', 'Apex Interior Elements', 1200000.00, 400000.00, 'incurred', '2026-10-16', 'M-009', null),
    ('EXP-027', 'Handover', 'Closeout managers, QA/QC punchlist engineers & facilities team salaries', 'Salaries & Labor', 'Project Handover Management', 2000000.00, 600000.00, 'incurred', '2026-10-16', 'M-009', null),
    ('EXP-028', 'Handover', 'Testing, Adjusting & Balancing mechanical commissioning', 'Subcontractors', 'National Commissioning Bureau', 2600000.00, 800000.00, 'incurred', '2026-10-16', 'M-009', 'TSK-106'),
    ('EXP-029', 'Handover', 'Thermal imaging cameras, airflow meters & load bank rentals', 'Equipment & Plant', 'Instrument Hire Co', 1100000.00, 300000.00, 'incurred', '2026-10-16', 'M-009', null),
    ('EXP-030', 'Handover', 'Certificate of Occupancy statutory approvals & fire marshal stamps', 'Permits & Fees', 'Bureau Veritas & Municipal Fire Dept', 1100000.00, 300000.00, 'incurred', '2026-10-16', 'M-009', null)
) as e(expenditure_id, phase_name, title, category, vendor, estimated_amount, actual_amount, status, expenditure_date, milestone_id, task_id)
join project_phase pp on pp.project_id = 'PRJ-2401' and pp.name = e.phase_name
on conflict (project_id, expenditure_id) do update
set phase_id = excluded.phase_id,
    milestone_id = excluded.milestone_id,
    task_id = excluded.task_id,
    title = excluded.title,
    category = excluded.category,
    vendor = excluded.vendor,
    estimated_amount = excluded.estimated_amount,
    actual_amount = excluded.actual_amount,
    status = excluded.status,
    expenditure_date = excluded.expenditure_date,
    updated_at = now();

-- The other projects: schedule, cost and risk history for comparisons across projects. Amounts
-- reconcile: milestone = its tasks, phase = its milestones, project spent = incurred expenditures.
insert into milestone (milestone_id, project_id, phase_id, milestone_name, due_date, status, progress_percent, planned_amount, actual_amount)
values
  ('M-001', 'PRJ-02', 'P-01', 'M-C01 Facade Concept & Performance Brief', '2026-03-31', 'completed', 100, 600000.00, 560000.00),
  ('M-002', 'PRJ-02', 'P-02', 'M-01 Facade Mockup Review', '2026-10-15', 'in_progress', 65, 1500000.00, 1400000.00),
  ('M-003', 'PRJ-02', 'P-02', 'M-02 Facade IFC Drawing Release', '2026-11-30', 'in_progress', 40, 1400000.00, 1140000.00),
  ('M-004', 'PRJ-02', 'P-03', 'M-03 Curtain Wall Unit Award', '2027-02-26', 'planned', 0, 2800000.00, 0.00),
  ('M-005', 'PRJ-02', 'P-04', 'M-04 Facade Installation Complete', '2027-10-29', 'planned', 0, 2600000.00, 0.00),
  ('M-006', 'PRJ-02', 'P-05', 'M-05 Facade Handover', '2027-12-15', 'planned', 0, 300000.00, 0.00),
  ('M-001', 'PRJ-03', 'P-01', 'M-D01 IFC Design Release', '2025-05-30', 'completed', 100, 2000000.00, 2100000.00),
  ('M-002', 'PRJ-03', 'P-02', 'M-P01 MEP Package Award', '2025-08-29', 'completed', 100, 5000000.00, 5200000.00),
  ('M-003', 'PRJ-03', 'P-03', 'M-01 Structure & MEP Installation Complete', '2026-07-31', 'completed', 100, 12500000.00, 13000000.00),
  ('M-004', 'PRJ-03', 'P-04', 'M-04 Final Integrated Commissioning', '2026-11-13', 'in_progress', 60, 3200000.00, 1200000.00),
  ('M-005', 'PRJ-03', 'P-05', 'M-H01 CCC & Handover', '2026-12-31', 'planned', 0, 800000.00, 0.00),
  ('M-001', 'PRJ-04', 'P-01', 'M-01 Design Freeze & IFC', '2026-04-30', 'completed', 100, 2400000.00, 2500000.00),
  ('M-002', 'PRJ-04', 'P-02', 'M-02 Long-Lead Package Sourcing', '2026-10-30', 'in_progress', 70, 5600000.00, 5300000.00),
  ('M-003', 'PRJ-04', 'P-02', 'M-03 Construction Contract Award', '2026-12-18', 'in_progress', 20, 400000.00, 0.00),
  ('M-004', 'PRJ-04', 'P-03', 'M-04 Building Envelope & MEP Complete', '2027-08-27', 'planned', 0, 6000000.00, 0.00),
  ('M-005', 'PRJ-04', 'P-04', 'M-05 Automation Commissioning & Handover', '2027-11-26', 'planned', 0, 1000000.00, 0.00),
  ('M-001', 'PRJ-05', 'P-01', 'M-01 FEED Approval', '2024-09-27', 'completed', 100, 3000000.00, 2900000.00),
  ('M-002', 'PRJ-05', 'P-02', 'M-02 IFC & HAZOP Close-out', '2025-04-25', 'completed', 100, 5500000.00, 5800000.00),
  ('M-003', 'PRJ-05', 'P-03', 'M-03 Long-lead Equipment Delivered', '2025-09-26', 'completed', 100, 12000000.00, 12400000.00),
  ('M-004', 'PRJ-05', 'P-04', 'M-04 Mechanical Completion', '2026-08-28', 'completed', 100, 19500000.00, 19900000.00),
  ('M-005', 'PRJ-05', 'P-05', 'M-05 Drive Pre-commissioning Gate', '2026-10-23', 'in_progress', 80, 2500000.00, 200000.00),
  ('M-006', 'PRJ-05', 'P-05', 'M-06 Ready for Start-up', '2026-12-11', 'planned', 0, 1500000.00, 0.00)
on conflict (project_id, milestone_name) do nothing;

insert into project_task (task_id, project_id, milestone_id, task_name, discipline, owner, status, priority, planned_start_date, planned_end_date, start_date, end_date, duration_days, cost_estimate, cost_actual, remark)
select
  t.task_id, t.project_id, t.milestone_id, t.task_name, t.discipline, t.owner, t.status, t.priority,
  t.planned_start_date::date, t.planned_end_date::date, t.start_date::date, t.end_date::date,
  t.end_date::date - t.start_date::date, t.cost_estimate, t.cost_actual, t.remark
from (
  values
    ('TSK-201', 'PRJ-02', 'M-001', 'Facade performance brief & thermal targets', 'Design', 'Facade consultant', 'completed', 'high', '2026-02-02', '2026-03-10', '2026-02-03', '2026-03-12', 300000.00, 290000.00, null),
    ('TSK-202', 'PRJ-02', 'M-001', 'Concept cladding options & cost plan', 'Cost & Planning', 'QS lead', 'completed', 'medium', '2026-02-16', '2026-03-31', '2026-02-16', '2026-03-31', 300000.00, 270000.00, null),
    ('TSK-203', 'PRJ-02', 'M-002', 'Visual mockup fabrication', 'Facade', 'Mockup contractor', 'completed', 'high', '2026-06-01', '2026-08-14', '2026-06-08', '2026-09-04', 700000.00, 760000.00, 'Mockup glass arrived three weeks late from the float supplier.'),
    ('TSK-204', 'PRJ-02', 'M-002', 'Performance mockup water & air infiltration test', 'Testing', 'Facade QA lead', 'blocked', 'high', '2026-08-17', '2026-10-02', '2026-09-07', null, 600000.00, 640000.00, 'Water infiltration failed at the stack joint on the first test; retest waits for the revised gasket (TQ-2026-0201).'),
    ('TSK-205', 'PRJ-02', 'M-002', 'Architect & client mockup sign-off', 'Design Assurance', 'Lead architect', 'planned', 'high', '2026-10-05', '2026-10-15', null, null, 200000.00, 0.00, null),
    ('TSK-206', 'PRJ-02', 'M-003', 'Facade shop drawings & structural calculations', 'Design', 'Facade design manager', 'in_progress', 'high', '2026-07-01', '2026-11-13', '2026-07-06', null, 900000.00, 640000.00, null),
    ('TSK-207', 'PRJ-02', 'M-003', 'Bracket & anchor design coordination with structure', 'Structural', 'Structural engineer', 'completed', 'medium', '2026-07-15', '2026-09-30', '2026-07-15', '2026-10-09', 500000.00, 500000.00, 'Slab-edge loads were confirmed late by the structural engineer.'),
    ('TSK-208', 'PRJ-02', 'M-004', 'Curtain wall tender & bid evaluation', 'Procurement', 'Procurement manager', 'planned', 'high', '2026-12-01', '2027-01-29', null, null, 250000.00, 0.00, null),
    ('TSK-209', 'PRJ-02', 'M-004', 'Glass & aluminium extrusion order', 'Supply Chain', 'Procurement manager', 'planned', 'high', '2027-01-15', '2027-02-26', null, null, 2550000.00, 0.00, null),
    ('TSK-210', 'PRJ-02', 'M-005', 'Unitised curtain wall panel installation', 'Facade', 'Installation contractor', 'planned', 'high', '2027-04-05', '2027-10-29', null, null, 2600000.00, 0.00, null),
    ('TSK-211', 'PRJ-02', 'M-006', 'Site water test, snagging & handover documents', 'Handover', 'Facade QA lead', 'planned', 'medium', '2027-11-01', '2027-12-15', null, null, 300000.00, 0.00, null),
    ('TSK-301', 'PRJ-03', 'M-001', 'Issue IFC drawings for all disciplines', 'Design', 'Lead architect', 'completed', 'high', '2025-01-06', '2025-05-23', '2025-01-06', '2025-05-30', 2000000.00, 2100000.00, null),
    ('TSK-302', 'PRJ-03', 'M-002', 'Award MEP and lift packages', 'Procurement', 'Procurement manager', 'completed', 'high', '2025-04-01', '2025-08-15', '2025-04-03', '2025-08-29', 5000000.00, 5200000.00, null),
    ('TSK-303', 'PRJ-03', 'M-003', 'Podium structure & transfer slabs', 'Structural', 'Main contractor', 'completed', 'high', '2025-09-01', '2026-03-27', '2025-09-01', '2026-04-17', 7000000.00, 7300000.00, 'Transfer slab pour delayed three weeks by monsoon rain.'),
    ('TSK-304', 'PRJ-03', 'M-003', 'MEP services installation', 'MEP Services', 'MEP contractor', 'completed', 'high', '2026-01-05', '2026-07-31', '2026-01-12', '2026-07-31', 5500000.00, 5700000.00, null),
    ('TSK-305', 'PRJ-03', 'M-004', 'Chilled water system pressure test', 'Mechanical', 'Mechanical QA lead', 'completed', 'high', '2026-08-03', '2026-08-28', '2026-08-03', '2026-09-18', 400000.00, 380000.00, 'First test pack rejected: calibration certificates of the test gauges had expired.'),
    ('TSK-306', 'PRJ-03', 'M-004', 'Fire alarm & sprinkler integrated test', 'Life Safety', 'Fire engineer', 'in_progress', 'high', '2026-09-01', '2026-10-16', '2026-09-21', null, 900000.00, 520000.00, 'Started late after the pressure test re-run.'),
    ('TSK-307', 'PRJ-03', 'M-004', 'BMS point-to-point & integrated systems test', 'Commissioning', 'BMS integrator', 'in_progress', 'high', '2026-10-05', '2026-11-13', '2026-10-19', null, 1300000.00, 300000.00, 'Integrator has one commissioning engineer on site.'),
    ('TSK-308', 'PRJ-03', 'M-004', 'TAB & energy performance verification', 'Commissioning', 'TAB specialist', 'planned', 'medium', '2026-10-19', '2026-11-13', null, null, 600000.00, 0.00, null),
    ('TSK-309', 'PRJ-03', 'M-005', 'CCC submission & as-built dossier', 'Handover', 'Document controller', 'planned', 'high', '2026-11-30', '2026-12-31', null, null, 800000.00, 0.00, null),
    ('TSK-401', 'PRJ-04', 'M-001', 'Warehouse structural & racking design', 'Structural', 'Design consultant', 'completed', 'high', '2025-11-03', '2026-03-27', '2025-11-03', '2026-04-10', 1400000.00, 1450000.00, null),
    ('TSK-402', 'PRJ-04', 'M-001', 'MEP & fire protection design', 'MEP Services', 'Design consultant', 'completed', 'high', '2025-12-01', '2026-04-30', '2025-12-01', '2026-04-30', 1000000.00, 1050000.00, null),
    ('TSK-403', 'PRJ-04', 'M-002', '33kV transformer & switchgear order', 'Electrical', 'Electrical package lead', 'completed', 'high', '2026-05-04', '2026-07-31', '2026-05-04', '2026-08-14', 2200000.00, 2300000.00, null),
    ('TSK-404', 'PRJ-04', 'M-002', 'Transformer FAT & delivery', 'Electrical', 'Electrical package lead', 'blocked', 'high', '2026-08-03', '2026-09-18', '2026-08-10', null, 300000.00, 250000.00, 'FAT failed the insulation resistance test; the witnessed re-test is six weeks later.'),
    ('TSK-405', 'PRJ-04', 'M-002', 'Structural steel portal frame order', 'Supply Chain', 'Procurement manager', 'completed', 'high', '2026-05-18', '2026-08-28', '2026-05-18', '2026-08-28', 2300000.00, 2300000.00, null),
    ('TSK-406', 'PRJ-04', 'M-002', 'Automated racking & conveyor order', 'Supply Chain', 'Automation lead', 'in_progress', 'medium', '2026-07-06', '2026-10-30', '2026-07-13', null, 800000.00, 450000.00, null),
    ('TSK-407', 'PRJ-04', 'M-003', 'Main contractor tender & award', 'Procurement', 'Contracts manager', 'in_progress', 'high', '2026-10-05', '2026-12-18', '2026-10-12', null, 400000.00, 0.00, 'Two of five invited bidders have declined.'),
    ('TSK-408', 'PRJ-04', 'M-004', 'Piling, slab & portal frame erection', 'Structural', 'Main contractor', 'planned', 'high', '2027-01-04', '2027-05-28', null, null, 3800000.00, 0.00, null),
    ('TSK-409', 'PRJ-04', 'M-004', 'MEP & racking installation', 'MEP Services', 'Main contractor', 'planned', 'medium', '2027-04-05', '2027-08-27', null, null, 2200000.00, 0.00, null),
    ('TSK-410', 'PRJ-04', 'M-005', 'Conveyor & WMS integration testing', 'Commissioning', 'Automation lead', 'planned', 'medium', '2027-09-27', '2027-11-26', null, null, 1000000.00, 0.00, null),
    ('TSK-501', 'PRJ-05', 'M-001', 'FEED package & HAZID', 'Engineering', 'FEED contractor', 'completed', 'high', '2024-03-04', '2024-09-27', '2024-03-04', '2024-09-20', 3000000.00, 2900000.00, null),
    ('TSK-502', 'PRJ-05', 'M-002', 'Detailed engineering IFC packages', 'Engineering', 'Engineering manager', 'completed', 'high', '2024-09-30', '2025-03-28', '2024-09-30', '2025-04-11', 4800000.00, 5050000.00, null),
    ('TSK-503', 'PRJ-05', 'M-002', 'HAZOP & SIL study close-out', 'Process Safety', 'Process safety lead', 'completed', 'high', '2025-02-03', '2025-04-25', '2025-02-03', '2025-05-09', 700000.00, 750000.00, 'Twelve HAZOP actions carried into construction.'),
    ('TSK-504', 'PRJ-05', 'M-003', 'Compressors, pumps & VFD drives delivery', 'Supply Chain', 'Procurement manager', 'completed', 'high', '2025-02-03', '2025-09-26', '2025-02-03', '2025-10-17', 12000000.00, 12400000.00, 'Compressor shipped three weeks late after a vendor test re-run.'),
    ('TSK-505', 'PRJ-05', 'M-004', 'Piping fabrication & erection', 'Piping', 'Piping contractor', 'completed', 'high', '2025-08-04', '2026-06-26', '2025-08-04', '2026-07-17', 11000000.00, 11300000.00, null),
    ('TSK-506', 'PRJ-05', 'M-004', 'Electrical & instrumentation installation', 'Electrical', 'E&I contractor', 'completed', 'high', '2025-10-06', '2026-08-28', '2025-10-13', '2026-08-28', 8500000.00, 8600000.00, null),
    ('TSK-507', 'PRJ-05', 'M-005', 'Motor no-load runs & VFD tuning', 'Electrical', 'Electrical lead', 'blocked', 'high', '2026-08-31', '2026-10-09', '2026-08-31', null, 900000.00, 150000.00, 'Drive DR-201 tripped on harmonic resonance at 80% speed; harmonic filter on order.'),
    ('TSK-508', 'PRJ-05', 'M-005', 'Loop checks & instrument calibration', 'Instrumentation', 'Instrument lead', 'completed', 'high', '2026-09-07', '2026-10-16', '2026-09-07', '2026-10-21', 600000.00, 50000.00, null),
    ('TSK-509', 'PRJ-05', 'M-005', 'Pre-commissioning gate review', 'Governance', 'Commissioning manager', 'planned', 'high', '2026-10-19', '2026-10-23', null, null, 1000000.00, 0.00, 'Gate review postponed until DR-201 passes its no-load run.'),
    ('TSK-510', 'PRJ-05', 'M-006', 'PSSR & start-up readiness', 'Process Safety', 'Process safety lead', 'planned', 'high', '2026-11-16', '2026-12-11', null, null, 1500000.00, 0.00, null)
) as t(task_id, project_id, milestone_id, task_name, discipline, owner, status, priority, planned_start_date, planned_end_date, start_date, end_date, cost_estimate, cost_actual, remark)
on conflict (task_id) do nothing;

insert into expenditure (
  expenditure_id, project_id, phase_id, milestone_id, task_id, title, category, vendor,
  estimated_amount, actual_amount, status, expenditure_date
)
values
  ('EXP-001', 'PRJ-02', 'P-01', 'M-001', null, 'Facade consultant concept & performance brief fee', 'Subcontractors', 'Arup Facade Engineering', 600000.00, 560000.00, 'paid', '2026-03-31'),
  ('EXP-002', 'PRJ-02', 'P-02', 'M-002', 'TSK-203', 'Visual mockup fabrication & glass samples', 'Materials', 'Permasteelisa Mockups', 700000.00, 760000.00, 'invoiced', '2026-09-04'),
  ('EXP-003', 'PRJ-02', 'P-02', 'M-002', 'TSK-204', 'Performance mockup test chamber & lab fees', 'Subcontractors', 'SIRIM Facade Test Lab', 600000.00, 640000.00, 'incurred', '2026-10-02'),
  ('EXP-004', 'PRJ-02', 'P-02', 'M-003', null, 'Facade design team payroll', 'Salaries & Labor', 'In-house Facade Design', 1400000.00, 1140000.00, 'incurred', '2026-10-16'),
  ('EXP-005', 'PRJ-02', 'P-03', 'M-004', 'TSK-209', 'Curtain wall glass & extrusion supply', 'Materials', 'To be tendered', 2550000.00, 0.00, 'forecast', '2027-02-26'),
  ('EXP-001', 'PRJ-03', 'P-01', 'M-001', 'TSK-301', 'Architectural & engineering design fees', 'Subcontractors', 'GDP Architects', 2000000.00, 2100000.00, 'paid', '2025-05-30'),
  ('EXP-002', 'PRJ-03', 'P-02', 'M-002', 'TSK-302', 'MEP plant & lift equipment', 'Materials', 'Daikin & Schindler', 5000000.00, 5200000.00, 'paid', '2025-08-29'),
  ('EXP-003', 'PRJ-03', 'P-03', 'M-003', 'TSK-303', 'Podium structure trade contract', 'Subcontractors', 'Gamuda Builders', 7000000.00, 7300000.00, 'paid', '2026-04-17'),
  ('EXP-004', 'PRJ-03', 'P-03', 'M-003', 'TSK-304', 'MEP installation trade contract', 'Subcontractors', 'IJM MEP Services', 5500000.00, 5700000.00, 'invoiced', '2026-07-31'),
  ('EXP-005', 'PRJ-03', 'P-04', 'M-004', null, 'Commissioning & testing contractor', 'Subcontractors', 'National Commissioning Bureau', 2500000.00, 900000.00, 'incurred', '2026-10-16'),
  ('EXP-006', 'PRJ-03', 'P-04', 'M-004', 'TSK-305', 'Pressure test re-run & calibrated gauge hire', 'Equipment & Plant', 'Instrument Hire Co', 700000.00, 300000.00, 'incurred', '2026-09-18'),
  ('EXP-001', 'PRJ-04', 'P-01', 'M-001', null, 'Design consultant fees', 'Subcontractors', 'Aurecon', 2400000.00, 2500000.00, 'paid', '2026-04-30'),
  ('EXP-002', 'PRJ-04', 'P-02', 'M-002', 'TSK-403', '33kV transformer & switchgear', 'Materials', 'Schneider Electric', 2200000.00, 2300000.00, 'invoiced', '2026-08-14'),
  ('EXP-003', 'PRJ-04', 'P-02', 'M-002', 'TSK-404', 'Transformer FAT re-test & third-party inspector', 'Subcontractors', 'Bureau Veritas', 300000.00, 250000.00, 'incurred', '2026-09-25'),
  ('EXP-004', 'PRJ-04', 'P-02', 'M-002', 'TSK-405', 'Structural steel portal frames', 'Materials', 'Southern Steel', 2300000.00, 2300000.00, 'invoiced', '2026-08-28'),
  ('EXP-005', 'PRJ-04', 'P-02', 'M-002', 'TSK-406', 'Racking & conveyor order deposit', 'Materials', 'Dematic', 800000.00, 450000.00, 'incurred', '2026-10-16'),
  ('EXP-001', 'PRJ-05', 'P-01', 'M-001', 'TSK-501', 'FEED contractor', 'Subcontractors', 'Technip Energies', 3000000.00, 2900000.00, 'paid', '2024-09-27'),
  ('EXP-002', 'PRJ-05', 'P-02', 'M-002', null, 'Detailed engineering contractor', 'Subcontractors', 'Petrofac Engineering', 5500000.00, 5800000.00, 'paid', '2025-05-09'),
  ('EXP-003', 'PRJ-05', 'P-03', 'M-003', 'TSK-504', 'Compressors, pumps & VFD drives', 'Materials', 'Siemens Energy', 12000000.00, 12400000.00, 'paid', '2025-10-17'),
  ('EXP-004', 'PRJ-05', 'P-04', 'M-004', 'TSK-505', 'Piping fabrication & erection contract', 'Subcontractors', 'Sapura Fabrication', 11000000.00, 11300000.00, 'invoiced', '2026-07-17'),
  ('EXP-005', 'PRJ-05', 'P-04', 'M-004', 'TSK-506', 'E&I installation contract', 'Subcontractors', 'Kejuruteraan E&I Sdn Bhd', 8500000.00, 8600000.00, 'invoiced', '2026-08-28'),
  ('EXP-006', 'PRJ-05', 'P-05', 'M-005', null, 'Pre-commissioning crews & vendor representatives', 'Salaries & Labor', 'Commissioning Services Ltd', 1500000.00, 200000.00, 'incurred', '2026-10-16'),
  ('EXP-007', 'PRJ-05', 'P-05', 'M-005', 'TSK-507', 'Harmonic filters for VFD motor feeders', 'Equipment & Plant', 'ABB', 350000.00, 0.00, 'forecast', '2026-11-13')
on conflict (project_id, expenditure_id) do nothing;

insert into activity_log (project_id, task_id, activity_type, title, source_type, source_path, summary, processing_state)
values
  ('PRJ-2401', 'TSK-103', 'drawing_reference', 'Drawing used for pump piping space requirement', 'drawing', 'pump-piping-layout.png', 'Drawing used to validate pump piping space requirement and installation progress.', 'applied'),
  ('PRJ-2401', 'TSK-103', 'technical_query', 'Pipe wall thickness below project class requirement', 'email', 'TQ-2026-0913', 'Engineer raised concern that detected wall thickness is 6 mm against 8 mm project requirement.', 'needs_review'),
  ('PRJ-2401', 'TSK-103', 'engineer_report', 'Pump piping access review', 'report', 'REP-MECH-014', 'Maintenance access and pipe rack clearance reviewed against latest layout.', 'applied'),
  ('PRJ-02', 'TSK-204', 'engineer_report', 'Performance mockup failed water infiltration test', 'report', 'MT-02', 'Water entered at the stack joint at 600 Pa; retest needs a revised gasket detail.', 'applied'),
  ('PRJ-03', 'TSK-305', 'engineer_report', 'Pressure test package rejected', 'report', 'TP-CHW-03', 'Test gauges had expired calibration certificates; test re-run three weeks later with hired gauges.', 'applied'),
  ('PRJ-04', 'TSK-404', 'engineer_report', 'Transformer FAT failed insulation resistance test', 'report', 'TX-FAT-01', 'Factory acceptance test failed; witnessed re-test booked six weeks later, delivery slips accordingly.', 'applied'),
  ('PRJ-05', 'TSK-507', 'engineer_report', 'VFD trip during motor no-load run', 'report', 'CL-0917', 'Drive DR-201 tripped on harmonic resonance at 80% speed; harmonic filters ordered.', 'applied');

insert into risk_register (
  risk_id, project_id, category, title, likelihood, impact, affected_areas, priority, status,
  mitigation, owner, due_date, affected_milestone, trigger_event,
  reasoning, evidence_source, confidence
)
values
  (
    'RSK-001',
    'PRJ-2401',
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
    'RSK-002',
    'PRJ-2401',
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
    'RSK-003',
    'PRJ-2401',
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
    'RSK-004',
    'PRJ-2401',
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
  ),
  ('RSK-001', 'PRJ-02', 'Quality & Safety', 'Performance mockup failed water infiltration test', 'Likely', '3-4 week delay to IFC drawing release',
    array['Schedule', 'Technical'], 'high', 'open', 'Revise stack-joint gasket detail and retest with the facade consultant witnessing.',
    'Facade QA lead', '2026-11-06', 'M-01 Facade Mockup Review', 'Water infiltration at the stack joint during the first test',
    'Mockup sign-off cannot happen until the retest passes, and IFC drawings depend on the signed-off detail.', 'Mockup test report MT-02', 'High'),
  ('RSK-002', 'PRJ-02', 'Procurement & Delivery', 'Low-e glass lead time exceeds the procurement window', 'Possible', '6-8 week delay to installation start',
    array['Schedule', 'Cost'], 'high', 'open', 'Reserve float glass capacity before the curtain wall award.',
    'Procurement manager', '2026-12-15', 'M-03 Curtain Wall Unit Award', 'Glass supplier quoting a 20-week lead time',
    'The mockup glass already arrived three weeks late; the production order is ten times larger.', 'Supplier lead-time quotation', 'Medium'),
  ('RSK-003', 'PRJ-02', 'Design & Interface', 'Slab-edge loads not confirmed for facade brackets', 'Possible', 'Rework of the anchor design',
    array['Technical', 'Schedule'], 'medium', 'closed', 'Joint bracket review held with the structural engineer.',
    'Structural engineer', '2026-09-30', 'M-02 Facade IFC Drawing Release', 'Structural load schedule issued late',
    'Realised: bracket coordination finished nine days late, then closed.', 'Design coordination minutes', 'High'),
  ('RSK-001', 'PRJ-03', 'Quality & Safety', 'Test equipment calibration expired before pressure test', 'Likely', '3-week test re-run',
    array['Schedule', 'Technical'], 'high', 'closed', 'Calibration validity added to test pack readiness checks.',
    'QA/QC manager', '2026-08-28', 'M-04 Final Integrated Commissioning', 'Calibration certificates found expired on test day',
    'Realised: the chilled water test pack was rejected and re-run three weeks later.', 'Test pack rejection note TP-CHW-03', 'High'),
  ('RSK-002', 'PRJ-03', 'Commissioning', 'Integrated fire and BMS testing may push CCC past year-end', 'Likely', '2-4 week handover delay',
    array['Schedule', 'Cost'], 'critical', 'open', 'Run fire and BMS tests in parallel shifts and add a second BMS engineer.',
    'Commissioning lead', '2026-11-13', 'M-04 Final Integrated Commissioning', 'Fire alarm test started three weeks late',
    'The pressure test re-run pushed every later commissioning test, and BMS testing has one engineer.', 'Commissioning schedule', 'High'),
  ('RSK-003', 'PRJ-03', 'Workforce & Staffing', 'BMS integrator has one commissioning engineer on site', 'Possible', 'Slower point-to-point testing',
    array['Schedule'], 'medium', 'open', 'Request a second engineer from the integrator.',
    'Construction manager', '2026-10-30', 'M-04 Final Integrated Commissioning', 'Integrator resource plan shows one engineer',
    'Point-to-point testing of 4,000 BMS points needs two engineers to finish by the milestone.', 'Integrator resource plan', 'Medium'),
  ('RSK-001', 'PRJ-04', 'Procurement & Delivery', 'Transformer delivery delayed by failed FAT', 'Likely', '6-week delay to permanent power',
    array['Schedule', 'Cost'], 'critical', 'open', 'Witnessed re-test; temporary generators for early works.',
    'Electrical package lead', '2026-11-06', 'M-02 Long-Lead Package Sourcing', 'Insulation resistance test failed at FAT',
    'The re-test is six weeks after the failed FAT, so delivery moves past the long-lead milestone.', 'FAT report TX-FAT-01', 'High'),
  ('RSK-002', 'PRJ-04', 'Procurement & Delivery', 'Steel price escalation on portal frames', 'Possible', 'RM 0.3M cost increase',
    array['Cost'], 'medium', 'closed', 'Fixed-price steel order placed in May.',
    'Procurement manager', '2026-05-29', 'M-02 Long-Lead Package Sourcing', 'Steel index up 8% in Q1',
    'Closed: the order was placed at a fixed price and delivered on time.', 'Purchase order PO-ST-004', 'High'),
  ('RSK-003', 'PRJ-04', 'Contract & Commercial', 'Few compliant bids for the main contract', 'Possible', 'Award slips into Q1 2027',
    array['Schedule', 'Cost'], 'medium', 'open', 'Extend the invitation list and hold a site briefing.',
    'Contracts manager', '2026-11-20', 'M-03 Construction Contract Award', 'Two of five invited bidders declined',
    'Three remaining bidders leave little competition and no fallback if one is non-compliant.', 'Tender register', 'Medium'),
  ('RSK-001', 'PRJ-05', 'Technical & Design', 'VFD harmonic resonance trips motor during no-load run', 'Likely', '2-3 week delay to the pre-commissioning gate',
    array['Schedule', 'Technical'], 'critical', 'open', 'Install harmonic filters and repeat the harmonic study.',
    'Electrical lead', '2026-11-13', 'M-05 Drive Pre-commissioning Gate', 'Drive DR-201 tripped at 80% speed',
    'The gate review needs every drive to pass its no-load run; the filters arrive mid-November.', 'Commissioning log CL-0917', 'High'),
  ('RSK-002', 'PRJ-05', 'Quality & Safety', 'HAZOP actions not closed before PSSR', 'Possible', 'Start-up held',
    array['Safety', 'Schedule'], 'high', 'open', 'Weekly HAZOP action review with signed close-out evidence.',
    'Process safety lead', '2026-11-30', 'M-06 Ready for Start-up', 'Twelve HAZOP actions carried into construction',
    'Open HAZOP actions block the pre-start-up safety review.', 'HAZOP action register', 'Medium'),
  ('RSK-003', 'PRJ-05', 'Procurement & Delivery', 'Compressor delivery slipped after vendor test re-run', 'Likely', '3-week delay to mechanical completion',
    array['Schedule'], 'high', 'closed', 'Resequenced piping tie-ins around the compressor.',
    'Procurement manager', '2025-10-17', 'M-03 Long-lead Equipment Delivered', 'Vendor test re-run at the factory',
    'Realised: the compressor shipped three weeks late; resequencing recovered most of it.', 'Expediting report EXR-11', 'High'),
  ('RSK-004', 'PRJ-05', 'Workforce & Staffing', 'Vendor commissioning engineers demobilise before the gate', 'Possible', 'Re-mobilisation cost and delay',
    array['Cost', 'Schedule'], 'medium', 'closed', 'Extended vendor representatives to the end of November.',
    'Commissioning manager', '2026-09-30', 'M-05 Drive Pre-commissioning Gate', 'Vendor contract ends in October',
    'Closed: the vendor service order was extended.', 'Service order variation SOV-03', 'High');

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
  ),
  ('TQ-2026-0201', 'PRJ-02', 'Stack joint gasket detail after water infiltration failure', 'technical_query',
    'Facade contractor asks whether a dual-gasket stack joint is acceptable before the mockup retest.', 'open'),
  ('CO-2026-0201', 'PRJ-02', 'Upgrade IGUs to laminated acoustic glass on the east elevation', 'change_order',
    'Client requests acoustic laminated glass facing the highway; adds cost and glass lead time.', 'review'),
  ('TQ-2026-0301', 'PRJ-03', 'Accept calibration certificates from an alternate laboratory', 'technical_query',
    'Contractor asks to use gauges calibrated by a non-SAMM lab for the pressure test re-run.', 'closed'),
  ('CO-2026-0301', 'PRJ-03', 'Add EV charger circuits to the podium car park', 'change_order',
    'Client requests twenty 7 kW EV charger circuits on level P2.', 'approved'),
  ('TQ-2026-0401', 'PRJ-04', 'Acceptance criteria for transformer insulation resistance re-test', 'technical_query',
    'Vendor asks to confirm the minimum insulation resistance value for the witnessed re-test.', 'open'),
  ('CO-2026-0401', 'PRJ-04', 'Add a second loading dock leveller bank', 'change_order',
    'Client requests six more dock levellers on the north side.', 'open'),
  ('TQ-2026-0501', 'PRJ-05', 'Harmonic filter sizing for long VFD motor feeders', 'technical_query',
    'Electrical contractor asks for the filter rating for feeders longer than 250 m.', 'open'),
  ('CO-2026-0501', 'PRJ-05', 'Add harmonic filters to DR-201 and DR-202 feeders', 'change_order',
    'Contractor requests a variation to supply and install harmonic filters on two drive feeders.', 'review')
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

insert into lesson (lesson_id, project_id, phase_id, title, knowledge_area, root_cause, description, business, expected_outcome, difference)
values
  ('LL-001', 'PRJ-2401', 'P-05', 'Pipe wall thickness was below the approved specification during receiving inspection.', 'Piping', 'Vendor certificate was accepted before the latest material requisition revision was checked.', 'Material acceptance needs a drawing, requisition and certificate match before release to site.', 'Add a receiving checklist step for wall thickness, heat number and revision match before installation release.', 'Pipe spools match the CW-014 class (8 mm wall) on receipt.', 'Spools measured 6 mm; installation of the pump package was held.'),
  ('LL-002', 'PRJ-2401', 'P-04', 'Pump package drawing arrived after civil foundation hold points were already planned.', 'Vendor Document', 'Vendor document schedule was not tied to the construction work pack baseline.', 'Long-lead package documents must drive field planning dates, not only purchase order dates.', 'Link vendor drawing approval dates to milestone readiness and flag late documents in weekly progress review.', 'Vendor drawings approved before civil hold points are planned.', 'Drawings arrived after the hold points; foundation work was re-sequenced.'),
  ('LL-003', 'PRJ-02', 'P-02', 'Cable tray route conflicted with access platform clearance.', 'Interface', 'Discipline models were reviewed separately without an interface freeze before fabrication.', 'Design review should focus on maintainability and access space before fabrication drawings are issued.', 'Run an interface review for access, lifting and maintenance clearance before construction release.', 'Cable tray routes clear of access platforms at the design freeze.', 'A clash was found after fabrication drawings were issued.'),
  ('LL-004', 'PRJ-03', 'P-04', 'Pressure test package was rejected because calibration certificates were expired.', 'Testing', 'Test equipment validity was checked at execution instead of during test pack preparation.', 'Test readiness must include tool and instrument validity, not only procedure approval.', 'Add calibration status to test pack readiness checks and assign QA verification before test day.', 'Chilled water pressure test passes on the planned date.', 'Test pack rejected for expired calibration; re-run three weeks later.'),
  ('LL-005', 'PRJ-2401', 'P-05', 'Skid anchor bolts misaligned by 25mm relative to base frame slots during equipment setting.', 'Structural', 'Survey grid line was referenced from preliminary civil mark instead of verified monument benchmark.', 'Equipment foundation bolt surveys must require independent surveyor sign-off prior to concrete pour.', 'Mandate joint civil/mechanical check sheet with photographic verification for all dynamic equipment pads.', 'Anchor bolts within tolerance of the skid base frame slots.', 'Bolts were 25 mm out; slots had to be site-modified.'),
  ('LL-006', 'PRJ-04', 'P-02', 'Transformer delivery delayed by 6 weeks due to factory testing failure.', 'Long Lead', 'Sub-supplier FAT was conducted without third-party inspector witnessing insulation resistance test.', 'Witness hold-points must be established for critical transformers and switchgear factory tests.', 'Implement mandatory QA inspection attendance for all critical-path power equipment FATs.', 'Transformer delivered on the long-lead milestone date.', 'FAT failure delayed delivery by six weeks.'),
  ('LL-007', 'PRJ-05', 'P-05', 'VFD drive trip during motor no-load commissioning due to harmonic resonance.', 'Electrical', 'Cable length exceeded unshielded threshold without harmonic filter installation.', 'Ensure motor feeder length calculations include line reactor specs during initial engineering freeze.', 'Incorporate harmonic study verification into pre-commissioning mechanical completion dossiers.', 'All drives pass their no-load runs before the pre-commissioning gate.', 'DR-201 tripped on harmonic resonance; the gate was postponed.')
on conflict (lesson_id) do update set
  phase_id = excluded.phase_id,
  title = excluded.title,
  knowledge_area = excluded.knowledge_area,
  root_cause = excluded.root_cause,
  description = excluded.description,
  business = excluded.business,
  expected_outcome = excluded.expected_outcome,
  difference = excluded.difference;

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
