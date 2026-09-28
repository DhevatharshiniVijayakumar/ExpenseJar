const API_BASE_URL = "http://localhost:8080/api";
const CURRENT_USER_ID = 1;

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

let categories = [];
let allExpenses = [];
let allBudgets = [];

function formatCurrency(amount) {
  return inrFormatter.format(amount || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getMonthName(m) {
  return MONTH_NAMES[parseInt(m) - 1] || "";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

async function apiFetch(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, options);
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
    }
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return await response.json();
    }
    return await response.text();
  } catch (error) {
    console.error(`API error for ${path}:`, error);
    throw error;
  }
}

function showError(message) {
  showToast(message, "error");
}

function showSuccess(message) {
  showToast(message, "success");
}

function showWarning(message) {
  showToast(message, "warning");
}

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 6000);
}

function showLoading(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.innerHTML = '<div class="loading">Loading</div>';
}

function showEmpty(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) el.innerHTML = `<div class="empty-state">${message}</div>`;
}

function getCategoryName(id) {
  const cat = categories.find(c => c.id == id);
  return cat ? cat.name : "Unknown";
}

function navigateToPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(`page-${page}`).classList.add("active");
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.querySelector(`.nav-item[data-page="${page}"]`).classList.add("active");
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add("active");
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
}

function populateCategoryDropdowns() {
  const dropdowns = ["expense-category", "budget-category", "expense-filter-category"];
  dropdowns.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const isFilter = id.includes("filter");
    el.innerHTML = isFilter ? '<option value="">All Categories</option>' : "";
    categories.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      el.appendChild(opt);
    });
  });
}

async function loadCategories() {
  try {
    const data = await apiFetch("/categories");
    categories = Array.isArray(data) ? data : [];
    populateCategoryDropdowns();
    renderCategories();
  } catch (error) {
    showError("Failed to load categories: " + error.message);
    showEmpty("categories-table-body", "No categories found");
  }
}

function renderCategories() {
  const tbody = document.getElementById("categories-table-body");
  if (!categories.length) {
    showEmpty("categories-table-body", "No categories found");
    return;
  }
  tbody.innerHTML = categories.map(c => `
    <tr>
      <td>${c.id}</td>
      <td>${escapeHtml(c.name)}</td>
    </tr>
  `).join("");
}

async function loadExpenses() {
  showLoading("expenses-table-body");
  try {
    const data = await apiFetch(`/expenses/user/${CURRENT_USER_ID}`);
    allExpenses = Array.isArray(data) ? data : [];
    renderExpenses();
  } catch (error) {
    showError("Failed to load expenses: " + error.message);
    showEmpty("expenses-table-body", "No expenses found");
  }
}

function renderExpenses() {
  const search = document.getElementById("expense-search").value.toLowerCase();
  const filterCat = document.getElementById("expense-filter-category").value;
  const filterMonth = document.getElementById("expense-filter-month").value;

  let filtered = allExpenses;

  if (search) {
    filtered = filtered.filter(e => (e.description || "").toLowerCase().includes(search));
  }
  if (filterCat) {
    filtered = filtered.filter(e => e.categoryId == filterCat);
  }
  if (filterMonth) {
    filtered = filtered.filter(e => {
      const d = new Date(e.date);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return ym === filterMonth;
    });
  }

  const tbody = document.getElementById("expenses-table-body");

  if (!filtered.length) {
    showEmpty("expenses-table-body", "No expenses found");
    return;
  }

  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  tbody.innerHTML = sorted.map(e => `
    <tr>
      <td>${formatDate(e.date)}</td>
      <td>${escapeHtml(e.description)}</td>
      <td>${escapeHtml(getCategoryName(e.categoryId))}</td>
      <td class="amount-col amount">${formatCurrency(e.amount)}</td>
    </tr>
  `).join("");
}

async function loadBudgets() {
  showLoading("budgets-table-body");
  try {
    const data = await apiFetch("/budgets");
    allBudgets = Array.isArray(data) ? data : [];
    await renderBudgets();
  } catch (error) {
    showError("Failed to load budgets: " + error.message);
    showEmpty("budgets-table-body", "No budgets found");
  }
}

async function renderBudgets() {
  const tbody = document.getElementById("budgets-table-body");

  if (!allBudgets.length) {
    showEmpty("budgets-table-body", "No budgets found");
    return;
  }

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const rows = [];
  for (const b of allBudgets) {
    const catName = getCategoryName(b.categoryId);
    const month = b.month || currentMonth;
    const monthLabel = formatMonthLabel(month);
    const budgetAmount = b.amount || 0;

    let spent = 0;
    try {
      const check = await apiFetch(`/budgets/check?userId=${CURRENT_USER_ID}&categoryId=${b.categoryId}&month=${month}`);
      if (typeof check === "number") {
        spent = check;
      } else if (check && typeof check === "object") {
        spent = check.spent || check.totalSpent || check.amount || 0;
      }
    } catch {
      spent = calculateSpentForCategory(b.categoryId, month);
    }

    const remaining = budgetAmount - spent;
    const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
    let status = "normal";
    let statusLabel = "Normal";
    if (percentage >= 100) {
      status = "exceeded";
      statusLabel = "Exceeded";
    } else if (percentage >= 90) {
      status = "warning";
      statusLabel = "Warning";
    }

    rows.push(`
      <tr>
        <td>${escapeHtml(catName)}</td>
        <td>${escapeHtml(monthLabel)}</td>
        <td class="amount-col amount">${formatCurrency(budgetAmount)}</td>
        <td class="amount-col">${formatCurrency(spent)}</td>
        <td class="amount-col">${formatCurrency(remaining)}</td>
        <td>${percentage.toFixed(1)}%</td>
        <td><span class="status-badge status-${status}">${statusLabel}</span></td>
      </tr>
    `);
  }

  tbody.innerHTML = rows.join("");
}

function calculateSpentForCategory(categoryId, month) {
  const [year, m] = month.split("-");
  return allExpenses
    .filter(e => {
      const d = new Date(e.date);
      return e.categoryId == categoryId &&
        d.getFullYear() == parseInt(year) &&
        (d.getMonth() + 1) == parseInt(m);
    })
    .reduce((sum, e) => sum + (e.amount || 0), 0);
}

function formatMonthLabel(month) {
  if (!month) return "—";
  const [y, m] = month.split("-");
  return m ? `${getMonthName(m)} ${y}` : month;
}

async function loadDashboard() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  showLoading("category-spending");
  showLoading("budget-progress");
  showLoading("recent-expenses");

  await loadMonthlyExpenses(year, month);
  await loadDashboardBudgetProgress();
  loadRecentExpenses();
}

async function loadMonthlyExpenses(year, month) {
  try {
    const data = await apiFetch(`/expenses/monthly?userId=${CURRENT_USER_ID}&year=${year}&month=${month}`);
    const expenses = Array.isArray(data) ? data : [];

    const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    document.getElementById("monthly-total").textContent = formatCurrency(total);

    const breakdown = {};
    expenses.forEach(e => {
      const cat = getCategoryName(e.categoryId);
      breakdown[cat] = (breakdown[cat] || 0) + (e.amount || 0);
    });

    const breakdownEl = document.getElementById("monthly-breakdown");
    if (Object.keys(breakdown).length === 0) {
      breakdownEl.innerHTML = '<div class="empty-state">No expenses found for this month</div>';
    } else {
      breakdownEl.innerHTML = Object.entries(breakdown)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amt]) => `
          <div class="breakdown-item">
            <span class="breakdown-label"><span class="breakdown-dot"></span>${escapeHtml(cat)}</span>
            <span class="breakdown-amount">${formatCurrency(amt)}</span>
          </div>
        `).join("");
    }

    renderCategorySpending(breakdown, total);
    updateSummaryCards(expenses, total);
  } catch (error) {
    showError("Failed to load monthly expenses: " + error.message);
    document.getElementById("monthly-total").textContent = formatCurrency(0);
    showEmpty("monthly-breakdown", "No expenses found");
    showEmpty("category-spending", "No expenses found");
  }
}

function renderCategorySpending(breakdown, total) {
  const el = document.getElementById("category-spending");
  if (!Object.keys(breakdown).length) {
    el.innerHTML = '<div class="empty-state">No expenses found for this month</div>';
    return;
  }
  el.innerHTML = Object.entries(breakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => {
      const pct = total > 0 ? (amt / total * 100).toFixed(1) : 0;
      return `
        <div class="breakdown-item">
          <span class="breakdown-label"><span class="breakdown-dot"></span>${escapeHtml(cat)}</span>
          <span class="breakdown-amount">${formatCurrency(amt)} (${pct}%)</span>
        </div>
      `;
    }).join("");
}

function updateSummaryCards(expenses, totalSpent) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  let totalBudget = 0;
  allBudgets.forEach(b => {
    if (!b.month || b.month === currentMonth) {
      totalBudget += b.amount || 0;
    }
  });

  const budgetUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const remaining = totalBudget - totalSpent;

  document.getElementById("total-spent").textContent = formatCurrency(totalSpent);
  document.getElementById("total-budget").textContent = formatCurrency(totalBudget);
  document.getElementById("budget-used").textContent = budgetUsed.toFixed(1) + "%";
  document.getElementById("remaining").textContent = formatCurrency(remaining);
}

async function loadDashboardBudgetProgress() {
  const el = document.getElementById("budget-progress");
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  if (!allBudgets.length) {
    el.innerHTML = '<div class="empty-state">No budgets found</div>';
    return;
  }

  const currentBudgets = allBudgets.filter(b => !b.month || b.month === currentMonth);

  if (!currentBudgets.length) {
    el.innerHTML = '<div class="empty-state">No budgets found for this month</div>';
    return;
  }

  const items = [];
  for (const b of currentBudgets) {
    const catName = getCategoryName(b.categoryId);
    const budgetAmount = b.amount || 0;
    let spent = 0;

    try {
      const check = await apiFetch(`/budgets/check?userId=${CURRENT_USER_ID}&categoryId=${b.categoryId}&month=${b.month || currentMonth}`);
      if (typeof check === "number") {
        spent = check;
      } else if (check && typeof check === "object") {
        spent = check.spent || check.totalSpent || check.amount || 0;
      }
    } catch {
      spent = calculateSpentForCategory(b.categoryId, b.month || currentMonth);
    }

    const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
    let fillClass = "normal";
    if (percentage >= 100) fillClass = "danger";
    else if (percentage >= 90) fillClass = "warning";

    const warningBadge = percentage >= 90
      ? '<span class="warning-badge">Warning</span>'
      : "";

    const fillWidth = Math.min(percentage, 100);

    items.push(`
      <div class="progress-item">
        <div class="progress-info">
          <span class="progress-label">${escapeHtml(catName)} ${warningBadge}</span>
          <span class="progress-amounts">${formatCurrency(spent)} / ${formatCurrency(budgetAmount)} (${percentage.toFixed(1)}%)</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${fillClass}" style="width: ${fillWidth}%"></div>
        </div>
      </div>
    `);
  }

  el.innerHTML = items.join("");
}

function loadRecentExpenses() {
  const el = document.getElementById("recent-expenses");
  if (!allExpenses.length) {
    el.innerHTML = '<div class="empty-state">No expenses found</div>';
    return;
  }
  const sorted = [...allExpenses].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = sorted.slice(0, 5);

  el.innerHTML = recent.map(e => `
    <div class="breakdown-item">
      <span class="breakdown-label">
        <span class="breakdown-dot"></span>
        ${escapeHtml(e.description)} — <span style="color:var(--gray-400)">${escapeHtml(getCategoryName(e.categoryId))} · ${formatDate(e.date)}</span>
      </span>
      <span class="breakdown-amount">${formatCurrency(e.amount)}</span>
    </div>
  `).join("");
}

async function addExpense(e) {
  e.preventDefault();
  const amount = document.getElementById("expense-amount").value;
  const categoryId = document.getElementById("expense-category").value;
  const date = document.getElementById("expense-date").value;
  const description = document.getElementById("expense-description").value;

  if (!amount || !categoryId || !date || !description) {
    showError("Please fill in all fields");
    return;
  }

  const submitBtn = document.getElementById("submit-expense");
  submitBtn.disabled = true;
  submitBtn.textContent = "Adding...";

  const params = new URLSearchParams({
    amount: amount,
    date: date,
    description: description,
    userId: CURRENT_USER_ID,
    categoryId: categoryId
  });

  try {
    const response = await fetch(`${API_BASE_URL}/expenses?${params.toString()}`, {
      method: "POST"
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(errText || `HTTP ${response.status}`);
    }

    const message = await response.text();

    closeModal("modal-expense");

    if (message && message.toLowerCase().includes("warning")) {
      showWarning(message);
    } else if (message) {
      showSuccess(message);
    } else {
      showSuccess("Expense added successfully");
    }

    document.getElementById("form-expense").reset();

    await loadExpenses();
    await loadDashboard();
  } catch (error) {
    console.error("Add expense error:", error);
    showError("Failed to add expense: " + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Add Expense";
  }
}

async function addBudget(e) {
  e.preventDefault();
  const categoryId = document.getElementById("budget-category").value;
  const amount = document.getElementById("budget-amount").value;
  const month = document.getElementById("budget-month").value;

  if (!categoryId || !amount || !month) {
    showError("Please fill in all fields");
    return;
  }

  const submitBtn = document.getElementById("submit-budget");
  submitBtn.disabled = true;
  submitBtn.textContent = "Adding...";

  const params = new URLSearchParams({
    amount: amount,
    month: month,
    userId: CURRENT_USER_ID,
    categoryId: categoryId
  });

  try {
    const response = await fetch(`${API_BASE_URL}/budgets?${params.toString()}`, {
      method: "POST"
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(errText || `HTTP ${response.status}`);
    }

    const message = await response.text();
    closeModal("modal-budget");
    showSuccess(message || "Budget added successfully");
    document.getElementById("form-budget").reset();
    await loadBudgets();
    await loadDashboard();
  } catch (error) {
    console.error("Add budget error:", error);
    showError("Failed to add budget: " + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Add Budget";
  }
}

async function addCategory(e) {
  e.preventDefault();
  const name = document.getElementById("category-name").value;

  if (!name) {
    showError("Please enter a category name");
    return;
  }

  const submitBtn = document.getElementById("submit-category");
  submitBtn.disabled = true;
  submitBtn.textContent = "Adding...";

  try {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(errText || `HTTP ${response.status}`);
    }

    closeModal("modal-category");
    showSuccess("Category added successfully");
    document.getElementById("form-category").reset();
    await loadCategories();
    await loadDashboard();
  } catch (error) {
    console.error("Add category error:", error);
    showError("Failed to add category: " + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Add Category";
  }
}

function populateMonthSelectors() {
  const now = new Date();
  const currentYear = now.getFullYear();

  const yearSelect = document.getElementById("dashboard-year");
  for (let y = currentYear - 3; y <= currentYear + 1; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    if (y === currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  }

  const monthSelect = document.getElementById("dashboard-month");
  MONTH_NAMES.forEach((name, i) => {
    const opt = document.createElement("option");
    opt.value = i + 1;
    opt.textContent = name;
    if (i === now.getMonth()) opt.selected = true;
    monthSelect.appendChild(opt);
  });
}

function setupEventListeners() {
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      navigateToPage(page);
      if (page === "expenses") loadExpenses();
      if (page === "budgets") loadBudgets();
      if (page === "categories") loadCategories();
    });
  });

  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.closest(".modal-overlay").classList.remove("active");
    });
  });

  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("active");
    });
  });

  document.getElementById("btn-add-expense").addEventListener("click", () => openModal("modal-expense"));
  document.getElementById("btn-add-expense-dashboard").addEventListener("click", () => openModal("modal-expense"));
  document.getElementById("btn-add-budget").addEventListener("click", () => openModal("modal-budget"));
  document.getElementById("btn-add-category").addEventListener("click", () => openModal("modal-category"));

  document.getElementById("form-expense").addEventListener("submit", addExpense);
  document.getElementById("form-budget").addEventListener("submit", addBudget);
  document.getElementById("form-category").addEventListener("submit", addCategory);

  document.getElementById("expense-search").addEventListener("input", renderExpenses);
  document.getElementById("expense-filter-category").addEventListener("change", renderExpenses);
  document.getElementById("expense-filter-month").addEventListener("change", renderExpenses);

  document.getElementById("dashboard-year").addEventListener("change", () => {
    const y = document.getElementById("dashboard-year").value;
    const m = document.getElementById("dashboard-month").value;
    loadMonthlyExpenses(y, m);
  });
  document.getElementById("dashboard-month").addEventListener("change", () => {
    const y = document.getElementById("dashboard-year").value;
    const m = document.getElementById("dashboard-month").value;
    loadMonthlyExpenses(y, m);
  });

  const today = new Date().toISOString().split("T")[0];
  document.getElementById("expense-date").value = today;
  const currentMonthValue = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  document.getElementById("budget-month").value = currentMonthValue;
}

async function init() {
  populateMonthSelectors();
  setupEventListeners();
  await loadCategories();
  await loadExpenses();
  await loadBudgets();
  await loadDashboard();
}

init();
