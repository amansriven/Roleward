<div align="center">
  <img src="public/brand/roleward-mark.svg" alt="Roleward logo" width="88" height="88" />

# Roleward

**Your entire job search. One contextualized AI workspace.**

Roleward is a contextualized AI career workspace that connects applications,
coding practice, resume revisions, and interview preparation for internships
and jobs—then keeps the next useful action visible.

![Next.js](https://img.shields.io/badge/Next.js-16-17191E?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-68A5B8?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/unit_tests-219_passing-73A897?style=flat-square)

[Full product specification](docs/PRODUCT_SPEC.md) · [Roadmap](docs/ROADMAP.md)
</div>

---

## The product

<p align="center">
  <img src="docs/images/roleward-dashboard.png" alt="Roleward dashboard connecting applications, coding practice, resume revisions, and interview preparation" width="100%" />
</p>

Roleward helps people land internships and jobs by bringing applications,
LeetCode-style coding practice, resume revisions, and interview preparation
into one agentic platform. One shared context lets every recommendation reflect
the candidate's verified experience and the role they actually want.

```text
Applications + verified experience + target role
                      ↓
             shared career context
                      ↓
    coding · resume · interview preparation
                      ↓
              one useful action next
```

## Product specification snapshot

### Core promise

> Know what to work on next—and why—for the internship or job you want.

### Product rules

- **Evidence before generation.** Resume suggestions can only use experience
  the candidate has confirmed.
- **Keep the original.** Resume Kitchen stores the imported resume as a locked
  original and keeps every editable revision as a separately named version.
- **Coach rather than answer.** Zed and Stage Fright strengthen reasoning and
  delivery instead of completing interviews for the candidate.
- **Explain readiness.** Preparation labels expose the evidence and activity
  behind them; they are not predictions of interviews or offers.
- **One target, shared context.** Applications connect the resume, coding plan,
  and behavioral preparation for a specific role.
- **Private by default.** Resumes, evidence, attempts, stories, and session data
  are treated as sensitive workspace information.

### Workspace map

| Workspace          | Current product behavior                                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Applications**   | Save a role, preserve the posting, confirm requirements, track status and dates, and build a preparation map.                                         |
| **Evidence**       | Review extracted claims and keep a verified record of projects, experience, metrics, and outcomes.                                                    |
| **Resume Kitchen** | Import PDF or DOCX resumes, lock the original, create named revisions, edit each version independently, and ground suggestions in confirmed evidence. |
| **Zed**            | Classify a technical pattern, commit to an approach, solve in the editor, use progressive hints, run tests, and review coaching.                      |
| **Stage Fright**   | Build a story bank, rehearse behavioral questions, track competency coverage, and review session feedback.                                            |
| **Home**           | Show the active role, readiness signals, and the highest-value next preparation action.                                                               |

## One role, one plan

<p align="center">
  <img src="docs/images/roleward-agent-plan.png" alt="Roleward agent plan connecting resume, coding, and interview preparation to one target role" width="100%" />
</p>

The agent plan keeps the target job at the center. Resume edits close evidence
gaps, coding sessions focus on role-relevant patterns, and interview practice
rehearses the decisions and stories the candidate will actually need.

## Resume Kitchen version contract

Resume versioning is deliberately non-destructive:

1. The first confirmed import becomes the **original resume**.
2. Original content is locked, but the user can give the source a clearer name.
3. Every revision is created as a separately named copy.
4. Revisions can change headlines, skills, bullets, and section content without
   modifying the source.
5. A revision can be associated with the active application while remaining
   independently selectable later.
6. Existing workspaces migrate their confirmed evidence into a protected
   original snapshot.

## Technical architecture

Roleward is a modular Next.js application. Route handlers and server
components stay close to the product surfaces they support, while domain rules
live in testable modules.

| Layer            | Technology                                       |
| ---------------- | ------------------------------------------------ |
| **Application**  | Next.js 16, React 19, TypeScript 6               |
| **Interface**    | Tailwind CSS 4, Geist, Lucide                    |
| **Identity**     | Auth.js, Amazon Cognito, Google federation       |
| **Storage**      | AWS DynamoDB and S3-compatible workspace storage |
| **AI workflows** | OpenAI structured outputs with Zod validation    |
| **Execution**    | AWS Lambda-backed coding test execution          |
| **Testing**      | Vitest, Testing Library, Playwright              |
| **Deployment**   | Vercel                                           |

```text
src/
├── app/                    routes, layouts, and server endpoints
├── components/             brand, product, and workspace interface
├── modules/
│   ├── applications/       job intake and requirement matching
│   ├── evidence/           verified candidate claims
│   ├── resume-kitchen/     extraction, versions, and tailoring rules
│   ├── zed/                practice generation, validation, and coaching
│   ├── interviews/         Stage Fright sessions and reports
│   └── workspace/          local and cloud workspace state
└── lib/                    shared utilities
```

## Authentication

Roleward supports email/password and Google sign-in through Amazon Cognito.
Auth.js exchanges the Cognito authorization result for a server-side application
session; protected dashboard routes never rely on a browser-only identity flag.

```text
Email/password ──→ Cognito validation ──→ Auth.js session ──→ Dashboard
Google ──→ Cognito hosted authorization ──→ Google ──→ callback ──→ Dashboard
```

| Environment | Cognito callback                                         |
| ----------- | -------------------------------------------------------- |
| Local       | `http://localhost:3000/api/auth/callback/cognito`        |
| Production  | `https://sweetplus.vercel.app/api/auth/callback/cognito` |

See [AUTH_SETUP.md](docs/AUTH_SETUP.md) for the app-client secret, OAuth scopes,
Google federation, callback URLs, and deployment variables.

## Run locally

### Requirements

- Node.js 22 or newer
- npm 10
- An Amazon Cognito user pool and confidential web app client

### Install

```bash
npm install
cp .env.example .env
```

Add the required server-only identity values:

```env
AUTH_SECRET=
AUTH_COGNITO_ID=
AUTH_COGNITO_SECRET=
AUTH_COGNITO_ISSUER=https://cognito-idp.us-east-2.amazonaws.com/YOUR_USER_POOL_ID
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate the Auth.js secret and start the development server:

```bash
openssl rand -base64 32
npm run dev
```

Open [localhost:3000](http://localhost:3000). Never prefix authentication
secrets with `NEXT_PUBLIC_`, and never commit a populated environment file.

## Quality checks

```bash
npm run lint          # ESLint
npm run typecheck     # TypeScript
npm test              # Unit and component tests
npm run test:e2e      # Browser flows
npm run format:check  # Prettier
npm run build         # Production build
```

## Project documentation

| Document                                      | Coverage                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| [Product specification](docs/PRODUCT_SPEC.md) | Product principles, feature behavior, readiness, and MVP boundaries      |
| [System architecture](docs/ARCHITECTURE.md)   | Services, modules, persistence, and execution boundaries                 |
| [Data model](docs/DATA_MODEL.md)              | Candidate, application, resume-version, evidence, and interview entities |
| [Delivery roadmap](docs/ROADMAP.md)           | Delivery phases and remaining work                                       |
| [Authentication setup](docs/AUTH_SETUP.md)    | Cognito, OAuth, callbacks, and Vercel configuration                      |

---

<div align="center">
  <sub>Serious preparation, kept focused, defensible, and connected.</sub>
</div>
