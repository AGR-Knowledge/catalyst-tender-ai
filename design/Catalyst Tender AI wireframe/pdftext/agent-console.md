Agent Console
Ten agents, each with a narrow remit, its own guardrails and an evaluation threshold it must pass before release. Operations and AI
governance see this view; it is not part of the bid user experience.
Per-agent and per-tender cost ceilings enforced by the orchestrator
AGENT RUNS — 24H
2,853
across 18 active tenders
EVAL PASS RATE
94.6%
all agents above threshold
HUMAN ESCALATIONS
61
2.1% of runs
GUARDRAIL BLOCKS
7
all correctly triggered
MODEL SPEND — MTD
₹ 2.14 L
62% economy tier
Agent status
AGENT 	STAGE 	STATE 	RUNS
24H
EVAL
SCORE
PRIMARY
GUARDRAIL
Intake &
Extraction S1 	Active 	1,284 	97.2%
Never auto-
discards a
tender
Outreach &
Evaluation S2 	Active 	642 	94.8%
Recommends
only — never
commits
spend
Win-Probability
&
Recommendation
S3 	Active 	38 	91.5%
Cannot make
the Bid/No-
Bid call
Scheduling 	S4 	Active 	54 	93.1%
Schedules
stay draft
until
validated
Costing &
Margin S5 	Active 	61 	95.6%
No price
without
Commercial
Manager
selection
Drafting &
Section Assembly S6 	Active 	417 	92.4%
Cites source
of any
reused
content
Compliance
Verification S7 	Active 	128 	96.9%
Cannot clear
the gate with
open gaps
Wireframe — indicative UI, illustrative data
C Catalyst_Tender_AI
A G E N T I C B I D & T E N D E R
I N T E L L I G E N C E
Workflow Role
Dashboards
Agent
Console Tenant 	Genesis Infra — Gulf JV 	MR
M. Rao
Project
Director
9/11/26, 2:16 PM 	Catalyst_Tender_AI — Product Wireframe & Role Dashboards
file:///C:/Users/abepu/OneDrive/Attachments/Celltick/Personal/Tender Management/workflow tender/customer engagement material/Catalyst_Ten… 1/2

-- 1 of 2 --

AGENT 	STAGE 	STATE RUNS
24H
EVAL
SCORE
PRIMARY
GUARDRAIL
Document
Assembly & e-
Submission
S8 	Idle 	19 	99.1%
No
submission
without a
DG3 record
Delivery
Oversight S9a 	Active 	206 	90.7%
Recommends
corrections
— humans
approve
Learning Loop 	S9b 	Scheduled 	4 	—
Model
changes
need
Governance
Forum
approval
Model routing — cost control
Economy tier 	62%
Workhorse tier 	29%
Frontier tier 	9%
Classification and routing run on the economy tier; the frontier tier is
reserved for Stages 3, 5, 6 and 7 where reasoning quality changes the
outcome.
Provider is a configuration value. A switch is a revalidation
exercise against the evaluation harness, not a rebuild.
Recent guardrail activations 	Every activation is an audit entry
WHEN 	AGENT 	GUARDRAIL 	ACTION TAKEN
Today 11:04 Compliance
Verification
Cannot clear gate with open
mandatory gaps
DG3 progression blocked on T-2026-041 — ISO
45001 expiry
Today 09:22 	Intake & Extraction 	Low-confidence field routed to human 	5 fields sent to Tender Coordinator queue
Yesterday
17:48
Outreach &
Evaluation No commitment authority Supplier award recommendation held for buyer
approval
Yesterday
14:10 Costing & Margin No price without Commercial
Manager selection Scenario set presented; no default applied
12 Mar 08:35 Document
Assembly No submission without DG3 record Submission attempt blocked pending gate
record
Wireframe — indicative UI, illustrative data
9/11/26, 2:16 PM 	Catalyst_Tender_AI — Product Wireframe & Role Dashboards
file:///C:/Users/abepu/OneDrive/Attachments/Celltick/Personal/Tender Management/workflow tender/customer engagement material/Catalyst_Ten… 2/2

-- 2 of 2 --

