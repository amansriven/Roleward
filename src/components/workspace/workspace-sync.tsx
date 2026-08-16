"use client";

import { Cloud, CloudOff, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
  hydrateCloudWorkspace,
  scheduleCloudWorkspaceSave,
} from "@/modules/workspace/cloud-sync";
import { workspaceUpdatedEvent } from "@/modules/workspace/repository";

export function WorkspaceSync() {
  const [state, setState] = useState<
    "loading" | "cloud" | "unconfigured" | "error"
  >("loading");
  useEffect(() => {
    let active = true;
    void hydrateCloudWorkspace(localStorage)
      .then((mode) => active && setState(mode))
      .catch(() => active && setState("error"));
    const save = (event: Event) => {
      if ((event as CustomEvent).detail?.source === "cloud") return;
      scheduleCloudWorkspaceSave(localStorage);
    };
    window.addEventListener(workspaceUpdatedEvent, save);
    return () => {
      active = false;
      window.removeEventListener(workspaceUpdatedEvent, save);
    };
  }, []);
  return (
    <span
      className="text-dust flex items-center gap-1.5 text-[10px]"
      title={
        state === "cloud"
          ? "Workspace synced to AWS"
          : state === "unconfigured"
            ? "AWS workspace variables are missing from this deployment"
            : state === "error"
              ? "AWS workspace request failed; check the table, region, and IAM permissions"
              : "Opening cloud workspace"
      }
    >
      {state === "loading" ? (
        <LoaderCircle className="size-3 animate-spin" />
      ) : state === "cloud" ? (
        <Cloud className="text-sage size-3" />
      ) : (
        <CloudOff className="size-3" />
      )}
      {state === "loading"
        ? "Syncing"
        : state === "cloud"
          ? "Synced"
          : state === "unconfigured"
            ? "AWS setup needed"
            : "Sync error"}
    </span>
  );
}
