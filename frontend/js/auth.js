/**
 * auth.js - Frontend authentication for FinPulse.
 *
 * Authentication is handled ONLY by the FastAPI backend.
 * User/transaction/category data is never fabricated in the browser.
 */

(function () {
  "use strict";

  function clearLegacyDemoData() {
    // Remove data created by the old demo/offline implementation.
    [
      "finpulse_users",
      "local_transactions",
      "finpulse-demo-token-alex",
      "local-user-token"
    ].forEach(key => localStorage.removeItem(key));
  }

  function isLoginPage() {
    return window.location.pathname.toLowerCase().includes("login.html");
  }

  function isRegisterPage() {
    return window.location.pathname.toLowerCase().includes("register.html");
  }

  function getUserInitials(name, email) {
    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").trim();

    if (cleanName) {
      const parts = cleanName.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return cleanName.slice(0, 2).toUpperCase();
    }

    if (cleanEmail) {
      return cleanEmail.split("@")[0].slice(0, 2).toUpperCase();
    }

    return "U";
  }

  function isUserLoggedIn() {
    const token = getAuthToken();
    return Boolean(token && token.trim());
  }

  function updateHeaderUserDisplay() {
    const email = String(localStorage.getItem("user_email") || "").trim();
    const name = String(localStorage.getItem("user_name") || "").trim();

    const display = document.getElementById("userEmailDisplay");
    const avatar = document.getElementById("userAvatar");

    // The current backend /auth/login response contains the token only.
    // Therefore email is the reliable identity value available to the frontend.
    const label = email || name || "Account";

    if (display) {
      display.textContent = label;
      display.title = email || label;
    }

    if (avatar) {
      avatar.textContent = getUserInitials(name, email);
      avatar.title = label;
    }
  }

  async function validateSession() {
    if (!isUserLoggedIn()) {
      return false;
    }

    try {
      // /summary/ is protected by the backend and therefore verifies
      // that the stored JWT is valid and belongs to an existing DB user.
      await apiRequest("/summary/", { method: "GET" });
      return true;
    } catch (error) {
      if (error.status === 401) {
        clearAuthSession();
        return false;
      }

      // A network failure is not proof that the token is invalid.
      return true;
    }
  }

  async function protectPage() {
    if (isLoginPage() || isRegisterPage()) {
      return;
    }

    const valid = await validateSession();

    if (!valid) {
      const target = encodeURIComponent(
        window.location.pathname.split("/").pop() || "index.html"
      );
      window.location.href = `login.html?auth_required=true&next=${target}`;
      return;
    }

    updateHeaderUserDisplay();

    document.querySelectorAll("#headerLogoutBtn, #logoutBtn").forEach(button => {
      button.addEventListener("click", handleLogout);
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    clearLegacyDemoData();
    setupPasswordToggles();

    if (isLoginPage()) {
      initLoginPage();
      return;
    }

    if (isRegisterPage()) {
      initRegisterPage();
      return;
    }

    await protectPage();
  });

  function setupPasswordToggles() {
    document.querySelectorAll(".password-toggle-btn").forEach(button => {
      button.addEventListener("click", () => {
        const input = document.getElementById(button.getAttribute("data-target"));
        if (!input) return;

        const open = button.querySelector(".eye-open");
        const closed = button.querySelector(".eye-closed");

        if (input.type === "password") {
          input.type = "text";
          if (open) open.style.display = "none";
          if (closed) closed.style.display = "inline";
        } else {
          input.type = "password";
          if (open) open.style.display = "inline";
          if (closed) closed.style.display = "none";
        }
      });
    });
  }

  function initLoginPage() {
    const form = document.getElementById("loginForm");
    if (form) form.addEventListener("submit", handleLogin);

    const forgotLink = document.getElementById("forgotPasswordLink");
    if (forgotLink) {
      forgotLink.addEventListener("click", event => {
        event.preventDefault();
        showAlert(
          "authAlert",
          "Please use the email and password registered in your account.",
          "info"
        );
      });
    }

    const params = new URLSearchParams(window.location.search);

    if (params.get("logout") === "true") {
      showAlert("authAlert", "You have been successfully signed out.", "success");
    } else if (params.get("registered") === "true") {
      showAlert("authAlert", "Account created. Please sign in.", "success");
    } else if (params.get("session_expired") === "true") {
      showAlert("authAlert", "Your session expired. Please sign in again.", "error");
    } else if (params.get("auth_required") === "true") {
      showAlert("authAlert", "Please sign in to access your FinPulse dashboard.", "info");
    }
  }

  function initRegisterPage() {
    const form = document.getElementById("registerForm");
    if (form) form.addEventListener("submit", handleRegister);
  }

  async function handleLogin(event) {
    event.preventDefault();
    hideAlert("authAlert");

    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const submitBtn = document.getElementById("loginSubmitBtn");

    const email = String(emailInput?.value || "").trim().toLowerCase();
    const password = String(passwordInput?.value || "");

    if (!email || !password) {
      showAlert("authAlert", "Please enter both your email address and password.", "error");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Signing In...";
    }

    try {
      const response = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      const token = response?.access_token || response?.token;

      if (!token) {
        throw new Error("The server did not return an authentication token.");
      }

      setAuthToken(token);

      // The current backend returns the token only. Store the authenticated
      // email for display; all protected financial data comes from PostgreSQL
      // through the JWT-protected API.
      localStorage.setItem("user_email", email);
      localStorage.removeItem("user_name");
      sessionStorage.removeItem("finpulse_explicit_logout");

      showAlert("authAlert", "Signed in successfully. Redirecting...", "success");

      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");

      setTimeout(() => {
        window.location.href = next
          ? decodeURIComponent(next)
          : "index.html";
      }, 300);
    } catch (error) {
      clearAuthSession();

      showAlert(
        "authAlert",
        error.message || "Unable to sign in. Please check your credentials.",
        "error"
      );

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign In";
      }
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    hideAlert("registerAlert");

    const name = String(document.getElementById("registerName")?.value || "").trim();
    const email = String(document.getElementById("registerEmail")?.value || "").trim().toLowerCase();
    const password = String(document.getElementById("registerPassword")?.value || "");
    const confirmPassword = String(
      document.getElementById("registerConfirmPassword")?.value || ""
    );
    const terms = document.getElementById("registerTerms");
    const submitBtn = document.getElementById("registerSubmitBtn");

    if (!name) {
      showAlert("registerAlert", "Please enter your full name.", "error");
      return;
    }

    if (!email || !email.includes("@")) {
      showAlert("registerAlert", "Please enter a valid email address.", "error");
      return;
    }

    if (password.length < 6) {
      showAlert("registerAlert", "Password must be at least 6 characters long.", "error");
      return;
    }

    if (password !== confirmPassword) {
      showAlert("registerAlert", "Passwords do not match.", "error");
      return;
    }

    if (terms && !terms.checked) {
      showAlert("registerAlert", "Please accept the terms to create your account.", "error");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Creating Account...";
    }

    try {
      // Registration is written to PostgreSQL by FastAPI.
      await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password })
      });

      // Do NOT fabricate a token. The backend registration endpoint does not
      // return one. Send the user to the real login flow instead.
      showAlert(
        "registerAlert",
        "Account created successfully. Please sign in with your new credentials.",
        "success"
      );

      setTimeout(() => {
        window.location.href = "login.html?registered=true";
      }, 500);
    } catch (error) {
      showAlert(
        "registerAlert",
        error.message || "Registration failed. Please try again.",
        "error"
      );

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Account & Sign In";
      }
    }
  }

  function handleLogout() {
    clearAuthSession();
    sessionStorage.setItem("finpulse_explicit_logout", "true");
    window.location.href = "login.html?logout=true";
  }

  window.isUserLoggedIn = isUserLoggedIn;
  window.getUserInitials = getUserInitials;
  window.updateHeaderUserDisplay = updateHeaderUserDisplay;
  window.handleLogout = handleLogout;
  window.validateSession = validateSession;
})();
