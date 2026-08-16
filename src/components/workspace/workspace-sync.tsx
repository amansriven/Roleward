"use client";

import { Cloud, CloudOff, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
  hydrateCloudWorkspace,
  scheduleCloudWorkspaceSave,
  WorkspaceSyncError,
  type WorkspaceSyncFailure,
} from "@/modules/workspace/cloud-sync";
import { workspaceUpdatedEvent } from "@/modules/workspace/repository";

export function WorkspaceSync() {
  const [state, setState] = useState<
    "loading" | "cloud" | WorkspaceSyncFailure
  >("loading");
  useEffect(() => {
    let active = true;
    void hydrateCloudWorkspace(localStorage)
      .then((mode) => active && setState(mode))
      .catch((error) => {
        if (!active) return;
        setState(
          error instanceof WorkspaceSyncError ? error.code : "storage_error",
        );
      });
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
            : state === "table_not_found"
              ? "DynamoDB table not found in the configured region"
              : state === "credentials"
                ? "AWS rejected the configured access key"
                : state === "access_denied"
                  ? "The IAM identity cannot access the workspace table"
                  : state === "storage_error"
                    ? "AWS workspace storage returned an unexpected error"
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
            : state === "table_not_found"
              ? "Table not found"
              : state === "credentials"
                ? "AWS key rejected"
                : state === "access_denied"
                  ? "AWS access denied"
                  : "Sync error"}
    </span>
  );
}
