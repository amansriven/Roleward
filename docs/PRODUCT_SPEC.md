# Roleward Product Specification

## 1. Product vision

Roleward is a personalized application and interview-preparation workspace for aspiring software engineers. It turns a candidate's verified experience and a target job description into a practical preparation plan across resume tailoring, coding interviews, and behavioral interviews.

### Core promise

> Know what to work on next for the software engineering role you want.

### Target users

Primary users are:

- University students seeking software engineering internships
- Final-year students applying for new-grad roles
- Recent graduates still pursuing their first full-time engineering role
- Bootcamp graduates and self-taught candidates competing for entry-level roles

The initial focus is candidates targeting large technology companies and similarly competitive interview processes.

### Primary user problem

Candidates prepare across disconnected products: job boards, resume editors, coding platforms, notes, spreadsheets, and general AI chatbots. Those tools do not share context, so candidates struggle to prioritize work for a specific opportunity.

Roleward connects preparation to a target job and maintains a verified record of the candidate's real experience.

## 2. Product principles

1. **Evidence before generation.** Resume suggestions must be supported by user-confirmed experience.
2. **Explain every assessment.** Readiness labels must expose their underlying evidence.
3. **Coach rather than answer.** Zed and Stage Fright should help candidates improve, not do the interview for them.
4. **Job-specific preparation.** Recommendations should respond to the user's target role.
5. **One next action.** The home experience should always make the next useful step clear.
6. **Private by default.** Resumes, stories, attempts, and recordings are sensitive.
7. **No outcome guarantees.** Roleward measures preparation activity and demonstrated capability, not employability.

## 3. Product structure

### Global navigation

- Home
- Applications
- Resume Kitchen
- Zed
- Stage Fright
- Profile and settings

### Shared foundation

#### Candidate profile

- Graduation date and education
- Internship or new-grad track
- Target roles and companies
- Preferred languages
- Technical skills
- Weekly availability
- Interview timeline
- Notification preferences

#### Evidence Library

The Evidence Library is the trusted source for resume and interview claims. Evidence can come from:

- Work and internship experience
- Projects
- Coursework
- Clubs and leadership
- Hackathons
- Volunteering
- Part-time employment

Every evidence item can include skills used, actions taken, outcomes, metrics, links, and user verification status.

#### Applications workspace

Each target job stores:

- Company, role, location, and source URL
- Original job-description snapshot
- Application deadline and status
- Extracted requirements
- Requirement-to-evidence matches
- Tailored resume version
- Assigned coding topics
- Relevant behavioral competencies
- Interview events and notes
- Readiness status

Application stages:

`Saved -> Preparing -> Applied -> Assessment -> Interviewing -> Offer | Closed`

## 4. Feature inventory

Priority labels:

- **P0:** required to validate the MVP
- **P1:** important shortly after validation
- **P2:** later expansion

### Home: Today in Roleward

| Priority | Feature                                               |
| -------- | ----------------------------------------------------- |
| P0       | Today's recommended preparation actions               |
| P0       | Active application and nearest deadline               |
| P0       | Resume, technical, and behavioral readiness summaries |
| P0       | Continue-preparing primary action                     |
| P1       | Weekly plan and completion history                    |
| P1       | Preparation streak with forgiving recovery rules      |
| P2       | Calendar synchronization and reminders                |

### Applications

| Priority | Feature                                                     |
| -------- | ----------------------------------------------------------- |
| P0       | Create a job workspace by pasting a description             |
| P0       | Extract and confirm job requirements                        |
| P0       | Track application status and deadline                       |
| P0       | Display a job-specific preparation checklist                |
| P0       | Connect a tailored resume, coding plan, and behavioral plan |
| P1       | Save job URL and immutable description snapshots            |
| P1       | Interview timeline and notes                                |
| P2       | Job-board import integrations                               |

### Resume Kitchen

Core metaphor:

- Ingredients: verified experiences, projects, skills, and outcomes
- Recipe: target-job requirements
- Dish: tailored resume

| Priority | Feature                                                         |
| -------- | --------------------------------------------------------------- |
| P0       | Upload PDF or DOCX base resume                                  |
| P0       | Extract structured resume content                               |
| P0       | Let the user correct and verify extracted evidence              |
| P0       | Match requirements to evidence                                  |
| P0       | Identify missing or weak evidence                               |
| P0       | Suggest truthful bullet revisions                               |
| P0       | Show original, suggestion, rationale, requirement, and evidence |
| P0       | Save a tailored resume version per application                  |
| P1       | Resume editor and section ordering                              |
| P1       | PDF and DOCX export                                             |
| P1       | Version comparison and restoration                              |
| P1       | Formatting and readability checks                               |
| P2       | Multiple resume templates                                       |
| P2       | Portfolio and GitHub evidence import                            |

Resume feedback dimensions:

- Requirement coverage
- Evidence strength
- Specificity
- Measurable impact
- Technical clarity
- Readability
- Formatting compatibility

### Zed

Practice modes:

- Learn: guided concept instruction
- Practice: targeted problems with progressive hints
- Interview: timed simulation with follow-up questions
- Review: revisit weak patterns through spaced repetition

| Priority | Feature                                           |
| -------- | ------------------------------------------------- |
| P0       | Curated problem bank                              |
| P0       | Python, JavaScript/TypeScript, and Java support   |
| P0       | In-browser editor                                 |
| P0       | Secure, isolated test execution                   |
| P0       | Progressive hints                                 |
| P0       | Attempt history and test results                  |
| P0       | Complexity and edge-case reflection               |
| P0       | Post-attempt feedback                             |
| P1       | Conversational AI interviewer                     |
| P1       | Timed interview mode                              |
| P1       | Adaptive follow-up variations                     |
| P1       | Personalized topic plan based on a target role    |
| P1       | Pattern- and mistake-level progress tracking      |
| P2       | System design practice                            |
| P2       | Company-tagged practice where legally appropriate |

Zed evaluates separate dimensions:

- Problem comprehension
- Communication
- Approach selection
- Implementation correctness
- Testing discipline
- Complexity analysis
- Independence and hint usage

### Stage Fright

Tagline: **From Stage Fright to Stage Ready.**

Progression:

`Stage Fright -> Finding Your Voice -> Rehearsal Mode -> Under the Spotlight -> Stage Ready`

| Priority | Feature                                                |
| -------- | ------------------------------------------------------ |
| P0       | Story Bank                                             |
| P0       | Guided story capture from real experiences             |
| P0       | Story Coverage Map                                     |
| P0       | Text-based behavioral rehearsal                        |
| P0       | STAR-based structure feedback without forcing a script |
| P0       | Suggested follow-up questions                          |
| P1       | Uninterrupted Spotlight mock interview                 |
| P1       | Adaptive questions based on target-job competencies    |
| P1       | Stage progression based on demonstrated coverage       |
| P2       | Voice interviews and transcript review                 |
| P2       | Delivery signals such as pace and filler words         |

Story coverage competencies:

- Leadership
- Teamwork
- Conflict
- Failure and learning
- Ambiguity
- Initiative
- Technical decisions
- Receiving feedback
- Delivering impact

Behavioral feedback dimensions:

- Structure
- Specificity
- Ownership
- Technical depth
- Reflection
- Impact
- Follow-up adaptability
- Natural delivery

## 5. Readiness model

Every application has three independent readiness statuses:

- Application readiness
- Technical interview readiness
- Behavioral interview readiness

Levels:

`Needs attention -> Developing -> Nearly ready -> Ready`

The status is calculated from deterministic signals where possible. AI may produce evidence and feedback, but application logic determines the displayed level from recorded criteria.

Example explanation:

> Technical: Developing. You consistently complete array and hash-map problems, but have not completed a timed tree or graph problem without substantial hints.

Roleward must never convert these statuses into a predicted probability of receiving an interview or offer.

## 6. MVP user journey

1. User creates an account.
2. User selects internship or new-grad track and completes a short profile.
3. User uploads a base resume.
4. Roleward extracts candidate evidence; the user confirms or corrects it.
5. User pastes a target job description.
6. Roleward extracts requirements; the user confirms them.
7. Roleward builds the first Readiness Map.
8. User receives no more than three recommended actions.
9. User completes a Resume Kitchen, Zed, or Stage Fright activity.
10. The Readiness Map updates and explains what changed.

## 7. Explicit non-goals for MVP

- Automated job applications
- Claims of ATS compatibility or guaranteed outcomes
- Recruiter or employer marketplace
- Social feed or candidate competition
- Video and body-language evaluation
- Native mobile applications
- Hundreds of coding problems
- Training a proprietary foundation model
- Scraping job boards
- Supporting every programming language

## 8. Initial success measures

### Activation

A user reaches activation when they:

1. Confirm at least three evidence items,
2. Add a target job, and
3. Complete one recommended action.

### Product measures

- Percentage of signups reaching activation
- Percentage of users returning within seven days
- Target jobs with at least one completed preparation action
- Suggested resume edits accepted, modified, or rejected
- Coding practice sessions completed after starting
- Story Bank coverage growth
- Weekly-plan completion rate
- User-reported confidence change

Offer rates can be collected as a long-term outcome signal, but should not be treated as a direct measure of causal product effectiveness.
