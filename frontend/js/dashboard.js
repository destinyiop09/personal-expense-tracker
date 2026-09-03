/**
 * ============================================================================
 * dashboard.js - Dashboard, Budget, Reports, Insights & Currency
 * ============================================================================
 *
 * Base currency: GHS
 * Display currencies: GHS and USD
 * Exchange rates: Frankfurter API
 *
 * IMPORTANT:
 * - Database/backend amounts remain in GHS.
 * - USD is display-only.
 * - Budget target is stored in GHS.
 * ============================================================================
 */

/* ============================================================================
   CURRENCY SYSTEM
   ============================================================================ */

const BASE_CURRENCY = "GHS";

const CURRENCY_INFO = {
  GHS: {
    code: "GHS",
    locale: "en-GH"
  },

  USD: {
    code: "USD",
    locale: "en-US"
  }
};

let selectedCurrency =
  localStorage.getItem("finpulse_currency") || BASE_CURRENCY;

if (!CURRENCY_INFO[selectedCurrency]) {
  selectedCurrency = BASE_CURRENCY;
}

let currentExchangeRate = 1;
let exchangeRateDate = null;


/* ============================================================================
   CURRENCY FORMATTING
   ============================================================================ */

function formatCurrency(amount) {
  const numericAmount =
    Number(amount) || 0;

  const convertedAmount =
    numericAmount * currentExchangeRate;

  const currency =
    CURRENCY_INFO[selectedCurrency] ||
    CURRENCY_INFO[BASE_CURRENCY];

  return new Intl.NumberFormat(
    currency.locale,
    {
      style: "currency",
      currency: currency.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  ).format(convertedAmount);
}

function convertCurrency(amount) {
  return (
    (Number(amount) || 0) *
    currentExchangeRate
  );
}


/* ============================================================================
   EXCHANGE RATE
   ============================================================================ */

async function fetchExchangeRate() {
  if (selectedCurrency === BASE_CURRENCY) {
    currentExchangeRate = 1;
    exchangeRateDate = null;
    return 1;
  }

  const url =
    `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(
      BASE_CURRENCY
    )}&symbols=${encodeURIComponent(
      selectedCurrency
    )}`;

  const response =
    await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });

  if (!response.ok) {
    throw new Error(
      "Unable to retrieve the USD exchange rate."
    );
  }

  const data =
    await response.json();

  const rate =
    data?.rates?.[selectedCurrency];

  if (
    rate === undefined ||
    rate === null ||
    !Number.isFinite(Number(rate)) ||
    Number(rate) <= 0
  ) {
    throw new Error(
      "Exchange rate was not available."
    );
  }

  currentExchangeRate =
    Number(rate);

  exchangeRateDate =
    data.date || null;

  console.log(
    `Exchange rate: 1 ${BASE_CURRENCY} = ${currentExchangeRate} ${selectedCurrency}`,
    exchangeRateDate
      ? `(rate date: ${exchangeRateDate})`
      : ""
  );

  return currentExchangeRate;
}


/* ============================================================================
   CURRENCY SELECTOR
   ============================================================================ */

async function setupCurrencySelector() {
  const currencySelect =
    document.getElementById(
      "currencySelect"
    );

  if (!currencySelect) {
    return;
  }

  currencySelect.value =
    selectedCurrency;

  currencySelect.addEventListener(
    "change",
    async event => {
      const newCurrency =
        event.target.value;

      if (
        !Object.prototype.hasOwnProperty.call(
          CURRENCY_INFO,
          newCurrency
        )
      ) {
        currencySelect.value =
          selectedCurrency;

        return;
      }

      const previousCurrency =
        selectedCurrency;

      selectedCurrency =
        newCurrency;

      localStorage.setItem(
        "finpulse_currency",
        selectedCurrency
      );

      currencySelect.disabled = true;

      try {
        await fetchExchangeRate();

        await refreshDashboard();

        if (
          typeof window.refreshTransactionCurrency ===
          "function"
        ) {
          window.refreshTransactionCurrency();
        }

        if (
          typeof window.renderAllCharts ===
          "function"
        ) {
          window.renderAllCharts();
        }

      } catch (error) {
        console.error(
          "Currency conversion error:",
          error
        );

        selectedCurrency =
          previousCurrency;

        localStorage.setItem(
          "finpulse_currency",
          previousCurrency
        );

        try {
          await fetchExchangeRate();
        } catch (restoreError) {
          currentExchangeRate =
            previousCurrency === BASE_CURRENCY
              ? 1
              : currentExchangeRate;
        }

        currencySelect.value =
          selectedCurrency;

        if (
          typeof showAlert ===
          "function"
        ) {
          showAlert(
            "dashboardAlert",
            "Could not retrieve the USD exchange rate. Showing the previous currency.",
            "error"
          );
        }
      } finally {
        currencySelect.disabled =
          false;
      }
    }
  );

  try {
    await fetchExchangeRate();
  } catch (error) {
    console.error(
      "Initial currency rate error:",
      error
    );

    selectedCurrency =
      BASE_CURRENCY;

    currentExchangeRate = 1;
    exchangeRateDate = null;

    localStorage.setItem(
      "finpulse_currency",
      BASE_CURRENCY
    );

    currencySelect.value =
      BASE_CURRENCY;
  }
}


/* ============================================================================
   CONSTANTS
   ============================================================================ */

const DEFAULT_BUDGET_TARGET = 2500;


/* ============================================================================
   PAGE CHECK
   ============================================================================ */

function isDashboardPage() {
  const path =
    window.location.pathname;

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

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    if (!isDashboardPage()) {
      return;
    }

    setupApiBar();

    await setupCurrencySelector();

    setupBudgetControls();

    await refreshDashboard();
  }
);


/* ============================================================================
   API BAR
   ============================================================================ */

function setupApiBar() {
  const display =
    document.getElementById(
      "apiBaseUrlDisplay"
    );

  const changeBtn =
    document.getElementById(
      "changeApiUrlBtn"
    );

  if (display) {
    display.textContent =
      getApiBaseUrl();
  }

  if (changeBtn) {
    changeBtn.addEventListener(
      "click",
      async () => {
        const current =
          getApiBaseUrl();

        const next =
          prompt(
            "Enter your FastAPI Backend URL:",
            current
          );

        if (
          next &&
          next.trim()
        ) {
          setApiBaseUrl(
            next.trim()
          );

          if (display) {
            display.textContent =
              getApiBaseUrl();
          }

          await refreshDashboard();
        }
      }
    );
  }
}


/* ============================================================================
   BUDGET
   ============================================================================ */

function setupBudgetControls() {
  const editBtn =
    document.getElementById(
      "editBudgetBtn"
    );

  if (!editBtn) {
    return;
  }

  editBtn.addEventListener(
    "click",
    () => {
      const current =
        Number(
          localStorage.getItem(
            "monthly_budget_target"
          )
        ) ||
        DEFAULT_BUDGET_TARGET;

      const input =
        prompt(
          "Enter your monthly budget target in GHS:",
          current.toString()
        );

      if (input === null) {
        return;
      }

      const amount =
        Number(input);

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        alert(
          "Please enter a valid positive number."
        );

        return;
      }

      localStorage.setItem(
        "monthly_budget_target",
        String(amount)
      );

      loadFinancialSummary();
    }
  );
}


/* ============================================================================
   QUICK ADD
   ============================================================================ */

function setupQuickShortcuts() {
  const buttons =
    document.querySelectorAll(
      ".quick-chip"
    );

  buttons.forEach(button => {
    button.addEventListener(
      "click",
      async () => {
        const description =
          button.getAttribute(
            "data-desc"
          ) ||
          "Quick Expense";

        const categoryName =
          button.getAttribute(
            "data-cat"
          ) ||
          "Food";

        const amount =
          Number(
            button.getAttribute(
              "data-amt"
            )
          );

        if (
          !Number.isFinite(amount) ||
          amount <= 0
        ) {
          showAlert(
            "dashboardAlert",
            "The quick expense amount is invalid.",
            "error"
          );

          return;
        }

        let categoryId = null;

        if (
          typeof window.getCategoryId ===
          "function"
        ) {
          categoryId =
            window.getCategoryId(
              categoryName,
              "expense"
            );
        }

        if (!categoryId) {
          const fallbackMap = {
            food: 1,
            transport: 2,
            housing: 3,
            "bills & utilities": 4,
            shopping: 5,
            health: 6,
            entertainment: 7,
            education: 8,
            travel: 9,
            other: 10
          };

          categoryId =
            fallbackMap[
            String(categoryName)
              .toLowerCase()
              .trim()
            ];
        }

        if (!categoryId) {
          showAlert(
            "dashboardAlert",
            `Could not find category: ${categoryName}`,
            "error"
          );

          return;
        }

        const payload = {
          amount,
          type: "expense",
          category_id: Number(categoryId),
          description,
          date: getTodayDate()
        };

        try {
          await apiRequest(
            "/transactions/",
            {
              method: "POST",
              body: JSON.stringify(payload)
            }
          );

          showAlert(
            "dashboardAlert",
            `Logged quick expense: ${description} (${formatCurrency(amount)})`,
            "success"
          );

          await refreshDashboard();

        } catch (error) {
          console.error(
            "Quick expense failed:",
            error
          );

          showAlert(
            "dashboardAlert",
            `Could not add quick expense: ${error.message || "Unknown error"
            }`,
            "error"
          );
        }
      }
    );
  });
}


/* ============================================================================
   REFRESH DASHBOARD
   ============================================================================ */

async function refreshDashboard() {
  const statusBadge =
    document.getElementById(
      "apiStatusBadge"
    );

  if (statusBadge) {
    statusBadge.textContent =
      "Connecting...";

    statusBadge.style.color =
      "var(--text-muted)";
  }

  try {
    if (
      typeof window.loadCategories ===
      "function"
    ) {
      await window.loadCategories();
    }

    if (
      typeof window.loadTransactions ===
      "function"
    ) {
      await window.loadTransactions();
    }

    await loadFinancialSummary();

    if (statusBadge) {
      statusBadge.textContent =
        "Connected";

      statusBadge.style.color =
        "var(--income)";
    }

  } catch (error) {
    console.error(
      "Dashboard initialization error:",
      error
    );

    if (statusBadge) {
      statusBadge.textContent =
        "Offline / Local";

      statusBadge.style.color =
        "var(--text-muted)";
    }
  }
}


/* ============================================================================
   FINANCIAL SUMMARY
   ============================================================================ */

async function loadFinancialSummary() {
  let summaryData = null;

  try {
    summaryData =
      await apiRequest(
        "/summary/",
        {
          method: "GET"
        }
      );
  } catch (error) {
    console.info(
      "Summary API unavailable. Calculating from transactions:",
      error.message
    );
  }

  let transactions = [];

  if (
    typeof window.getAllTransactions ===
    "function"
  ) {
    const result =
      window.getAllTransactions();

    if (Array.isArray(result)) {
      transactions = result;
    }
  }

  let totalIncome = 0;
  let totalExpenses = 0;

  let incomeCount = 0;
  let expenseCount = 0;

  if (transactions.length > 0) {
    transactions.forEach(
      transaction => {
        const amount =
          Number(
            transaction.amount
          ) || 0;

        const type =
          String(
            transaction.type || ""
          ).toLowerCase();

        if (type === "income") {
          totalIncome += amount;
          incomeCount++;
        } else if (type === "expense") {
          totalExpenses += amount;
          expenseCount++;
        }
      }
    );
  } else if (summaryData) {
    totalIncome =
      Number(
        summaryData.total_income ??
        summaryData.income ??
        0
      );

    totalExpenses =
      Number(
        summaryData.total_expenses ??
        summaryData.expenses ??
        0
      );

    incomeCount =
      Number(
        summaryData.income_count ??
        0
      );

    expenseCount =
      Number(
        summaryData.expense_count ??
        0
      );
  }

  const balance =
    totalIncome -
    totalExpenses;

  updateSummaryCards(
    totalIncome,
    totalExpenses,
    balance,
    incomeCount,
    expenseCount
  );

  updateBudgetTracker(
    totalExpenses,
    transactions
  );

  await loadCategoryReport();

  await loadMonthlyReport();

  updateFinancialInsights(
    totalIncome,
    totalExpenses,
    balance,
    transactions
  );
}


/* ============================================================================
   SUMMARY CARDS
   ============================================================================ */

function updateSummaryCards(
  income,
  expenses,
  balance,
  incomeCount,
  expenseCount
) {
  const incomeEl =
    document.getElementById(
      "totalIncomeDisplay"
    );

  const expenseEl =
    document.getElementById(
      "totalExpensesDisplay"
    );

  const balanceEl =
    document.getElementById(
      "netBalanceDisplay"
    );

  const incomeCountEl =
    document.getElementById(
      "totalIncomeCount"
    );

  const expenseCountEl =
    document.getElementById(
      "totalExpensesCount"
    );

  const balanceCard =
    document.getElementById(
      "summaryCardBalance"
    );

  const balanceBadge =
    document.getElementById(
      "balanceStatusBadge"
    );

  const balanceSubtext =
    document.getElementById(
      "netBalanceSubtext"
    );

  const savingsRateEl =
    document.getElementById(
      "savingsRateDisplay"
    );

  const savingsBadge =
    document.getElementById(
      "savingsBadge"
    );

  if (incomeEl) {
    incomeEl.textContent =
      formatCurrency(income);
  }

  if (expenseEl) {
    expenseEl.textContent =
      formatCurrency(expenses);
  }

  if (balanceEl) {
    balanceEl.textContent =
      balance < 0
        ? `-${formatCurrency(Math.abs(balance))}`
        : formatCurrency(balance);
  }

  if (incomeCountEl) {
    incomeCountEl.textContent =
      `${incomeCount} inflow${incomeCount === 1 ? "" : "s"
      }`;
  }

  if (expenseCountEl) {
    expenseCountEl.textContent =
      `${expenseCount} outflow${expenseCount === 1 ? "" : "s"
      }`;
  }

  if (balanceCard) {
    balanceCard.classList.remove(
      "positive",
      "negative"
    );

    balanceCard.classList.add(
      balance >= 0
        ? "positive"
        : "negative"
    );
  }

  if (balanceBadge) {
    if (balance > 0) {
      balanceBadge.textContent =
        "Surplus";

      balanceBadge.className =
        "badge badge-emerald";

      if (balanceSubtext) {
        balanceSubtext.textContent =
          "Net positive cash flow";
      }

    } else if (balance < 0) {
      balanceBadge.textContent =
        "Deficit";

      balanceBadge.className =
        "badge badge-rose";

      if (balanceSubtext) {
        balanceSubtext.textContent =
          "Expenses exceed income";
      }

    } else {
      balanceBadge.textContent =
        "Balanced";

      balanceBadge.className =
        "badge badge-blue";

      if (balanceSubtext) {
        balanceSubtext.textContent =
          "Break-even point";
      }
    }
  }

  const savingsRate =
    income > 0
      ? Math.round(
        ((income - expenses) /
          income) *
        100
      )
      : 0;

  if (savingsRateEl) {
    savingsRateEl.textContent =
      `${savingsRate}%`;
  }

  if (savingsBadge) {
    if (savingsRate >= 40) {
      savingsBadge.textContent =
        "Excellent";

      savingsBadge.className =
        "badge badge-emerald";

    } else if (savingsRate >= 20) {
      savingsBadge.textContent =
        "Healthy";

      savingsBadge.className =
        "badge badge-blue";

    } else if (savingsRate > 0) {
      savingsBadge.textContent =
        "Modest";

      savingsBadge.className =
        "badge badge-orange";

    } else {
      savingsBadge.textContent =
        "0% Saved";

      savingsBadge.className =
        "badge badge-rose";
    }
  }
}


/* ============================================================================
   BUDGET TRACKER
   ============================================================================ */

function updateBudgetTracker(
  totalExpenses,
  transactions
) {
  const spentEl =
    document.getElementById(
      "budgetSpentDisplay"
    );

  const targetEl =
    document.getElementById(
      "budgetTargetDisplay"
    );

  const remainingEl =
    document.getElementById(
      "budgetRemainingDisplay"
    );

  const fillEl =
    document.getElementById(
      "budgetFill"
    );

  const percentEl =
    document.getElementById(
      "budgetPercentDisplay"
    );

  const noticeEl =
    document.getElementById(
      "budgetStatusNotice"
    );

  const monthBadge =
    document.getElementById(
      "budgetMonthBadge"
    );

  const target =
    Number(
      localStorage.getItem(
        "monthly_budget_target"
      )
    ) ||
    DEFAULT_BUDGET_TARGET;

  const now =
    new Date();

  if (monthBadge) {
    monthBadge.textContent =
      now.toLocaleString(
        "default",
        {
          month: "long",
          year: "numeric"
        }
      );
  }

  const currentMonth =
    getCurrentMonthKey();

  let monthlySpent = 0;

  transactions.forEach(
    transaction => {
      const type =
        String(
          transaction.type || ""
        ).toLowerCase();

      if (
        type === "expense" &&
        String(
          transaction.date || ""
        ).startsWith(
          currentMonth
        )
      ) {
        monthlySpent +=
          Number(
            transaction.amount
          ) || 0;
      }
    }
  );

  const spent =
    transactions.length > 0
      ? monthlySpent
      : totalExpenses;

  const percentage =
    target > 0
      ? Math.round(
        (spent / target) * 100
      )
      : 0;

  const remaining =
    target - spent;

  if (spentEl) {
    spentEl.textContent =
      formatCurrency(spent);
  }

  if (targetEl) {
    targetEl.textContent =
      formatCurrency(target);
  }

  if (remainingEl) {
    if (remaining < 0) {
      remainingEl.textContent =
        `Over by ${formatCurrency(
          Math.abs(remaining)
        )}`;

      remainingEl.style.color =
        "var(--expense)";
    } else {
      remainingEl.textContent =
        `${formatCurrency(
          remaining
        )} remaining`;

      remainingEl.style.color =
        "var(--text-heading)";
    }
  }

  if (percentEl) {
    percentEl.textContent =
      `${percentage}% of monthly budget utilized`;
  }

  if (fillEl) {
    fillEl.style.width =
      `${Math.min(
        100,
        Math.max(0, percentage)
      )}%`;

    fillEl.classList.remove(
      "warning",
      "danger"
    );

    if (percentage > 95) {
      fillEl.classList.add("danger");
    } else if (percentage >= 75) {
      fillEl.classList.add("warning");
    }
  }

  if (noticeEl) {
    if (percentage > 100) {
      noticeEl.textContent =
        "Budget limit exceeded!";

      noticeEl.style.color =
        "var(--expense)";

    } else if (percentage >= 75) {
      noticeEl.textContent =
        "Approaching target threshold";

      noticeEl.style.color =
        "#d97706";

    } else {
      noticeEl.textContent =
        "Spending safely on track";

      noticeEl.style.color =
        "var(--income)";
    }
  }
}


/* ============================================================================
   CATEGORY REPORT
   ============================================================================ */

async function loadCategoryReport() {
  const container =
    document.getElementById(
      "categoryReportContainer"
    );

  if (!container) {
    return;
  }

  try {
    const data =
      await apiRequest(
        "/summary/categories",
        {
          method: "GET"
        }
      );

    let entries = [];

    if (Array.isArray(data)) {
      entries =
        data.map(item => [
          item.category ||
          item.name ||
          "Other",
          Number(
            item.total ??
            item.amount ??
            0
          )
        ]);
    } else if (
      data &&
      typeof data === "object"
    ) {
      entries =
        Object.entries(data).map(
          ([category, amount]) => [
            category,
            Number(amount) || 0
          ]
        );
    }

    entries =
      entries.filter(
        ([, amount]) =>
          Number(amount) > 0
      );

    if (entries.length === 0) {
      container.innerHTML = `
        <div
          class="empty-state"
          style="padding:24px 0;"
        >
          <p>
            No expense categories recorded yet.
          </p>
        </div>
      `;

      return;
    }

    entries.sort(
      ([, a], [, b]) =>
        Number(b) - Number(a)
    );

    const max =
      Math.max(
        ...entries.map(
          ([, amount]) =>
            Number(amount) || 0
        ),
        1
      );

    container.innerHTML = `
      <ul class="report-list">
        ${entries
        .map(
          ([category, amount]) => {
            const value =
              Number(amount) || 0;

            const percentage =
              Math.round(
                (value / max) * 100
              );

            return `
                <li
                  class="report-list-item"
                  style="
                    flex-direction:column;
                    align-items:stretch;
                  "
                >
                  <div
                    style="
                      display:flex;
                      justify-content:space-between;
                      margin-bottom:4px;
                    "
                  >
                    <span>
                      <strong>
                        ${escapeHtml(category)}
                      </strong>
                    </span>

                    <span
                      style="font-weight:600;"
                    >
                      ${formatCurrency(value)}
                    </span>
                  </div>

                  <div class="bar-wrapper">
                    <div
                      class="bar-fill"
                      style="width:${percentage}%"
                    ></div>
                  </div>
                </li>
              `;
          }
        )
        .join("")}
      </ul>
    `;

  } catch (error) {
    console.error(
      "Category report error:",
      error
    );

    renderLocalCategoryReport(
      container
    );
  }
}


/* ============================================================================
   LOCAL CATEGORY REPORT FALLBACK
   ============================================================================ */

function renderLocalCategoryReport(
  container
) {
  if (
    typeof window.getAllTransactions !==
    "function"
  ) {
    return;
  }

  const transactions =
    window.getAllTransactions();

  if (!Array.isArray(transactions)) {
    return;
  }

  const totals = {};

  transactions
    .filter(
      transaction =>
        String(
          transaction.type || ""
        ).toLowerCase() ===
        "expense"
    )
    .forEach(
      transaction => {
        const category =
          getTransactionCategoryName(
            transaction
          );

        totals[category] =
          (totals[category] || 0) +
          (Number(transaction.amount) || 0);
      }
    );

  const entries =
    Object.entries(totals)
      .filter(
        ([, amount]) =>
          amount > 0
      )
      .sort(
        ([, a], [, b]) =>
          b - a
      );

  if (entries.length === 0) {
    container.innerHTML = `
      <div
        class="empty-state"
        style="padding:24px 0;"
      >
        <p>
          No expense categories recorded yet.
        </p>
      </div>
    `;

    return;
  }

  const max =
    Math.max(
      ...entries.map(
        ([, amount]) =>
          amount
      ),
      1
    );

  container.innerHTML = `
    <ul class="report-list">
      ${entries
      .map(
        ([category, amount]) => {
          const percentage =
            Math.round(
              (amount / max) * 100
            );

          return `
              <li
                class="report-list-item"
                style="
                  flex-direction:column;
                  align-items:stretch;
                "
              >
                <div
                  style="
                    display:flex;
                    justify-content:space-between;
                    margin-bottom:4px;
                  "
                >
                  <span>
                    <strong>
                      ${escapeHtml(category)}
                    </strong>
                  </span>

                  <span
                    style="font-weight:600;"
                  >
                    ${formatCurrency(amount)}
                  </span>
                </div>

                <div class="bar-wrapper">
                  <div
                    class="bar-fill"
                    style="width:${percentage}%"
                  ></div>
                </div>
              </li>
            `;
        }
      )
      .join("")}
    </ul>
  `;
}


/* ============================================================================
   MONTHLY REPORT
   ============================================================================ */

async function loadMonthlyReport() {
  const container =
    document.getElementById(
      "monthlyReportContainer"
    );

  if (!container) {
    return;
  }

  try {
    const data =
      await apiRequest(
        "/summary/monthly",
        {
          method: "GET"
        }
      );

    let entries = [];

    if (Array.isArray(data)) {
      entries =
        data.map(item => {
          const year =
            item.year;

          const month =
            item.month;

          let label =
            item.month ||
            item.date ||
            "Unknown";

          if (
            year !== undefined &&
            month !== undefined &&
            Number.isFinite(
              Number(year)
            )
          ) {
            const date =
              new Date(
                Number(year),
                Number(month) - 1,
                1
              );

            label =
              date.toLocaleString(
                "default",
                {
                  month: "short",
                  year: "numeric"
                }
              );
          }

          return [
            label,
            Number(
              item.total ??
              item.amount ??
              0
            )
          ];
        });

    } else if (
      data &&
      typeof data === "object"
    ) {
      entries =
        Object.entries(data).map(
          ([label, amount]) => [
            label,
            Number(amount) || 0
          ]
        );
    }

    entries =
      entries.filter(
        ([, amount]) =>
          Number(amount) > 0
      );

    if (entries.length === 0) {
      container.innerHTML = `
        <div
          class="empty-state"
          style="padding:24px 0;"
        >
          <p>
            No monthly trends recorded yet.
          </p>
        </div>
      `;

      return;
    }

    entries.sort(
      ([a], [b]) =>
        String(a).localeCompare(
          String(b)
        )
    );

    const max =
      Math.max(
        ...entries.map(
          ([, amount]) =>
            Number(amount) || 0
        ),
        1
      );

    container.innerHTML = `
      <ul class="report-list">
        ${entries
        .map(
          ([month, amount]) => {
            const value =
              Number(amount) || 0;

            const percentage =
              Math.round(
                (value / max) * 100
              );

            return `
                <li
                  class="report-list-item"
                  style="
                    flex-direction:column;
                    align-items:stretch;
                  "
                >
                  <div
                    style="
                      display:flex;
                      justify-content:space-between;
                      margin-bottom:4px;
                    "
                  >
                    <span>
                      <strong>
                        ${escapeHtml(month)}
                      </strong>
                    </span>

                    <span
                      style="font-weight:600;"
                    >
                      ${formatCurrency(value)}
                    </span>
                  </div>

                  <div class="bar-wrapper">
                    <div
                      class="bar-fill"
                      style="width:${percentage}%"
                    ></div>
                  </div>
                </li>
              `;
          }
        )
        .join("")}
      </ul>
    `;

  } catch (error) {
    console.error(
      "Monthly report error:",
      error
    );

    renderLocalMonthlyReport(
      container
    );
  }
}


/* ============================================================================
   LOCAL MONTHLY REPORT FALLBACK
   ============================================================================ */

function renderLocalMonthlyReport(
  container
) {
  if (
    typeof window.getAllTransactions !==
    "function"
  ) {
    return;
  }

  const transactions =
    window.getAllTransactions();

  if (!Array.isArray(transactions)) {
    return;
  }

  const totals = {};

  transactions.forEach(
    transaction => {
      if (
        String(
          transaction.type || ""
        ).toLowerCase() !==
        "expense"
      ) {
        return;
      }

      const date =
        String(
          transaction.date || ""
        );

      const monthKey =
        date.slice(0, 7);

      if (!/^\d{4}-\d{2}$/.test(monthKey)) {
        return;
      }

      totals[monthKey] =
        (totals[monthKey] || 0) +
        (Number(transaction.amount) || 0);
    }
  );

  const entries =
    Object.entries(totals)
      .filter(
        ([, amount]) =>
          amount > 0
      )
      .sort(
        ([a], [b]) =>
          a.localeCompare(b)
      );

  if (entries.length === 0) {
    container.innerHTML = `
      <div
        class="empty-state"
        style="padding:24px 0;"
      >
        <p>
          No monthly trends recorded yet.
        </p>
      </div>
    `;

    return;
  }

  const max =
    Math.max(
      ...entries.map(
        ([, amount]) =>
          amount
      ),
      1
    );

  container.innerHTML = `
    <ul class="report-list">
      ${entries
      .map(
        ([monthKey, amount]) => {
          const [year, month] =
            monthKey.split("-");

          const date =
            new Date(
              Number(year),
              Number(month) - 1,
              1
            );

          const label =
            date.toLocaleString(
              "default",
              {
                month: "short",
                year: "numeric"
              }
            );

          const percentage =
            Math.round(
              (amount / max) * 100
            );

          return `
              <li
                class="report-list-item"
                style="
                  flex-direction:column;
                  align-items:stretch;
                "
              >
                <div
                  style="
                    display:flex;
                    justify-content:space-between;
                    margin-bottom:4px;
                  "
                >
                  <span>
                    <strong>
                      ${escapeHtml(label)}
                    </strong>
                  </span>

                  <span
                    style="font-weight:600;"
                  >
                    ${formatCurrency(amount)}
                  </span>
                </div>

                <div class="bar-wrapper">
                  <div
                    class="bar-fill"
                    style="width:${percentage}%"
                  ></div>
                </div>
              </li>
            `;
        }
      )
      .join("")}
    </ul>
  `;
}


/* ============================================================================
   FINANCIAL INSIGHTS
   ============================================================================ */

function updateFinancialInsights(
  income,
  expenses,
  balance,
  transactions
) {
  const topCategoryEl =
    document.getElementById(
      "insightTopCategory"
    );

  const topCategoryPill =
    document.getElementById(
      "insightTopCategoryPill"
    );

  const largestExpenseEl =
    document.getElementById(
      "insightLargestExpense"
    );

  const largestExpensePill =
    document.getElementById(
      "insightLargestExpensePill"
    );

  const dailyAverageEl =
    document.getElementById(
      "insightDailyAverage"
    );

  const cashFlowStatusEl =
    document.getElementById(
      "insightCashFlowStatus"
    );

  const cashFlowPill =
    document.getElementById(
      "insightCashFlowPill"
    );

  const safeTransactions =
    Array.isArray(transactions)
      ? transactions
      : [];

  const expensesList =
    safeTransactions.filter(
      transaction =>
        String(
          transaction.type || ""
        ).toLowerCase() ===
        "expense"
    );

  const categoryTotals = {};

  expensesList.forEach(
    transaction => {
      const category =
        getTransactionCategoryName(
          transaction
        );

      categoryTotals[category] =
        (categoryTotals[category] || 0) +
        (Number(transaction.amount) || 0);
    }
  );

  let topCategory = "None";
  let topAmount = 0;

  Object.entries(
    categoryTotals
  ).forEach(
    ([category, amount]) => {
      if (amount > topAmount) {
        topCategory = category;
        topAmount = amount;
      }
    }
  );

  if (topCategoryEl) {
    topCategoryEl.textContent =
      topCategory;
  }

  if (topCategoryPill) {
    topCategoryPill.textContent =
      formatCurrency(topAmount);
  }

  let largestExpense = null;

  expensesList.forEach(
    transaction => {
      const amount =
        Number(
          transaction.amount
        ) || 0;

      if (
        !largestExpense ||
        amount >
        largestExpense.amount
      ) {
        largestExpense = {
          description:
            transaction.description ||
            getTransactionCategoryName(
              transaction
            ) ||
            "Expense",
          amount
        };
      }
    }
  );

  if (largestExpenseEl) {
    largestExpenseEl.textContent =
      largestExpense
        ? largestExpense.description
        : "None";
  }

  if (largestExpensePill) {
    largestExpensePill.textContent =
      largestExpense
        ? formatCurrency(
          largestExpense.amount
        )
        : formatCurrency(0);
  }

  if (dailyAverageEl) {
    dailyAverageEl.textContent =
      `${formatCurrency(
        expenses / 30
      )} / day`;
  }

  if (
    cashFlowStatusEl &&
    cashFlowPill
  ) {
    if (balance > 500) {
      cashFlowStatusEl.textContent =
        "Strong Surplus";

      cashFlowPill.textContent =
        "Healthy";

      cashFlowPill.className =
        "insight-pill badge badge-emerald";

    } else if (balance >= 0) {
      cashFlowStatusEl.textContent =
        "Modest Positive";

      cashFlowPill.textContent =
        "Stable";

      cashFlowPill.className =
        "insight-pill badge badge-blue";

    } else {
      cashFlowStatusEl.textContent =
        "Net Negative";

      cashFlowPill.textContent =
        "Attention";

      cashFlowPill.className =
        "insight-pill badge badge-rose";
    }
  }
}


/* ============================================================================
   TRANSACTION HELPERS
   ============================================================================ */

function getTransactionCategoryName(
  transaction
) {
  if (!transaction) {
    return "Other";
  }

  if (transaction.category) {
    if (
      typeof transaction.category ===
      "string"
    ) {
      return transaction.category;
    }

    if (
      typeof transaction.category ===
      "object" &&
      transaction.category.name
    ) {
      return String(
        transaction.category.name
      );
    }
  }

  if (transaction.category_name) {
    return String(
      transaction.category_name
    );
  }

  if (
    transaction.category_id !==
    undefined &&
    typeof window.getCategoryName ===
    "function"
  ) {
    const name =
      window.getCategoryName(
        transaction.category_id
      );

    if (name) {
      return name;
    }
  }

  return "Other";
}


/* ============================================================================
   DATE HELPERS
   ============================================================================ */

function getTodayDate() {
  const now =
    new Date();

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

function getCurrentMonthKey() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  return `${year}-${month}`;
}


/* ============================================================================
   HTML ESCAPE
   ============================================================================ */

function escapeHtml(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}


/* ============================================================================
   GLOBAL FUNCTIONS
   ============================================================================ */

window.formatCurrency =
  formatCurrency;

window.convertCurrency =
  convertCurrency;

window.fetchExchangeRate =
  fetchExchangeRate;

window.refreshDashboard =
  refreshDashboard;

window.loadFinancialSummary =
  loadFinancialSummary;

window.loadCategoryReport =
  loadCategoryReport;

window.loadMonthlyReport =
  loadMonthlyReport;

window.getTransactionCategoryName =
  getTransactionCategoryName;

window.getTodayDate =
  getTodayDate;

window.getCurrentMonthKey =
  getCurrentMonthKey;