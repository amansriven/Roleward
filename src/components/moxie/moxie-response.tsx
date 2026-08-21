import type { ReactNode } from "react";

function inlineText(text: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code
          key={index}
          className="border-iron bg-raised text-linen rounded-md border px-1.5 py-0.5 font-mono text-[.88em]"
        >
          {part.slice(1, -1)}
        </code>
      );
    if (part.startsWith("**") && part.endsWith("**"))
      return (
        <strong key={index} className="text-linen font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    return part;
  });
}

export function MoxieResponse({ content }: { content: string }) {
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
        /^(?:[-*]|\d+\.)\s+/.test(candidate)
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

  return <div className="text-canvas text-[13px] sm:text-sm">{blocks}</div>;
}
