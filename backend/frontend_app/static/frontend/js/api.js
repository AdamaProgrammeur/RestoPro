(() => {
  const csrfToken = () => document.cookie.split("; ")
    .find((cookie) => cookie.startsWith("csrftoken="))?.split("=").slice(1).join("=");

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
      options.body = JSON.stringify(options.body);
    }
    const method = (options.method || "GET").toUpperCase();
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      const token = csrfToken();
      if (token) headers.set("X-CSRFToken", decodeURIComponent(token));
    }
    const url = path.startsWith("/api/") ? path : `/api/${path.replace(/^\/+/, "")}`;
    const response = await fetch(url, {
      ...options, method, headers, credentials: "same-origin",
    });
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(formatError(payload) || `Erreur API (${response.status})`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  function formatError(payload) {
    if (!payload) return "";
    if (typeof payload === "string") return payload;
    if (payload.detail) return payload.detail;
    return Object.entries(payload).map(([key, value]) => {
      const message = Array.isArray(value) ? value.join(" ") : typeof value === "object" ? formatError(value) : value;
      return `${key}: ${message}`;
    }).join(" · ");
  }

  window.RestoProAPI = { request, formatError };
})();
