# Portfolio Pro

A lightweight retirement prediction tool built with HTML, CSS, and JavaScript. It lets you model savings, pension income, and withdrawal scenarios to estimate how your portfolio behaves over time and whether it can support your desired post-retirement income.

---

## ✅ What it does

- Projects a **year-by-year retirement forecast** from today up to age 95.
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

---

## 🧭 Key Inputs

### Core assumptions
- **Retire age scenario** (target age for full withdrawal)
- **Inflation %**
- **Safe withdrawal %**
- **Annual requirement (real)** — monthly requirement is annualized internally

### Risk / growth scenarios
You can select a growth rate to model different portfolio return assumptions.
- **Cons** (Conservative)
- **Bal** (Balanced) — default
- **Aggr** (Aggressive)

Each scenario has its own expected annual return rate that you can adjust.

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

- **Chart.js** (loaded from CDN for charting) — No local installation needed.

---

## �🛠 Notes / Tips

- The model assumes monthly compounding on the selected annual growth rate.
- Withdrawals are taken at the end of each year after growth is applied.
- Inflation is applied to the “real” (inflation-adjusted) required income and pot values.
- To reset, either clear your browser’s local storage for this page or remove saved accounts/pensions in the UI and save.

---

## 📌 File
- `invest.html` — single-file tool (no build steps required)
