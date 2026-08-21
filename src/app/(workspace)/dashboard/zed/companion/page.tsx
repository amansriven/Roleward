import { LeetCodeCompanion } from "@/components/zed/practice-modes";

export default function LeetCodeCompanionPage() {
  return (
    <main className="min-w-0">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-label">Companion workspace</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">
            Solve on LeetCode. Think with Zed.
          </h2>
          <p className="text-dust mt-2 max-w-3xl text-sm leading-6">
            A spacious, guided conversation for working through any LeetCode
            problem without giving away the answer too early.
          </p>
        </div>
        <span className="border-iron bg-raised text-dust hidden rounded-full border px-3 py-1.5 font-mono text-[10px] sm:inline-flex">
          Full-width coaching
        </span>
      </div>
      <LeetCodeCompanion />
    </main>
  );
}
