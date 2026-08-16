import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  awsRegion,
  uploadBucket,
  uploadStorageConfigured,
} from "@/modules/aws/config";

export const runtime = "nodejs";
const requestSchema = z.object({
  fileName: z.string().trim().min(1).max(180),
  contentType: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "audio/mpeg",
    "audio/mp4",
    "audio/webm",
    "video/mp4",
    "video/webm",
  ]),
  size: z
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024),
  kind: z.enum(["resume", "recording"]),
});
const s3 = new S3Client({ region: awsRegion });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!uploadStorageConfigured)
    return NextResponse.json(
      { error: "Uploads are not configured" },
      { status: 503 },
    );
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  const safeName = parsed.data.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const objectKey = `private/${session.user.id}/${parsed.data.kind}/${randomUUID()}-${safeName}`;
  const command = new PutObjectCommand({
    Bucket: uploadBucket,
    Key: objectKey,
    ContentType: parsed.data.contentType,
    ContentLength: parsed.data.size,
    ServerSideEncryption: "AES256",
    Metadata: { owner: session.user.id, kind: parsed.data.kind },
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  return NextResponse.json({ uploadUrl, objectKey, expiresIn: 300 });
}
