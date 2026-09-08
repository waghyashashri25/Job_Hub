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
  const token =
    localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
  
  if (token) {
    const payload = parseTokenPayload(token);
    if (payload) {
      const roleClaim = payload.role || payload.roles || payload.authorities;
      let role = null;

      if (Array.isArray(roleClaim)) {
        if (roleClaim.some((r) => String(r).toUpperCase().includes("ADMIN"))) {
          role = "ADMIN";
        } else if (roleClaim.some((r) => String(r).toUpperCase().includes("RECRUITER"))) {
          role = "RECRUITER";
        } else if (roleClaim.some((r) => String(r).toUpperCase().includes("USER"))) {
          role = "USER";
        }
      } else if (typeof roleClaim === "string") {
        const upper = roleClaim.toUpperCase();
        if (upper.includes("ADMIN")) {
          role = "ADMIN";
        } else if (upper.includes("RECRUITER")) {
          role = "RECRUITER";
        } else if (upper.includes("USER")) {
          role = "USER";
        }
      }

      if (role) {
        localStorage.setItem(ROLE_KEY, role);
        return role;
      }
    }
  }

  return localStorage.getItem(ROLE_KEY) || null;
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

export const getUserEmail = () => {
  const token =
    localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
  if (!token) return null;
  const payload = parseTokenPayload(token);
  return payload?.sub || payload?.email || payload?.username || null;
};

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
};
