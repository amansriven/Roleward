import { describe, expect, it } from "vitest";
import {
  isMoxiePayload,
  moxieHistoryText,
  moxiePayloadSchema,
  moxiePlainText,
  parseMoxiePayload,
} from "./contract";

const payload = {
  blocks: [
    {
      type: "paragraph",
      text: "Your gap is depth.",
      citations: ["Active application"],
      ordered: null,
      items: null,
      language: null,
      code: null,
      title: null,
      steps: null,
      observation: null,
      evidence: null,
      drill: null,
      headers: null,
      rows: null,
      label: null,
      target: null,
      bulletId: null,
    },
  ],
  proposals: [],
};

describe("Moxie response contract", () => {
  it("accepts a well-formed payload", () => {
    expect(moxiePayloadSchema.safeParse(payload).success).toBe(true);
  });

  it("recognises contract JSON and leaves markdown alone", () => {
    expect(isMoxiePayload(JSON.stringify(payload))).toBe(true);
    expect(isMoxiePayload("## Heading\n\nSome prose")).toBe(false);
    expect(parseMoxiePayload("## Heading")).toBeNull();
  });

  it("returns null for malformed JSON rather than throwing", () => {
    expect(parseMoxiePayload('{"blocks": [')).toBeNull();
    expect(parseMoxiePayload('{"blocks": "nope"}')).toBeNull();
  });

  it("flattens blocks back to prose for replayed history", () => {
    const text = moxiePlainText(
      moxiePayloadSchema.parse({
        blocks: [
          { ...payload.blocks[0], type: "heading", text: "Where your gap is" },
          {
            ...payload.blocks[0],
            type: "list",
            ordered: true,
            items: [{ text: "Drills", citations: [] }],
            text: null,
          },
          {
            ...payload.blocks[0],
            type: "coach",
            text: null,
            observation: "Rushed",
            evidence: "162 wpm",
          },
        ],
        proposals: [],
      }),
    );
    expect(text).toBe(
      "## Where your gap is\n\n1. Drills\n\nObservation: Rushed\nEvidence: 162 wpm",
    );
  });

  it("passes legacy markdown through history untouched", () => {
    expect(moxieHistoryText("plain answer")).toBe("plain answer");
    expect(moxieHistoryText(JSON.stringify(payload))).toBe(
      "Your gap is depth.",
    );
  });
});
