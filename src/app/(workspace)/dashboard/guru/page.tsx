import {
  ArrowRight,
  Braces,
  CheckCircle2,
  Clock3,
  Lightbulb,
  Play,
  Target,
} from "lucide-react";
import { Metric, PageIntro, Panel } from "@/components/workspace/dashboard-ui";

const topics = [
  ["Arrays & strings", 88],
  ["Hash maps", 81],
  ["Two pointers", 72],
  ["Trees", 64],
  ["Graphs", 42],
] as const;
export default function GuruPage() {
  return (
    <div className="theme-guru space-y-7">
      <PageIntro
        eyebrow="Guru"
        title="Practice the gap that matters next."
        copy="Guru separates correctness, reasoning, testing, and independence—then uses those signals to choose practice for your target role."
        action={
          <button className="tool-button min-h-10 rounded-lg px-4 text-sm font-semibold text-white">
            Start focused practice
          </button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Panel className="p-5">
          <Metric
            label="Technical readiness"
            value="62%"
            note="Developing · +6 this week"
          />
        </Panel>
        <Panel className="p-5">
          <Metric label="Problems solved" value="18" note="14 independently" />
        </Panel>
        <Panel className="p-5">
          <Metric label="Practice time" value="3h 20m" note="This week" />
        </Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <Panel className="overflow-hidden">
          <div className="border-iron/70 border-b p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Next up · Number of Islands</p>
                <p className="text-dust mt-1 text-xs">
                  Graph traversal · Medium · Stripe plan
                </p>
              </div>
              <span className="bg-cobalt/10 text-cobalt rounded-full px-2.5 py-1 text-[10px]">
                Recommended
              </span>
            </div>
          </div>
          <div className="grid lg:grid-cols-[.8fr_1.2fr]">
            <div className="border-iron/70 border-b p-5 lg:border-r lg:border-b-0">
              <p className="text-canvas text-sm leading-6">
                Given a 2D grid of land and water, return the number of
                connected islands.
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-xs">
                  <Target className="text-cobalt size-4" />
                  <span>Focus: model grid traversal clearly</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <Clock3 className="text-cobalt size-4" />
                  <span>Target: 25 minutes</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <Lightbulb className="text-cobalt size-4" />
                  <span>3 progressive hints available</span>
                </div>
              </div>
            </div>
            <div className="bg-[#18191e] p-5">
              <div className="flex items-center justify-between">
                <div className="text-canvas flex items-center gap-2 text-xs">
                  <Braces className="text-cobalt size-4" /> TypeScript
                </div>
                <span className="text-dust font-mono text-[10px]">
                  solution.ts
                </span>
              </div>
              <pre className="text-canvas mt-5 overflow-auto font-mono text-xs leading-7">
                <code>
                  <span className="text-plum">function</span>{" "}
                  <span className="text-cobalt">numIslands</span>(grid:
                  string[][]) {"{\n"}{" "}
                  <span className="text-dust">
                    {"// explain your approach first"}
                  </span>
                  {"\n\n\n}"}
                </code>
              </pre>
              <button className="bg-cobalt mt-8 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold text-white">
                <Play className="size-3.5" /> Open workspace
              </button>
            </div>
          </div>
        </Panel>
        <Panel className="p-5">
          <p className="font-semibold">Topic map</p>
          <p className="text-dust mt-1 text-xs">
            Based on correctness, recency, and hint use
          </p>
          <div className="mt-6 space-y-5">
            {topics.map(([topic, value]) => (
              <div key={topic}>
                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-canvas">{topic}</span>
                  <span className="text-dust font-mono">{value}%</span>
                </div>
                <div className="bg-iron h-1.5 rounded-full">
                  <div
                    className="bg-cobalt h-full rounded-full"
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <button className="text-cobalt mt-7 flex items-center gap-2 text-xs font-semibold">
            See complete topic plan <ArrowRight className="size-3" />
          </button>
        </Panel>
      </div>
      <Panel className="p-5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="text-sage size-4" />
          <p className="font-semibold">Your latest coaching signal</p>
        </div>
        <p className="text-canvas mt-3 text-sm leading-6">
          Your solution was correct, but you started coding before naming the
          invariant. On the next graph problem, explain what each visited node
          guarantees before implementation.
        </p>
      </Panel>
    </div>
  );
}
