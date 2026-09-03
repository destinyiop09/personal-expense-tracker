/**
 * ============================================================================
 * transactions.js - Transaction CRUD, Filtering & CSV Export
 * ============================================================================
 */

let allTransactions = [];
let allCategories = [];

let activeFilters = {
  type: "",
  category: "",
  search: ""
};

/* ============================================================================
   FALLBACK CATEGORIES
   Used only if the backend categories endpoint is unavailable.
   IDs match the seeded categories in the database.
   ============================================================================ */

const FALLBACK_CATEGORIES = [
  // Expense categories
  { id: 1, name: "Food", type: "expense" },
  { id: 2, name: "Transport", type: "expense" },
  { id: 3, name: "Housing", type: "expense" },
  { id: 4, name: "Bills & Utilities", type: "expense" },
  { id: 5, name: "Shopping", type: "expense" },
  { id: 6, name: "Health", type: "expense" },
  { id: 7, name: "Entertainment", type: "expense" },
  { id: 8, name: "Education", type: "expense" },
  { id: 9, name: "Travel", type: "expense" },
  { id: 10, name: "Other", type: "expense" },

  // Income categories
  { id: 11, name: "Salary", type: "income" },
  { id: 12, name: "Freelance", type: "income" },
  { id: 13, name: "Business", type: "income" },
  { id: 14, name: "Investment", type: "income" },
  { id: 15, name: "Bonus", type: "income" },
  { id: 16, name: "Gift", type: "income" },
  { id: 17, name: "Other", type: "income" }
];

/* ============================================================================
   PAGE CHECK
   ============================================================================ */

function isTransactionsPage() {
  const path = window.location.pathname;

  return (
    path.includes("dashboard.html") ||
    path.endsWith("/index.html") ||
    path === "/" ||
    path === "" ||
    !path.includes(".html")
  );
}

/* ============================================================================
   INITIALIZATION
   ============================================================================ */

document.addEventListener("DOMContentLoaded", async () => {
  if (!isTransactionsPage()) return;

  setupTransactionModal();
  setupFilterControls();
  setupExportControls();

  await loadCategories();

  updateCategorySelectOptions("expense");
  populateCategoryFilter();

  await loadTransactions();
});

/* ============================================================================
   CATEGORY LOADING
   ============================================================================ */

async function loadCategories() {
  try {
    const data = await apiRequest("/categories/", {
      method: "GET"
    });

    if (Array.isArray(data) && data.length > 0) {
      allCategories = data.map(category => ({
        id: Number(category.id),
        name: String(category.name || "Other"),
        type: String(category.type || "expense").toLowerCase()
      }));
    } else {
      useFallbackCategories();
    }
  } catch (error) {
    console.warn(
      "Could not load categories from backend. Using local categories.",
      error
    );

    useFallbackCategories();
  }
}

function useFallbackCategories() {
  allCategories = FALLBACK_CATEGORIES.map(category => ({
    ...category
  }));
}

/* ============================================================================
   CATEGORY HELPERS
   ============================================================================ */

function getCategoryName(categoryId) {
  const category = allCategories.find(
    item => Number(item.id) === Number(categoryId)
  );

  if (category) {
    return category.name;
  }

  return "Other";
}

function getCategoryId(categoryName, type = "") {
  if (!categoryName) {
    return null;
  }

  // Handle category objects safely.
  if (typeof categoryName === "object") {
    if (categoryName.id !== undefined) {
      return Number(categoryName.id);
    }

    categoryName = categoryName.name;
  }

  const targetName = String(categoryName).toLowerCase().trim();

  const category = allCategories.find(item => {
    const nameMatches =
      String(item.name).toLowerCase().trim() === targetName;

    const typeMatches =
      !type ||
      String(item.type).toLowerCase() === String(type).toLowerCase();

    return nameMatches && typeMatches;
  });

  return category ? Number(category.id) : null;
}

/* ============================================================================
   TRANSACTION CATEGORY NAME
   ============================================================================ */

function getTransactionCategoryName(transaction) {
  if (!transaction) {
    return "Other";
  }

  if (transaction.category) {
    if (typeof transaction.category === "string") {
      return transaction.category;
    }

    if (typeof transaction.category === "object") {
      if (transaction.category.name) {
        return transaction.category.name;
      }
    }
  }

  if (transaction.category_name) {
    return String(transaction.category_name);
  }

  if (transaction.category_id !== undefined) {
    return getCategoryName(transaction.category_id);
  }

  return "Other";
}

/* ============================================================================
   CURRENCY DISPLAY
   ============================================================================ */

/*
 * dashboard.js provides formatCurrency().
 *
 * transactions.js loads before dashboard.js, so we check for the function
 * when the transaction table is rendered rather than calling it immediately.
 *
 * If dashboard.js is unavailable, amounts fall back to GHS.
 */

function formatTransactionAmount(amount) {
  const numericAmount = Number(amount || 0);

  if (typeof window.formatCurrency === "function") {
    return window.formatCurrency(numericAmount);
  }

  return `GHS ${numericAmount.toFixed(2)}`;
}

/*
 * Allows dashboard.js or the currency selector to refresh the transaction
 * table after the selected display currency changes.
 */

function refreshTransactionCurrency() {
  applyFiltersAndRender();
}

/* ============================================================================
   MODAL
   ============================================================================ */

function setupTransactionModal() {
  const modal = document.getElementById("transactionModal");
  const openBtn = document.getElementById("openAddTransactionBtn");
  const closeBtn = document.getElementById("closeModalBtn");
  const cancelBtn = document.getElementById("cancelModalBtn");
  const form = document.getElementById("transactionForm");

  const expenseBtn = document.getElementById("typeExpenseBtn");
  const incomeBtn = document.getElementById("typeIncomeBtn");

  const typeInput = document.getElementById("transactionType");
  const dateInput = document.getElementById("transactionDate");

  if (dateInput && !dateInput.value) {
    dateInput.value = getTodayDate();
  }

  openBtn?.addEventListener("click", () => {
    resetTransactionForm();

    const title = document.getElementById("modalTitle");

    if (title) {
      title.textContent = "Add Transaction";
    }

    modal?.classList.add("active");
  });

  const closeModal = () => {
    modal?.classList.remove("active");
    hideAlert("modalAlert");
  };

  closeBtn?.addEventListener("click", closeModal);
  cancelBtn?.addEventListener("click", closeModal);

  modal?.addEventListener("click", event => {
    if (event.target === modal) {
      closeModal();
    }
  });

  expenseBtn?.addEventListener("click", () => {
    expenseBtn.classList.add("active");
    incomeBtn?.classList.remove("active");

    if (typeInput) {
      typeInput.value = "expense";
    }

    updateCategorySelectOptions("expense");
  });

  incomeBtn?.addEventListener("click", () => {
    incomeBtn.classList.add("active");
    expenseBtn?.classList.remove("active");

    if (typeInput) {
      typeInput.value = "income";
    }

    updateCategorySelectOptions("income");
  });

  form?.addEventListener("submit", handleSaveTransaction);
}

/* ============================================================================
   CATEGORY SELECT
   ============================================================================ */

function updateCategorySelectOptions(
  type,
  selectedCategoryId = ""
) {
  const select = document.getElementById("transactionCategory");

  if (!select) return;

  const normalizedType = String(type || "expense").toLowerCase();

  const categories = allCategories.filter(
    category =>
      String(category.type).toLowerCase() === normalizedType
  );

  select.innerHTML =
    '<option value="">Select a category</option>';

  categories.forEach(category => {
    const option = document.createElement("option");

    option.value = String(category.id);
    option.textContent = category.name;

    if (
      selectedCategoryId !== "" &&
      Number(category.id) === Number(selectedCategoryId)
    ) {
      option.selected = true;
    }

    select.appendChild(option);
  });
}

/* ============================================================================
   RESET FORM
   ============================================================================ */

function resetTransactionForm() {
  const form = document.getElementById("transactionForm");

  if (!form) return;

  form.reset();

  const id = document.getElementById("transactionId");
  const type = document.getElementById("transactionType");

  const expenseBtn =
    document.getElementById("typeExpenseBtn");

  const incomeBtn =
    document.getElementById("typeIncomeBtn");

  if (id) {
    id.value = "";
  }

  if (type) {
    type.value = "expense";
  }

  expenseBtn?.classList.add("active");
  incomeBtn?.classList.remove("active");

  updateCategorySelectOptions("expense");

  const date = document.getElementById("transactionDate");

  if (date) {
    date.value = getTodayDate();
  }

  hideAlert("modalAlert");
}

/* ============================================================================
   FILTERS
   ============================================================================ */

function setupFilterControls() {
  const typeFilter =
    document.getElementById("filterType");

  const categoryFilter =
    document.getElementById("filterCategory");

  const searchInput =
    document.getElementById("searchTransactions");

  const clearBtn =
    document.getElementById("clearFiltersBtn");

  typeFilter?.addEventListener("change", event => {
    activeFilters.type = event.target.value;
    applyFiltersAndRender();
  });

  categoryFilter?.addEventListener("change", event => {
    activeFilters.category = event.target.value;
    applyFiltersAndRender();
  });

  searchInput?.addEventListener("input", event => {
    activeFilters.search =
      event.target.value.toLowerCase().trim();

    applyFiltersAndRender();
  });

  clearBtn?.addEventListener("click", () => {
    activeFilters = {
      type: "",
      category: "",
      search: ""
    };

    if (typeFilter) {
      typeFilter.value = "";
    }

    if (categoryFilter) {
      categoryFilter.value = "";
    }

    if (searchInput) {
      searchInput.value = "";
    }

    applyFiltersAndRender();
  });
}

/* ============================================================================
   CATEGORY FILTER
   ============================================================================ */

function populateCategoryFilter() {
  const select =
    document.getElementById("filterCategory");

  if (!select) return;

  select.innerHTML =
    '<option value="">All Categories</option>';

  const sortedCategories = [...allCategories].sort(
    (a, b) =>
      String(a.name).localeCompare(String(b.name))
  );

  sortedCategories.forEach(category => {
    const option = document.createElement("option");

    option.value = String(category.id);
    option.textContent = category.name;

    select.appendChild(option);
  });
}

/* ============================================================================
   CSV EXPORT
   ============================================================================ */

function setupExportControls() {
  const exportBtn =
    document.getElementById("exportCsvBtn");

  exportBtn?.addEventListener(
    "click",
    exportTransactionsToCSV
  );
}

function exportTransactionsToCSV() {
  if (
    !Array.isArray(allTransactions) ||
    allTransactions.length === 0
  ) {
    alert("No transactions available to export.");
    return;
  }

  /*
   * CSV uses the backend's stored currency: GHS.
   * This avoids exporting converted display values.
   */

  const headers = [
    "ID",
    "Date",
    "Type",
    "Category",
    "Description",
    "Amount (GHS)"
  ];

  const rows = allTransactions.map(transaction => {
    const categoryName =
      getTransactionCategoryName(transaction);

    return [
      csvEscape(transaction.id ?? ""),
      csvEscape(transaction.date ?? ""),
      csvEscape(transaction.type ?? ""),
      csvEscape(categoryName),
      csvEscape(transaction.description || ""),
      Number(transaction.amount || 0).toFixed(2)
    ];
  });

  const csv = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");

  const blob = new Blob(
    [csv],
    {
      type: "text/csv;charset=utf-8;"
    }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download =
    `expense_tracker_export_${getTodayDate()}.csv`;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

/* ============================================================================
   LOAD TRANSACTIONS
   ============================================================================ */

async function loadTransactions() {
  try {
    const data = await apiRequest(
      "/transactions/",
      {
        method: "GET"
      }
    );

    allTransactions =
      Array.isArray(data)
        ? data
        : Array.isArray(data?.transactions)
          ? data.transactions
          : [];

    applyFiltersAndRender();
  } catch (error) {
    console.error(
      "Failed to load transactions:",
      error
    );

    showAlert(
      "dashboardAlert",
      `Failed to load transactions: ${error.message}`,
      "error"
    );
  }
}

/* ============================================================================
   FILTER + RENDER
   ============================================================================ */

function applyFiltersAndRender() {
  let filtered = [...allTransactions];

  /* Search */
  if (activeFilters.search) {
    const term = activeFilters.search;

    filtered = filtered.filter(transaction => {
      const description =
        String(
          transaction.description || ""
        ).toLowerCase();

      const category =
        String(
          getTransactionCategoryName(transaction)
        ).toLowerCase();

      const amount =
        String(
          transaction.amount ?? ""
        );

      return (
        description.includes(term) ||
        category.includes(term) ||
        amount.includes(term)
      );
    });
  }

  /* Type */
  if (activeFilters.type) {
    const selectedType =
      activeFilters.type.toLowerCase();

    filtered = filtered.filter(transaction =>
      String(
        transaction.type || ""
      ).toLowerCase() === selectedType
    );
  }

  /* Category */
  if (activeFilters.category) {
    filtered = filtered.filter(transaction =>
      Number(transaction.category_id) ===
      Number(activeFilters.category)
    );
  }

  renderTransactionsTable(filtered);
}

/* ============================================================================
   TABLE
   ============================================================================ */

function renderTransactionsTable(transactions) {
  const tbody =
    document.getElementById(
      "transactionsTableBody"
    );

  if (!tbody) return;

  if (
    !Array.isArray(transactions) ||
    transactions.length === 0
  ) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <strong>No transactions found</strong>
            <p>
              No records match your selected filters.
              Try changing or clearing your filters.
            </p>
          </div>
        </td>
      </tr>
    `;

    return;
  }

  const sorted = [...transactions].sort(
    (a, b) =>
      new Date(b.date || 0) -
      new Date(a.date || 0)
  );

  tbody.innerHTML = sorted
    .map(transaction => {
      const isIncome =
        String(
          transaction.type || ""
        ).toLowerCase() === "income";

      const amount =
        formatTransactionAmount(
          transaction.amount
        );

      const categoryName =
        getTransactionCategoryName(
          transaction
        );

      const id =
        transaction.id ??
        transaction._id ??
        "";

      const safeId =
        String(id).replace(/'/g, "\\'");

      const categoryLower =
        String(categoryName).toLowerCase();

      let categoryBadge = "badge-blue";

      if (categoryLower.includes("food")) {
        categoryBadge = "badge-rose";
      } else if (
        categoryLower.includes("bill") ||
        categoryLower.includes("utilit") ||
        categoryLower.includes("housing")
      ) {
        categoryBadge = "badge-orange";
      } else if (
        categoryLower.includes("salary") ||
        categoryLower.includes("bonus")
      ) {
        categoryBadge = "badge-emerald";
      } else if (
        categoryLower.includes("entertain")
      ) {
        categoryBadge = "badge-purple";
      }

      return `
        <tr data-id="${escapeHtml(id)}">

          <td>
            ${escapeHtml(
        formatTransactionDate(
          transaction.date
        )
      )}
          </td>

          <td>
            <span class="badge ${isIncome
          ? "badge-income"
          : "badge-expense"
        }">
              ${isIncome
          ? "Income"
          : "Expense"
        }
            </span>
          </td>

          <td>
            <span class="badge ${categoryBadge}">
              ${escapeHtml(categoryName)}
            </span>
          </td>

          <td>
            ${escapeHtml(
          transaction.description || ""
        )}
          </td>

          <td
            style="text-align:right;"
            class="${isIncome
          ? "amount-income"
          : "amount-expense"
        }"
          >
            ${isIncome ? "+" : "-"}${amount}
          </td>

          <td style="text-align:center;">
            <div
              class="table-actions"
              style="justify-content:center;"
            >

              <button
                type="button"
                class="action-btn edit-btn"
                onclick="openEditModal('${safeId}')"
              >
                Edit
              </button>

              <button
                type="button"
                class="action-btn delete-btn"
                onclick="confirmDeleteTransaction('${safeId}')"
              >
                Delete
              </button>

            </div>
          </td>

        </tr>
      `;
    })
    .join("");
}

/* ============================================================================
   SAVE TRANSACTION
   ============================================================================ */

async function handleSaveTransaction(event) {
  event.preventDefault();

  hideAlert("modalAlert");

  const idElement =
    document.getElementById("transactionId");

  const typeElement =
    document.getElementById("transactionType");

  const amountElement =
    document.getElementById("transactionAmount");

  const categoryElement =
    document.getElementById("transactionCategory");

  const descriptionElement =
    document.getElementById("transactionDescription");

  const dateElement =
    document.getElementById("transactionDate");

  const saveBtn =
    document.getElementById("saveTransactionBtn");

  if (
    !typeElement ||
    !amountElement ||
    !categoryElement ||
    !descriptionElement ||
    !dateElement
  ) {
    console.error(
      "Transaction form elements are missing."
    );

    return;
  }

  const id =
    idElement?.value.trim() || "";

  const type =
    String(
      typeElement.value || "expense"
    ).toLowerCase();

  const amount =
    Number(amountElement.value);

  const categoryId =
    Number(categoryElement.value);

  const description =
    descriptionElement.value.trim();

  const date =
    dateElement.value;

  /* Validation */

  if (!Number.isFinite(amount) || amount <= 0) {
    showAlert(
      "modalAlert",
      "Please enter a valid amount greater than 0.",
      "error"
    );

    return;
  }

  if (
    type !== "expense" &&
    type !== "income"
  ) {
    showAlert(
      "modalAlert",
      "Please select a valid transaction type.",
      "error"
    );

    return;
  }

  if (!categoryId) {
    showAlert(
      "modalAlert",
      "Please select a category.",
      "error"
    );

    return;
  }

  if (!description) {
    showAlert(
      "modalAlert",
      "Please enter a description.",
      "error"
    );

    return;
  }

  if (!date) {
    showAlert(
      "modalAlert",
      "Please select a date.",
      "error"
    );

    return;
  }

  /*
   * IMPORTANT:
   * FastAPI expects category_id as an INTEGER.
   *
   * Amounts are stored in GHS in the backend.
   * Currency conversion happens only for display.
   */

  const payload = {
    amount: amount,
    type: type,
    category_id: categoryId,
    description: description,
    date: date
  };

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
  }

  try {
    if (id) {
      await apiRequest(
        `/transactions/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          body: JSON.stringify(payload)
        }
      );

      showAlert(
        "dashboardAlert",
        "Transaction updated successfully!",
        "success"
      );
    } else {
      await apiRequest(
        "/transactions/",
        {
          method: "POST",
          body: JSON.stringify(payload)
        }
      );

      showAlert(
        "dashboardAlert",
        "Transaction created successfully!",
        "success"
      );
    }

    document
      .getElementById("transactionModal")
      ?.classList.remove("active");

    hideAlert("modalAlert");

    await loadTransactions();

    if (
      typeof window.loadFinancialSummary ===
      "function"
    ) {
      await window.loadFinancialSummary();
    }

    if (
      typeof window.loadCategoryReport ===
      "function"
    ) {
      await window.loadCategoryReport();
    }

    if (
      typeof window.loadMonthlyReport ===
      "function"
    ) {
      await window.loadMonthlyReport();
    }
  } catch (error) {
    console.error(
      "Save transaction error:",
      error
    );

    showAlert(
      "modalAlert",
      error.message ||
      "Transaction could not be saved.",
      "error"
    );
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent =
        "Save Transaction";
    }
  }
}

/* ============================================================================
   EDIT
   ============================================================================ */

function openEditModal(transactionId) {
  const transaction =
    allTransactions.find(
      item =>
        String(
          item.id ?? item._id
        ) === String(transactionId)
    );

  if (!transaction) {
    console.warn(
      "Transaction not found:",
      transactionId
    );

    return;
  }

  const modal =
    document.getElementById(
      "transactionModal"
    );

  const title =
    document.getElementById(
      "modalTitle"
    );

  const idInput =
    document.getElementById(
      "transactionId"
    );

  const amountInput =
    document.getElementById(
      "transactionAmount"
    );

  const descriptionInput =
    document.getElementById(
      "transactionDescription"
    );

  const dateInput =
    document.getElementById(
      "transactionDate"
    );

  const typeInput =
    document.getElementById(
      "transactionType"
    );

  if (title) {
    title.textContent =
      "Edit Transaction";
  }

  if (idInput) {
    idInput.value =
      transactionId;
  }

  if (amountInput) {
    amountInput.value =
      transaction.amount ?? "";
  }

  if (descriptionInput) {
    descriptionInput.value =
      transaction.description || "";
  }

  if (dateInput) {
    dateInput.value =
      transaction.date
        ? String(transaction.date).substring(0, 10)
        : "";
  }

  const isIncome =
    String(
      transaction.type || ""
    ).toLowerCase() === "income";

  if (typeInput) {
    typeInput.value =
      isIncome
        ? "income"
        : "expense";
  }

  const expenseBtn =
    document.getElementById(
      "typeExpenseBtn"
    );

  const incomeBtn =
    document.getElementById(
      "typeIncomeBtn"
    );

  if (isIncome) {
    incomeBtn?.classList.add("active");
    expenseBtn?.classList.remove("active");
  } else {
    expenseBtn?.classList.add("active");
    incomeBtn?.classList.remove("active");
  }

  let categoryId =
    transaction.category_id;

  if (!categoryId && transaction.category) {
    categoryId =
      getCategoryId(
        transaction.category,
        isIncome
          ? "income"
          : "expense"
      );
  }

  updateCategorySelectOptions(
    isIncome
      ? "income"
      : "expense",
    categoryId
  );

  modal?.classList.add("active");
}

/* ============================================================================
   DELETE
   ============================================================================ */

async function confirmDeleteTransaction(
  transactionId
) {
  const confirmed =
    confirm(
      "Are you sure you want to delete this transaction?"
    );

  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(
      `/transactions/${encodeURIComponent(transactionId)}`,
      {
        method: "DELETE"
      }
    );

    showAlert(
      "dashboardAlert",
      "Transaction deleted successfully.",
      "success"
    );

    await loadTransactions();

    if (
      typeof window.loadFinancialSummary ===
      "function"
    ) {
      await window.loadFinancialSummary();
    }

    if (
      typeof window.loadCategoryReport ===
      "function"
    ) {
      await window.loadCategoryReport();
    }

    if (
      typeof window.loadMonthlyReport ===
      "function"
    ) {
      await window.loadMonthlyReport();
    }
  } catch (error) {
    console.error(
      "Delete transaction error:",
      error
    );

    showAlert(
      "dashboardAlert",
      error.message ||
      "Transaction could not be deleted.",
      "error"
    );
  }
}

/* ============================================================================
   DATE HELPERS
   ============================================================================ */

function getTodayDate() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTransactionDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  const value =
    String(dateValue);

  /*
   * Keep YYYY-MM-DD dates as-is so timezone conversion does not
   * accidentally move the displayed date backward or forward.
   */

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return value.substring(0, 10);
}

/* ============================================================================
   HTML ESCAPING
   ============================================================================ */

function escapeHtml(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ============================================================================
   GLOBAL FUNCTIONS
   Required because dashboard HTML uses inline onclick handlers.
   ============================================================================ */

window.loadTransactions =
  loadTransactions;

window.openEditModal =
  openEditModal;

window.confirmDeleteTransaction =
  confirmDeleteTransaction;

window.getCategoryName =
  getCategoryName;

window.getCategoryId =
  getCategoryId;

window.loadCategories =
  loadCategories;

window.refreshTransactionCurrency =
  refreshTransactionCurrency;

window.renderTransactionsTable =
  renderTransactionsTable;

window.getAllTransactions = () => {
  return allTransactions;
};