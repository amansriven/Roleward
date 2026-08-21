import type { Metadata } from "next";
import { MoxieWorkspace } from "@/components/moxie/moxie-workspace";

export const metadata: Metadata = { title: "Moxie" };
export default function MoxiePage() {
  return <MoxieWorkspace />;
}
