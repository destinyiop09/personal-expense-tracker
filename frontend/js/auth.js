/**
 * ============================================================================
 * auth.js - User Authentication & Session Handler for FinPulse
 * ============================================================================
 *
 * Manages user login, registration, session checks, password toggles,
 * and logout. Connects to FastAPI backend auth endpoints when online,
 * with resilient offline client-side user accounts storage.
 */

// Predefined demo accounts
const DEFAULT_AUTH_USERS = [
  {
    name: "Alex Morgan",
    email: "demo@finpulse.app",
    password: "password123",
    registeredAt: "2026-08-15T00:00:00.000Z"
  },
  {
    name: "Jane Doe",
    email: "jane@example.com",
    password: "password123",
    registeredAt: "2026-08-20T00:00:00.000Z"
  }
];

/**
 * Retrieve registered accounts from localStorage.
 */
function getRegisteredUsers() {
  const raw = localStorage.getItem("finpulse_users");

  if (!raw) {
    const defaults = [...DEFAULT_AUTH_USERS];
    localStorage.setItem("finpulse_users", JSON.stringify(defaults));
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }

    const defaults = [...DEFAULT_AUTH_USERS];
    localStorage.setItem("finpulse_users", JSON.stringify(defaults));
    return defaults;
  } catch (error) {
    const defaults = [...DEFAULT_AUTH_USERS];
    localStorage.setItem("finpulse_users", JSON.stringify(defaults));
    return defaults;
  }
}

/**
 * Save registered accounts to localStorage.
 */
function saveRegisteredUsers(users) {
  localStorage.setItem("finpulse_users", JSON.stringify(users));
}

/**
 * Check if the user is currently authenticated.
 */
function isUserLoggedIn() {
  const token = localStorage.getItem("token");
  const email = localStorage.getItem("user_email");

  return Boolean(
    token &&
    token.trim().length > 0 &&
    email &&
    email.trim().length > 0
  );
}

/**
 * Extract 2-letter initials from full name or email.
 */
function getUserInitials(name, email) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);

    if (parts.length >= 2) {
      return (
        parts[0][0] +
        parts[parts.length - 1][0]
      ).toUpperCase();
    }

    return name.trim().slice(0, 2).toUpperCase();
  }

  if (email && email.trim()) {
    const prefix = email.split("@")[0];
    return prefix.slice(0, 2).toUpperCase();
  }

  return "FP";
}

/**
 * Main DOM Content Loaded Listener.
 */
document.addEventListener("DOMContentLoaded", () => {
  getRegisteredUsers();
  setupPasswordToggles();

  const currentPath = window.location.pathname;

  const isLoginPage =
    currentPath.includes("login.html");

  const isRegisterPage =
    currentPath.includes("register.html");

  if (isLoginPage) {
    initLoginPage();
    return;
  }

  if (isRegisterPage) {
    initRegisterPage();
    return;
  }

  initProtectedPage();
});

/**
 * Password Visibility Toggle Setup.
 */
function setupPasswordToggles() {
  const toggleButtons =
    document.querySelectorAll(".password-toggle-btn");

  toggleButtons.forEach(button => {
    button.addEventListener("click", () => {
      const targetId =
        button.getAttribute("data-target");

      const input =
        document.getElementById(targetId);

      if (!input) {
        return;
      }

      const eyeOpen =
        button.querySelector(".eye-open");

      const eyeClosed =
        button.querySelector(".eye-closed");

      if (input.type === "password") {
        input.type = "text";

        if (eyeOpen) {
          eyeOpen.style.display = "none";
        }

        if (eyeClosed) {
          eyeClosed.style.display = "inline";
        }
      } else {
        input.type = "password";

        if (eyeOpen) {
          eyeOpen.style.display = "inline";
        }

        if (eyeClosed) {
          eyeClosed.style.display = "none";
        }
      }
    });
  });
}

/**
 * Initialize Login Page.
 */
function initLoginPage() {
  const loginForm =
    document.getElementById("loginForm");

  const demoBtn =
    document.getElementById("demoLoginBtn");

  const forgotLink =
    document.getElementById("forgotPasswordLink");

  if (loginForm) {
    loginForm.addEventListener(
      "submit",
      handleLogin
    );
  }

  if (demoBtn) {
    demoBtn.addEventListener(
      "click",
      () => handleDemoLogin("login")
    );
  }

  if (forgotLink) {
    forgotLink.addEventListener(
      "click",
      event => {
        event.preventDefault();

        showAlert(
          "authAlert",
          "For demo convenience, use demo@finpulse.app / password123 or instant 1-click login.",
          "info"
        );
      }
    );
  }

  const params =
    new URLSearchParams(
      window.location.search
    );

  if (params.get("logout") === "true") {
    showAlert(
      "authAlert",
      "You have been successfully signed out.",
      "success"
    );
  } else if (
    params.get("registered") === "true"
  ) {
    showAlert(
      "authAlert",
      "Account registered! You can now sign in with your credentials.",
      "success"
    );
  } else if (
    params.get("error") === "session_expired"
  ) {
    showAlert(
      "authAlert",
      "Your session expired. Please sign in again.",
      "error"
    );
  } else if (
    params.get("auth_required") === "true"
  ) {
    showAlert(
      "authAlert",
      "Please sign in to access your FinPulse dashboard.",
      "info"
    );
  }
}

/**
 * Initialize Register Page.
 */
function initRegisterPage() {
  const registerForm =
    document.getElementById("registerForm");

  const demoBtn =
    document.getElementById("demoRegisterBtn");

  if (registerForm) {
    registerForm.addEventListener(
      "submit",
      handleRegister
    );
  }

  if (demoBtn) {
    demoBtn.addEventListener(
      "click",
      () => handleDemoLogin("register")
    );
  }
}

/**
 * Initialize Protected Pages.
 */
function initProtectedPage() {
  if (!isUserLoggedIn()) {
    const wasLoggedOut =
      sessionStorage.getItem(
        "finpulse_explicit_logout"
      );

    if (wasLoggedOut === "true") {
      window.location.href =
        "login.html?auth_required=true";

      return;
    }

    setAuthToken("finpulse-demo-token-alex");

    localStorage.setItem(
      "user_email",
      "demo@finpulse.app"
    );

    localStorage.setItem(
      "user_name",
      "Alex Morgan"
    );
  }

  updateHeaderUserDisplay();

  const logoutButtons = [
    document.getElementById("headerLogoutBtn"),
    document.getElementById("logoutBtn")
  ];

  logoutButtons.forEach(button => {
    if (button) {
      button.addEventListener(
        "click",
        handleLogout
      );
    }
  });
}

/**
 * Update user avatar & display name in header.
 */
function updateHeaderUserDisplay() {
  const userEmailDisplay =
    document.getElementById(
      "userEmailDisplay"
    );

  const userAvatar =
    document.getElementById("userAvatar");

  const name =
    localStorage.getItem("user_name") || "";

  const email =
    localStorage.getItem("user_email") ||
    "demo@finpulse.app";

  if (userEmailDisplay) {
    userEmailDisplay.textContent =
      name || email;

    userEmailDisplay.title =
      name
        ? `${name} (${email})`
        : email;
  }

  if (userAvatar) {
    userAvatar.textContent =
      getUserInitials(name, email);

    userAvatar.title =
      name || email;
  }
}

/**
 * Handles Login Form Submission.
 */
async function handleLogin(event) {
  event.preventDefault();

  hideAlert("authAlert");

  const emailInput =
    document.getElementById("loginEmail");

  const passwordInput =
    document.getElementById("loginPassword");

  const submitBtn =
    document.getElementById("loginSubmitBtn");

  const email =
    (emailInput?.value || "")
      .trim()
      .toLowerCase();

  const password =
    passwordInput?.value || "";

  if (!email || !password) {
    showAlert(
      "authAlert",
      "Please enter both your email address and password.",
      "error"
    );

    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;

    submitBtn.innerHTML = `
      <svg class="animate-spin"
           width="16"
           height="16"
           viewBox="0 0 24 24"
           fill="none"
           stroke="currentColor"
           stroke-width="2">
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke-opacity="0.25">
        </circle>

        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke-linecap="round">
        </path>
      </svg>
      Signing In...
    `;
  }

  try {
    let authSuccess = false;
    let userName = "";

    /*
     * Try FastAPI backend first.
     */
    try {
      const response =
        await apiRequest("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email,
            password
          })
        });

      if (
        response &&
        (response.access_token ||
          response.token)
      ) {
        setAuthToken(
          response.access_token ||
          response.token
        );

        authSuccess = true;

        userName =
          response.user?.name ||
          response.name ||
          "";
      }
    } catch (apiError) {
      /*
       * Backend unavailable or rejected.
       * Continue with local authentication.
       */
    }

    /*
     * Local authentication fallback.
     */
    if (!authSuccess) {
      const users =
        getRegisteredUsers();

      const matchedUser =
        users.find(
          user =>
            String(user.email || "")
              .toLowerCase() === email
        );

      if (matchedUser) {
        if (
          matchedUser.password !== password
        ) {
          throw new Error(
            "Incorrect password. Please verify and try again."
          );
        }

        authSuccess = true;
        userName =
          matchedUser.name || "";

        setAuthToken(
          "finpulse-token-" +
          Date.now()
        );
      } else {
        throw new Error(
          "No account registered with this email. Please check your spelling or create an account."
        );
      }
    }

    sessionStorage.removeItem(
      "finpulse_explicit_logout"
    );

    localStorage.setItem(
      "user_email",
      email
    );

    if (userName) {
      localStorage.setItem(
        "user_name",
        userName
      );
    } else {
      localStorage.setItem(
        "user_name",
        email.split("@")[0]
      );
    }

    showAlert(
      "authAlert",
      "Signed in successfully! Redirecting to dashboard...",
      "success"
    );

    setTimeout(() => {
      window.location.href =
        "index.html";
    }, 450);

  } catch (error) {
    showAlert(
      "authAlert",
      error.message ||
      "Unable to sign in. Please try again.",
      "error"
    );

    if (submitBtn) {
      submitBtn.disabled = false;

      submitBtn.innerHTML = `
        <svg width="16"
             height="16"
             viewBox="0 0 24 24"
             fill="none"
             stroke="currentColor"
             stroke-width="2"
             stroke-linecap="round"
             stroke-linejoin="round">

          <path
            d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4">
          </path>

          <polyline
            points="10 17 15 12 10 7">
          </polyline>

          <line
            x1="15"
            y1="12"
            x2="3"
            y2="12">
          </line>
        </svg>
        Sign In
      `;
    }
  }
}

/**
 * Handles Register Form Submission.
 */
async function handleRegister(event) {
  event.preventDefault();

  hideAlert("registerAlert");

  const nameInput =
    document.getElementById("registerName");

  const emailInput =
    document.getElementById("registerEmail");

  const passwordInput =
    document.getElementById(
      "registerPassword"
    );

  const confirmPasswordInput =
    document.getElementById(
      "registerConfirmPassword"
    );

  const termsCheckbox =
    document.getElementById("registerTerms");

  const submitBtn =
    document.getElementById(
      "registerSubmitBtn"
    );

  const name =
    (nameInput?.value || "").trim();

  const email =
    (emailInput?.value || "")
      .trim()
      .toLowerCase();

  const password =
    passwordInput?.value || "";

  const confirmPassword =
    confirmPasswordInput?.value || "";

  if (!name) {
    showAlert(
      "registerAlert",
      "Please enter your full name.",
      "error"
    );

    nameInput?.focus();
    return;
  }

  if (
    !email ||
    !email.includes("@") ||
    !email.includes(".")
  ) {
    showAlert(
      "registerAlert",
      "Please enter a valid email address.",
      "error"
    );

    emailInput?.focus();
    return;
  }

  if (
    !password ||
    password.length < 6
  ) {
    showAlert(
      "registerAlert",
      "Password must be at least 6 characters long.",
      "error"
    );

    passwordInput?.focus();
    return;
  }

  if (password !== confirmPassword) {
    showAlert(
      "registerAlert",
      "Passwords do not match. Please re-enter your password.",
      "error"
    );

    confirmPasswordInput?.focus();
    return;
  }

  if (
    termsCheckbox &&
    !termsCheckbox.checked
  ) {
    showAlert(
      "registerAlert",
      "Please accept the terms to create your account.",
      "error"
    );

    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;

    submitBtn.innerHTML = `
      <svg class="animate-spin"
           width="16"
           height="16"
           viewBox="0 0 24 24"
           fill="none"
           stroke="currentColor"
           stroke-width="2">

        <circle
          cx="12"
          cy="12"
          r="10"
          stroke-opacity="0.25">
        </circle>

        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke-linecap="round">
        </path>
      </svg>
      Creating Account...
    `;
  }

  try {
    const users =
      getRegisteredUsers();

    const existing =
      users.find(
        user =>
          String(user.email || "")
            .toLowerCase() === email
      );

    if (existing) {
      throw new Error(
        "An account with this email address already exists. Please sign in instead."
      );
    }

    /*
     * Try backend registration.
     */
    try {
      await apiRequest(
        "/auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            name,
            email,
            password
          })
        }
      );
    } catch (apiError) {
      /*
       * Backend unavailable.
       * Continue with local registration.
       */
    }

    const newUser = {
      name,
      email,
      password,
      registeredAt:
        new Date().toISOString()
    };

    users.push(newUser);

    saveRegisteredUsers(users);

    /*
     * Auto-login new account.
     */
    sessionStorage.removeItem(
      "finpulse_explicit_logout"
    );

    setAuthToken(
      "finpulse-user-token-" +
      Date.now()
    );

    localStorage.setItem(
      "user_email",
      email
    );

    localStorage.setItem(
      "user_name",
      name
    );

    showAlert(
      "registerAlert",
      "Account created successfully! Welcome to FinPulse...",
      "success"
    );

    setTimeout(() => {
      window.location.href =
        "index.html";
    }, 600);

  } catch (error) {
    showAlert(
      "registerAlert",
      error.message ||
      "Registration failed. Please try again.",
      "error"
    );

    if (submitBtn) {
      submitBtn.disabled = false;

      submitBtn.innerHTML = `
        <svg width="16"
             height="16"
             viewBox="0 0 24 24"
             fill="none"
             stroke="currentColor"
             stroke-width="2"
             stroke-linecap="round"
             stroke-linejoin="round">

          <path
            d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2">
          </path>

          <circle
            cx="8.5"
            cy="7.5"
            r="4">
          </circle>

          <polyline
            points="17 11 19 13 23 9">
          </polyline>
        </svg>
        Create Account & Sign In
      `;
    }
  }
}

/**
 * Handles 1-Click Instant Demo Login.
 */
function handleDemoLogin(source = "login") {
  const alertId =
    source === "register"
      ? "registerAlert"
      : "authAlert";

  showAlert(
    alertId,
    "Logging in with Demo Account (Alex Morgan)...",
    "info"
  );

  sessionStorage.removeItem(
    "finpulse_explicit_logout"
  );

  setAuthToken(
    "finpulse-demo-token-alex"
  );

  localStorage.setItem(
    "user_email",
    "demo@finpulse.app"
  );

  localStorage.setItem(
    "user_name",
    "Alex Morgan"
  );

  setTimeout(() => {
    window.location.href =
      "index.html";
  }, 400);
}

/**
 * Handles User Sign Out.
 */
function handleLogout() {
  sessionStorage.setItem(
    "finpulse_explicit_logout",
    "true"
  );

  clearAuthSession();

  window.location.href =
    "login.html?logout=true";
}

/**
 * Expose useful authentication helpers globally.
 */
window.isUserLoggedIn =
  isUserLoggedIn;

window.getUserInitials =
  getUserInitials;

window.updateHeaderUserDisplay =
  updateHeaderUserDisplay;

window.handleLogout =
  handleLogout;