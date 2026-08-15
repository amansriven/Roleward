import {
  ArrowRight,
  BookOpen,
  MessageSquareText,
  Mic2,
  Play,
  Plus,
  Sparkles,
} from "lucide-react";
import { Metric, PageIntro, Panel } from "@/components/workspace/dashboard-ui";

const competencies = [
  ["Leadership", 2],
  ["Teamwork", 3],
  ["Conflict", 1],
  ["Failure & learning", 1],
  ["Initiative", 2],
  ["Technical decisions", 3],
] as const;
export default function StageFrightPage() {
  return (
    <div className="theme-stage space-y-7">
      <PageIntro
        eyebrow="Stage Fright"
        title="Build stories. Rehearse the truth."
        copy="Capture flexible stories from real experiences, map them to interview competencies, and practice until your structure feels natural—not memorized."
        action={
          <button className="tool-button flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white">
            <Plus className="size-4" /> Add a story
          </button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Panel className="p-5">
          <Metric
            label="Current stage"
            value="Rehearsal"
            note="2 steps to Stage Ready"
          />
        </Panel>
        <Panel className="p-5">
          <Metric
            label="Story bank"
            value="7 stories"
            note="5 ready to rehearse"
          />
        </Panel>
        <Panel className="p-5">
          <Metric label="Coverage" value="6 / 9" note="competencies covered" />
        </Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <Panel className="overflow-hidden">
          <div className="border-iron/70 flex items-center justify-between border-b p-5">
            <div>
              <p className="font-semibold">Story Bank</p>
              <p className="text-dust mt-1 text-xs">
                One story can support multiple competencies
              </p>
            </div>
            <BookOpen className="text-plum size-4" />
          </div>
          {[
            {
              title: "The launch that slipped",
              source: "Campus Cart · Project lead",
              tags: ["Conflict", "Ownership"],
              status: "Needs rehearsal",
            },
            {
              title: "Cutting API latency by 38%",
              source: "Campus Cart · Backend engineer",
              tags: ["Technical decisions", "Impact"],
              status: "Ready",
            },
            {
              title: "Unblocking a new teammate",
              source: "CodePath · Team project",
              tags: ["Leadership", "Teamwork"],
              status: "Ready",
            },
          ].map((story, i) => (
            <article
              key={story.title}
              className="group border-iron/65 hover:bg-linen/[.025] flex items-center gap-4 border-t p-5 first:border-t-0"
            >
              <div className="bg-plum/10 text-plum flex size-9 shrink-0 items-center justify-center rounded-lg">
                <MessageSquareText className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{story.title}</p>
                <p className="text-dust mt-1 text-xs">{story.source}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {story.tags.map((t) => (
                    <span
                      key={t}
                      className="bg-linen/[.05] text-canvas rounded px-2 py-0.5 text-[9px]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <span
                className={
                  i === 0 ? "text-amber text-[10px]" : "text-sage text-[10px]"
                }
              >
                {story.status}
              </span>
              <ArrowRight className="text-dust size-4" />
            </article>
          ))}
        </Panel>
        <div className="space-y-5">
          <Panel className="border-plum/35 bg-[linear-gradient(140deg,rgba(154,92,138,.13),rgba(33,30,26,.9))] p-5">
            <Sparkles className="text-plum size-4" />
            <p className="mt-4 font-semibold">Today’s rehearsal</p>
            <p className="text-canvas mt-2 text-sm leading-6">
              Tell me about a time you disagreed with a teammate.
            </p>
            <p className="text-dust mt-3 text-xs leading-5">
              Use “The launch that slipped.” Focus on your specific action and
              what changed afterward.
            </p>
            <button className="bg-plum mt-5 flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold text-white">
              <Play className="size-3.5" /> Start text rehearsal
            </button>
          </Panel>
          <Panel className="p-5">
            <p className="font-semibold">Competency coverage</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {competencies.map(([name, count]) => (
                <div
                  key={name}
                  className="border-iron/70 rounded-lg border p-3"
                >
                  <p className="text-canvas text-[11px]">{name}</p>
                  <p className="mt-1 font-mono text-lg">
                    {count}
                    <span className="text-dust text-[9px]"> stories</span>
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
      <Panel className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex gap-3">
          <Mic2 className="text-plum mt-1 size-4" />
          <div>
            <p className="text-sm font-semibold">
              Spotlight mode unlocks at “Under the Spotlight”
            </p>
            <p className="text-dust mt-1 text-xs">
              Cover 8 competencies and complete 3 uninterrupted rehearsals.
            </p>
          </div>
        </div>
        <span className="text-plum text-xs">2 of 3 requirements met</span>
      </Panel>
    </div>
  );
}
