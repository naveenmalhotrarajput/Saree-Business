// ============ UTILITIES ============
let isUnlocked = false;
const $ = (s) => document.querySelector(s);
const today = () => new Date().toISOString().split('T')[0];
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN');
const inr = (n) => '₹' + (Number(n) || 0).toLocaleString('en-IN');

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2500);
}

function isToday(timestamp) {
  const d = new Date(timestamp);
  const n = new Date();
  return d.toDateString() === n.toDateString();
}

function inRange(timestamp, days) {
  const diff = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
  return diff <= days;
}

// ============ ROUTING ============
const pages = {};
let currentPage = 'dashboard';

function renderPage(page) {
  currentPage = page;
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });
  if (pages[page]) pages[page]();
}

document.querySelectorAll('.nav-btn').forEach(b => {
  b.addEventListener('click', () => renderPage(b.dataset.page));
});

// ============ DASHBOARD ============
pages.dashboard = async () => {
  $('#pageTitle').textContent = '🏠 Aaj ka Hisaab';

  const work = await dbGetAll('work');
  const helperPays = await dbGetAll('helperPayments');
  const expenses = await dbGetAll('expenses');
  const loans = await dbGetAll('loans');
  const loanPays = await dbGetAll('loanPayments');

  const todayEarning = work.filter(w => isToday(w.createdAt)).reduce((s, w) => s + w.total, 0);
  const todayExpense = expenses.filter(e => isToday(e.createdAt)).reduce((s, e) => s + e.amount, 0);
  const todayHelper = helperPays.filter(h => isToday(h.createdAt)).reduce((s, h) => s + h.total, 0);
  const netToday = todayEarning - todayExpense - todayHelper;

  // 🔧 FIX 1: rename loan totalPaid
  const totalLoan = loans.reduce((s, l) => s + l.amount, 0);
  const loanPaid = loanPays.reduce((s, p) => s + p.amount, 0);
  const loanRemaining = totalLoan - loanPaid;

  // 🔧 FIX 2: helper pending calculation
  const helperWorks = await dbGetAll('helperWork');

  const totalWork = helperWorks.reduce((s, w) => s + w.total, 0);
  const helperPaid = helperPays.reduce((s, p) => s + p.total, 0);

  const pendingAmount = totalWork - helperPaid;

  const displayEarning = isUnlocked ? todayEarning : Math.floor(250 + Math.random()*100);
  const displayExpense = isUnlocked ? todayExpense : Math.floor(80 + Math.random()*50);
  const displayHelper = isUnlocked ? todayHelper : Math.floor(60 + Math.random()*40);
  const displayNet = isUnlocked ? netToday : displayEarning - displayExpense - displayHelper;

  // Smart suggestion
  const loanSuggest = Math.max(0, Math.round(netToday * 0.6));
  const personalSuggest = Math.max(0, netToday - loanSuggest);

  $('#main').innerHTML = `
    <div class="date-display">📅 ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>

    <div class="stats-grid">
      <div class="stat-card green">
        <div class="label">Aaj ki Earning</div>
        <div class="value">${inr(displayEarning)}</div>
      </div>
      <div class="stat-card red">
        <div class="label">Aaj ka Kharcha</div>
        <div class="value">${inr(displayExpense)}</div>
      </div>
      <div class="highlight-box">
  <div class="label">💰 Total Pending</div>
  <div class="value">${inr(pendingAmount)}</div>
</div>
      <div class="stat-card blue">
        <div class="label">Helper ko Diya</div>
        <div class="value">${inr(displayHelper)}</div>
      </div>
      <div class="stat-card">
        <div class="label">Net Profit</div>
        <div class="value">${inr(displayNet)}</div>
      </div>
      <div class="stat-card full red">
        <div class="label">Loan Bacha Hai</div>
        <div class="value">${inr(loanRemaining)}</div>
      </div>
    </div>

    ${netToday > 0 ? `
      <div class="highlight-box green">
        🎉 Aaj aapne ${inr(netToday)} kamaye!
      </div>
      <div class="highlight-box">
        💰 Aap aaj ${inr(loanSuggest)} loan ke liye rakh sakte ho
      </div>
      <div class="highlight-box pink">
        🛍️ Aapke paas ${inr(personalSuggest)} personal use ke liye bacha hai
      </div>
    ` : `
      <div class="highlight-box">
        Aaj ka kaam shuru karein 💪
      </div>
    `}

    <div class="card">
      <h3>⚡ Quick Actions</h3>
      <div class="btn-row">
        <button class="btn btn-primary" onclick="renderPage('work')">+ Kaam Add</button>
        <button class="btn btn-secondary" onclick="renderPage('expense')">+ Kharcha</button>
      </div>
    </div>
  `;
};

// ============ WORK / EARNING ============
pages.work = async () => {
  $('#pageTitle').textContent = '✂️ Aaj ka Kaam';

  const shops = await dbGetAll('shops');
  const work = await dbGetAll('work');
  const todayWork = work.filter(w => isToday(w.createdAt)).reverse();
  const todayTotal = todayWork.reduce((s, w) => s + w.total, 0);

  $('#main').innerHTML = `
    <div class="card">
      <h3>➕ Naya Kaam Add Karein</h3>
      <div class="form-group">
        <label>Shop / Customer Naam</label>
        <select id="shopSelect">
          <option value="">-- Choose karein --</option>
          ${shops.map(s => `<option value="${s.name}">${s.name}</option>`).join('')}
          <option value="__new__">+ Naya Customer</option>
        </select>
      </div>
      <div id="newShopBox" class="form-group hidden">
        <label>Naya Customer Naam</label>
        <input id="newShopName" placeholder="Naam likhein" />
      </div>
      <div class="form-group">
        <label>Kitni Saree?</label>
        <input type="number" id="sareeCount" placeholder="0" inputmode="numeric" />
      </div>
      <div class="form-group">
        <label>Rate per Saree (₹)</label>
        <input type="number" id="rate" placeholder="0" inputmode="numeric" />
      </div>
      <div class="highlight-box" id="totalDisplay">Total: ₹0</div>
      <button class="btn btn-primary" id="saveWork">✅ Save Karein</button>
    </div>

    <div class="highlight-box green">
      💰 Aaj aapki total earning ${inr(todayTotal)} hai
    </div>

    <h3 class="section-title">📋 Aaj Ka Kaam (${todayWork.length})</h3>
    <div id="workList">
      ${todayWork.length === 0 ? '<div class="empty">Abhi koi kaam add nahi hua</div>' :
        todayWork.map(w => `
          <div class="list-item">
            <div class="info">
              <div class="name">${w.shop}</div>
              <div class="sub">${w.count} saree × ${inr(w.rate)}</div>
            </div>
            <div class="amount">${inr(w.total)}</div>
            <button class="del-btn" onclick="deleteItem('work', ${w.id})">🗑️</button>
          </div>
        `).join('')}
    </div>
  `;

  // Live total calc
  const calcTotal = () => {
    const c = +$('#sareeCount').value || 0;
    const r = +$('#rate').value || 0;
    $('#totalDisplay').textContent = `Total: ${inr(c * r)}`;
  };
  $('#sareeCount').addEventListener('input', calcTotal);
  $('#rate').addEventListener('input', calcTotal);

  $('#shopSelect').addEventListener('change', (e) => {
    $('#newShopBox').classList.toggle('hidden', e.target.value !== '__new__');
  });

  $('#saveWork').addEventListener('click', async () => {
    let shop = $('#shopSelect').value;
    if (shop === '__new__') {
      shop = $('#newShopName').value.trim();
      if (!shop) return toast('Naam likhein');
      await dbAdd('shops', { name: shop });
    }
    const count = +$('#sareeCount').value;
    const rate = +$('#rate').value;
    if (!shop || !count || !rate) return toast('Sab fields bharein');
    await dbAdd('work', { shop, count, rate, total: count * rate, date: today() });
    toast('✅ Save ho gaya');
    pages.work();
  });
};

// ============ HELPER ============
pages.helper = async () => {
  $('#pageTitle').textContent = '👥 Helper';
const helperWorks = await dbGetAll('helperWork');
  const helpers = await dbGetAll('helpers');
  const pays = await dbGetAll('helperPayments');
  const todayPays = pays.filter(p => isToday(p.createdAt)).reverse();
  const todayTotal = todayPays.reduce((s, p) => s + p.total, 0);
const totalWork = helperWorks.reduce((s, w) => s + w.total, 0);
 const totalPaid = pays.reduce((s, p) => s + p.total, 0);
 const pendingAmount = totalWork - totalPaid;
  $('#main').innerHTML = `
    <div class="card">
      <h3>➕ Helper ko Payment</h3>
      <div class="form-group">
        <label>Helper Naam</label>
        <select id="helperSelect">
          <option value="">-- Choose --</option>
          ${helpers.map(h => `<option value="${h.name}">${h.name}</option>`).join('')}
          <option value="__new__">+ Naya Helper</option>
        </select>
      </div>
      <div id="newHelperBox" class="form-group hidden">
        <label>Naya Helper Naam</label>
        <input id="newHelperName" placeholder="Naam" />
      </div>
      <div class="form-group">
        <label>Kitni Saree ki?</label>
        <input type="number" id="hCount" inputmode="numeric" placeholder="0" />
      </div>
      <div class="form-group">
        <label>Rate per Saree (₹)</label>
        <input type="number" id="hRate" inputmode="numeric" placeholder="0" />
      </div>
      <div class="highlight-box" id="hTotal">Total: ₹0</div>
      <button class="btn btn-primary" id="saveHelper">✅ Payment Save</button>
    </div>

    <div class="highlight-box pink">
      Aaj helper ko diya: ${inr(todayTotal)}
    </div>
    <div class="highlight-box">
  💰 Total Pending: ${inr(pendingAmount)}
     </div>

    <h3 class="section-title">📋 Aaj Ka Payment</h3>
    <div>
      ${todayPays.length === 0 ? '<div class="empty">Koi payment nahi</div>' :
        todayPays.map(p => `
          <div class="list-item">
            <div class="info">
              <div class="name">${p.helper}</div>
              <div class="sub">${p.count} saree × ${inr(p.rate)}</div>
            </div>
            <div class="amount">${inr(p.total)}</div>
            <button class="del-btn" onclick="deleteItem('helperPayments', ${p.id})">🗑️</button>
          </div>
        `).join('')}
    </div>
  `;

  const calc = () => {
    const c = +$('#hCount').value || 0, r = +$('#hRate').value || 0;
    $('#hTotal').textContent = `Total: ${inr(c * r)}`;
  };
  $('#hCount').addEventListener('input', calc);
  $('#hRate').addEventListener('input', calc);

  $('#helperSelect').addEventListener('change', (e) => {
    $('#newHelperBox').classList.toggle('hidden', e.target.value !== '__new__');
  });

  $('#saveHelper').addEventListener('click', async () => {
    let helper = $('#helperSelect').value;
    if (helper === '__new__') {
      helper = $('#newHelperName').value.trim();
      if (!helper) return toast('Naam likhein');
      await dbAdd('helpers', { name: helper });
    }
    const count = +$('#hCount').value, rate = +$('#hRate').value;
    if (!helper || !count || !rate) return toast('Sab fields bharein');
   await dbAdd('helperWork', { helper, count, rate, total: count * rate, date: today() });
    toast('✅ Save ho gaya');
    pages.helper();
  });
};


// ============ EXPENSE ============
pages.expense = async () => {
  $('#pageTitle').textContent = '💸 Kharcha';

  const expenses = await dbGetAll('expenses');
  const todayExp = expenses.filter(e => isToday(e.createdAt)).reverse();
  const total = todayExp.reduce((s, e) => s + e.amount, 0);

  $('#main').innerHTML = `
    <div class="card">
      <h3>➕ Kharcha Add Karein</h3>
      <div class="form-group">
        <label>Kis Cheez ka?</label>
        <select id="expType">
          <option value="Fall">Fall</option>
          <option value="Thread">Thread (Dhaaga)</option>
          <option value="Other">Doosra</option>
        </select>
      </div>
      <div class="form-group">
        <label>Kitne Rupaye?</label>
        <input type="number" id="expAmt" inputmode="numeric" placeholder="0" />
      </div>
      <div class="form-group">
        <label>Note (optional)</label>
        <input id="expNote" placeholder="..." />
      </div>
      <button class="btn btn-primary" id="saveExp">✅ Save Karein</button>
    </div>

    <div class="highlight-box">
      Aaj ka kul kharcha: ${inr(total)}
    </div>

    <h3 class="section-title">📋 Aaj Ke Kharche</h3>
    <div>
      ${todayExp.length === 0 ? '<div class="empty">Koi kharcha nahi</div>' :
        todayExp.map(e => `
          <div class="list-item">
            <div class="info">
              <div class="name">${e.type}</div>
              <div class="sub">${e.note || '-'}</div>
            </div>
            <div class="amount">${inr(e.amount)}</div>
            <button class="del-btn" onclick="deleteItem('expenses', ${e.id})">🗑️</button>
          </div>
        `).join('')}
    </div>
  `;

  $('#saveExp').addEventListener('click', async () => {
    const type = $('#expType').value;
    const amount = +$('#expAmt').value;
    const note = $('#expNote').value;
    if (!amount) return toast('Amount likhein');
    await dbAdd('expenses', { type, amount, note, date: today() });
    toast('✅ Save ho gaya');
    pages.expense();
  });
};

// ============ MORE MENU ============
pages.more = async () => {
  $('#pageTitle').textContent = '☰ More';
  $('#main').innerHTML = `
    <div class="card">
      <h3>📊 Sab Options</h3>
      <button class="btn btn-secondary" onclick="renderPage('loans')">💳 Loan Manage</button>
      <button class="btn btn-secondary" onclick="renderPage('reports')">📈 Reports Dekhein</button>
      <button class="btn btn-secondary" onclick="renderPage('shops')">🏪 Shops & Customers</button>
      <button class="btn btn-success" onclick="exportData()">⬇️ Backup Download</button>
      <button class="btn btn-secondary" onclick="document.getElementById('importFile').click()">⬆️ Backup Import</button>
      <input type="file" id="importFile" accept=".json" style="display:none" />
    </div>
  `;
  $('#importFile').addEventListener('change', importData);
};

// ============ LOANS ============
pages.loans = async () => {
  $('#pageTitle').textContent = '💳 Loan';
  const loans = await dbGetAll('loans');
  const pays = await dbGetAll('loanPayments');

  const totalLoan = loans.reduce((s, l) => s + l.amount, 0);
  const totalPaid = pays.reduce((s, p) => s + p.amount, 0);
  const remaining = totalLoan - totalPaid;

  $('#main').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card red full">
        <div class="label">Bacha Hua Loan</div>
        <div class="value">${inr(remaining)}</div>
      </div>
      <div class="stat-card blue">
        <div class="label">Total Loan</div>
        <div class="value">${inr(totalLoan)}</div>
      </div>
      <div class="stat-card green">
        <div class="label">Pay Kiya</div>
        <div class="value">${inr(totalPaid)}</div>
      </div>
    </div>

    <div class="card">
      <h3>➕ Naya Loan Add</h3>
      <div class="form-group">
        <label>Kisse Liya?</label>
        <input id="loanFrom" placeholder="Naam" />
      </div>
      <div class="form-group">
        <label>Kitna Loan?</label>
        <input type="number" id="loanAmt" inputmode="numeric" placeholder="0" />
      </div>
      <button class="btn btn-primary" id="saveLoan">✅ Add</button>
    </div>

    <div class="card">
      <h3>💸 Loan Pay Karein</h3>
      <div class="form-group">
        <label>Kitna Pay Kiya?</label>
        <input type="number" id="payAmt" inputmode="numeric" placeholder="0" />
      </div>
      <div class="form-group">
        <label>Kisko?</label>
        <input id="payTo" placeholder="Naam" />
      </div>
      <button class="btn btn-success" id="savePay">✅ Pay Save</button>
    </div>

    <h3 class="section-title">📋 Sab Loans</h3>
    <div>
      ${loans.length === 0 ? '<div class="empty">Koi loan nahi</div>' :
        loans.map(l => `
          <div class="list-item">
            <div class="info">
              <div class="name">${l.from}</div>
              <div class="sub">${fmtDate(l.createdAt)}</div>
            </div>
            <div class="amount">${inr(l.amount)}</div>
            <button class="del-btn" onclick="deleteItem('loans', ${l.id})">🗑️</button>
          </div>
        `).join('')}
    </div>

    <h3 class="section-title">💰 Payments</h3>
    <div>
      ${pays.length === 0 ? '<div class="empty">Koi payment nahi</div>' :
        pays.map(p => `
          <div class="list-item">
            <div class="info">
              <div class="name">${p.to}</div>
              <div class="sub">${fmtDate(p.createdAt)}</div>
            </div>
            <div class="amount">${inr(p.amount)}</div>
            <button class="del-btn" onclick="deleteItem('loanPayments', ${p.id})">🗑️</button>
          </div>
        `).join('')}
    </div>
  `;

  $('#saveLoan').addEventListener('click', async () => {
    const from = $('#loanFrom').value.trim();
    const amount = +$('#loanAmt').value;
    if (!from || !amount) return toast('Sab bharein');
    await dbAdd('loans', { from, amount });
    toast('✅ Save'); pages.loans();
  });

  $('#savePay').addEventListener('click', async () => {
    const to = $('#payTo').value.trim();
    const amount = +$('#payAmt').value;
    if (!to || !amount) return toast('Sab bharein');
    await dbAdd('loanPayments', { to, amount });
    toast('✅ Save'); pages.loans();
  });
};

// ============ SHOPS ============
pages.shops = async () => {
  $('#pageTitle').textContent = '🏪 Shops';
  const shops = await dbGetAll('shops');
  $('#main').innerHTML = `
    <div class="card">
      <h3>➕ Nayi Shop Add</h3>
      <div class="form-group">
        <input id="shopName" placeholder="Shop ya Customer naam" />
      </div>
      <button class="btn btn-primary" id="addShop">Add Karein</button>
    </div>
    <h3 class="section-title">📋 Sab (${shops.length})</h3>
    <div>
      ${shops.length === 0 ? '<div class="empty">Koi shop nahi</div>' :
        shops.map(s => `
          <div class="list-item">
            <div class="info"><div class="name">${s.name}</div></div>
            <button class="del-btn" onclick="deleteItem('shops', ${s.id})">🗑️</button>
          </div>
        `).join('')}
    </div>
  `;
  $('#addShop').addEventListener('click', async () => {
    const name = $('#shopName').value.trim();
    if (!name) return toast('Naam likhein');
    await dbAdd('shops', { name });
    toast('✅ Add'); pages.shops();
  });
};

// ============ REPORTS ============
let reportRange = 1; // 1=today, 7=week, 30=month
pages.reports = async () => {
  $('#pageTitle').textContent = '📈 Reports';
  const work = await dbGetAll('work');
  const exp = await dbGetAll('expenses');
  const help = await dbGetAll('helperPayments');

  const filterFn = reportRange === 1
    ? (x) => isToday(x.createdAt)
    : (x) => inRange(x.createdAt, reportRange);

  const fW = work.filter(filterFn);
  const fE = exp.filter(filterFn);
  const fH = help.filter(filterFn);

  const earn = fW.reduce((s, w) => s + w.total, 0);
  const expT = fE.reduce((s, e) => s + e.amount, 0);
  const helpT = fH.reduce((s, h) => s + h.total, 0);
  const net = earn - expT - helpT;
  const sareeCount = fW.reduce((s, w) => s + w.count, 0);

  $('#main').innerHTML = `
    <div class="tabs">
      <button class="tab ${reportRange===1?'active':''}" onclick="setRange(1)">Aaj</button>
      <button class="tab ${reportRange===7?'active':''}" onclick="setRange(7)">7 Din</button>
      <button class="tab ${reportRange===30?'active':''}" onclick="setRange(30)">30 Din</button>
    </div>

    <div class="stats-grid">
      <div class="stat-card green full">
        <div class="label">Total Earning</div>
        <div class="value">${inr(earn)}</div>
      </div>
      <div class="stat-card red">
        <div class="label">Kharcha</div>
        <div class="value">${inr(expT)}</div>
      </div>
      <div class="stat-card blue">
        <div class="label">Helper</div>
        <div class="value">${inr(helpT)}</div>
      </div>
      <div class="stat-card full">
        <div class="label">Net Profit</div>
        <div class="value">${inr(net)}</div>
      </div>
      <div class="stat-card full">
        <div class="label">Total Saree Banaye</div>
        <div class="value">${sareeCount}</div>
      </div>
    </div>

    <div class="highlight-box green">
      🎉 Is period mein ${inr(net)} kamaye!
    </div>
  `;
};

window.setRange = (r) => { reportRange = r; pages.reports(); };

// ============ HELPERS ============
window.deleteItem = async (store, id) => {
  if (!confirm('Delete karna hai?')) return;
  await dbDelete(store, id);
  toast('🗑️ Delete ho gaya');
  renderPage(currentPage);
};

window.renderPage = renderPage;

// ============ EXPORT / IMPORT ============
window.exportData = async () => {
  const data = await exportAllData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `saree-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('✅ Backup download ho gaya');
};

window.importData = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!confirm('Purana data delete ho jayega. Continue?')) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    await importAllData(data);
    toast('✅ Import ho gaya');
    renderPage('dashboard');
  } catch (err) {
    toast('❌ File galat hai');
  }
};

// ============ PWA INSTALL ============
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $('#installPrompt').classList.remove('hidden');
});

$('#installBtn').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  $('#installPrompt').classList.add('hidden');
});

$('#closeInstall').addEventListener('click', () => {
  $('#installPrompt').classList.add('hidden');
});

// ============ SERVICE WORKER ============
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
navigator.serviceWorker.register('sw.js')
  .then(() => console.log("SW registered"))
  .catch(console.error);  });
}
let tapCount = 0;

document.addEventListener("DOMContentLoaded", () => {
  const title = document.getElementById("pageTitle");
  if (!title) return;

  title.addEventListener("click", () => {
    tapCount++;
    if (tapCount === 5) {
      const pin = prompt("PIN daalein");
      if (pin === "4321") {   // 👉 isko change kar lena baad me
        isUnlocked = true;
        alert("Unlocked");
        renderPage('dashboard');
      }
      tapCount = 0;
    }
  });
});

// ============ INIT ============
renderPage('dashboard');
window.payHelper = async () => {
  const amount = prompt("Kitna paisa dena hai?");
  if (!amount) return;

  await dbAdd('helperPayments', {
    total: Number(amount),
    date: today()
  });

  alert("Payment saved");
  renderPage('helper');
};