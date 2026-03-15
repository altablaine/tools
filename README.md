# Portfolio Pro

A lightweight retirement prediction tool built with HTML, CSS, and JavaScript. It lets you model savings, pension income, and withdrawal scenarios to estimate how your portfolio behaves over time and whether it can support your desired post-retirement income. Features Monte Carlo simulations for risk analysis with visual charts.

---

## ✅ What it does

- Projects a **year-by-year retirement forecast** from today up to your configured life expectancy.
- Shows both **nominal portfolio value** and **inflation-adjusted value**.
- Calculates income from:
  - **Periodic withdrawals** (using a configurable safe withdrawal rate)
  - **Pensions** starting at a target age
- Lets you add:
  - Multiple accounts (investment accounts, cash, etc.)
  - One-off events (lump deposits/withdrawals by age)
  - Pension income streams
  - Historical balance points (for plotting logged progress)
- Persists your data automatically using **localStorage**.
- **Monte Carlo simulations** for probabilistic risk analysis with visual charts.

---

## 🧭 Key Inputs

### Core assumptions
- **Retire age scenario** (target age for full withdrawal)
- **Life expectancy** (how long to project, default 95)
- **Inflation %**
- **Safe withdrawal %**
- **Annual requirement (real)** — monthly requirement is annualized internally
- **Display currency** — View projections in GBP (£) or USD ($), default GBP

### Risk / growth scenarios
You can select a growth rate to model different portfolio return assumptions.
- **Cons** (Conservative)
- **Bal** (Balanced) — default
- **Aggr** (Aggressive)

Each scenario has its own expected annual return rate that you can adjust.

### Monte Carlo simulations (optional)
For advanced risk analysis, enable Monte Carlo to run probabilistic simulations:
- **Number of simulations**: 100-10,000 (default 1,000)
- **Volatility %**: Market volatility (default 12%)
- Outputs: Success rate, average/max/min ending balances, risk of income shortfall, risk of portfolio depletion, distribution charts

---

## 📥 Account & Pension Inputs

### Account setup
For each account you can set:
- Name
- Currency (GBP / USD / HKD)
- Current balance
- Monthly contribution
- Target draw age (lockable)
- One-off events (e.g., bonuses, capital gains, major spending)

### Pension setup
- Name
- Amount (annual, in selected currency)
- Age when the pension starts

---

## 📊 Output & Visualization

After clicking **Project Life Path**, the tool renders:
- A **line chart** showing:
  - Nominal portfolio value
  - Inflation-adjusted portfolio value
  - Adjusted income (withdrawals + pensions)
  - Required floor income
- A **table view** showing per-year breakdown
- Detail rows with:
  - Income sources
  - Contributions
  - Account balances

All amounts are displayed in the selected display currency (GBP or USD).

**Monte Carlo simulations** provide probabilistic analysis with:
- **Text Summary**: Success rate, average/max/min ending balances, risk of income shortfall, risk of portfolio depletion
- **Distribution Histogram**: Bar chart showing frequency of different ending balances
- **Cumulative Probability Curve**: Line chart showing likelihood of achieving certain balances

---

## � File Structure

The app is organized into three files for better maintainability:
- **`invest.html`** — Main HTML structure and layout.
- **`styles.css`** — All CSS styles for the UI.
- **`app.js`** — JavaScript logic for calculations, data handling, and interactions.

---

## �💾 Persistence & Data Sync

Data is saved automatically in the browser via `localStorage`.

You can also:
- Download a JSON backup
- Upload a JSON file to restore
- Export/import via a base64 text field for quick data sharing

---

## ▶️ How to run

1. Open `invest.html` in your browser (double-click or drag into a browser window).
2. Enter your assumptions and accounts.
3. Click **Project Life Path** to update the chart and table.

---

## � Dependencies

- **Chart.js** (loaded from CDN for charting) — No local installation needed.- **Exchange Rate API** (fetched from exchangerate-api.com for currency conversion) — Free, no key required; uses prior EOD rates.
---

## �🛠 Notes / Tips

- The model assumes monthly compounding on the selected annual growth rate.
- Withdrawals are taken at the end of each year after growth is applied.
- Inflation is applied to the “real” (inflation-adjusted) required income and pot values.- Projections run from current age to your configured life expectancy (default 95).
- Monte Carlo success requires both sufficient income throughout retirement AND ending with money remaining.
- Risk of Income Shortfall measures scenarios where income drops below requirements (but money may remain).
- Risk of Portfolio Depletion measures scenarios where the portfolio is completely exhausted.- To reset, either clear your browser’s local storage for this page or remove saved accounts/pensions in the UI and save.

---

## 📌 File
- `invest.html` — single-file tool (no build steps required)
