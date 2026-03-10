/**
 * LocalStorage helpers for user, profile, moments, saved scenario.
 */
const USER_KEY = "nettosim_user";
const PROFILE_KEY = (id) => `nettosim_profile_${id}`;
const MOMENTS_KEY = (id) => `nettosim_moments_${id}`;
const SAVED_SCENARIO_KEY = (id) => `nettosim_saved_${id}`;

export function loadUser() {
  try {
    const s = localStorage.getItem(USER_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export function saveUser(u) {
  try {
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  } catch {}
}

export function loadMoments(id) {
  try {
    const s = localStorage.getItem(MOMENTS_KEY(id));
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

export function saveMoments(id, m) {
  try {
    localStorage.setItem(MOMENTS_KEY(id), JSON.stringify(m));
  } catch {}
}

export function loadSavedScenario(id) {
  try {
    const s = localStorage.getItem(SAVED_SCENARIO_KEY(id));
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export function saveSavedScenario(id, data) {
  try {
    localStorage.setItem(SAVED_SCENARIO_KEY(id), JSON.stringify(data));
  } catch {}
}

export function loadProfile(id) {
  try {
    const s = localStorage.getItem(PROFILE_KEY(id));
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

export function saveProfile(id, data) {
  try {
    localStorage.setItem(PROFILE_KEY(id), JSON.stringify(data));
  } catch {}
}
