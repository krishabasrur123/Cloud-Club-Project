const API_BASE = "";

export function getToken() {
  return localStorage.getItem("token");
}
export function setSession({ token, user }) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}
export function getUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}
export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

async function request(path, { method = "GET", body } = {}) {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) throw new Error(typeof data === "string" ? data : (data?.message || "Request failed"));
  return data;
}

export const api = {
  login: ({ email, password }) =>
    request("/api/users/login", { method: "POST", body: { email, password } }),
  register: ({ name, email, password }) =>
    request("/api/users/register", { method: "POST", body: { name, email, password } }),
  getTasks: () => request("/api/tasks"),
  createTask: (payload) => request("/api/tasks", { method: "POST", body: payload }),
};