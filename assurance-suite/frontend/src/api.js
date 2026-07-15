const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = j.error || msg; } catch (e) { /* not json */ }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Top-level module CRUD
  list: (mod) => req(`/${mod}`),
  get: (mod, id) => req(`/${mod}/${id}`),
  create: (mod, body) => req(`/${mod}`, { method: "POST", body: JSON.stringify(body) }),
  update: (mod, id, body) => req(`/${mod}/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (mod, id) => req(`/${mod}/${id}`, { method: "DELETE" }),

  // Nested sub-resources, addressed by explicit path (kept generic on purpose)
  post: (path, body) => req(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: (path, body) => req(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path) => req(path, { method: "DELETE" }),
  getPath: (path) => req(path),

  activity: () => req("/activity"),
  dashboard: () => req("/dashboard"),
};
