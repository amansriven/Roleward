import { CircleDot, Dumbbell, Gauge, ListChecks } from "lucide-react";
import type { ReactNode } from "react";
import type {
  MoxieCoachBlock,
  MoxiePlanBlock,
  MoxieTable,
} from "@/modules/moxie/blocks";

export function MoxiePlanCard({
  block,
  inline,
}: {
  block: MoxiePlanBlock;
  inline: (text: string) => ReactNode[];
}) {
  return (
    <section className="border-iron/80 bg-linen/[.02] my-5 rounded-2xl border p-4">
      <header className="text-dust flex items-center gap-2 font-mono text-[9px] tracking-wider uppercase">
        <ListChecks className="text-amber size-3.5" />
        {block.title ?? "Plan"}
      </header>
      <ol className="mt-3 space-y-2.5">
        {block.steps.map((step, index) => (
          <li key={`${index}-${step.text}`} className="flex gap-3">
            <span className="border-iron text-dust mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border font-mono text-[9px]">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-canvas text-[13px] leading-6">
                {inline(step.text)}
              </p>
              {step.date && (
                <span className="text-amber/80 mt-0.5 block font-mono text-[9px]">
                  {step.date}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function MoxieCoachCard({
  block,
  inline,
}: {
  block: MoxieCoachBlock;
  inline: (text: string) => ReactNode[];
}) {
  return (
    <section className="border-iron/80 bg-linen/[.02] my-5 space-y-3 rounded-2xl border p-4">
      <div className="flex gap-2.5">
        <CircleDot className="text-amber mt-0.5 size-3.5 shrink-0" />
        <div className="min-w-0">
          <span className="text-dust block font-mono text-[9px] tracking-wider uppercase">
            Observation
          </span>
          <p className="text-linen mt-1 text-[13px] leading-6">
            {inline(block.observation)}
          </p>
        </div>
      </div>
      {/* The spec keeps the measurement visually separate from the reading. */}
      {block.evidence && (
        <div className="flex gap-2.5">
          <Gauge className="text-sage mt-0.5 size-3.5 shrink-0" />
          <div className="min-w-0">
            <span className="text-dust block font-mono text-[9px] tracking-wider uppercase">
              Measured
            </span>
            <p className="text-canvas mt-1 text-[13px] leading-6">
              {inline(block.evidence)}
            </p>
          </div>
        </div>
      )}
      {block.drill && (
        <div className="flex gap-2.5">
          <Dumbbell className="text-canvas mt-0.5 size-3.5 shrink-0" />
          <div className="min-w-0">
            <span className="text-dust block font-mono text-[9px] tracking-wider uppercase">
              Next drill
            </span>
            <p className="text-canvas mt-1 text-[13px] leading-6">
              {inline(block.drill)}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

export function MoxieComparisonTable({
  table,
  inline,
}: {
  table: MoxieTable;
  inline: (text: string) => ReactNode[];
}) {
  return (
    <div className="border-iron/80 my-5 overflow-x-auto rounded-xl border">
      <table className="w-full border-collapse text-left text-[12px]">
        <thead>
          <tr className="border-iron/80 bg-raised/60 border-b">
            {table.headers.map((header, index) => (
              <th
                key={`${index}-${header}`}
                scope="col"
                className="text-dust px-3 py-2 font-mono text-[9px] font-medium tracking-wider whitespace-nowrap uppercase"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-iron/50 text-canvas border-b last:border-0"
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={
                    cellIndex === 0
                      ? "text-linen px-3 py-2.5 align-top font-medium"
                      : "px-3 py-2.5 align-top leading-6"
                  }
                >
                  {inline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
