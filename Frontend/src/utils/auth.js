const TOKEN_KEY = "token";
const LEGACY_TOKEN_KEY = "jwtToken";
const ROLE_KEY = "userRole";

const parseTokenPayload = (token) => {
  if (!token || typeof token !== "string") {
    return null;
  }

  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }
    const jsonStr = decodeURIComponent(
      Array.prototype.map
        .call(atob(base64), (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonStr);
  } catch (e) {
    try {
      const parts = token.split(".");
      let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4 !== 0) {
        base64 += "=";
      }
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
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
