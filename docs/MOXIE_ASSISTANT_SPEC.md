# Moxie — Roleward career assistant

Status: Milestone 6 product and interaction specification. Implementation is deferred to Milestone 7.

## Product thesis

Moxie is a career operating partner grounded in the candidate's real Roleward workspace. It helps the candidate decide what to do, understand why it matters, improve their work, and rehearse effectively. It is not a general-purpose chatbot and it does not silently modify career records.

The assistant's visual identity is an original abstract humanoid guide. The production avatar is stored at `/public/assistant/moxie-avatar-v1.png`.

## Jobs to be done

Moxie supports five primary jobs:

1. Plan: turn deadlines, interview dates, gaps, and goals into a preparation plan.
2. Analyze: identify patterns across applications, evidence, resumes, coding attempts, and interviews.
3. Coach: run conversational drills and improve delivery, reasoning, confidence, pace, and clarity.
4. Draft: create grounded resume bullets, STAR stories, outreach, questions, and preparation notes.
5. Review: critique user work against the active role and verified evidence.

Navigation is a supporting behavior, not a mode: Moxie can always direct the candidate to the correct product surface.

## Context available to Moxie

### Applications

- Active and saved applications
- Job descriptions and extracted requirements
- Status, deadlines, interview dates, and readiness gaps
- Saved company research and source references

### Evidence

- Confirmed, corrected, proposed, and rejected claims
- Experience, projects, education, activities, links, and skills
- The evidence IDs supporting generated statements

### Resume Kitchen

- Original resume and every named revision
- Active version and target application
- Tailored bullets and their source claim IDs
- Version history and update timestamps

### Zed

- Problem title, archetype, difficulty, and language
- Pattern and complexity choices
- Edge-case score, runs, hints, verdicts, and coaching
- Code submitted for the user's own attempts
- Imported LeetCode problem context when present
- Longitudinal weak patterns and skill observations

### Stage Fright

- Interview configuration and target role
- Full user-visible transcript when explicitly relevant
- Report, competency coverage, scores, and recurring feedback
- Voice signals: pace, filler words, answer length, pauses, clarity, structure, and confidence indicators where the recording pipeline can support them

### Goals and conversation

- User-approved career goals, preferences, constraints, and target dates
- Current conversation and explicitly saved memories
- Current route and selected workspace object

## Context selection

The full workspace is never inserted into every request. A context broker builds the smallest useful bundle.

1. Route context: current page, selected application, resume, problem, or interview.
2. Intent context: only domains needed for the detected mode.
3. Supporting context: cited evidence and recent relevant history.
4. Workspace summary: compact counts, active goal, and top priority.

Every context bundle records source type, source ID, title, timestamp, verification state, and sensitivity. Large documents and transcripts are retrieved in relevant excerpts. Raw audio is not retained as assistant memory.

## Trust and permissions

- Read actions are allowed within the signed-in user's workspace.
- Drafting never changes the source record.
- Every factual career claim must cite confirmed or corrected Evidence.
- Proposed or unverified facts must be visibly labeled.
- Workspace writes use preview → confirmation → commit.
- Destructive actions require a separate confirmation and state the exact target.
- Moxie never submits applications, sends messages, or publishes a portfolio without explicit authorization.
- Durable memory is opt-in, visible, editable, and deletable.

## Voice coaching

Voice coaching is a dedicated Coach experience, not a hidden score.

After permission is granted, Moxie can analyze:

- Pace and meaningful pauses
- Filler words and repeated phrases
- Answer structure and signposting
- Concision versus under-explaining
- Vocal energy and confidence proxies
- Whether examples answer the actual question

The UI separates observable measures from interpretation. For example, “162 words per minute” is a measurement; “you sounded rushed” is coaching. Users can replay only the relevant moment and see a transcript-aligned suggestion. Voice-derived data is excluded from durable memory unless saved by the user.

## Interaction design

### Global launcher

A 48px Moxie avatar button sits above the workspace feedback control. It shows a restrained sage availability dot and a short tooltip. The launcher never obscures primary page actions.

### Contextual drawer

Desktop uses a 420–480px right drawer. Mobile uses a full-height sheet. Opening it does not navigate away or discard in-progress forms or code.

Drawer anatomy:

1. Header: avatar, “Moxie”, mode, new conversation, and expand control.
2. Context rail: compact source chips such as `Stripe application`, `Backend internship`, or `Zed · Graphs`.
3. Conversation: calm message layout with generous spacing and no decorative chat bubbles for long answers.
4. Composer: multiline input, voice input, attachment/context control, and send.
5. Suggested prompts: page-specific and removed after the conversation begins.

### Full workspace

`/dashboard/moxie` is the durable conversation workspace. It contains a conversation list, the active conversation, a collapsible context inspector, saved goals, and memory controls. Long plans and document comparisons use this surface rather than the drawer.

### Response components

Moxie responses can contain:

- Source chips that open the exact supporting record
- A plan with checkable steps and dates
- A comparison table for roles or resume versions
- A draft card with “Copy”, “Revise”, and “Apply…” actions
- A coaching card with observation, evidence, and next drill
- An action preview showing the exact workspace mutation

## Visual system

- Uses the existing night, workshop, raised, linen, amber, sage, and iron tokens.
- Moxie's avatar supplies personality; the surrounding UI remains restrained.
- Drawer surfaces use 20–24px radii, thin iron borders, and the existing inset highlight.
- Amber is reserved for primary action and active context. Sage communicates grounded/verified state.
- Motion uses 180–280ms transforms and opacity. The drawer uses a spring-like ease without bounce.
- Avatar animation is limited to a subtle idle orbit and speaking pulse and respects reduced motion.
- Conversation width is capped for readable 60–75 character lines.

## Conversation and memory model

### Conversation

- id, userId, title, mode, createdAt, updatedAt
- messages with structured response blocks
- context references, not copied source documents

### Goal

- id, statement, targetDate, status, sourceConversationId
- milestones and linked workspace entities
- explicit user approval timestamp

### Memory

- id, category, statement, sourceMessageId, createdAt
- approvedAt and deletedAt
- categories: preference, constraint, target, background

## Milestone 7 implementation order

1. Read-only context schemas and context broker.
2. Assistant API with grounded text responses and source citations.
3. Global launcher, contextual drawer, and page-aware suggestions.
4. Full conversation workspace and persistence.
5. Goal and memory controls.
6. Draft previews and confirmed write actions.
7. Transcript-grounded voice coaching.
8. Audio-derived coaching after privacy and retention review.

The first release must remain read-only. It can analyze, explain, plan, coach from existing text, and draft content, but it cannot change workspace records.
