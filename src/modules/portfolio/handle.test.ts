import { describe, expect, it } from "vitest";
import { deriveHandle, isUsableHandle, resolveHandle } from "./handle";

const free = () => false;

describe("deriveHandle", () => {
  it("turns a name into something a person can read back", () => {
    expect(deriveHandle("Jane Okonkwo")).toBe("jane-okonkwo");
  });

  it("folds accents rather than dropping the letters", () => {
    // Stripping them would produce "jos-lvarez", which is worse than nothing.
    expect(deriveHandle("José Álvarez")).toBe("jose-alvarez");
  });

  it("handles apostrophes and punctuation the way a name is written", () => {
    expect(deriveHandle("Siobhán O'Brien-Wu")).toBe("siobhan-obrien-wu");
    expect(deriveHandle("Dr. Amy Chen, PhD")).toBe("dr-amy-chen-phd");
  });

  it("never leaves a leading or trailing separator", () => {
    expect(deriveHandle("  Jane  ")).toBe("jane");
    expect(deriveHandle("--Jane--")).toBe("jane");
  });

  it("returns nothing for a name with no usable characters", () => {
    expect(deriveHandle("!!!")).toBe("");
    expect(deriveHandle("")).toBe("");
  });
});

describe("isUsableHandle", () => {
  it("rejects paths the app might want for itself", () => {
    expect(isUsableHandle("dashboard")).toBe(false);
    expect(isUsableHandle("api")).toBe(false);
  });
  it("rejects handles too short to be anyone's name", () => {
    expect(isUsableHandle("jo")).toBe(false);
  });
  it("accepts an ordinary name", () => {
    expect(isUsableHandle("jane-okonkwo")).toBe(true);
  });
});

describe("resolveHandle", () => {
  it("uses the plain name when it is free", () => {
    expect(resolveHandle("Jane Okonkwo", free)).toBe("jane-okonkwo");
  });

  it("counts up rather than appending random characters", () => {
    // This URL gets read aloud and pasted into applications.
    const taken = new Set(["jane-okonkwo", "jane-okonkwo-2"]);
    expect(resolveHandle("Jane Okonkwo", (h) => taken.has(h))).toBe(
      "jane-okonkwo-3",
    );
  });

  it("suffixes a reserved name instead of refusing it", () => {
    // Someone really can be called Dr. Support.
    expect(resolveHandle("support", free)).toBe("support-2");
  });

  it("lengthens a name too short to stand alone", () => {
    expect(resolveHandle("Jo", free)).toBe("jo-2");
  });

  it("gives up rather than looping forever when everything is taken", () => {
    expect(resolveHandle("Jane Okonkwo", () => true)).toBeNull();
  });

  it("returns null for a name that cannot make a handle", () => {
    expect(resolveHandle("!!!", free)).toBeNull();
  });
});
