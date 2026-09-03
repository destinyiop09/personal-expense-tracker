/**
 * api.js - FastAPI-only API client for FinPulse.
 *
 * All application data comes from the backend/database.
 * There is no local transaction, category, or authentication fallback.
 */

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

function getApiBaseUrl() {
  return (
    localStorage.getItem("expense_tracker_api_url") ||
    DEFAULT_API_BASE_URL
  );
}

function setApiBaseUrl(newUrl) {
  if (!newUrl) return;
  localStorage.setItem(
    "expense_tracker_api_url",
    newUrl.trim().replace(/\/+$/, "")
  );
}

function getAuthToken() {
  return localStorage.getItem("token") || "";
}

function setAuthToken(token) {
  if (token) {
    localStorage.setItem("token", token);
  } else {
    localStorage.removeItem("token");
  }
}

function clearAuthSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user_email");
  localStorage.removeItem("user_name");
}

function updateApiStatusBadge(text, color) {
  const badge = document.getElementById("apiStatusBadge");
  if (!badge) return;

  badge.textContent = `Status: ${text}`;
  if (color) badge.style.color = color;
}

async function apiRequest(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${getApiBaseUrl()}${cleanEndpoint}`;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    let payload = null;
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      try {
        payload = await response.json();
      } catch (_) {
        payload = null;
      }
    }

    if (response.status === 401) {
      const error = new Error(
        payload?.detail || "Your session is invalid or has expired. Please sign in again."
      );
      error.status = 401;
      throw error;
    }

    if (!response.ok) {
      let message = payload?.detail || `Request failed with status ${response.status}.`;

      if (Array.isArray(payload?.detail)) {
        message = payload.detail
          .map(item => item.msg || "Validation error")
          .join(", ");
      }

      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    updateApiStatusBadge("Connected (FastAPI)", "var(--income)");
    return payload;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.status === 401) {
      throw error;
    }

    updateApiStatusBadge("Backend unavailable", "var(--text-muted)");

    if (error.name === "AbortError") {
      const timeoutError = new Error(
        "The backend request timed out. Please make sure FastAPI is running."
      );
      timeoutError.status = 0;
      throw timeoutError;
    }

    if (error instanceof TypeError) {
      const networkError = new Error(
        "Could not connect to the FastAPI backend. Check the API URL and make sure the server is running."
      );
      networkError.status = 0;
      throw networkError;
    }

    throw error;
  }
}

function showAlert(elementId, message, type = "error") {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.className = `alert alert-${type} active`;
  element.textContent = message;
}

function hideAlert(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.className = "alert";
  element.textContent = "";
}
