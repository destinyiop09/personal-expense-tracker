/**
 * ============================================================================
 * api.js - Core API Client & Configuration for FastAPI Backend
 * ============================================================================
 */

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

/* ============================================================================
   API CONFIGURATION
   ============================================================================ */

function getApiBaseUrl() {
  return (
    localStorage.getItem("expense_tracker_api_url") ||
    DEFAULT_API_BASE_URL
  );
}

function setApiBaseUrl(newUrl) {
  if (!newUrl) return;

  const cleanUrl = newUrl.trim().replace(/\/+$/, "");

  localStorage.setItem("expense_tracker_api_url", cleanUrl);
}

/* ============================================================================
   AUTH TOKEN HELPERS
   ============================================================================ */

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

/* ============================================================================
   LOCAL CATEGORY DEFINITIONS
   These IDs match the FastAPI seeded categories.
   ============================================================================ */

const PREDEFINED_CATEGORIES = {
  expense: [
    { id: 1, name: "Food" },
    { id: 2, name: "Transport" },
    { id: 3, name: "Housing" },
    { id: 4, name: "Bills & Utilities" },
    { id: 5, name: "Shopping" },
    { id: 6, name: "Health" },
    { id: 7, name: "Entertainment" },
    { id: 8, name: "Education" },
    { id: 9, name: "Travel" },
    { id: 10, name: "Other" }
  ],

  income: [
    { id: 11, name: "Salary" },
    { id: 12, name: "Freelance" },
    { id: 13, name: "Business" },
    { id: 14, name: "Investment" },
    { id: 15, name: "Bonus" },
    { id: 16, name: "Gift" },
    { id: 17, name: "Other" }
  ]
};

/* ============================================================================
   CATEGORY HELPERS
   ============================================================================ */

function getAllPredefinedCategories() {
  return [
    ...PREDEFINED_CATEGORIES.expense,
    ...PREDEFINED_CATEGORIES.income
  ];
}

function getCategoryById(id) {
  const numericId = Number(id);

  return getAllPredefinedCategories().find(
    category => category.id === numericId
  );
}

function getCategoryIdByName(name, type = null) {
  if (!name) return null;

  const categories = type
    ? PREDEFINED_CATEGORIES[type] || []
    : getAllPredefinedCategories();

  const found = categories.find(
    category =>
      category.name.toLowerCase() === String(name).toLowerCase()
  );

  return found ? found.id : null;
}

function getCategoryNameById(id) {
  const category = getCategoryById(id);

  return category ? category.name : "Other";
}

/* ============================================================================
   LOCAL TRANSACTIONS
   ============================================================================ */

const DEFAULT_LOCAL_TRANSACTIONS = [
  {
    id: "tx-1",
    date: "2026-09-02",
    type: "income",
    category_id: 11,
    category: "Salary",
    description: "Tech monthly salary payout",
    amount: 3500
  },
  {
    id: "tx-2",
    date: "2026-09-01",
    type: "expense",
    category_id: 3,
    category: "Housing",
    description: "Apartment rent",
    amount: 1200
  },
  {
    id: "tx-3",
    date: "2026-08-29",
    type: "expense",
    category_id: 1,
    category: "Food",
    description: "Weekly groceries",
    amount: 142.5
  },
  {
    id: "tx-4",
    date: "2026-08-27",
    type: "income",
    category_id: 12,
    category: "Freelance",
    description: "Consulting & web development",
    amount: 650
  },
  {
    id: "tx-5",
    date: "2026-08-25",
    type: "expense",
    category_id: 4,
    category: "Bills & Utilities",
    description: "Internet & electricity",
    amount: 115
  },
  {
    id: "tx-6",
    date: "2026-08-20",
    type: "expense",
    category_id: 7,
    category: "Entertainment",
    description: "Streaming subscriptions",
    amount: 28.5
  },
  {
    id: "tx-7",
    date: "2026-08-16",
    type: "expense",
    category_id: 2,
    category: "Transport",
    description: "Transport recharge",
    amount: 65
  }
];

function getStoredLocalTransactions() {
  const raw = localStorage.getItem("local_transactions");

  if (!raw) {
    const defaults = [...DEFAULT_LOCAL_TRANSACTIONS];

    localStorage.setItem(
      "local_transactions",
      JSON.stringify(defaults)
    );

    return defaults;
  }

  try {
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    return [...DEFAULT_LOCAL_TRANSACTIONS];
  } catch (error) {
    return [...DEFAULT_LOCAL_TRANSACTIONS];
  }
}

function saveStoredLocalTransactions(transactions) {
  localStorage.setItem(
    "local_transactions",
    JSON.stringify(transactions)
  );
}

/* ============================================================================
   API STATUS
   ============================================================================ */

function updateApiStatusBadge(text, color) {
  const badge = document.getElementById("apiStatusBadge");

  if (!badge) return;

  badge.textContent = `Status: ${text}`;

  if (color) {
    badge.style.color = color;
  }
}

/* ============================================================================
   OFFLINE / LOCAL FALLBACK
   ============================================================================ */

function handleLocalFallback(endpoint, options = {}) {
  const method = (options.method || "GET").toUpperCase();

  const transactions = getStoredLocalTransactions();

  /* --------------------------------------------------------------------------
     GET /categories/
     -------------------------------------------------------------------------- */

  if (/^\/categories\/?$/.test(endpoint)) {
    return getAllPredefinedCategories().map(category => ({
      id: category.id,
      name: category.name,
      type:
        category.id <= 10
          ? "expense"
          : "income"
    }));
  }

  /* --------------------------------------------------------------------------
     GET /transactions/
     POST /transactions/
     -------------------------------------------------------------------------- */

  if (/^\/transactions\/?$/.test(endpoint)) {
    if (method === "GET") {
      return [...transactions];
    }

    if (method === "POST") {
      let body = {};

      try {
        body =
          typeof options.body === "string"
            ? JSON.parse(options.body)
            : options.body || {};
      } catch (error) {
        body = {};
      }

      const categoryId =
        Number(body.category_id) ||
        getCategoryIdByName(body.category, body.type);

      const categoryName =
        body.category ||
        getCategoryNameById(categoryId);

      const newTransaction = {
        ...body,
        id: `tx-${Date.now()}`,
        category_id: categoryId,
        category: categoryName,
        amount: Number(body.amount) || 0
      };

      transactions.unshift(newTransaction);

      saveStoredLocalTransactions(transactions);

      return newTransaction;
    }
  }

  /* --------------------------------------------------------------------------
     PUT /transactions/{id}
     DELETE /transactions/{id}
     -------------------------------------------------------------------------- */

  const singleMatch = endpoint.match(
    /^\/transactions\/([^/]+)\/?$/
  );

  if (singleMatch) {
    const id = singleMatch[1];

    /* ------------------------------------------------------------------------
       PUT
       ------------------------------------------------------------------------ */

    if (method === "PUT") {
      let body = {};

      try {
        body =
          typeof options.body === "string"
            ? JSON.parse(options.body)
            : options.body || {};
      } catch (error) {
        body = {};
      }

      const index = transactions.findIndex(
        transaction =>
          String(transaction.id || transaction._id) === String(id)
      );

      if (index !== -1) {
        const categoryId =
          Number(body.category_id) ||
          getCategoryIdByName(body.category, body.type) ||
          transactions[index].category_id;

        const categoryName =
          body.category ||
          getCategoryNameById(categoryId);

        transactions[index] = {
          ...transactions[index],
          ...body,
          category_id: categoryId,
          category: categoryName,
          amount:
            body.amount !== undefined
              ? Number(body.amount) || 0
              : Number(transactions[index].amount) || 0
        };

        saveStoredLocalTransactions(transactions);

        return transactions[index];
      }

      return {
        ...body,
        id
      };
    }

    /* ------------------------------------------------------------------------
       DELETE
       ------------------------------------------------------------------------ */

    if (method === "DELETE") {
      const filtered = transactions.filter(
        transaction =>
          String(transaction.id || transaction._id) !== String(id)
      );

      saveStoredLocalTransactions(filtered);

      return {
        success: true,
        id
      };
    }
  }

  /* ==========================================================================
     GET /summary/
     ========================================================================== */

  if (/^\/summary\/?$/.test(endpoint)) {
    let income = 0;
    let expenses = 0;

    transactions.forEach(transaction => {
      const amount = Number(transaction.amount) || 0;

      if (
        String(transaction.type).toLowerCase() === "income"
      ) {
        income += amount;
      } else {
        expenses += amount;
      }
    });

    return {
      total_income: income,
      total_expenses: expenses,
      balance: income - expenses
    };
  }

  /* ==========================================================================
     GET /summary/categories
     GET /summary/category
     ========================================================================== */

  if (
    endpoint === "/summary/categories" ||
    endpoint === "/summary/category"
  ) {
    const totals = {};

    transactions
      .filter(
        transaction =>
          String(transaction.type).toLowerCase() === "expense"
      )
      .forEach(transaction => {
        const categoryName =
          transaction.category ||
          getCategoryNameById(transaction.category_id);

        totals[categoryName] =
          (totals[categoryName] || 0) +
          (Number(transaction.amount) || 0);
      });

    return Object.entries(totals).map(
      ([category, total]) => ({
        category,
        total
      })
    );
  }

  /* ==========================================================================
     GET /summary/monthly
     ========================================================================== */

  if (endpoint === "/summary/monthly") {
    const totals = {};

    transactions
      .filter(
        transaction =>
          String(transaction.type).toLowerCase() === "expense"
      )
      .forEach(transaction => {
        if (!transaction.date) return;

        const month = String(transaction.date).substring(0, 7);

        totals[month] =
          (totals[month] || 0) +
          (Number(transaction.amount) || 0);
      });

    return Object.entries(totals).map(
      ([month, total]) => ({
        month,
        total
      })
    );
  }

  /* ==========================================================================
     MOCK AUTH FALLBACK
     ========================================================================== */

  if (
    endpoint.includes("/auth/login") ||
    endpoint.includes("/auth/register")
  ) {
    return {
      access_token: "local-user-token",
      token_type: "bearer"
    };
  }

  /* --------------------------------------------------------------------------
     Unknown endpoint
     -------------------------------------------------------------------------- */

  return [];
}

/* ============================================================================
   MAIN API REQUEST
   ============================================================================ */

async function apiRequest(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl();

  const cleanEndpoint =
    endpoint.startsWith("/")
      ? endpoint
      : `/${endpoint}`;

  const url = `${baseUrl}${cleanEndpoint}`;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const token = getAuthToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 2500);

  const config = {
    ...options,
    headers,
    signal: controller.signal
  };

  try {
    const response = await fetch(url, config);

    clearTimeout(timeoutId);

    /* ------------------------------------------------------------------------
       AUTHENTICATION ERROR
       ------------------------------------------------------------------------ */

    if (response.status === 401) {
      /*
       * Do NOT immediately destroy the user's session.
       * Authentication code can decide how to handle this.
       */

      const error = new Error(
        "Unauthorized. Please log in again."
      );

      error.status = 401;

      throw error;
    }

    /* ------------------------------------------------------------------------
       SERVER / NOT FOUND ERRORS
       ------------------------------------------------------------------------ */

    if (!response.ok) {
      if (
        response.status === 404 ||
        response.status >= 500
      ) {
        updateApiStatusBadge(
          "Local Storage (Backend Error)",
          "var(--text-muted)"
        );

        return handleLocalFallback(
          cleanEndpoint,
          options
        );
      }

      /* ----------------------------------------------------------------------
         FASTAPI VALIDATION / OTHER ERRORS
         ---------------------------------------------------------------------- */

      let detail = "Backend request failed.";

      try {
        const json = await response.json();

        if (typeof json?.detail === "string") {
          detail = json.detail;
        } else if (Array.isArray(json?.detail)) {
          detail = json.detail
            .map(error => error.msg || "Validation error")
            .join(", ");
        }
      } catch (error) {
        /*
         * Ignore invalid JSON responses.
         */
      }

      const error = new Error(detail);

      error.status = response.status;

      throw error;
    }

    /* ------------------------------------------------------------------------
       SUCCESS
       ------------------------------------------------------------------------ */

    updateApiStatusBadge(
      "Connected (FastAPI)",
      "var(--income)"
    );

    const contentType =
      response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return await response.json();
    }

    return null;

  } catch (error) {
    clearTimeout(timeoutId);

    /* ------------------------------------------------------------------------
       NETWORK / OFFLINE FALLBACK
       ------------------------------------------------------------------------ */

    /*
     * Only use local fallback for network failures.
     * Do not hide real validation/authentication errors.
     */

    if (
      error.name === "AbortError" ||
      error instanceof TypeError ||
      error.message?.includes("Failed to fetch")
    ) {
      updateApiStatusBadge(
        "Local Storage (FastAPI Offline)",
        "var(--text-muted)"
      );

      return handleLocalFallback(
        cleanEndpoint,
        options
      );
    }

    throw error;
  }
}

/* ============================================================================
   ALERT HELPERS
   ============================================================================ */

function showAlert(
  elementId,
  message,
  type = "error"
) {
  const alertElement =
    document.getElementById(elementId);

  if (!alertElement) return;

  alertElement.className =
    `alert alert-${type} active`;

  alertElement.textContent = message;
}

function hideAlert(elementId) {
  const alertElement =
    document.getElementById(elementId);

  if (!alertElement) return;

  alertElement.className = "alert";
  alertElement.textContent = "";
}