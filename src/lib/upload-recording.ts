/**
 * Browser-side: save one recorded answer. Uses a direct upload to cloud storage when the server offers one
 * (needed on Vercel, where requests are limited to 4.5 MB), otherwise posts the file to the server.
 */
export async function uploadRecording(sessionId: string, wav: Blob, attempt: number, questionIndex: number): Promise<{ transcriptionError: string | null }> {
  const target = await fetch(`/api/speaking/sessions/${sessionId}/upload-url`, { method: "POST" })
    .then((r) => (r.ok ? r.json() : { mode: "server" }))
    .catch(() => ({ mode: "server" }));

  let res: Response;
  if (target.mode === "direct") {
    const put = await fetch(target.uploadUrl, { method: "PUT", headers: { "Content-Type": "audio/wav", "x-upsert": "true" }, body: wav });
    if (!put.ok) throw new Error("Upload failed. Please check your connection and try again.");
    res = await fetch(`/api/speaking/sessions/${sessionId}/recordings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: target.key, attempt, questionIndex }),
    });
  } else {
    const form = new FormData();
    form.append("audio", wav, "answer.wav");
    form.append("attempt", String(attempt));
    form.append("questionIndex", String(questionIndex));
    res = await fetch(`/api/speaking/sessions/${sessionId}/recordings`, { method: "POST", body: form });
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Upload failed.");
  return { transcriptionError: body.transcriptionError ?? null };
}
