import { Compass } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-5 py-16">
      <div className="surface w-full max-w-md rounded-2xl p-8 text-center">
        <div className="border-iron bg-raised mx-auto flex size-11 items-center justify-center rounded-full border">
          <Compass className="text-amber size-5" />
        </div>
        <h1 className="text-linen mt-5 text-xl font-semibold tracking-[-0.03em]">
          That page does not exist
        </h1>
        <p className="text-canvas mt-2 text-sm leading-6">
          The link may be out of date, or the page may have moved.
        </p>
        <div className="mt-6 grid gap-3">
          <Button asChild>
            <Link href="/">Back to Roleward</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/how-it-works">See how it works</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
