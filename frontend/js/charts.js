/**
 * charts.js
 * FinPulse Analytics page.
 *
 * IMPORTANT:
 * - Every financial value is loaded from the authenticated FastAPI API.
 * - No demo users, dummy transactions, or hard-coded financial records.
 * - This page uses the actual DOM in charts.html (SVG/custom containers).
 */

(() => {
  "use strict";

  const BASE_CURRENCY = "GHS";
  const CURRENCY_META = {
    GHS: { locale: "en-GH", code: "GHS" },
    USD: { locale: "en-US", code: "USD" }
  };

  let allTransactions = [];
  let categorySummary = [];
  let monthlySummary = [];
  let currentPeriod = "all";
  let viewType = "expense";
  let exchangeRate = 1;
  let selectedCurrency =
    localStorage.getItem("finpulse_currency") || BASE_CURRENCY;

  if (!CURRENCY_META[selectedCurrency]) {
    selectedCurrency = BASE_CURRENCY;
  }

  const $ = id => document.getElementById(id);

  function number(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatMoney(amount) {
    const meta = CURRENCY_META[selectedCurrency] || CURRENCY_META.GHS;
    return new Intl.NumberFormat(meta.locale, {
      style: "currency",
      currency: meta.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(number(amount) * exchangeRate);
  }

  function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function normalizeTransaction(item) {
    if (!item || typeof item !== "object") return null;

    const type = String(
      item.type ?? item.transaction_type ?? ""
    ).toLowerCase();

    const date = item.date ?? item.transaction_date ?? item.created_at ?? "";

    return {
      id: item.id ?? item._id ?? "",
      type: type === "income" ? "income" : "expense",
      amount: number(item.amount ?? item.value),
      category: String(
        item.category_name ??
        item.category ??
        item.category?.name ??
        "Uncategorized"
      ),
      description: String(
        item.description ??
        item.merchant ??
        item.note ??
        "Transaction"
      ),
      date: String(date)
    };
  }

  function normalizeCategorySummary(data) {
    if (!Array.isArray(data)) return [];

    return data
      .map(item => ({
        category: String(item.category ?? item.name ?? "Uncategorized"),
        total: number(item.total ?? item.amount)
      }))
      .filter(item => item.total > 0);
  }

  function normalizeMonthlySummary(data) {
    if (!Array.isArray(data)) return [];

    return data
      .map(item => ({
        year: number(item.year),
        month: number(item.month),
        total: number(item.total ?? item.amount)
      }))
      .filter(
        item =>
          item.year > 0 &&
          item.month >= 1 &&
          item.month <= 12
      )
      .sort((a, b) =>
        a.year - b.year || a.month - b.month
      );
  }

  function periodStart(period) {
    const now = new Date();

    if (period === "year") {
      return new Date(now.getFullYear(), 0, 1);
    }

    if (period === "6months") {
      return new Date(now.getFullYear(), now.getMonth() - 5, 1);
    }

    if (period === "30days") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 29);
      return start;
    }

    return null;
  }

  function filterTransactions() {
    const start = periodStart(currentPeriod);
    if (!start) return [...allTransactions];

    return allTransactions.filter(transaction => {
      const date = parseDate(transaction.date);
      return date && date >= start;
    });
  }

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  function setUserDisplay() {
    const email = String(
      localStorage.getItem("user_email") || ""
    ).trim();

    const name = String(
      localStorage.getItem("user_name") || ""
    ).trim();

    const display = name || email || "Account";
    setText("userEmailDisplay", display);

    const avatar = $("userAvatar");
    if (avatar) {
      if (name) {
        const parts = name.split(/\s+/).filter(Boolean);
        avatar.textContent =
          parts.length > 1
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : name.slice(0, 2).toUpperCase();
      } else if (email) {
        avatar.textContent = email.split("@")[0].slice(0, 2).toUpperCase();
      } else {
        avatar.textContent = "U";
      }
    }
  }

  async function loadData() {
    const [transactionsResult, categoriesResult, monthlyResult] =
      await Promise.all([
        apiRequest("/transactions/", { method: "GET" }),
        apiRequest("/summary/categories", { method: "GET" }),
        apiRequest("/summary/monthly", { method: "GET" })
      ]);

    const transactionRows = Array.isArray(transactionsResult)
      ? transactionsResult
      : Array.isArray(transactionsResult?.transactions)
        ? transactionsResult.transactions
        : Array.isArray(transactionsResult?.data)
          ? transactionsResult.data
          : [];

    allTransactions = transactionRows
      .map(normalizeTransaction)
      .filter(Boolean);

    categorySummary = normalizeCategorySummary(categoriesResult);
    monthlySummary = normalizeMonthlySummary(monthlyResult);

    // The backend summary endpoints return expense-only category/month totals.
    // For the analytics page we use the authenticated user's transaction rows
    // as the source of truth for the income/expense comparison.
  }

  async function loadExchangeRate() {
    if (selectedCurrency === BASE_CURRENCY) {
      exchangeRate = 1;
      return;
    }

    try {
      const response = await fetch(
        `https://api.frankfurter.dev/v1/latest?base=${BASE_CURRENCY}&symbols=${selectedCurrency}`,
        { headers: { Accept: "application/json" } }
      );

      if (!response.ok) throw new Error("Exchange rate unavailable.");

      const data = await response.json();
      const rate = number(data?.rates?.[selectedCurrency]);

      exchangeRate = rate > 0 ? rate : 1;
    } catch (error) {
      console.warn("Using GHS display because exchange rate failed.", error);
      selectedCurrency = BASE_CURRENCY;
      exchangeRate = 1;
    }
  }

  function getMonthlyCashFlow(transactions) {
    const map = new Map();

    transactions.forEach(transaction => {
      const date = parseDate(transaction.date);
      if (!date) return;

      const key =
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!map.has(key)) {
        map.set(key, { key, income: 0, expense: 0 });
      }

      const row = map.get(key);
      if (transaction.type === "income") {
        row.income += transaction.amount;
      } else {
        row.expense += transaction.amount;
      }
    });

    return [...map.values()].sort((a, b) =>
      a.key.localeCompare(b.key)
    );
  }

  function getCategoryTotals(transactions) {
    const totals = new Map();

    transactions
      .filter(transaction =>
        viewType === "income"
          ? transaction.type === "income"
          : transaction.type === "expense"
      )
      .forEach(transaction => {
        const category = transaction.category || "Uncategorized";
        totals.set(
          category,
          (totals.get(category) || 0) + transaction.amount
        );
      });

    return [...totals.entries()]
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }

  function renderKpis(transactions) {
    const relevant = transactions.filter(t =>
      viewType === "income"
        ? t.type === "income"
        : t.type === "expense"
    );

    const total = relevant.reduce((sum, t) => sum + t.amount, 0);
    const categories = getCategoryTotals(transactions);
    const top = categories[0];

    const monthly = getMonthlyCashFlow(transactions);
    const peak = [...monthly].sort(
      (a, b) =>
        (viewType === "income" ? b.income : b.expense) -
        (viewType === "income" ? a.income : a.expense)
    )[0];

    const monthsWithData = monthly.filter(row =>
      viewType === "income" ? row.income > 0 : row.expense > 0
    );

    const averageMonthly =
      monthsWithData.length
        ? total / monthsWithData.length
        : 0;

    setText("kpiTotalAnalyzed", formatMoney(total));
    setText(
      "kpiTotalAnalyzedSub",
      `${relevant.length} transaction${relevant.length === 1 ? "" : "s"} in selected time range`
    );

    setText("kpiTopCategory", top?.category || "None");
    setText(
      "kpiTopCategorySub",
      top
        ? `${formatMoney(top.total)} of total`
        : `${formatMoney(0)} of total`
    );

    setText(
      "kpiPeakMonth",
      peak ? formatMonthKey(peak.key) : "None"
    );

    setText(
      "kpiPeakMonthSub",
      peak
        ? `${formatMoney(viewType === "income" ? peak.income : peak.expense)} recorded`
        : `${formatMoney(0)} recorded`
    );

    setText("kpiAvgMonthly", formatMoney(averageMonthly));
    setText(
      "kpiAvgMonthlySub",
      "Average monthly outflow"
    );

    setText(
      "pieCenterLabel",
      viewType === "income" ? "Total Income" : "Total Spent"
    );
    setText("pieCenterValue", formatMoney(total));
    setText(
      "pieChartTitle",
      viewType === "income"
        ? "Income Breakdown by Category"
        : "Expense Breakdown by Category"
    );
  }

  function formatMonthKey(key) {
    const [year, month] = String(key).split("-").map(Number);
    if (!year || !month) return key;

    return new Date(year, month - 1, 1).toLocaleDateString("en-GH", {
      month: "short",
      year: "numeric"
    });
  }

  function renderPie(categories) {
    const container = $("pieSvgContainer");
    const legend = $("pieLegendContainer");

    if (!container || !legend) return;

    if (!categories.length) {
      container.innerHTML = "";
      legend.innerHTML =
        `<p class="text-muted" style="font-size:13px;">No data recorded for the selected range.</p>`;
      return;
    }

    const total = categories.reduce((sum, item) => sum + item.total, 0);

    // Use an SVG donut. No chart library is required.
    const cx = 150;
    const cy = 150;
    const radius = 105;
    const circumference = 2 * Math.PI * radius;

    let offset = 0;

    const segments = categories.map((item, index) => {
      const length = total ? (item.total / total) * circumference : 0;
      const segment = {
        ...item,
        index,
        length,
        offset
      };
      offset += length;
      return segment;
    });

    const circles = segments
      .map(item => `
        <circle
          cx="${cx}"
          cy="${cy}"
          r="${radius}"
          fill="none"
          stroke="hsl(${item.index * 47 + 220} 70% 55%)"
          stroke-width="42"
          stroke-dasharray="${item.length} ${circumference - item.length}"
          stroke-dashoffset="${-item.offset}"
          transform="rotate(-90 ${cx} ${cy})"
        >
          <title>${escapeHtml(item.category)}: ${escapeHtml(formatMoney(item.total))}</title>
        </circle>
      `)
      .join("");

    container.innerHTML = `
      <svg viewBox="0 0 300 300"
           width="100%"
           height="100%"
           role="img"
           aria-label="Spending by category">
        <circle cx="150" cy="150" r="105" fill="none"
                stroke="var(--border-color, #e5e7eb)" stroke-width="42"></circle>
        ${circles}
      </svg>
    `;

    legend.innerHTML = segments
      .map(item => {
        const percent = total ? (item.total / total) * 100 : 0;
        return `
          <div class="pie-legend-item">
            <span class="pie-legend-dot"
                  style="background:hsl(${item.index * 47 + 220} 70% 55%);"></span>
            <span style="flex:1;">${escapeHtml(item.category)}</span>
            <strong>${escapeHtml(formatMoney(item.total))}</strong>
            <span class="text-muted" style="margin-left:6px;">
              ${percent.toFixed(1)}%
            </span>
          </div>
        `;
      })
      .join("");
  }

  function renderBarChart(monthly) {
    const container = $("barChartContainer");
    if (!container) return;

    if (!monthly.length) {
      container.innerHTML =
        `<p class="text-muted" style="font-size:13px;text-align:center;padding:24px;">No monthly transaction data recorded yet.</p>`;
      return;
    }

    const width = 900;
    const height = 320;
    const left = 55;
    const right = 20;
    const top = 20;
    const bottom = 60;
    const chartWidth = width - left - right;
    const chartHeight = height - top - bottom;

    const maxValue = Math.max(
      1,
      ...monthly.flatMap(row => [row.income, row.expense])
    );

    const groupWidth = chartWidth / monthly.length;
    const barWidth = Math.max(8, Math.min(28, groupWidth * 0.25));

    const bars = monthly.map((row, index) => {
      const center = left + groupWidth * index + groupWidth / 2;
      const incomeHeight = (row.income / maxValue) * chartHeight;
      const expenseHeight = (row.expense / maxValue) * chartHeight;

      const xIncome = center - barWidth - 2;
      const xExpense = center + 2;
      const yIncome = top + chartHeight - incomeHeight;
      const yExpense = top + chartHeight - expenseHeight;

      return `
        <rect x="${xIncome}" y="${yIncome}" width="${barWidth}" height="${incomeHeight}"
              fill="var(--income, #10b981)" rx="3">
          <title>${escapeHtml(formatMonthKey(row.key))} income: ${escapeHtml(formatMoney(row.income))}</title>
        </rect>
        <rect x="${xExpense}" y="${yExpense}" width="${barWidth}" height="${expenseHeight}"
              fill="var(--expense, #ef4444)" rx="3">
          <title>${escapeHtml(formatMonthKey(row.key))} expenses: ${escapeHtml(formatMoney(row.expense))}</title>
        </rect>
        <text x="${center}" y="${height - 25}" text-anchor="middle"
              font-size="11" fill="currentColor">${escapeHtml(formatMonthKey(row.key))}</text>
      `;
    }).join("");

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="320"
           role="img" aria-label="Monthly income and expense comparison">
        <line x1="${left}" y1="${top + chartHeight}"
              x2="${width - right}" y2="${top + chartHeight}"
              stroke="currentColor" opacity=".2"></line>
        ${bars}
      </svg>
    `;
  }

  function renderTrend(monthly) {
    const container = $("trendChartContainer");
    if (!container) return;

    if (!monthly.length) {
      container.innerHTML =
        `<p class="text-muted" style="font-size:13px;text-align:center;padding:24px;">No spending trend data recorded yet.</p>`;
      return;
    }

    const width = 900;
    const height = 260;
    const left = 50;
    const right = 25;
    const top = 20;
    const bottom = 45;
    const chartWidth = width - left - right;
    const chartHeight = height - top - bottom;

    const values = monthly.map(row => row.expense);
    const maxValue = Math.max(1, ...values);

    const points = monthly.map((row, index) => {
      const x =
        monthly.length === 1
          ? left + chartWidth / 2
          : left + (index / (monthly.length - 1)) * chartWidth;

      const y =
        top + chartHeight - (row.expense / maxValue) * chartHeight;

      return { x, y, row };
    });

    const path = points
      .map((point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
      )
      .join(" ");

    const circles = points
      .map(point => `
        <circle cx="${point.x}" cy="${point.y}" r="4"
                fill="currentColor">
          <title>${escapeHtml(formatMonthKey(point.row.key))}: ${escapeHtml(formatMoney(point.row.expense))}</title>
        </circle>
        <text x="${point.x}" y="${height - 18}" text-anchor="middle"
              font-size="10" fill="currentColor">
          ${escapeHtml(formatMonthKey(point.row.key))}
        </text>
      `)
      .join("");

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="260"
           role="img" aria-label="Monthly expense trend">
        <line x1="${left}" y1="${top + chartHeight}"
              x2="${width - right}" y2="${top + chartHeight}"
              stroke="currentColor" opacity=".2"></line>
        <path d="${path}" fill="none" stroke="currentColor"
              stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
        ${circles}
      </svg>
    `;
  }

  function renderCategoryTable(categories) {
    const body = $("categoryTableBody");
    if (!body) return;

    if (!categories.length) {
      body.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">
            No category data recorded for the selected range.
          </td>
        </tr>
      `;
      return;
    }

    const total = categories.reduce((sum, item) => sum + item.total, 0);

    body.innerHTML = categories
      .map(item => {
        const count = filterTransactions().filter(transaction =>
          (transaction.category || "Uncategorized") === item.category &&
          (viewType === "income"
            ? transaction.type === "income"
            : transaction.type === "expense")
        ).length;

        const average = count ? item.total / count : 0;
        const share = total ? (item.total / total) * 100 : 0;

        return `
          <tr>
            <td>${escapeHtml(item.category)}</td>
            <td>${escapeHtml(formatMoney(item.total))}</td>
            <td>${share.toFixed(1)}%</td>
            <td>${count}</td>
            <td>${escapeHtml(formatMoney(average))}</td>
          </tr>
        `;
      })
      .join("");
  }

  function renderEmptyStateIfNeeded(transactions) {
    const hasData = transactions.length > 0;
    if (hasData) return;

    const message =
      currentPeriod === "all"
        ? "No transactions have been recorded for this account yet."
        : "No transactions were recorded in the selected time range.";

    ["pieLegendContainer", "barChartContainer", "trendChartContainer"].forEach(id => {
      const element = $(id);
      if (element) {
        element.innerHTML =
          `<p class="text-muted" style="font-size:13px;text-align:center;padding:24px;">${escapeHtml(message)}</p>`;
      }
    });

    const body = $("categoryTableBody");
    if (body) {
      body.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">
            ${escapeHtml(message)}
          </td>
        </tr>
      `;
    }
  }

  function render() {
    const transactions = filterTransactions();

    renderKpis(transactions);

    const categories = getCategoryTotals(transactions);
    renderPie(categories);
    renderCategoryTable(categories);

    const monthly = getMonthlyCashFlow(transactions);
    renderBarChart(monthly);
    renderTrend(monthly);

    renderEmptyStateIfNeeded(transactions);
  }

  async function refresh() {
    try {
      await loadExchangeRate();
      await loadData();
      render();
    } catch (error) {
      console.error("Analytics data load failed:", error);

      const message =
        error?.status === 401
          ? "Your session has expired. Please sign in again."
          : error?.message ||
            "Could not load analytics data from the backend.";

      ["pieLegendContainer", "barChartContainer", "trendChartContainer"].forEach(id => {
        const element = $(id);
        if (element) {
          element.innerHTML =
            `<p class="text-muted" style="font-size:13px;text-align:center;padding:24px;">${escapeHtml(message)}</p>`;
        }
      });
    }
  }

  function setupControls() {
    const period = $("chartsPeriodSelect");
    if (period) {
      currentPeriod = period.value || "all";
      period.addEventListener("change", () => {
        currentPeriod = period.value || "all";
        render();
      });
    }

    const expenseButton = $("toggleTypeExpense");
    const incomeButton = $("toggleTypeIncome");

    if (expenseButton) {
      expenseButton.addEventListener("click", () => {
        viewType = "expense";
        expenseButton.classList.add("active");
        incomeButton?.classList.remove("active");
        render();
      });
    }

    if (incomeButton) {
      incomeButton.addEventListener("click", () => {
        viewType = "income";
        incomeButton.classList.add("active");
        expenseButton?.classList.remove("active");
        render();
      });
    }

    const logout = $("headerLogoutBtn");
    if (logout && typeof window.handleLogout === "function") {
      logout.addEventListener("click", window.handleLogout);
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    setUserDisplay();
    setupControls();
    await refresh();
  });

  window.FinPulseCharts = {
    refresh
  };
})();
