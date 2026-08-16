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
  if (!response.ok) throw new Error("Unable to prepare the private upload");
  const result = (await response.json()) as {
    uploadUrl: string;
    objectKey: string;
  };
  const upload = await fetch(result.uploadUrl, {
    method: "PUT",
    headers: { "content-type": file.type },
    body: file,
  });
  if (!upload.ok) throw new Error("Unable to upload the private file");
  return result.objectKey;
}
