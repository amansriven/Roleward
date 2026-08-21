"use client";

export async function uploadPrivateFile(
  file: File,
  kind: "resume" | "recording",
) {
  const response = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      size: file.size,
      kind,
    }),
  });
  if (response.status === 503) return null;
  if (response.status === 401)
    throw new Error("Your session expired. Log in again before uploading.");
  if (!response.ok)
    throw new Error("Roleward could not prepare a secure upload URL.");
  const result = (await response.json()) as {
    uploadUrl: string;
    objectKey: string;
  };
  let upload: Response;
  try {
    upload = await fetch(result.uploadUrl, {
      method: "PUT",
      headers: { "content-type": file.type },
      body: file,
    });
  } catch {
    throw new Error(
      "The browser could not reach S3. Check the bucket CORS origins and allowed headers.",
    );
  }
  if (upload.status === 403)
    throw new Error(
      "S3 rejected the signed upload. Check that the IAM policy update is active and retry.",
    );
  if (upload.status === 404)
    throw new Error(
      "The configured S3 bucket was not found in the selected region.",
    );
  if (!upload.ok)
    throw new Error(`S3 rejected the upload with status ${upload.status}.`);
  return result.objectKey;
}
