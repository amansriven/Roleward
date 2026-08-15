# Sweet+

Sweet+ is an AI-assisted preparation workspace for students and recent graduates pursuing competitive software engineering internships and new-grad roles.

The product connects three preparation areas around each target job:

- **Resume Kitchen** — evidence-based resume tailoring
- **Guru** — guided technical interview practice
- **Stage Fright** — behavioral preparation that takes candidates from Stage Fright to Stage Ready

Sweet+ does not promise an interview or offer. It helps candidates understand what a role requires, identify preparation gaps, and decide what to work on next.

## Planning documents

- [Product specification](docs/PRODUCT_SPEC.md)
- [System architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md)
- [Delivery roadmap](docs/ROADMAP.md)

## Proposed MVP stack

- Next.js and TypeScript
- Tailwind CSS and shadcn/ui
- AWS Amplify Hosting
- Amazon Cognito
- PostgreSQL on Amazon RDS with Drizzle ORM
- Amazon S3
- AWS Lambda and SQS
- OpenAI API through the Vercel AI SDK
- E2B for isolated code execution
- CloudWatch and Sentry

The initial architecture is a modular monolith: one deployable application with clear domain boundaries and asynchronous workers for long-running operations.

## Local development

Requirements:

- Node.js 22
- npm 10

Set up and run the application:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open `http://localhost:3000`.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run format:check
npm run build
```
