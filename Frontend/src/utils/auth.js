const TOKEN_KEY = "token";
const LEGACY_TOKEN_KEY = "jwtToken";
const ROLE_KEY = "userRole";

const parseTokenPayload = (token) => {
  if (!token) {
    return null;
  }

  try {
    const base64Payload = token.split(".")[1];
    return JSON.parse(atob(base64Payload));
  } catch {
    return null;
  }
};

export const getRole = () => {
  const storedRole = localStorage.getItem(ROLE_KEY);
  if (storedRole) {
    return storedRole;
  }

  const token =
    localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
  if (!token) {
    return null;
  }

  const payload = parseTokenPayload(token);
  if (!payload) {
    return null;
  }

  const roleClaim = payload.role || payload.roles || payload.authorities;
  let role = null;

  if (Array.isArray(roleClaim)) {
    if (roleClaim.includes("ROLE_ADMIN") || roleClaim.includes("ADMIN")) {
      role = "ADMIN";
    } else if (roleClaim.includes("ROLE_USER") || roleClaim.includes("USER")) {
      role = "USER";
    }
  }

  if (typeof roleClaim === "string") {
    if (roleClaim.includes("ADMIN")) {
      role = "ADMIN";
    } else if (roleClaim.includes("USER")) {
      role = "USER";
    }
  }

  if (role) {
    localStorage.setItem(ROLE_KEY, role);
  }

  return role;
};

export const saveAuthState = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.removeItem(LEGACY_TOKEN_KEY);

  const payload = parseTokenPayload(token);
  const role = payload?.role;
  if (role) {
    localStorage.setItem(ROLE_KEY, String(role).toUpperCase());
  }
};

export const getToken = () => {
  return (
    localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY)
  );
};

export const isAuthenticated = () => {
  return !!(
    localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY)
  );
};

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
};
