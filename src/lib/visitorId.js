const VISITOR_STORAGE_KEY = "nettosim_visitor_id";

function randomChunk() {
  return Math.random().toString(36).slice(2, 10);
}

export function createVisitorId() {
  return `v_${randomChunk()}${randomChunk()}`;
}

export function getOrCreateVisitorId() {
  if (typeof window === "undefined") return null;
  try {
    const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY);
    if (existing && /^v_[a-zA-Z0-9_-]{8,72}$/.test(existing)) {
      return existing;
    }
    const created = createVisitorId();
    window.localStorage.setItem(VISITOR_STORAGE_KEY, created);
    return created;
  } catch {
    return createVisitorId();
  }
}
