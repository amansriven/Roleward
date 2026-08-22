import Link from "next/link";
import type { ReactNode } from "react";
import {
  collectMoxieCitations,
  splitMoxieCitations,
} from "@/modules/moxie/citations";
import {
  collectMoxieProposals,
  stripMoxieProposals,
} from "@/modules/moxie/proposals";
import { MoxieProposals } from "@/components/moxie/moxie-proposals";
import {
  parseMoxieBlock,
  parseMoxieTable,
  type MoxieDraftBlock,
} from "@/modules/moxie/blocks";
import {
  MoxieCoachCard,
  MoxieComparisonTable,
  MoxiePlanCard,
} from "@/components/moxie/moxie-blocks";
import { MoxieDraftCard } from "@/components/moxie/moxie-draft-card";
import { MoxieStructuredResponse } from "@/components/moxie/moxie-structured-response";
import { parseMoxiePayload } from "@/modules/moxie/contract";

export function SourceChip({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      title={`Open ${label} in your workspace`}
      className="border-sage/25 bg-sage/[.07] text-sage hover:border-sage/50 hover:bg-sage/[.12] mx-0.5 inline-flex max-w-[16rem] shrink-0 items-center gap-1 truncate rounded-full border px-2 py-0.5 align-middle text-[10px] font-medium transition"
    >
      <span className="bg-sage/70 size-1 shrink-0 rounded-full" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function inlineText(text: string): ReactNode[] {
  return splitMoxieCitations(text).flatMap<ReactNode>(
    (segment, segmentIndex) => {
      if (segment.type === "citation")
        return [
          <SourceChip
            key={`chip-${segmentIndex}-${segment.citation.key}`}
            label={segment.citation.label}
            href={segment.citation.href}
          />,
        ];
      return inlineMarkup(segment.value, segmentIndex);
    },
  );
}

function inlineMarkup(text: string, scope: number): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code
          key={`${scope}-${index}`}
          className="border-iron bg-raised text-linen rounded-md border px-1.5 py-0.5 font-mono text-[.88em]"
        >
          {part.slice(1, -1)}
        </code>
      );
    if (part.startsWith("**") && part.endsWith("**"))
      return (
        <strong key={`${scope}-${index}`} className="text-linen font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    return part;
  });
}

export function MoxieResponse({
  content: raw,
  sourceMessageId,
  conversationId,
  onProposalSaved,
  onRevise,
}: {
  content: string;
  sourceMessageId?: string;
  conversationId?: string;
  onProposalSaved?: () => void;
  onRevise?: (draft: MoxieDraftBlock) => void;
}) {
  // Answers now arrive as the structured contract; markdown is the fallback for
  // conversations stored before it, and for anything that fails to parse.
  const payload = parseMoxiePayload(raw);
  if (payload)
    return (
      <MoxieStructuredResponse
        payload={payload}
        inline={(text) => inlineMarkup(text, 0)}
        chip={(label, href, key) => (
          <SourceChip key={key} label={label} href={href} />
        )}
        sourceMessageId={sourceMessageId}
        conversationId={conversationId}
        onProposalSaved={onProposalSaved}
        onRevise={onRevise}
      />
    );

  const proposals = collectMoxieProposals(raw);
  const content = proposals.length > 0 ? stripMoxieProposals(raw) : raw;
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index]?.trim() ?? "";
    if (!line) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index]?.trim().startsWith("```")) {
        code.push(lines[index] ?? "");
        index += 1;
      }
      index += 1;
      const parsedBlock = parseMoxieBlock(language, code.join("\n"));
      if (parsedBlock) {
        if (parsedBlock.kind === "plan")
          blocks.push(
            <MoxiePlanCard
              key={`plan-${index}`}
              block={parsedBlock}
              inline={inlineText}
            />,
          );
        else if (parsedBlock.kind === "coach")
          blocks.push(
            <MoxieCoachCard
              key={`coach-${index}`}
              block={parsedBlock}
              inline={inlineText}
            />,
          );
        else
          blocks.push(
            <MoxieDraftCard
              key={`draft-${index}`}
              block={parsedBlock}
              onRevise={onRevise}
            />,
          );
        continue;
      }
      blocks.push(
        <div key={`code-${index}`} className="my-5 overflow-hidden rounded-xl">
          {language && (
            <div className="border-iron bg-raised text-dust border-b px-4 py-2 font-mono text-[9px] tracking-wider uppercase">
              {language}
            </div>
          )}
          <pre className="overflow-x-auto bg-black/25 p-4 text-xs leading-6">
            <code>{code.join("\n")}</code>
          </pre>
        </div>,
      );
      continue;
    }

    const parsedTable = parseMoxieTable(lines, index);
    if (parsedTable) {
      blocks.push(
        <MoxieComparisonTable
          key={`table-${index}`}
          table={parsedTable.table}
          inline={inlineText}
        />,
      );
      index = parsedTable.next;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push(
        <h3
          key={`heading-${index}`}
          className="text-linen mt-7 mb-2 text-base font-semibold tracking-[-.02em] first:mt-0"
        >
          {inlineText(heading[2] ?? "")}
        </h3>,
      );
      index += 1;
      continue;
    }

    const listMatch = line.match(/^(?:[-*]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const ordered = /^\d+\./.test(line);
      const items: string[] = [];
      while (index < lines.length) {
        const candidate = lines[index]?.trim() ?? "";
        const match = candidate.match(
          ordered ? /^\d+\.\s+(.+)$/ : /^(?:[-*])\s+(.+)$/,
        );
        if (!match) break;
        items.push(match[1] ?? "");
        index += 1;
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List
          key={`list-${index}`}
          className={
            ordered
              ? "my-3 list-decimal space-y-2 pl-5"
              : "my-3 list-disc space-y-2 pl-5"
          }
        >
          {items.map((item, itemIndex) => (
            <li key={itemIndex} className="marker:text-amber/80 pl-1">
              {inlineText(item)}
            </li>
          ))}
        </List>,
      );
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (index < lines.length) {
      const candidate = lines[index]?.trim() ?? "";
      if (
        !candidate ||
        candidate.startsWith("```") ||
        /^(#{1,3})\s+/.test(candidate) ||
        /^(?:[-*]|\d+\.)\s+/.test(candidate) ||
        parseMoxieTable(lines, index)
      )
        break;
      paragraph.push(candidate);
      index += 1;
    }
    blocks.push(
      <p
        key={`paragraph-${index}`}
        className="my-3 leading-7 first:mt-0 last:mb-0"
      >
        {inlineText(paragraph.join(" "))}
      </p>,
    );
  }

  const citations = collectMoxieCitations(content);

  return (
    <div className="text-canvas text-[13px] sm:text-sm">
      {blocks}
      {proposals.length > 0 && (
        <MoxieProposals
          proposals={proposals}
          sourceMessageId={sourceMessageId}
          conversationId={conversationId}
          onSaved={onProposalSaved}
        />
      )}
      {citations.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="text-dust mr-1 font-mono text-[9px] tracking-wider uppercase">
            Grounded in
          </span>
          {citations.map((citation) => (
            <SourceChip
              key={citation.key}
              label={citation.label}
              href={citation.href}
            />
          ))}
        </div>
      )}
    </div>
  );
}
