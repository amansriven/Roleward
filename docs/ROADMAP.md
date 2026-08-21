# Backstage Delivery Roadmap

## 1. Delivery strategy

Build a narrow vertical slice before completing any single product area. The first usable release should let one candidate add evidence, add a job, receive explainable gaps, complete one preparation action, and observe readiness change.

Avoid building Resume Kitchen, Zed, and Stage Fright as three disconnected applications.

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
- Configure PostgreSQL, private S3, SQS, SES, and observability
- Add environment validation and secret handling
- Establish database migrations

### Authentication and account recovery

- Integrate Better Auth with PostgreSQL-backed users, accounts, sessions, and verification records
- Support Google, GitHub, Apple, and email/password signup and login
- Require email verification for email/password accounts before sensitive preparation data is stored
- Link multiple providers to one internal Backstage user without creating duplicate preparation histories
- Require an authenticated session and recent verification before linking or unlinking a provider
- Add session rotation, revocation, device/session history, and global sign-out
- Add a **Forgot password?** flow that accepts an email without revealing whether an account exists
- Send password-reset links through Amazon SES using single-use, hashed, expiring tokens
- Add a reset-password screen with password-strength guidance, confirmation, and accessible error states
- Revoke existing password sessions after a successful password reset while preserving explicitly linked social accounts
- Rate-limit reset requests and record security events without logging tokens or passwords
- Configure Google and GitHub OAuth applications when local callback URLs are stable
- Configure Apple Sign In after the production domain and Apple Developer account are available
- Configure SES domain verification before staging sends real verification or password-reset email

### Exit criteria

- A developer can reproduce the local environment from documentation.
- Staging deploys automatically.
- A user can sign in and access only their own empty workspace.
- A user can use Google, GitHub, Apple, or verified email/password without creating duplicate Backstage histories.
- A user who forgets an email-account password can request a reset, use one valid expiring link, choose a new password, and sign in again.
- Password-reset requests return the same public response for existing and unknown email addresses.
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
- Recipe Card for target roles
- Evidence-backed bullet suggestions
- Suggestion review: accept, edit, or reject
- Tailored version per application
- Basic printable resume export

### Exit criteria

- Every generated claim references confirmed evidence.
- Users can understand why each edit was proposed.
- Original content is always recoverable.
- Exported resumes pass visual and text-extraction checks.

## 5. Phase 3: Zed MVP

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
- Foundational Zed problem set
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
2. Add Better Auth with PostgreSQL sessions and internal user provisioning.
3. Add Google, GitHub, Apple, and verified email/password authentication.
4. Add forgot-password, password-reset, session revocation, and account-linking flows.
5. Configure SES verification and password-reset email templates.
6. Create the initial Drizzle schema and migrations.
7. Add candidate onboarding.
8. Add private S3 upload flow.
9. Create resume processing queue and worker contract.
10. Build evidence confirmation UI.
11. Build application and job-description intake.
12. Create requirement extraction schema and evaluator tests.
13. Build requirement confirmation UI.
14. Implement evidence matching.
15. Implement readiness rules version 1.
16. Build the Home and application workspace views.

## 11. Architecture decision log

### ADR-001: Modular monolith first

**Decision:** Use one Next.js application with internal domain modules and asynchronous workers.

**Reason:** It minimizes operational overhead while keeping product boundaries explicit.

### ADR-002: PostgreSQL as source of truth

**Decision:** Use relational storage rather than a document database.

**Reason:** Backstage has strong relationships among candidates, evidence, applications, versions, attempts, stories, and assessments.

### ADR-003: AI suggestions require traceability

**Decision:** Store prompt/schema versions and evidence references for material AI outputs.

**Reason:** Resume and readiness suggestions must be explainable, correctable, and testable.

### ADR-004: Isolate code execution

**Decision:** Use an external sandbox provider for the MVP.

**Reason:** Candidate code is untrusted and must not run in the web or worker environment.

### ADR-005: Deterministic readiness levels

**Decision:** AI can contribute rubric observations, but versioned product rules assign readiness levels.

**Reason:** Users need stable and understandable progression rather than opaque model scores.

### ADR-006: Unified authentication outside Cognito

**Decision:** Use Better Auth with PostgreSQL for Google, GitHub, Apple, and email/password authentication.

**Reason:** One authentication layer can link all four login methods to the same internal user and preparation history. GitHub is not a native Cognito social provider, and adding an identity broker only for GitHub would create unnecessary operational complexity.

Password recovery uses Amazon SES for delivery and stores only hashed, single-use, short-lived reset tokens. Provider credentials and AWS access are not required during UI development. They become necessary when callback URLs, the staging domain, the PostgreSQL environment, and the SES sender domain are ready to configure.
