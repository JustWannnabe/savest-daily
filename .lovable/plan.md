
## MoneyFlow — Updated Plan (Hackathon Build)

Same foundation as approved (Lovable Cloud auth, INR, Apple-minimalist design, sidebar+bottom nav, theme toggle, streak header, Recharts). Updates below replace the v1 placeholders.

### Alerts Center — Functional (rule-based)
- Computed live from the user's transactions; no manual entry needed.
- **Detection rules**:
  1. **Subscription price jump** — same merchant/category tagged "Subscription" appears monthly; flag when latest amount > previous by ≥ 10%.
  2. **Spending spike** — for each category, if this week's spend > 2× the trailing 4-week average, raise an alert.
  3. **Bonus rule** — single transaction > 3× user's average transaction size ("Unusual large charge").
- **UI**: list of alert cards with severity color (amber/red), icon (TrendingUp, AlertTriangle, Repeat), human message ("Netflix went from ₹499 → ₹649"), timestamp, and a "Dismiss" / "View transaction" action.
- Dismissed alert IDs stored per-user in `alert_dismissals` table so they stay hidden across sessions.
- Header bell shows unread count badge.

### Transactions — Simulated Import
- New **"Import"** button next to "Add transaction" opens a dialog with two tabs: **Upload CSV** and **Scan Receipt (image)**.
- Drag-drop or file picker accepts `.csv`, `.png`, `.jpg`.
- On submit: 2–3s **"Scanning…"** animation (shimmer + scanning-line over a preview of the file, rotating status text: "Reading file → Detecting merchants → Categorizing").
- Then reveals a **review table** of 4–6 auto-generated transactions (realistic student-life sample data: Zomato, Uber, Amazon, Spotify, etc., with categories + dates spread across the last 14 days).
- User can edit/uncheck rows, then **"Import 5 transactions"** writes them to the DB in one batch — they appear instantly on Dashboard/Analytics/Alerts.
- Pure client-side simulation (no real OCR/parsing) — clearly labelled "Demo import" so it's honest for the hackathon.

### AI Mentor — Chat UI with Quick Insights
- Full chat layout: scrollable message list, assistant avatar (Sparkles icon), user bubbles right-aligned, assistant bubbles left-aligned with subtle fade-in.
- Opens with a friendly greeting message from the mentor.
- Below the greeting: **3 Quick Insight chips**:
  1. *"How can I save more this month?"*
  2. *"Where am I overspending?"*
  3. *"Give me a 50/30/20 plan for ₹15,000"*
- Tapping a chip pushes the user's question into the thread, shows a 600ms typing indicator (three pulsing dots), then streams in a hardcoded, well-formatted response (uses real numbers from the user's transactions where trivial — e.g., top category name + amount — otherwise static advice).
- Input bar is enabled but only echoes a polite "I can answer the Quick Insights for now — full chat coming soon" for free-text. Keeps the demo honest while feeling alive.

### Data model additions
- `alert_dismissals` (user_id, alert_key, dismissed_at) — RLS: own rows only.
- No schema change needed for import (writes to existing `transactions`).

Everything else from the previously approved plan stands.
