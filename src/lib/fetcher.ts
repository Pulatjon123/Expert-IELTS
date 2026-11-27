export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

/** Client-side JSON fetch that throws ApiError with the server's message. */
export async function api<T = unknown>(path: string, init?: RequestInit & { body?: BodyInit | null; json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(path, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...(rest.headers ?? {}) } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    let message: string = data.error ?? `Request failed (${res.status})`;
    if (data.issues?.length) message += " " + data.issues.map((i: { path: string[]; message: string }) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new ApiError(res.status, message, data.code);
  }
  return data as T;
}
