const STORAGE_KEY = 'GlobalPortfolio_V6';
const PENSION_KEY = 'GlobalPortfolio_PENSIONS_V6';
const HIST_KEY = 'GlobalPortfolio_HIST_V6';
let rates = { "GBP": 1.0, "USD": 1.27, "HKD": 9.92 }; // Fallback rates

let accounts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let pensions = JSON.parse(localStorage.getItem(PENSION_KEY)) || [];
let history = JSON.parse(localStorage.getItem(HIST_KEY)) || [];
let activeScenarioType = 'bal';
let myChart;
let displayCurrency = 'GBP';
let mcHistogramChart = null;
let mcProbabilityChart = null;
let numSims = 1000;
let volatility = 0.12;
let confidence = 0.95;

async function fetchExchangeRates() {
    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/GBP');
        const data = await response.json();
        rates = {
            "GBP": 1.0,
            "USD": data.rates.USD,
            "HKD": data.rates.HKD
        };
        console.log('Exchange rates updated:', rates);
        updateRatesDisplay();
    } catch (error) {
        console.warn('Failed to fetch exchange rates, using fallback:', error);
        updateRatesDisplay(true); // Show fallback message
    }
}

function updateRatesDisplay(isFallback = false) {
    const display = document.getElementById('ratesDisplay');
    if (isFallback) {
        display.innerHTML = 'Exchange Rates (GBP base): Using fallback rates';
    } else {
        display.innerHTML = `Exchange Rates (GBP base): USD: ${rates.USD.toFixed(2)} | HKD: ${rates.HKD.toFixed(2)}`;
    }
}

function toDisplayCurrency(amount) {
    return displayCurrency === 'USD' ? amount * rates.USD : amount;
}

function getCurrencySymbol() {
    return displayCurrency === 'USD' ? '$' : '£';
}

function changeDisplayCurrency(curr) {
    displayCurrency = curr;
    calculate();
}

function toggleMC() {
    monteCarloEnabled = document.getElementById('enableMC').checked;
    document.getElementById('mcInputs').style.display = monteCarloEnabled ? 'block' : 'none';
    document.getElementById('mcResults').style.display = 'none';
    document.getElementById('mcCharts').style.display = 'none';
}

function randomNormal(mean = 0, std = 1) {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function runMonteCarlo() {
    if (!monteCarloEnabled) return;
    numSims = parseInt(document.getElementById('numSims').value) || 1000;
    volatility = parseFloat(document.getElementById('volatility').value) / 100 || 0.12;
    confidence = parseFloat(document.getElementById('confidence').value) / 100 || 0.95;

    const currentYear = new Date().getFullYear();
    const birthYear = parseInt(document.getElementById('birthYear').value);
    const startAge = currentYear - birthYear;
    const inflation = parseFloat(document.getElementById('inflationRate').value) / 100;
    const drawRate = parseFloat(document.getElementById('drawdownRate').value) / 100;
    const realReqAnnual = parseFloat(document.getElementById('realRequirement').value) * 12;
    const scenarioAge = parseInt(document.getElementById('scenarioRetireAge').value);
    const lifeExp = parseInt(document.getElementById('lifeExpectancy').value) || 95;
    const activeRate = (parseFloat(document.getElementById('rate-' + activeScenarioType).value) || 6) / 100;

    let successes = 0;
    let endingBalances = [];
    let incomeFailures = 0;
    let depletionFailures = 0;

    for (let sim = 0; sim < numSims; sim++) {
        let tempAccs = JSON.parse(JSON.stringify(accounts));
        let simSuccess = true;

        for (let y = 0; y <= (lifeExp - startAge); y++) {
            let age = startAge + y;
            let n_Dist = 0;

            pensions.forEach(p => {
                if (age >= p.age) {
                    let gbpPenNom = (p.amount / rates[p.currency]) * Math.pow(1 + inflation, y);
                    n_Dist += gbpPenNom;
                }
            });

            tempAccs.forEach(a => {
                const effAge = a.locked ? a.retireAge : scenarioAge;
                let isRet = age >= effAge;
                let mon = isRet ? 0 : a.monthly;

                if (a.events) a.events.forEach(ev => {
                    if (parseInt(ev.age) === age) {
                        a.balance += parseFloat(ev.amount);
                    }
                });

                // Random return
                let randReturn = randomNormal(activeRate, volatility);
                for (let m = 0; m < 12; m++) a.balance = Math.max(0, (a.balance + mon) * (1 + randReturn / 12));

                if (isRet && a.balance > 0) {
                    let dist = a.balance * drawRate;
                    a.balance -= dist;
                    n_Dist += (dist / rates[a.currency]);
                }

                // Removed: totalBalNom += a.balance / rates[a.currency];
            });

            // Check if income meets requirements
            const requiredIncome = realReqAnnual * Math.pow(1 + inflation, y);
            if (age >= scenarioAge && n_Dist < requiredIncome) {
                simSuccess = false;
            }
        }

        // Calculate final portfolio value
        let totalBalNom = tempAccs.reduce((sum, a) => sum + a.balance / rates[a.currency], 0);

        endingBalances.push(totalBalNom);
        if (simSuccess && totalBalNom > 0) successes++;
        if (!simSuccess) incomeFailures++;
        if (totalBalNom <= 0) depletionFailures++;
    }

    const successRate = (successes / numSims * 100).toFixed(1);
    const avgBalance = endingBalances.reduce((a, b) => a + b, 0) / numSims;
    const maxBalance = Math.max(...endingBalances);
    const minBalance = Math.min(...endingBalances);
    const riskIncomeShortfall = (incomeFailures / numSims * 100).toFixed(1);
    const riskDepletion = (depletionFailures / numSims * 100).toFixed(1);

    document.getElementById('successRate').textContent = successRate + '%';
    document.getElementById('avgBalance').textContent = getCurrencySymbol() + Math.round(toDisplayCurrency(avgBalance)).toLocaleString();
    document.getElementById('maxBalance').textContent = getCurrencySymbol() + Math.round(toDisplayCurrency(maxBalance)).toLocaleString();
    document.getElementById('minBalance').textContent = getCurrencySymbol() + Math.round(toDisplayCurrency(minBalance)).toLocaleString();
    document.getElementById('riskIncomeShortfall').textContent = riskIncomeShortfall + '%';
    document.getElementById('riskDepletion').textContent = riskDepletion + '%';
    document.getElementById('mcResults').style.display = 'block';

    // Show and create MC charts
    document.getElementById('mcCharts').style.display = 'block';

    // Destroy previous charts
    if (mcHistogramChart) mcHistogramChart.destroy();
    if (mcProbabilityChart) mcProbabilityChart.destroy();

    // Create histogram
    const bins = createHistogramBins(endingBalances);
    mcHistogramChart = new Chart(document.getElementById('mcHistogram'), {
        type: 'bar',
        data: {
            labels: bins.labels,
            datasets: [{
                label: 'Number of Simulations',
                data: bins.data,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Frequency' } },
                x: { title: { display: true, text: 'Ending Balance (' + getCurrencySymbol() + ')' } }
            }
        }
    });

    // Create cumulative probability chart
    const probData = createCumulativeProbability(endingBalances);
    mcProbabilityChart = new Chart(document.getElementById('mcProbability'), {
        type: 'line',
        data: {
            labels: probData.labels,
            datasets: [{
                label: 'Cumulative Probability',
                data: probData.data,
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, max: 1, title: { display: true, text: 'Probability' } },
                x: { title: { display: true, text: 'Ending Balance (' + getCurrencySymbol() + ')' } }
            }
        }
    });
}

function init() {
    fetchExchangeRates().then(() => {
        // Load data from localStorage
        accounts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        pensions = JSON.parse(localStorage.getItem(PENSION_KEY) || '[]');
        history = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');

        if (accounts.length === 0 && pensions.length === 0) {
            alert("No saved data found. Please add your accounts and pensions.");
        }

        updateList();
        updateTotalHeader();
        pensions.forEach(p => addPensionUI(p.name, p.amount, p.age, p.currency));
        history.forEach(h => addHistoryUI(h.date, h.val));
        document.getElementById('displayCurrency').value = displayCurrency;
    });
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
    const lifeExp = parseInt(document.getElementById('lifeExpectancy').value) || 95;
    const activeRate = (parseFloat(document.getElementById('rate-' + activeScenarioType).value) || 6) / 100;

    let tempAccs = JSON.parse(JSON.stringify(accounts));
    let labels = [], nomPotData = [], realPotData = [], nomIncData = [], realIncData = [], floorData = [], histData = [];

    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = `<tr style="background:#f8f9fa;"><th>Year (Age)</th><th>Net Income (${getCurrencySymbol()})</th><th>Nominal Pot</th><th>Adjusted Pot</th></tr>`;

    for (let y = 0; y <= (lifeExp - startAge); y++) {
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
                    eventTags.push(`<span class="tag-event">${ev.name}: ${getCurrencySymbol()}${Math.round(toDisplayCurrency(parseFloat(ev.amount)/rates[a.currency])).toLocaleString()}</span>`);
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
                    <td style="color:${color}; font-weight:${isRet?'bold':'normal'}">Net: ${getCurrencySymbol()}${Math.round(toDisplayCurrency(aggNom)).toLocaleString()} (${getCurrencySymbol()}${Math.round(toDisplayCurrency(aggReal)).toLocaleString()} adj) ${eventTags.join('')}</td>
                    <td>${getCurrencySymbol()}${Math.round(toDisplayCurrency(totalBalNom)).toLocaleString()}</td>
                    <td>${getCurrencySymbol()}${Math.round(toDisplayCurrency(realPot)).toLocaleString()}</td>
                </tr>
                <tr id="row-${y}" class="details-row" style="display:none;"><td colspan="4">
                    <div class="details-container">
                        <div><b>Nominal Account Bals:</b><br>${balDetails.map(d=>d.n+': '+getCurrencySymbol()+Math.round(toDisplayCurrency(d.v)).toLocaleString()).join('<br>')}</div>
                        <div>
                            <b>Income:</b><br>${incomeDetails.map(i=>i.n+': '+getCurrencySymbol()+Math.round(toDisplayCurrency(i.v)).toLocaleString()).join('<br>') || 'None'}
                            <hr style="margin:5px 0;">
                            <b>Activity:</b><br>${contribDetails.map(c=>c.n+' Contrib: '+getCurrencySymbol()+Math.round(toDisplayCurrency(c.v)).toLocaleString()).join('<br>') || 'None'}
                        </div>
                    </div>
                </td></tr>`;
    }
    document.getElementById('chartCard').style.display = 'block'; document.getElementById('tableContainer').style.display = 'block';
    renderGrowthChart(labels, nomPotData.map(toDisplayCurrency), realPotData.map(toDisplayCurrency), nomIncData.map(toDisplayCurrency), realIncData.map(toDisplayCurrency), floorData.map(toDisplayCurrency), histData.map(h => h ? toDisplayCurrency(h) : null));
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
            { label: `Nominal Pot (${getCurrencySymbol()})`, data: np, borderColor: '#1a73e8', pointRadius: 0, tension: 0.2, yAxisID: 'y' },
            { label: `Adjusted Pot (${getCurrencySymbol()})`, data: rp, borderColor: '#34a853', pointRadius: 0, tension: 0.2, yAxisID: 'y' },
            { label: `Logged Progress (${getCurrencySymbol()})`, data: hd, backgroundColor: '#fbbc04', borderColor: '#fbbc04', pointRadius: 5, showLine: false, yAxisID: 'y' },
            { label: `Adj Income (${getCurrencySymbol()})`, data: ri, borderColor: '#e67c73', borderDash: [5, 5], pointRadius: 0, tension: 0.2, yAxisID: 'y1' },
            { label: `Floor (${getCurrencySymbol()})`, data: fd, borderColor: '#ea4335', borderWidth: 2, pointRadius: 0, yAxisID: 'y1' }
        ]},
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { position: 'left' }, y1: { position: 'right', grid: { drawOnChartArea: false } } } }
    });
}

function applyScenario(t, b) { activeScenarioType = t; document.querySelectorAll('.risk-btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); calculate(); }
function toggleSection(id) { const el = document.getElementById(id); el.style.display = el.style.display === 'block' ? 'none' : 'block'; }
function toggleRow(id) { const el = document.getElementById(id); el.style.display = el.style.display === 'table-row' ? 'none' : 'table-row'; }
function updateTotalHeader() { let t = 0; accounts.forEach(a => t += (a.balance / rates[a.currency])); document.getElementById('totalPortfolioAmount').innerText = getCurrencySymbol() + Math.round(toDisplayCurrency(t)).toLocaleString(); }
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

function createHistogramBins(balances) {
    if (balances.length === 0) return { labels: [], data: [] };
    
    const min = Math.min(...balances);
    const max = Math.max(...balances);
    const binCount = 20;
    const binSize = (max - min) / binCount || 1;
    
    const bins = new Array(binCount).fill(0);
    const labels = [];
    
    for (let i = 0; i < binCount; i++) {
        const binStart = min + i * binSize;
        labels.push(Math.round(binStart).toLocaleString());
    }
    
    balances.forEach(b => {
        const bin = Math.min(Math.floor((b - min) / binSize), binCount - 1);
        bins[bin]++;
    });
    
    return { labels, data: bins };
}

function createCumulativeProbability(balances) {
    if (balances.length === 0) return { labels: [], data: [] };
    
    const sorted = [...balances].sort((a, b) => a - b);
    const labels = sorted.map(b => Math.round(b).toLocaleString());
    const data = sorted.map((_, i) => (i + 1) / sorted.length);
    
    return { labels, data };
}


