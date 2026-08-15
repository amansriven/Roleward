# Sweet+ Delivery Roadmap

## 1. Delivery strategy

Build a narrow vertical slice before completing any single product area. The first usable release should let one candidate add evidence, add a job, receive explainable gaps, complete one preparation action, and observe readiness change.

Avoid building Resume Kitchen, Guru, and Stage Fright as three disconnected applications.

## 2. Phase 0: Product and engineering foundation

### Product decisions

- Confirm internship and new-grad onboarding variants
- Define the first readiness rules
- Define the candidate evidence verification experience
- Create a small, consented evaluation set of resumes and job descriptions
- Establish AI safety language and deletion policy

### Engineering work

- Initialize Next.js and TypeScript
- Configure linting, formatting, testing, and CI
- Create the visual token system
- Define domain module boundaries
- Provision development AWS resources through infrastructure code
- Configure Cognito, PostgreSQL, private S3, SQS, and observability
- Add environment validation and secret handling
- Establish database migrations

### Exit criteria

- A developer can reproduce the local environment from documentation.
- Staging deploys automatically.
- A user can sign in and access only their own empty workspace.
- Budget and error alerts are active.

## 3. Phase 1: First vertical slice

### Build

- Candidate onboarding
- Resume upload
- Resume parsing job
- Evidence confirmation
- Target-job creation
- Requirement extraction and confirmation
- Initial requirement-to-evidence matches
- Simple Readiness Map
- Home screen with up to three recommended actions

### Exit criteria

- A test user can go from signup to an explainable Readiness Map.
- No unconfirmed AI extraction becomes verified evidence.
- Reprocessing the same file or description does not duplicate records.
- Every readiness statement links to supporting data.

## 4. Phase 2: Resume Kitchen MVP

### Build

- Base resume representation
- Recipe Card for a target job
- Evidence-backed bullet suggestions
- Suggestion review: accept, edit, or reject
- Tailored version per application
- Basic printable resume export

### Exit criteria

- Every generated claim references confirmed evidence.
- Users can understand why each edit was proposed.
- Original content is always recoverable.
- Exported resumes pass visual and text-extraction checks.

## 5. Phase 3: Guru MVP

### Build

- Curate 20-30 foundational problems
- Add topic taxonomy and test cases
- Integrate browser editor
- Integrate isolated execution for three languages
- Record attempts and hint usage
- Generate post-attempt coaching
- Feed objective activity into technical readiness

Initial topic set:

- Arrays and strings
- Hash maps and sets
- Two pointers and sliding windows
- Stacks and queues
- Linked lists
- Trees and graph traversal
- Binary search
- Recursion and introductory dynamic programming

### Exit criteria

- Untrusted code cannot access application secrets or infrastructure.
- Private tests never reach the browser.
- Execution has enforced resource and output limits.
- Technical readiness explains correctness, topic coverage, recency, and hint use.

## 6. Phase 4: Stage Fright MVP

### Build

- Guided story capture
- Story Bank
- Competency Coverage Map
- Text-based Rehearsal
- Structured feedback and follow-up questions
- Stage progression through Rehearsal Mode
- Feed coverage and practice into behavioral readiness

### Exit criteria

- Users can create verified stories without invented content.
- Feedback distinguishes specificity, ownership, reflection, and impact.
- Stage progression has visible, deterministic requirements.
- Users can reuse one story across multiple competencies without duplicating it.

## 7. Phase 5: Integrated private beta

### Build

- Weekly preparation plans
- Cross-module recommendations
- Application timeline
- Usage limits
- Feedback collection
- Account export and permanent deletion
- Product analytics with privacy review

### Beta cohort

Recruit a small cohort of internship and new-grad applicants. Include different universities, experience levels, and target roles. Do not use their private content for model training without separate explicit consent.

### Questions to validate

- Do users understand and trust the Evidence Library?
- Do job-specific recommendations feel more useful than generic checklists?
- Do users complete the recommended next actions?
- Does readiness feel explainable rather than arbitrary?
- Which area drives repeat use?
- Does the combined product feel cohesive?

## 8. Phase 6: Public MVP

### Required before launch

- Production privacy policy and terms
- Security review and threat model
- File scanning
- Abuse and rate limiting
- Operational dashboards and alerts
- Restore-tested database backups
- Support and incident process
- Model-output evaluation suite
- Cost controls and plan entitlements
- Accessibility review

### Candidate release scope

- One base resume
- One or a small number of active applications on the free plan
- Resume Kitchen core workflow
- Foundational Guru problem set
- Stage Fright Story Bank and Rehearsal
- Explainable readiness
- Weekly plan

## 9. Later roadmap

Potential additions should be validated individually:

- Spotlight behavioral mock interviews
- Voice transcription and delivery feedback
- More programming languages
- System design preparation
- GitHub and portfolio evidence import
- Calendar integration
- More resume templates
- University or cohort plans
- Mentor review workflows
- Mobile companion experience

## 10. Suggested first development backlog

1. Create application shell and design tokens.
2. Add Cognito authentication and internal user provisioning.
3. Create the initial Drizzle schema and migrations.
4. Add candidate onboarding.
5. Add private S3 upload flow.
6. Create resume processing queue and worker contract.
7. Build evidence confirmation UI.
8. Build application and job-description intake.
9. Create requirement extraction schema and evaluator tests.
10. Build requirement confirmation UI.
11. Implement evidence matching.
12. Implement readiness rules version 1.
13. Build the Home and application workspace views.

## 11. Architecture decision log

### ADR-001: Modular monolith first

**Decision:** Use one Next.js application with internal domain modules and asynchronous workers.

**Reason:** It minimizes operational overhead while keeping product boundaries explicit.

### ADR-002: PostgreSQL as source of truth

**Decision:** Use relational storage rather than a document database.

**Reason:** Sweet+ has strong relationships among candidates, evidence, applications, versions, attempts, stories, and assessments.

### ADR-003: AI suggestions require traceability

**Decision:** Store prompt/schema versions and evidence references for material AI outputs.

**Reason:** Resume and readiness suggestions must be explainable, correctable, and testable.

### ADR-004: Isolate code execution

**Decision:** Use an external sandbox provider for the MVP.

**Reason:** Candidate code is untrusted and must not run in the web or worker environment.

### ADR-005: Deterministic readiness levels

**Decision:** AI can contribute rubric observations, but versioned product rules assign readiness levels.

**Reason:** Users need stable and understandable progression rather than opaque model scores.
