// One small function per server route. Each sends JSON and turns server errors into
// a friendly message, plus the name of the field it belongs to.

export class ApiError extends Error {
  constructor(message, field) {
    super(message);
    this.field = field;
  }
}

async function request(method, path, body) {
  let response;
  try {
    response = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach Smart's server. Is it running?");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.error || "Something went wrong. Try again.", data.field);
  }
  return data;
}

export const getState = () => request("GET", "/api/state");
export const saveEmail = (email) => request("PUT", "/api/settings", { email });
export const saveCard = (card) => request("POST", "/api/cards", card);
export const saveSubscription = (sub) => request("POST", "/api/subscriptions", sub);
