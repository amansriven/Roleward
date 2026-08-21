import { describe, expect, it } from "vitest";
import { buildMoxieContext } from "./context";
import { emptyWorkspace } from "@/modules/workspace/repository";

describe("Moxie context broker", () => {
  it("builds a bounded cross-product context", () => {
    const context = JSON.parse(
      buildMoxieContext({
        workspace: emptyWorkspace,
        pathname: "/dashboard/zed",
        attempts: [],
      }),
    );
    expect(context.currentPage).toBe("/dashboard/zed");
    expect(context.activeApplication).toBeNull();
    expect(context.evidenceSummary).toEqual({ entries: 0, confirmedClaims: 0 });
    expect(context.zed).toEqual([]);
  });
});
