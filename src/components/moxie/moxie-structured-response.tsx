"use client";

import type { ReactNode } from "react";
import {
  MoxieCoachCard,
  MoxieComparisonTable,
  MoxiePlanCard,
} from "@/components/moxie/moxie-blocks";
import { MoxieDraftCard } from "@/components/moxie/moxie-draft-card";
import { MoxieProposals } from "@/components/moxie/moxie-proposals";
import type { MoxieDraftBlock } from "@/modules/moxie/blocks";
import { resolveMoxieCitation } from "@/modules/moxie/citations";
import type {
  MoxieWireBlock,
  MoxieWirePayload,
} from "@/modules/moxie/contract";
import type { MoxieProposal } from "@/modules/moxie/proposals";

/** Chips for the sources a block declared, deduped within that block. */
function Citations({
  labels,
  chip,
}: {
  labels: string[];
  chip: (label: string, href: string, key: string) => ReactNode;
}) {
  const seen = new Map<string, { label: string; href: string }>();
  for (const raw of labels) {
    const citation = resolveMoxieCitation(raw);
    if (!seen.has(citation.key)) seen.set(citation.key, citation);
  }
  if (seen.size === 0) return null;
  return (
    <>
      {[...seen.entries()].map(([key, citation]) =>
        chip(citation.label, citation.href, key),
      )}
    </>
  );
}

function toProposals(payload: MoxieWirePayload): MoxieProposal[] {
  return payload.proposals.flatMap<MoxieProposal>((proposal) =>
    proposal.kind === "memory"
      ? [
          {
            kind: "memory",
            category: proposal.category ?? "background",
            statement: proposal.statement,
          },
        ]
      : [
          {
            kind: "goal",
            statement: proposal.statement,
            ...(proposal.targetDate ? { targetDate: proposal.targetDate } : {}),
          },
        ],
  );
}

function draftFrom(block: MoxieWireBlock): MoxieDraftBlock {
  return {
    kind: "draft",
    label: block.label ?? "Draft",
    text: block.text ?? "",
    ...(block.target ? { target: block.target } : {}),
    ...(block.bulletId ? { bulletId: block.bulletId } : {}),
  };
}

export function MoxieStructuredResponse({
  payload,
  inline,
  chip,
  sourceMessageId,
  conversationId,
  onProposalSaved,
  onRevise,
}: {
  payload: MoxieWirePayload;
  inline: (text: string) => ReactNode[];
  chip: (label: string, href: string, key: string) => ReactNode;
  sourceMessageId?: string;
  conversationId?: string;
  onProposalSaved?: () => void;
  onRevise?: (draft: MoxieDraftBlock) => void;
}) {
  const proposals = toProposals(payload);

  return (
    <div className="text-canvas text-[13px] sm:text-sm">
      {payload.blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        switch (block.type) {
          case "heading":
            return (
              <h3
                key={key}
                className="text-linen mt-7 mb-2 text-base font-semibold tracking-[-.02em] first:mt-0"
              >
                {inline(block.text ?? "")}
              </h3>
            );
          case "list": {
            const List = block.ordered ? "ol" : "ul";
            return (
              <List
                key={key}
                className={
                  block.ordered
                    ? "my-3 list-decimal space-y-2 pl-5"
                    : "my-3 list-disc space-y-2 pl-5"
                }
              >
                {(block.items ?? []).map((item, itemIndex) => (
                  <li key={itemIndex} className="marker:text-amber/80 pl-1">
                    {inline(item.text)}
                    <Citations labels={item.citations} chip={chip} />
                  </li>
                ))}
              </List>
            );
          }
          case "code":
            return (
              <div key={key} className="my-5 overflow-hidden rounded-xl">
                {block.language && (
                  <div className="border-iron bg-raised text-dust border-b px-4 py-2 font-mono text-[9px] tracking-wider uppercase">
                    {block.language}
                  </div>
                )}
                <pre className="overflow-x-auto bg-black/25 p-4 text-xs leading-6">
                  <code>{block.code ?? ""}</code>
                </pre>
              </div>
            );
          case "plan":
            return (
              <MoxiePlanCard
                key={key}
                inline={inline}
                block={{
                  kind: "plan",
                  ...(block.title ? { title: block.title } : {}),
                  steps: (block.steps ?? []).map((step) => ({
                    text: step.text,
                    ...(step.date ? { date: step.date } : {}),
                  })),
                }}
              />
            );
          case "coach":
            return (
              <MoxieCoachCard
                key={key}
                inline={inline}
                block={{
                  kind: "coach",
                  observation: block.observation ?? "",
                  ...(block.evidence ? { evidence: block.evidence } : {}),
                  ...(block.drill ? { drill: block.drill } : {}),
                }}
              />
            );
          case "table":
            return (
              <MoxieComparisonTable
                key={key}
                inline={inline}
                table={{
                  headers: block.headers ?? [],
                  rows: (block.rows ?? []).map((row) => row.cells),
                }}
              />
            );
          case "draft":
            return (
              <MoxieDraftCard
                key={key}
                block={draftFrom(block)}
                onRevise={onRevise}
              />
            );
          default:
            return (
              <p key={key} className="my-3 leading-7 first:mt-0 last:mb-0">
                {inline(block.text ?? "")}
                <Citations labels={block.citations} chip={chip} />
              </p>
            );
        }
      })}

      {proposals.length > 0 && (
        <MoxieProposals
          proposals={proposals}
          sourceMessageId={sourceMessageId}
          conversationId={conversationId}
          onSaved={onProposalSaved}
        />
      )}
    </div>
  );
}
