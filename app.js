const STORAGE_KEY = 'GlobalPortfolio_V6';
const PENSION_KEY = 'GlobalPortfolio_PENSIONS_V6';
const HIST_KEY = 'GlobalPortfolio_HIST_V6';
const rates = { "GBP": 1.0, "USD": 1.27, "HKD": 9.92 };

let accounts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let pensions = JSON.parse(localStorage.getItem(PENSION_KEY)) || [];
let history = JSON.parse(localStorage.getItem(HIST_KEY)) || [];
let activeScenarioType = 'bal';
let myChart;

function init() {
    updateList();
    updateTotalHeader();
    pensions.forEach(p => addPensionUI(p.name, p.amount, p.age, p.currency));
    history.forEach(h => addHistoryUI(h.date, h.val));
}

document.addEventListener('DOMContentLoaded', init);

function calculate() {
    const currentYear = new Date().getFullYear();
    const birthYear = parseInt(document.getElementById('birthYear').value);
    const startAge = currentYear - birthYear;
    const inflation = parseFloat(document.getElementById('inflationRate').value) / 100;
    const drawRate = parseFloat(document.getElementById('drawdownRate').value) / 100;
    const realReqAnnual = parseFloat(document.getElementById('realRequirement').value) * 12;
    const scenarioAge = parseInt(document.getElementById('scenarioRetireAge').value);
    const activeRate = (parseFloat(document.getElementById('rate-' + activeScenarioType).value) || 6) / 100;

    let tempAccs = JSON.parse(JSON.stringify(accounts));
    let labels = [], nomPotData = [], realPotData = [], nomIncData = [], realIncData = [], floorData = [], histData = [];

    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = `<tr style="background:#f8f9fa;"><th>Year (Age)</th><th>Net Income (£)</th><th>Nominal Pot</th><th>Adjusted Pot</th></tr>`;

    for (let y = 0; y <= (95 - startAge); y++) {
        let year = currentYear + y, age = startAge + y;
        let n_Dist = 0, n_Pens = 0, totalBalNom = 0;
        let incomeDetails = [], contribDetails = [], eventTags = [], balDetails = [];

        pensions.forEach(p => {
            if (age >= p.age) {
                let gbpPenNom = (p.amount / rates[p.currency]) * Math.pow(1 + inflation, y);
                n_Pens += gbpPenNom;
                incomeDetails.push({ n: p.name, v: gbpPenNom });
            }
        });

        tempAccs.forEach(a => {
            const effAge = a.locked ? a.retireAge : scenarioAge;
            let isRet = age >= effAge;
            let mon = isRet ? 0 : a.monthly;

            if (a.events) a.events.forEach(ev => {
                if (parseInt(ev.age) === age) {
                    a.balance += parseFloat(ev.amount);
                    eventTags.push(`<span class="tag-event">${ev.name}: £${Math.round(parseFloat(ev.amount)/rates[a.currency]).toLocaleString()}</span>`);
                }
            });

            for (let m = 0; m < 12; m++) a.balance = Math.max(0, (a.balance + mon) * (1 + (activeRate / 12)));

            if (isRet && a.balance > 0) {
                let dist = a.balance * drawRate;
                a.balance -= dist;
                n_Dist += (dist / rates[a.currency]);
                incomeDetails.push({ n: a.name + ' Dist', v: (dist / rates[a.currency]) });
            }

            if(!isRet && a.monthly > 0) contribDetails.push({ n: a.name, v: a.monthly * 12 });
            balDetails.push({ n: a.name, v: a.balance / rates[a.currency] });
            totalBalNom += a.balance / rates[a.currency];
        });

        let realPot = totalBalNom / Math.pow(1 + inflation, y);
        let aggNom = (n_Pens + n_Dist);
        let aggReal = aggNom / Math.pow(1 + inflation, y);

        labels.push(year); nomPotData.push(Math.round(totalBalNom)); realPotData.push(Math.round(realPot));
        nomIncData.push(Math.round(aggNom)); realIncData.push(Math.round(aggReal)); floorData.push(Math.round(realReqAnnual));

        let hPoint = history.find(h => h.date.toString() === year.toString());
        histData.push(hPoint ? hPoint.val : null);

        const isMilestone = (age === scenarioAge), isRet = (age >= scenarioAge);
        let color = isRet ? (aggReal >= realReqAnnual ? "var(--success)" : "var(--danger)") : "#202124";

        tableBody.innerHTML += `
                <tr class="main-row" onclick="toggleRow('row-${y}')" style="${isMilestone ? 'background:#e8f0fe; border-left: 5px solid var(--primary);' : ''}">
                    <td><b>${year}</b> (${age}) ${isMilestone ? '🎯' : '▾'}</td>
                    <td style="color:${color}; font-weight:${isRet?'bold':'normal'}">Net: £${Math.round(aggNom).toLocaleString()} (£${Math.round(aggReal).toLocaleString()} adj) ${eventTags.join('')}</td>
                    <td>£${Math.round(totalBalNom).toLocaleString()}</td>
                    <td>£${Math.round(realPot).toLocaleString()}</td>
                </tr>
                <tr id="row-${y}" class="details-row" style="display:none;"><td colspan="4">
                    <div class="details-container">
                        <div><b>Nominal Account Bals:</b><br>${balDetails.map(d=>d.n+': £'+Math.round(d.v).toLocaleString()).join('<br>')}</div>
                        <div>
                            <b>Income:</b><br>${incomeDetails.map(i=>i.n+': £'+Math.round(i.v).toLocaleString()).join('<br>') || 'None'}
                            <hr style="margin:5px 0;">
                            <b>Activity:</b><br>${contribDetails.map(c=>c.n+' Contrib: £'+Math.round(c.v).toLocaleString()).join('<br>') || 'None'}
                        </div>
                    </div>
                </td></tr>`;
    }
    document.getElementById('chartCard').style.display = 'block'; document.getElementById('tableContainer').style.display = 'block';
    renderGrowthChart(labels, nomPotData, realPotData, nomIncData, realIncData, floorData, histData);
    updateTotalHeader();
}

function saveAccount() {
    const evs = []; document.querySelectorAll('#eventsListUI > div').forEach(r => {
        const n = r.querySelector('.ev-n').value, a = r.querySelector('.ev-a').value, y = r.querySelector('.ev-y').value;
        if (n && a && y) evs.push({ name: n, amount: parseFloat(a), age: parseInt(y) });
    });
    const data = { name: document.getElementById('accName').value, currency: document.getElementById('accCurr').value, balance: parseFloat(document.getElementById('accBal').value) || 0, monthly: parseFloat(document.getElementById('accMonthly').value) || 0, retireAge: parseInt(document.getElementById('accRetireAge').value) || 65, locked: document.getElementById('accLocked').checked, events: evs };
    const idx = parseInt(document.getElementById('editIndex').value);
    if(idx > -1) accounts[idx] = data; else accounts.push(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    const currentYear = new Date().getFullYear().toString();
    let totalNow = 0; accounts.forEach(a => totalNow += (a.balance / rates[a.currency]));
    let exIdx = history.findIndex(h => h.date.toString() === currentYear);
    if (exIdx > -1) history[exIdx].val = totalNow; else history.push({ date: currentYear, val: totalNow });
    localStorage.setItem(HIST_KEY, JSON.stringify(history));
    updateList(); toggleSection('formContent'); calculate();
}

function renderGrowthChart(l, np, rp, ni, ri, fd, hd) {
    const ctx = document.getElementById('growthChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'line',
        data: { labels: l, datasets: [
            { label: 'Nominal Pot', data: np, borderColor: '#1a73e8', pointRadius: 0, tension: 0.2, yAxisID: 'y' },
            { label: 'Adjusted Pot', data: rp, borderColor: '#34a853', pointRadius: 0, tension: 0.2, yAxisID: 'y' },
            { label: 'Logged Progress', data: hd, backgroundColor: '#fbbc04', borderColor: '#fbbc04', pointRadius: 5, showLine: false, yAxisID: 'y' },
            { label: 'Adj Income', data: ri, borderColor: '#e67c73', borderDash: [5, 5], pointRadius: 0, tension: 0.2, yAxisID: 'y1' },
            { label: 'Floor', data: fd, borderColor: '#ea4335', borderWidth: 2, pointRadius: 0, yAxisID: 'y1' }
        ]},
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { position: 'left' }, y1: { position: 'right', grid: { drawOnChartArea: false } } } }
    });
}

function applyScenario(t, b) { activeScenarioType = t; document.querySelectorAll('.risk-btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); calculate(); }
function toggleSection(id) { const el = document.getElementById(id); el.style.display = el.style.display === 'block' ? 'none' : 'block'; }
function toggleRow(id) { const el = document.getElementById(id); el.style.display = el.style.display === 'table-row' ? 'none' : 'table-row'; }
function updateTotalHeader() { let t = 0; accounts.forEach(a => t += (a.balance / rates[a.currency])); document.getElementById('totalPortfolioAmount').innerText = "£" + Math.round(t).toLocaleString(); }
function updateList() { document.getElementById('accountList').innerHTML = accounts.map((a, i) => `<div class="account-item"><div><b>${a.name}</b><br><small>${a.currency} · Draw: ${a.retireAge} ${a.locked?'🔒':'🔗'}</small></div><button class="btn-secondary" style="padding:4px 8px; flex:none;" onclick="editAccount(${i})">Edit</button></div>`).join(''); }
function editAccount(i) {
    const a = accounts[i]; document.getElementById('accName').value = a.name; document.getElementById('accCurr').value = a.currency; document.getElementById('accBal').value = a.balance; document.getElementById('accRetireAge').value = a.retireAge; document.getElementById('accMonthly').value = a.monthly; document.getElementById('accLocked').checked = a.locked; document.getElementById('editIndex').value = i; document.getElementById('eventsListUI').innerHTML = '';
    if (a.events) a.events.forEach(e => addEventInputUI(e.name, e.amount, e.age)); toggleSection('formContent');
}
function confirmRemove() { const i = parseInt(document.getElementById('editIndex').value); if(i > -1 && confirm("Remove?")) { accounts.splice(i,1); localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts)); updateList(); toggleSection('formContent'); calculate(); } }
function addPensionUI(n='', a='', y='', c='GBP') {
    const d = document.createElement('div'); d.style = "display:grid; grid-template-columns: 1fr 60px 80px 60px 30px; gap:5px; margin-bottom:5px;";
    d.innerHTML = `<input type="text" placeholder="Name" value="${n}" class="pen-n"><select class="pen-c"><option value="GBP" ${c==='GBP'?'selected':''}>GBP</option><option value="USD" ${c==='USD'?'selected':''}>USD</option><option value="HKD" ${c==='HKD'?'selected':''}>HKD</option></select><input type="number" placeholder="Amt" value="${a}" class="pen-a"><input type="number" placeholder="Age" value="${y}" class="pen-y"><button onclick="this.parentElement.remove()" style="color:red; border:none; background:none;">✕</button>`;
    document.getElementById('pensionInputList').appendChild(d);
}
function savePensions() {
    pensions = []; document.querySelectorAll('#pensionInputList > div').forEach(r => {
        const n = r.querySelector('.pen-n').value, a = r.querySelector('.pen-a').value, y = r.querySelector('.pen-y').value, c = r.querySelector('.pen-c').value;
        if (n && a && y) pensions.push({ name: n, amount: parseFloat(a), age: parseInt(y), currency: c });
    }); localStorage.setItem(PENSION_KEY, JSON.stringify(pensions)); toggleSection('pensionContent'); calculate();
}
function addHistoryUI(d='', v='') {
    const div = document.createElement('div'); div.style = "display:grid; grid-template-columns: 1fr 1fr 30px; gap: 10px; margin-bottom: 8px;";
    div.innerHTML = `<input type="text" placeholder="Year" value="${d}" class="h-d"><input type="number" placeholder="Total £" value="${v}" class="h-v"><button onclick="this.parentElement.remove()" style="color:red; border:none; background:none;">✕</button>`;
    document.getElementById('historyInputList').appendChild(div);
}
function saveHistory() {
    history = []; document.querySelectorAll('#historyInputList > div').forEach(r => {
        const d = r.querySelector('.h-d').value, v = r.querySelector('.h-v').value;
        if (d && v) history.push({ date: d, val: parseFloat(v) });
    }); localStorage.setItem(HIST_KEY, JSON.stringify(history)); toggleSection('historyContent'); calculate();
}
function downloadBackup() { const blob = new Blob([JSON.stringify({accounts, pensions, history})], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `portfolio.json`; a.click(); }
function exportData() { document.getElementById('syncArea').value = btoa(JSON.stringify({acc: accounts, pen: pensions, hist: history})); alert("Copied!"); }
function importData() { try { const d = JSON.parse(atob(document.getElementById('syncArea').value)); accounts = d.acc; pensions = d.pen; history = d.hist || []; localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts)); localStorage.setItem(PENSION_KEY, JSON.stringify(pensions)); localStorage.setItem(HIST_KEY, JSON.stringify(history)); location.reload(); } catch(e) { alert("Invalid"); } }
function handleFileUpload(e) { const reader = new FileReader(); reader.onload = (x) => { const d = JSON.parse(x.target.result); accounts = d.accounts; pensions = d.pensions; history = d.history || []; localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts)); localStorage.setItem(PENSION_KEY, JSON.stringify(pensions)); localStorage.setItem(HIST_KEY, JSON.stringify(history)); location.reload(); }; reader.readAsText(e.target.files[0]); }
function addEventInputUI(n='', a='', y='') {
    const d = document.createElement('div'); d.style = "display:grid; grid-template-columns: 1fr 70px 50px 30px; gap:5px; margin-bottom:5px;";
    d.innerHTML = `<input type="text" placeholder="Note" value="${n}" class="ev-n"><input type="number" placeholder="Amt" value="${a}" class="ev-a"><input type="number" placeholder="Age" value="${y}" class="ev-y"><button onclick="this.parentElement.remove()" style="color:red; background:none; border:none;">✕</button>`;
    document.getElementById('eventsListUI').appendChild(d);
}
