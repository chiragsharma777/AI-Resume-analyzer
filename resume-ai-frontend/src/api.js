const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://ai-resume-analyzer-2-16d4.onrender.com";


// =========================================================
// AUTH TOKEN
// =========================================================

export function getToken() {
  return localStorage.getItem("access_token");
}

export function getTokenType() {
  return "Bearer";
}


// =========================================================
// CLEAR AUTH
// =========================================================

export function clearAuth() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("token_type");
  localStorage.removeItem("user");
}


// =========================================================
// API ERROR FORMATTER
// =========================================================

export function formatApiError(
  detail,
  fallback = "Request failed."
) {
  if (!detail) {
    return fallback;
  }

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map(
        (item) =>
          item?.msg ||
          item?.detail ||
          JSON.stringify(item)
      )
      .join(" ");
  }

  if (typeof detail === "object") {
    return (
      detail.message ||
      detail.detail ||
      JSON.stringify(detail)
    );
  }

  return fallback;
}


// =========================================================
// NETWORK ERROR
// =========================================================

export function networkErrorMessage(error) {
  const message = String(
    error?.message || error || ""
  );

  const lowerMessage =
    message.toLowerCase();

  if (
    lowerMessage.includes("failed to fetch") ||
    lowerMessage.includes("networkerror") ||
    lowerMessage.includes(
      "network request failed"
    ) ||
    error?.name === "TypeError"
  ) {
    return (
      "Cannot reach the API server. Please check your internet connection or try again."
    );
  }

  return (
    message ||
    "Something went wrong."
  );
}


// =========================================================
// API REQUEST
// =========================================================

export async function apiRequest(
  endpoint,
  options = {}
) {
  const token = getToken();

  // -------------------------------------------------------
  // Build headers
  // -------------------------------------------------------

  const headers = new Headers(
    options.headers || {}
  );

  // -------------------------------------------------------
  // ALWAYS attach JWT when available
  // -------------------------------------------------------

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`
    );
  }

  // -------------------------------------------------------
  // Add JSON content type only when a body exists
  // and it is not FormData.
  // -------------------------------------------------------

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  // -------------------------------------------------------
  // Debug information
  // -------------------------------------------------------

  console.log(
    `[API] ${options.method || "GET"} ${API_BASE_URL}${endpoint}`
  );

  console.log(
    "[API] Token available:",
    Boolean(token)
  );

  console.log(
    "[API] Authorization header:",
    token
      ? "Bearer ********"
      : "MISSING"
  );

  // -------------------------------------------------------
  // Request
  // -------------------------------------------------------

  let response;

  try {
    response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        ...options,
        headers,
      }
    );
  } catch (error) {
    throw new Error(
      networkErrorMessage(error)
    );
  }

  // -------------------------------------------------------
  // Parse response
  // -------------------------------------------------------

  let data = null;

  try {
    const contentType =
      response.headers.get(
        "content-type"
      ) || "";

    if (
      contentType.includes(
        "application/json"
      )
    ) {
      data = await response.json();
    } else {
      const text =
        await response.text();

      data = text || null;
    }
  } catch {
    data = null;
  }

  // -------------------------------------------------------
  // Unauthorized
  // -------------------------------------------------------

  if (response.status === 401) {
    console.error(
      "[API] 401 Unauthorized:",
      data
    );

    clearAuth();

    throw new Error(
      formatApiError(
        data?.detail,
        "Your session has expired. Please login again."
      )
    );
  }

  // -------------------------------------------------------
  // Other errors
  // -------------------------------------------------------

  if (!response.ok) {
    throw new Error(
      formatApiError(
        data?.detail ||
          data?.message,
        `Request failed with status ${response.status}.`
      )
    );
  }

  // -------------------------------------------------------
  // Success
  // -------------------------------------------------------

  return data;
}


// =========================================================
// EXPORT
// =========================================================

export { API_BASE_URL };
