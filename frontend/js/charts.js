/* ============================================================================
   charts.js - FinPulse Analytics & Charts
   ============================================================================
   IMPORTANT:
   - No hard-coded user names.
   - No dummy Alex Morgan account.
   - Uses the current authenticated user's information.
   - Uses the selected currency from #currencySelect.
   - Falls back to transaction data when summary endpoints are unavailable.
   ============================================================================ */

(function () {
  "use strict";

  /* ==========================================================================
     CONFIGURATION
     ========================================================================== */

  const CHART_COLORS = [
    "#6366f1",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#ec4899",
    "#84cc16",
    "#f97316",
    "#64748b"
  ];

  let categoryChart = null;
  let monthlyChart = null;

  /* ==========================================================================
     USER
     ========================================================================== */

  function getCurrentUser() {
    let name = localStorage.getItem("user_name") || "";
    let email = localStorage.getItem("user_email") || "";

    name = name.trim();
    email = email.trim();

    /*
     * Never use a fake fallback such as "Alex Morgan".
     */
    if (
      !name ||
      name.toLowerCase() === "alex morgan" ||
      name.toLowerCase() === "alexmorgan"
    ) {
      name = "";
    }

    return {
      name,
      email
    };
  }

  function getUserDisplayName() {
    const user = getCurrentUser();

    if (user.name) {
      return user.name;
    }

    if (user.email) {
      return user.email;
    }

    return "Your Account";
  }

  function updateUserDisplay() {
    const user = getCurrentUser();
    const displayName = getUserDisplayName();

    const nameElements = [
      document.getElementById("userEmailDisplay"),
      document.getElementById("chartUserName"),
      document.getElementById("welcomeUserName"),
      document.getElementById("analyticsUserName")
    ];

    nameElements.forEach(element => {
      if (element) {
        element.textContent = displayName;
      }
    });

    const avatar = document.getElementById("userAvatar");

    if (avatar) {
      if (user.name) {
        const initials = user.name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map(part => part.charAt(0).toUpperCase())
          .join("");

        avatar.textContent = initials || "U";
      } else if (user.email) {
        avatar.textContent =
          user.email.charAt(0).toUpperCase();
      } else {
        avatar.textContent = "U";
      }
    }
  }

  /* ==========================================================================
     CURRENCY
     ========================================================================== */

  function getCurrency() {
    const selector =
      document.getElementById("currencySelect");

    const stored =
      localStorage.getItem("currency") ||
      localStorage.getItem("selected_currency") ||
      localStorage.getItem("display_currency");

    const value =
      selector?.value ||
      stored ||
      "GHS";

    return String(value).toUpperCase();
  }

  function setCurrency(value) {
    const currency = String(value || "GHS").toUpperCase();

    localStorage.setItem("currency", currency);
    localStorage.setItem("selected_currency", currency);
    localStorage.setItem("display_currency", currency);
  }

  function formatMoney(amount) {
    const numericAmount = Number(amount) || 0;
    const currency = getCurrency();

    try {
      return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(numericAmount);
    } catch (error) {
      return `${currency} ${numericAmount.toFixed(2)}`;
    }
  }

  /* ==========================================================================
     DOM HELPERS
     ========================================================================== */

  function getElement(...ids) {
    for (const id of ids) {
      const element = document.getElementById(id);

      if (element) {
        return element;
      }
    }

    return null;
  }

  function setText(ids, value) {
    const element = getElement(...ids);

    if (element) {
      element.textContent = value;
    }
  }

  /* ==========================================================================
     TRANSACTION NORMALIZATION
     ========================================================================== */

  function normalizeTransaction(transaction) {
    if (!transaction || typeof transaction !== "object") {
      return null;
    }

    const type =
      String(
        transaction.type ||
        transaction.transaction_type ||
        ""
      ).toLowerCase();

    const amount =
      Number(
        transaction.amount ??
        transaction.value ??
        0
      ) || 0;

    const category =
      transaction.category ||
      transaction.category_name ||
      "Other";

    const description =
      transaction.description ||
      transaction.merchant ||
      transaction.note ||
      "Transaction";

    const date =
      transaction.date ||
      transaction.transaction_date ||
      transaction.created_at ||
      "";

    return {
      id:
        transaction.id ??
        transaction._id ??
        cryptoRandomId(),

      type:
        type === "income"
          ? "income"
          : "expense",

      amount,
      category: String(category),
      description: String(description),
      date: String(date)
    };
  }

  function cryptoRandomId() {
    return `chart-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
  }

  /* ==========================================================================
     LOAD TRANSACTIONS
     ========================================================================== */

  async function loadTransactions() {
    try {
      const response =
        await apiRequest("/transactions/");

      if (Array.isArray(response)) {
        return response
          .map(normalizeTransaction)
          .filter(Boolean);
      }

      if (Array.isArray(response?.transactions)) {
        return response.transactions
          .map(normalizeTransaction)
          .filter(Boolean);
      }

      if (Array.isArray(response?.data)) {
        return response.data
          .map(normalizeTransaction)
          .filter(Boolean);
      }

    } catch (error) {
      console.error(
        "Unable to load transactions:",
        error
      );
    }

    return [];
  }

  /* ==========================================================================
     SUMMARY CALCULATIONS
     ========================================================================== */

  function calculateSummary(transactions) {
    let income = 0;
    let expenses = 0;

    transactions.forEach(transaction => {
      if (transaction.type === "income") {
        income += transaction.amount;
      } else {
        expenses += transaction.amount;
      }
    });

    return {
      income,
      expenses,
      balance: income - expenses
    };
  }

  function calculateCategoryTotals(transactions) {
    const totals = {};

    transactions
      .filter(transaction => transaction.type === "expense")
      .forEach(transaction => {
        const category =
          transaction.category || "Other";

        totals[category] =
          (totals[category] || 0) +
          transaction.amount;
      });

    return totals;
  }

  function calculateMonthlyTotals(transactions) {
    const totals = {};

    transactions
      .filter(transaction => transaction.type === "expense")
      .forEach(transaction => {
        if (!transaction.date) return;

        const parsedDate =
          new Date(transaction.date);

        if (Number.isNaN(parsedDate.getTime())) {
          return;
        }

        const year =
          parsedDate.getFullYear();

        const month =
          String(
            parsedDate.getMonth() + 1
          ).padStart(2, "0");

        const key = `${year}-${month}`;

        totals[key] =
          (totals[key] || 0) +
          transaction.amount;
      });

    return totals;
  }

  /* ==========================================================================
     CHART.JS CHECK
     ========================================================================== */

  function chartJsAvailable() {
    return (
      typeof window.Chart !== "undefined"
    );
  }

  /* ==========================================================================
     CATEGORY CHART
     ========================================================================== */

  function renderCategoryChart(transactions) {
    const canvas =
      getElement(
        "categoryChart",
        "spendingByCategoryChart"
      );

    if (!canvas) {
      renderCategoryFallback(transactions);
      return;
    }

    if (!chartJsAvailable()) {
      renderCategoryFallback(transactions);
      return;
    }

    const totals =
      calculateCategoryTotals(transactions);

    const labels =
      Object.keys(totals);

    const values =
      labels.map(label => totals[label]);

    if (categoryChart) {
      categoryChart.destroy();
    }

    categoryChart =
      new Chart(canvas, {
        type: "doughnut",

        data: {
          labels,

          datasets: [
            {
              data: values,

              backgroundColor:
                labels.map(
                  (_, index) =>
                    CHART_COLORS[
                    index %
                    CHART_COLORS.length
                    ]
                ),

              borderWidth: 2
            }
          ]
        },

        options: {
          responsive: true,

          maintainAspectRatio: false,

          plugins: {
            legend: {
              position: "bottom"
            },

            tooltip: {
              callbacks: {
                label: function (context) {
                  const value =
                    Number(
                      context.raw
                    ) || 0;

                  return `${context.label}: ${formatMoney(value)}`;
                }
              }
            }
          }
        }
      });

    renderCategoryList(
      labels,
      values
    );
  }

  function renderCategoryFallback(transactions) {
    const container =
      getElement(
        "categoryReportContainer",
        "categoryChartContainer"
      );

    if (!container) return;

    const totals =
      calculateCategoryTotals(transactions);

    const entries =
      Object.entries(totals)
        .sort((a, b) => b[1] - a[1]);

    if (!entries.length) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No category spending recorded yet.</p>
        </div>
      `;

      return;
    }

    container.innerHTML = entries
      .map(([category, amount]) => `
        <div class="chart-row">
          <span>${escapeHtml(category)}</span>
          <strong>${formatMoney(amount)}</strong>
        </div>
      `)
      .join("");
  }

  function renderCategoryList(
    labels,
    values
  ) {
    const container =
      getElement(
        "categoryReportContainer"
      );

    if (!container) return;

    if (!labels.length) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No category spending recorded yet.</p>
        </div>
      `;

      return;
    }

    container.innerHTML =
      labels
        .map(
          (label, index) => `
            <div class="chart-row">
              <span>
                ${escapeHtml(label)}
              </span>

              <strong>
                ${formatMoney(values[index])}
              </strong>
            </div>
          `
        )
        .join("");
  }

  /* ==========================================================================
     MONTHLY CHART
     ========================================================================== */

  function renderMonthlyChart(transactions) {
    const canvas =
      getElement(
        "monthlyChart",
        "spendingByMonthChart"
      );

    const totals =
      calculateMonthlyTotals(
        transactions
      );

    const sortedMonths =
      Object.keys(totals).sort();

    const labels =
      sortedMonths.map(formatMonth);

    const values =
      sortedMonths.map(
        month => totals[month]
      );

    if (
      canvas &&
      chartJsAvailable()
    ) {
      if (monthlyChart) {
        monthlyChart.destroy();
      }

      monthlyChart =
        new Chart(canvas, {
          type: "bar",

          data: {
            labels,

            datasets: [
              {
                label: "Expenses",

                data: values,

                borderWidth: 1
              }
            ]
          },

          options: {
            responsive: true,

            maintainAspectRatio: false,

            scales: {
              y: {
                beginAtZero: true,

                ticks: {
                  callback: function (value) {
                    return formatMoney(value);
                  }
                }
              }
            },

            plugins: {
              tooltip: {
                callbacks: {
                  label: function (context) {
                    return formatMoney(
                      context.raw
                    );
                  }
                }
              }
            }
          }
        });
    }

    renderMonthlyList(
      sortedMonths,
      values
    );
  }

  function renderMonthlyList(
    months,
    values
  ) {
    const container =
      getElement(
        "monthlyReportContainer"
      );

    if (!container) return;

    if (!months.length) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No monthly spending recorded yet.</p>
        </div>
      `;

      return;
    }

    container.innerHTML =
      months
        .map(
          (month, index) => `
            <div class="chart-row">
              <span>
                ${escapeHtml(
            formatMonth(month)
          )}
              </span>

              <strong>
                ${formatMoney(values[index])}
              </strong>
            </div>
          `
        )
        .join("");
  }

  function formatMonth(value) {
    const date =
      new Date(`${value}-01T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString(
      "en-GH",
      {
        month: "short",
        year: "numeric"
      }
    );
  }

  /* ==========================================================================
     INSIGHTS
     ========================================================================== */

  function renderInsights(transactions) {
    const expenses =
      transactions.filter(
        transaction =>
          transaction.type === "expense"
      );

    if (!expenses.length) {
      setText(
        ["insightTopCategory"],
        "None"
      );

      setText(
        ["insightTopCategoryPill"],
        formatMoney(0)
      );

      setText(
        ["insightLargestExpense"],
        "None"
      );

      setText(
        ["insightLargestExpensePill"],
        formatMoney(0)
      );

      setText(
        ["insightDailyAverage"],
        `${formatMoney(0)} / day`
      );

      setText(
        ["insightCashFlowStatus"],
        "No spending yet"
      );

      return;
    }

    const categoryTotals =
      calculateCategoryTotals(
        transactions
      );

    const topCategory =
      Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])[0];

    const largestExpense =
      [...expenses].sort(
        (a, b) =>
          b.amount - a.amount
      )[0];

    const totalExpenses =
      expenses.reduce(
        (sum, transaction) =>
          sum + transaction.amount,
        0
      );

    const uniqueDates =
      new Set(
        expenses
          .map(
            transaction =>
              transaction.date
                ? transaction.date.substring(
                  0,
                  10
                )
                : null
          )
          .filter(Boolean)
      );

    const days =
      Math.max(
        uniqueDates.size,
        1
      );

    const dailyAverage =
      totalExpenses / days;

    setText(
      ["insightTopCategory"],
      topCategory
        ? topCategory[0]
        : "None"
    );

    setText(
      ["insightTopCategoryPill"],
      topCategory
        ? formatMoney(topCategory[1])
        : formatMoney(0)
    );

    setText(
      ["insightLargestExpense"],
      largestExpense
        ? largestExpense.description
        : "None"
    );

    setText(
      ["insightLargestExpensePill"],
      largestExpense
        ? formatMoney(
          largestExpense.amount
        )
        : formatMoney(0)
    );

    setText(
      ["insightDailyAverage"],
      `${formatMoney(
        dailyAverage
      )} / day`
    );
  }

  /* ==========================================================================
     SUMMARY
     ========================================================================== */

  function renderSummary(transactions) {
    const summary =
      calculateSummary(
        transactions
      );

    setText(
      ["totalIncomeDisplay"],
      formatMoney(summary.income)
    );

    setText(
      ["totalExpensesDisplay"],
      formatMoney(summary.expenses)
    );

    setText(
      ["netBalanceDisplay"],
      formatMoney(summary.balance)
    );

    setText(
      ["totalIncomeCount"],
      `${transactions.filter(
        transaction =>
          transaction.type === "income"
      ).length} inflows`
    );

    setText(
      ["totalExpensesCount"],
      `${transactions.filter(
        transaction =>
          transaction.type === "expense"
      ).length} outflows`
    );
  }

  /* ==========================================================================
     CURRENCY SELECTOR
     ========================================================================== */

  function setupCurrencySelector() {
    const selector =
      document.getElementById(
        "currencySelect"
      );

    if (!selector) return;

    const saved =
      localStorage.getItem("currency") ||
      localStorage.getItem("selected_currency") ||
      localStorage.getItem("display_currency");

    if (
      saved &&
      [...selector.options].some(
        option =>
          option.value === saved
      )
    ) {
      selector.value = saved;
    }

    setCurrency(selector.value);

    selector.addEventListener(
      "change",
      function () {
        setCurrency(
          selector.value
        );

        /*
         * Re-render everything so every
         * displayed amount changes currency.
         */
        refreshCharts();
      }
    );
  }

  /* ==========================================================================
     QUICK ADD DISPLAY
     ========================================================================== */

  function updateQuickAddCurrency() {
    const currency =
      getCurrency();

    document
      .querySelectorAll(
        ".quick-chip"
      )
      .forEach(button => {
        const amount =
          Number(
            button.dataset.amt
          );

        if (!Number.isFinite(amount)) {
          return;
        }

        const description =
          button.dataset.desc ||
          "";

        const icon =
          getQuickIcon(
            description
          );

        button.textContent =
          `+ ${icon} ${description} (${formatMoney(amount)})`;
      });
  }

  function getQuickIcon(description) {
    const text =
      String(description)
        .toLowerCase();

    if (text.includes("coffee")) {
      return "☕";
    }

    if (text.includes("lunch")) {
      return "🥪";
    }

    if (text.includes("grocer")) {
      return "🛒";
    }

    if (text.includes("transit")) {
      return "🚗";
    }

    if (
      text.includes("utility") ||
      text.includes("internet")
    ) {
      return "⚡";
    }

    return "💳";
  }

  /* ==========================================================================
     REFRESH
     ========================================================================== */

  async function refreshCharts() {
    updateUserDisplay();

    updateQuickAddCurrency();

    const transactions =
      await loadTransactions();

    renderSummary(
      transactions
    );

    renderCategoryChart(
      transactions
    );

    renderMonthlyChart(
      transactions
    );

    renderInsights(
      transactions
    );
  }

  /* ==========================================================================
     ESCAPE HTML
     ========================================================================== */

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* ==========================================================================
     PUBLIC API
     ========================================================================== */

  window.FinPulseCharts = {
    refresh: refreshCharts,
    refreshCharts,
    getCurrentUser,
    getCurrency,
    formatMoney
  };

  /* ==========================================================================
     INITIALIZE
     ========================================================================== */

  document.addEventListener(
    "DOMContentLoaded",
    function () {
      setupCurrencySelector();
      refreshCharts();
    }
  );

})();