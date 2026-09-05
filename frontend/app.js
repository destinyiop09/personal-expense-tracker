const API = localStorage.getItem("expense_api_url") || "https://personal-expense-tracker-1-dnqz.onrender.com";
const TOKEN_KEY = "expense_access_token";
const USER_KEY = "expense_user";

const state = {
  view: "dashboard",
  user: JSON.parse(localStorage.getItem(USER_KEY) || "null"),
  transactions: [],
  categories: [],
  summary: null,
  categorySummary: [],
  monthlySummary: [],
  filters: { type: "", category_id: "" },
  modal: false,
  authMode: "login",
  loading: false,
};

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money = (v) => {
  const n = Number(v || 0);
  return new Intl.NumberFormat(undefined, { style:"currency", currency:"GHS", maximumFractionDigits:2 }).format(n);
};
const dateLabel = (v) => v ? new Date(v + "T00:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}) : "—";
const initials = (name) => (name || "?").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(API + path, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); state.user = null;
    renderAuth(); throw new Error("Session expired. Please sign in again.");
  }
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const detail = data?.detail;
    const msg = Array.isArray(detail) ? detail.map(x=>x.msg).join(", ") : (detail || `Request failed (${res.status})`);
    throw new Error(msg);
  }
  return data;
}

function toast(message) {
  const root = $("#toast-root");
  root.innerHTML = `<div class="toast">${esc(message)}</div>`;
  setTimeout(()=>root.innerHTML="", 3200);
}

function renderAuth() {
  const register = state.authMode === "register";
  $("#app").innerHTML = `
    <main class="auth-shell">
      <section class="auth-visual">
        <div class="brand"><span class="brand-mark">↗</span> ExpenseFlow</div>
        <div class="auth-copy">
          <h1>Know where your money goes.</h1>
          <p>A focused personal finance workspace for tracking income, expenses, categories and monthly trends without the clutter.</p>
          <div class="feature-pills"><span class="pill">Live summaries</span><span class="pill">Smart charts</span><span class="pill">Secure sessions</span></div>
        </div>
        <small style="color:#8993a5;position:relative;z-index:1">Simple by design · Connected to your FastAPI backend</small>
      </section>
      <section class="auth-card-wrap">
        <div class="auth-card">
          <div class="brand" style="margin-bottom:26px"><span class="brand-mark">↗</span> ExpenseFlow</div>
          <h2>${register ? "Create your account" : "Welcome back"}</h2>
          <p class="sub">${register ? "Start building a clearer picture of your finances." : "Sign in to continue to your dashboard."}</p>
          <div id="auth-error"></div>
          <form id="auth-form" class="form-grid">
            ${register ? `<div class="field"><label for="name">Full name</label><input id="name" name="name" autocomplete="name" required placeholder="Alex Morgan"></div>` : ""}
            <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required placeholder="you@example.com"></div>
            <div class="field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="${register?"new-password":"current-password"}" minlength="6" required placeholder="••••••••"></div>
            <button class="btn btn-primary" type="submit">${register ? "Create account" : "Sign in"} <span>→</span></button>
          </form>
          <div class="auth-switch">${register ? "Already have an account?" : "New to ExpenseFlow?"}
            <button id="switch-auth">${register ? "Sign in" : "Create one"}</button>
          </div>
        </div>
      </section>
    </main>`;
  $("#switch-auth").onclick = () => { state.authMode = register ? "login" : "register"; renderAuth(); };
  $("#auth-form").onsubmit = handleAuth;
}

async function handleAuth(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = Object.fromEntries(fd.entries());
  const register = state.authMode === "register";
  const error = $("#auth-error");
  error.innerHTML = "";
  try {
    const result = await api(register ? "/auth/register" : "/auth/login", { method:"POST", body:JSON.stringify(payload) });
    if (register) {
      state.user = result;
      localStorage.setItem(USER_KEY, JSON.stringify(result));
      toast("Account created. Please sign in.");
      state.authMode = "login"; renderAuth();
    } else {
      localStorage.setItem(TOKEN_KEY, result.access_token);
      const me = await api("/auth/me");
      state.user = me;
      localStorage.setItem(USER_KEY, JSON.stringify(me));
      await loadDashboard();
    }
  } catch (err) {
    error.innerHTML = `<div class="error-box">${esc(err.message)}</div>`;
  }
}

async function loadDashboard() {
  state.loading = true; renderLoading();
  try {
    const [me, summary, cats, transactions, categorySummary, monthly] = await Promise.all([
      api("/auth/me"), api("/summary/"), api("/categories/"), api("/transactions/"), api("/summary/categories"), api("/summary/monthly")
    ]);
    state.user = me; state.summary = summary; state.categories = cats;
    state.transactions = transactions; state.categorySummary = categorySummary; state.monthlySummary = monthly;
    localStorage.setItem(USER_KEY, JSON.stringify(me));
    renderDashboard();
  } catch (err) {
    if (state.user) toast(err.message);
  } finally { state.loading = false; }
}

function renderLoading() { $("#app").innerHTML = `<div class="loading-screen"><div class="spinner"></div></div>`; }

function renderDashboard() {
  const title = state.view === "dashboard" ? "Overview" : state.view === "transactions" ? "Transactions" : "Profile";
  $("#app").innerHTML = `
  <div class="dashboard">
    <aside class="sidebar" id="sidebar">
      <div class="brand"><span class="brand-mark">↗</span> ExpenseFlow</div>
      <nav class="nav">
        <button data-view="dashboard" class="${state.view==="dashboard"?"active":""}">⌂ <span>Dashboard</span></button>
        <button data-view="transactions" class="${state.view==="transactions"?"active":""}">▤ <span>Transactions</span></button>
        <button data-view="profile" class="${state.view==="profile"?"active":""}">◯ <span>Profile</span></button>
      </nav>
      <div class="sidebar-foot">
        <div class="profile-mini"><div class="avatar">${esc(initials(state.user?.name))}</div><div style="min-width:0"><div class="name">${esc(state.user?.name)}</div><div class="email">${esc(state.user?.email)}</div></div></div>
        <button class="nav" id="logout" style="width:100%;margin-top:5px"><span style="padding:12px 14px;color:#aab4c5">↪ &nbsp; Sign out</span></button>
      </div>
    </aside>
    <section class="main">
      <header class="topbar">
        <div style="display:flex;align-items:center;gap:12px"><button class="btn btn-secondary mobile-menu" id="menu">☰</button><h1>${title}</h1></div>
        <div class="topbar-right"><div class="user-chip" style="font-size:13px;color:var(--muted)">Good to see you, <strong>${esc((state.user?.name||"").split(" ")[0])}</strong></div><button class="btn btn-primary" id="add-btn">+ Add transaction</button></div>
      </header>
      <main class="content" id="content"></main>
    </section>
  </div>
  ${state.modal ? modalHtml() : ""}`;
  document.querySelectorAll("[data-view]").forEach(b => b.onclick = () => { state.view=b.dataset.view; renderDashboard(); });
  $("#logout").onclick = logout;
  $("#add-btn").onclick = () => { state.modal=true; renderDashboard(); };
  if ($("#menu")) $("#menu").onclick = () => $("#sidebar").classList.toggle("open");
  if (state.modal) wireModal();
  if (state.view==="dashboard") renderOverview();
  if (state.view==="transactions") renderTransactions();
  if (state.view==="profile") renderProfile();
}

function renderOverview() {
  const s=state.summary || {total_income:0,total_expenses:0,balance:0};
  const recent=[...state.transactions].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,6);
  $("#content").innerHTML = `
    <div class="page-intro"><div><h2>Your financial snapshot</h2><p>Track the flow of money and spot patterns at a glance.</p></div></div>
    <section class="grid-kpi">
      <div class="card kpi"><div class="label">Total balance</div><div class="value">${money(s.balance)}</div><div class="hint">Income minus expenses</div></div>
      <div class="card kpi"><div class="label">Total income</div><div class="value income">${money(s.total_income)}</div><div class="hint">All recorded income</div></div>
      <div class="card kpi"><div class="label">Total expenses</div><div class="value expense">${money(s.total_expenses)}</div><div class="hint">All recorded expenses</div></div>
    </section>
    <section class="analytics">
      <div class="card"><div class="card-head"><h3>Monthly spending</h3><span>Expense trend</span></div><div class="chart-wrap">${monthlyChart()}</div></div>
      <div class="card"><div class="card-head"><h3>Spending by category</h3><span>Expenses only</span></div>${donutChart()}</div>
    </section>
    <section class="card transactions-card"><div class="card-head"><h3>Recent transactions</h3><button class="btn btn-secondary" id="all-tx">View all</button></div>
      ${transactionTable(recent)}
    </section>`;
  $("#all-tx").onclick=()=>{state.view="transactions";renderDashboard();};
}

function monthlyChart() {
  const data=state.monthlySummary.slice(-8), vals=data.map(x=>Number(x.total||0)), max=Math.max(...vals,1);
  if (!data.length) return `<div class="empty">Add a few expenses to see your monthly trend.</div>`;
  const w=760,h=230,pad=28;
  const pts=data.map((x,i)=>({x:pad+i*(w-pad*2)/Math.max(data.length-1,1),y:h-pad-(Number(x.total||0)/max)*(h-pad*2)}));
  const line=pts.map(p=>`${p.x},${p.y}`).join(" ");
  const area=`${pts[0].x},${h-pad} ${line} ${pts[pts.length-1].x},${h-pad}`;
  return `<svg class="chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <defs><linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%"/><stop offset="100%" stop-opacity="0"/></linearGradient></defs>
    <line class="chart-gridline" x1="28" y1="55" x2="732" y2="55"/><line class="chart-gridline" x1="28" y1="115" x2="732" y2="115"/><line class="chart-gridline" x1="28" y1="175" x2="732" y2="175"/>
    <polygon class="chart-area" points="${area}"/><polyline class="chart-line" points="${line}"/>
    ${pts.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="4" fill="#fff" stroke="#635bff" stroke-width="2"><title>${money(vals[i])}</title></circle>`).join("")}
    ${data.map((x,i)=>`<text x="${pts[i].x}" y="218" text-anchor="middle" font-size="10" fill="#8a94a6">${monthName(x.month)}</text>`).join("")}
  </svg>`;
}
function monthName(m){return new Date(2020,m-1,1).toLocaleString(undefined,{month:"short"});}
function donutChart() {
  const data=state.categorySummary.slice().sort((a,b)=>Number(b.total)-Number(a.total)).slice(0,6);
  const total=data.reduce((a,x)=>a+Number(x.total||0),0);
  if(!data.length || !total) return `<div class="empty">No expense categories yet.</div>`;
  const r=66,c=2*Math.PI*r; let offset=0;
  const segments=data.map((x,i)=>{
    const len=c*(Number(x.total)/total); const seg=`<circle cx="85" cy="85" r="${r}" fill="none" stroke="hsl(${245+i*48} 75% 62%)" stroke-width="18" stroke-dasharray="${len} ${c-len}" stroke-dashoffset="${-offset}"/>`; offset+=len; return seg;
  }).join("");
  return `<div class="donut-wrap"><div class="donut-box"><svg class="donut" viewBox="0 0 170 170"><circle cx="85" cy="85" r="${r}" fill="none" stroke="#eef0f5" stroke-width="18"/>${segments}</svg><div class="donut-center"><strong>${money(total)}</strong><small style="color:var(--muted)">spent</small></div></div>
    <div class="legend">${data.map((x,i)=>`<div class="legend-row"><span class="dot" style="background:hsl(${245+i*48} 75% 62%)"></span><span style="flex:1">${esc(x.category)}</span><strong>${money(x.total)}</strong></div>`).join("")}</div></div>`;
}

function transactionTable(rows) {
  if(!rows.length) return `<div class="empty">No transactions yet. Click <strong>+ Add transaction</strong> to get started.</div>`;
  return `<div class="table-scroll"><table class="table"><thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Category</th><th>Amount</th><th></th></tr></thead><tbody>
    ${rows.map(t=>`<tr><td>${dateLabel(t.date)}</td><td><strong>${esc(t.description||"Untitled")}</strong></td><td><span class="badge ${t.type==="income"?"badge-income":"badge-expense"}">${esc(t.type)}</span></td><td>${esc(categoryName(t.category_id))}</td><td class="${t.type==="income"?"income":"expense"}"><strong>${t.type==="income"?"+":"−"}${money(t.amount)}</strong></td><td><button class="btn btn-danger" data-delete="${t.id}" title="Delete">×</button></td></tr>`).join("")}
  </tbody></table></div>`;
}
function categoryName(id){return state.categories.find(c=>c.id===id)?.name || `Category #${id}`;}

function renderTransactions() {
  const type=state.filters.type, cat=state.filters.category_id;
  const rows=state.transactions.filter(t=>(!type||t.type===type)&&(!cat||String(t.category_id)===String(cat))).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  $("#content").innerHTML=`<div class="page-intro"><div><h2>All transactions</h2><p>Every entry belongs to your authenticated account.</p></div><div class="filters">
    <select class="select-compact" id="type-filter"><option value="">All types</option><option value="income" ${type==="income"?"selected":""}>Income</option><option value="expense" ${type==="expense"?"selected":""}>Expense</option></select>
    <select class="select-compact" id="cat-filter"><option value="">All categories</option>${state.categories.map(c=>`<option value="${c.id}" ${String(cat)===String(c.id)?"selected":""}>${esc(c.name)} · ${c.type}</option>`).join("")}</select>
  </div></div><section class="card transactions-card">${transactionTable(rows)}</section>`;
  $("#type-filter").onchange=e=>{state.filters.type=e.target.value;renderDashboard();};
  $("#cat-filter").onchange=e=>{state.filters.category_id=e.target.value;renderDashboard();};
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteTransaction(Number(b.dataset.delete)));
}

function renderProfile() {
  const s = state.summary || { total_income: 0, total_expenses: 0 };
  $("#content").innerHTML=`<div class="page-intro"><div><h2>Your profile</h2><p>Your account details and recorded transaction totals.</p></div></div>
    <section class="card profile-card">
      <div class="profile-identity">
        <div class="avatar profile-avatar">${esc(initials(state.user?.name))}</div>
        <div>
          <h3>${esc(state.user?.name)}</h3>
          <div class="profile-email">${esc(state.user?.email)}</div>
        </div>
      </div>
      <div class="profile-details">
        <div class="profile-detail">
          <span class="profile-detail-label">Name</span>
          <strong>${esc(state.user?.name)}</strong>
        </div>
        <div class="profile-detail">
          <span class="profile-detail-label">Email</span>
          <strong>${esc(state.user?.email)}</strong>
        </div>
      </div>
      <div class="profile-stats">
        <div class="profile-stat">
          <span class="profile-stat-label">Total expenses</span>
          <strong class="expense">${money(s.total_expenses)}</strong>
          <span class="profile-stat-hint">Recorded expense transactions</span>
        </div>
        <div class="profile-stat">
          <span class="profile-stat-label">Total income</span>
          <strong class="income">${money(s.total_income)}</strong>
          <span class="profile-stat-hint">Recorded income transactions</span>
        </div>
      </div>
    </section>`;
}

function modalHtml(){
  return `<div class="modal-backdrop" id="modal-backdrop"><div class="modal"><div class="modal-head"><h3>Add transaction</h3><button class="close" id="close-modal">×</button></div>
  <form id="tx-form" class="form-grid">
    <div class="field"><label>Type</label><select id="tx-type" required><option value="expense">Expense</option><option value="income">Income</option></select></div>
    <div class="field"><label>Amount</label><input id="tx-amount" type="number" min="0.01" step="0.01" required placeholder="0.00"></div>
    <div class="field"><label>Category</label><select id="tx-category" required></select></div>
    <div class="field"><label>Date</label><input id="tx-date" type="date" required value="${new Date().toISOString().slice(0,10)}"></div>
    <div class="field"><label>Description <span style="font-weight:400;color:var(--muted)">(optional)</span></label><input id="tx-description" maxlength="255" placeholder="Groceries, salary, rent..."></div>
    <div class="form-actions"><button type="button" class="btn btn-secondary" id="cancel-modal">Cancel</button><button class="btn btn-primary" type="submit">Save transaction</button></div>
  </form></div></div>`;
}
function wireModal(){
  $("#close-modal").onclick=closeModal; $("#cancel-modal").onclick=closeModal;
  $("#modal-backdrop").onclick=e=>{if(e.target.id==="modal-backdrop")closeModal();};
  const fill=()=>{const type=$("#tx-type").value;$("#tx-category").innerHTML=state.categories.filter(c=>c.type===type).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");};
  $("#tx-type").onchange=fill; fill();
  $("#tx-form").onsubmit=async e=>{e.preventDefault();try{
    await api("/transactions/",{method:"POST",body:JSON.stringify({amount:$("#tx-amount").value,type:$("#tx-type").value,category_id:Number($("#tx-category").value),description:$("#tx-description").value||null,date:$("#tx-date").value})});
    state.modal=false; toast("Transaction saved."); await loadDashboard();
  }catch(err){toast(err.message);}
  };
}
function closeModal(){state.modal=false;renderDashboard();}
async function deleteTransaction(id){if(!confirm("Delete this transaction?"))return;try{await api(`/transactions/${id}`,{method:"DELETE"});toast("Transaction deleted.");await loadDashboard();}catch(err){toast(err.message);}}
function logout(){localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(USER_KEY);state.user=null;state.authMode="login";renderAuth();}

(async function init(){
  if(localStorage.getItem(TOKEN_KEY)){try{await loadDashboard();return;}catch{}}
  renderAuth();
})();