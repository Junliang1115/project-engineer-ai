# Project Engineering Agent Platform

## Overview

This platform supports project engineering teams by combining chat-based assistance, multi-project tracking, technical query support, risk analysis, and compliance review. It uses specialized agents to reconcile project data, estimate risks, and check designs or materials against applicable standards.

## Scope

- **Design timeline and work plan**: Accounts for dependencies across project progress, workforce availability, and team skill mix.
- **Milestone and cost tracking**: Cross-references project timeline, milestone status, and spending data from multiple sources.
- **Risk estimation**: Assesses risks related to material delivery, construction delays, international price fluctuations, workforce availability, and hiring gaps.
- **Compliance and safety review**: Checks designs, materials, and construction plans against relevant regulatory and safety standards.

## Agents

- **Orchestration Agent**: Coordinates agent workflows, routes user requests, and combines outputs into a single response.
- **Reconciliation Agent**: Pulls data from different sources, compares timeline and status, and highlights mismatches.
- **Risk Estimation Agent**: Estimates the likelihood and impact of risks based on reconciled project data.
- **Compliance Agent**: Reviews designs, materials, and project documentation against regulatory standards.

## Knowledge Bank

The knowledge bank stores reusable project knowledge and supports both internal users and incoming external questions.

- Technical query support
- Lesson register
- Risk register
- Historical project decisions
- Similar-question matching for incoming emails
- Reusable answers for repeated engineering or compliance questions

## Pages

### 1. Chat Interface

The chat interface is the main entry point for users to ask questions and run project analysis.

Key functions:

- General project assistant chat
- Technical query support
- Design analysis
- Risk analysis
- Compliance and safety review
- Email-style question answering using the knowledge bank

Plus button actions:

- Upload project documents
- Add design files
- Run risk analysis
- Run compliance review
- Ask from knowledge bank
- Create or update a lesson learned

### 2. Projects

The project page manages multiple projects and their milestones.

Each project should include:

- Project overview
- Scope
- Timeline
- Work plan
- Milestones
- Budget and cost tracking
- Workforce plan and skill mix
- Material delivery status
- Risk register
- Lesson register
- Compliance status

Milestone tracking should show:

- Planned date
- Forecast date
- Actual date
- Owner
- Status
- Cost impact
- Linked risks
- Linked dependencies

### 3. Technical Query

The technical query page helps users ask engineering, design, compliance, and project-delivery questions.

Supported query types:

- Technical design questions
- Material and specification questions
- Regulatory and compliance questions
- Safety review questions
- Lessons learned lookup
- Similar previous question lookup
- Risk and mitigation lookup

Example user questions:

- "What risks affect the current milestone?"
- "Does this material meet the required standard?"
- "Which delayed deliveries affect the design timeline?"
- "Have we answered a similar technical question before?"
- "What lessons learned apply to this construction method?"

## Suggested Workflow

1. User opens the chat interface.
2. User uploads or selects project data.
3. Orchestration Agent routes the request to the correct specialist agents.
4. Reconciliation Agent compares project data across sources.
5. Risk Estimation Agent identifies likely risks and impact.
6. Compliance Agent checks relevant design, material, and safety requirements.
7. Orchestration Agent summarizes the result and updates the project record, risk register, or knowledge bank where needed.

