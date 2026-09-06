# FlyHigh Money Flow — From Client Payment to Expert Payout

The complete journey of a rupee on FlyHigh: client payment → commission split → settlement → expert withdrawal → automatic bank transfer. With UI samples from the live app.

> Styled HTML version with visual UI mockups: `expert-payout-flow.html`
> Setup/config guide: `razorpayx-payout-setup.md`

**Worked example used throughout:** expert rate **₹1,000/hour**, session **60 minutes** → client pays **₹1,250**, split **80/20** (₹1,000 expert / ₹250 TrinaDe).

---

## The journey at a glance

```
Client pays ₹1,250 ──► Split & hold ──────────► Settlement ────────► Expert withdraws
(Razorpay checkout)    ₹1,000 expert earning     window elapses      RazorpayX transfers
                       ₹250 TrinaDe commission   → AVAILABLE          ₹1,000 to bank/UPI
```

---

## 1. The money split — 80% expert, 20% TrinaDe

For every payment the split is fixed: **80% of the client's payment goes to the expert's earnings, and 20% stays with TrinaDe** as the platform commission.

```
clientAmount       = ₹1,250     // what the client pays
expertAmount       = ₹1,000     // clientAmount × 80%
trinaDeCommission  = ₹250       // clientAmount × 20%
```

| Client pays | Expert gets | TrinaDe keeps | Split |
|---|---|---|---|
| ₹1,250 | ₹1,000 | ₹250 | **80% / 20%** |

The split is driven by the commission setting (**Admin → Settings → Commission Rate**; backend: `PricingService` — single source of truth). All money math uses BigDecimal with banker's rounding.

---

## 2. The client pays

1. Client books a session; backend creates a Razorpay order for the full client price (in paise).
2. Client pays via Razorpay checkout → signature verified (client-side + atomic backend claim) → payment status **`HELD`**. The `payment.captured` webhook is the backup path.
3. The money stays **held** through the session and settlement window — it's not credited to anyone yet, so the client can still dispute/refund.

```
UI sample · client payment step
┌────────────────────────────────────────────┐
│ Book Session — 60 min                      │
│ Expert rate ₹1,000/hr · Platform fee ₹250  │
│ Total ₹1,250                               │
│ [ Pay ₹1,250 via Razorpay ]                │
└────────────────────────────────────────────┘
```

---

## 3. Session completes → the earning is created

When the session is `COMPLETED` and payment `HELD`, an **ExpertEarning** record is created and the settlement countdown starts:

```json
{
  "clientPaidAmount": 1250.00,
  "platformFee": 250.00,          // TrinaDe's share
  "expertEarningAmount": 1000.00, // expert's share
  "status": "PENDING",
  "settlementStartTime": "2026-08-21T10:00:00Z",
  "settlementEndTime": "2026-08-21T10:10:00Z"   // + settlement window
}
```

The **settlement window** = Admin → Settings → **Dispute Window** (default 10 min in dev; set 24h+ for production). Clients can dispute/refund inside this window; nothing is payable while `PENDING`.

---

## 4. Settlement — PENDING becomes AVAILABLE

A scheduled worker (every 1 min in dev) picks `PENDING` earnings whose window elapsed and runs **five checks** (`SettlementService`):

```
PENDING → claim → SETTLEMENT_PROCESSING → checks:
 1. Payment still HELD
 2. Session COMPLETED
 3. No active dispute
 4. No refund in progress
 5. No payout already exists for this earning

All pass  → status = AVAILABLE   ← now withdrawable
Any fail  → revert to PENDING (max 5 attempts, then blocked for admin review)
```

Disputes/refunds therefore **block money from becoming withdrawable** until resolved.

---

## 5. The expert dashboard shows the money

```
UI sample · expert dashboard — overview cards
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ AVAILABLE       │ │ PENDING         │ │ LIFETIME        │
│ ₹1,000   (green)│ │ ₹0      (amber) │ │ ₹1,000          │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

| Card | What it counts |
|---|---|
| Available Balance | `AVAILABLE` earnings **not** currently inside a withdrawal request — what the Withdraw button pays out |
| Pending Balance | `PENDING` + `SETTLEMENT_PROCESSING` + `DISPUTED` — still in the window or under review |
| Lifetime Earnings | Every expert earning ever created, any status |

---

## 6. Adding bank details

Expert dashboard → **Withdraw to Bank** → fill name, account number, IFSC, optional UPI → **Save Details**.

```
UI sample · Payout Details form
┌────────────────────────────────────────────────┐
│ Withdraw to Bank                               │
│ Payout Details · Saved: account ending 6789    │
│ ✓ Bank details verified · Registered name: …   │
│ ┌─────────────────┐ ┌─────────────────┐        │
│ │ Gaurav Kumar    │ │ ********6789    │        │
│ └─────────────────┘ └─────────────────┘        │
│ ┌─────────────────┐ ┌─────────────────┐        │
│ │ HDFC0000053     │ │ gaurav@upi      │        │
│ └─────────────────┘ └─────────────────┘        │
│ [ Save Details ]                               │
└────────────────────────────────────────────────┘
```

- **Account number masking:** after saving, the field always shows only the last 4 digits (`********6789`). The full number is stored but never displayed; click the field to type a replacement.
- **Live-mode verification:** with RazorpayX keys configured, saving bank details creates a contact + fund account at RazorpayX and starts a ₹1 validation. UI states: `⏳ Verifying bank details…` → `✓ Bank details verified` or `✗ Bank verification failed: <reason> — re-save your details`. Failed verification blocks bank withdrawals until fixed. (Test mode has no validation API → skipped, format checks only.)

---

## 7. Clicking "Withdraw Available Balance"

```
UI sample · Withdrawal section
┌──────────────────────────────────────────────┐
│ Withdrawal                                   │
│ Withdrawable balance: ₹1,000 · Minimum: ₹1,000│
│ [ 💰 Withdraw Available Balance ]            │
│ ┌──────────────────────────────────────────┐ │
│ │ Withdrawal requested — ₹1,000 across     │ │
│ │ 1 earning(s). Processing shortly.        │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### Backend sequence (`POST /api/expert/payouts/withdraw`)

```
1. Auth: expert role + bank/UPI details on file
2. Atomically claim every eligible AVAILABLE earning
   (findAndModify: payoutStatus → PROCESSING)   ← no double-withdrawal, ever
3. Total < ₹1,000 minimum → release claims, error out
4. Create Payout (PROCESSING) — earnings bundle + bank-details snapshot + idempotency key
5. RazorpayX transfer (automatic mode):
   a. contact "expert_<id>"           (reuse or create)
   b. fund account (bank / VPA)       (from the snapshot)
   c. POST /v1/payouts                (IMPS ≤ ₹5L, NEFT above, UPI ≤ ₹1L)
      X-Payout-Idempotency: <payoutId>  ← retries can't double-pay
      queue_if_low_balance: true
   d. store gatewayPayoutId + mode on the Payout
6. Respond "Withdrawal requested" — stays PROCESSING until the gateway confirms
```

Any failure in step 5 releases the claims immediately → payout `FAILED` with reason, full amount back in Available Balance.

### How the amounts adjust

| Record | Before withdraw | Right after (PROCESSING) | Payout SUCCESS | Payout FAILED |
|---|---|---|---|---|
| Available Balance | ₹1,000 | **₹0** (drops instantly) | ₹0 | **₹1,000 restored** |
| Pending Balance | ₹0 | ₹0 | ₹0 | ₹0 |
| Lifetime Earnings | ₹1,000 | ₹1,000 | ₹1,000 | ₹1,000 |
| Earning status | AVAILABLE | AVAILABLE · in withdrawal | **PAID** | AVAILABLE · released |
| Recent Withdrawals | — | ₹1,000 `PROCESSING` | ₹1,000 `SUCCESS` + UTR | ₹1,000 `FAILED` + red reason |

---

## 8. The money lands in the expert's bank

RazorpayX processes the transfer and calls the webhook (`/api/webhooks/razorpayx`):

- `payout.processed` → payout **SUCCESS** (UTR stored), earnings → **PAID**, interaction payment closed to PAID.
- `payout.reversed / failed / rejected / cancelled` → payout **FAILED** with the reason shown in red in the expert's list, earnings **released back to AVAILABLE**.
- Missed webhook? An hourly reconcile worker re-checks every stuck payout with RazorpayX and applies the real outcome.
- `processed` arriving after FAILED is never auto-flipped (double-pay protection) → critical log for manual admin review.

```
UI sample · Recent Withdrawals
┌───────────────────────────────────────────────┐
│ RECENT WITHDRAWALS                            │
│ ₹1,000  21 Aug 2026 · Ref HDFCN00000000001  ✔ SUCCESS │
│ ₹2,500  18 Aug 2026                        ⏳ PROCESSING│
│ ₹800    10 Aug 2026   ✗ FAILED               │
│   Gateway: invalid IFSC code for beneficiary │
└───────────────────────────────────────────────┘
```

---

## 9. What the admin sees (Admin → Payouts)

- Every payout listed with status, mode (`RazorpayX · IMPS/NEFT/UPI`) and gateway state.
- **Mark Paid** stays enabled — emergency override (enter the UTR).
- **Fail** is disabled for RazorpayX-managed payouts — the money may already be moving.
- No RazorpayX keys configured → payouts sit in `PROCESSING` and both buttons work (old manual mode).

---

## 10. Why money can't be lost or double-paid

| Guarantee | Mechanism |
|---|---|
| Atomic claims | `findAndModify` claims earnings before any payout is created — double clicks can't double-pay |
| Gateway idempotency | `X-Payout-Idempotency: <payoutId>` — retries return the same RazorpayX payout |
| Terminal guards | SUCCESS ignores late failure events; FAILED never auto-flips to SUCCESS |
| Failure releases money | Every failure path returns earnings to AVAILABLE |
| Reconcile worker | Hourly re-check of stuck payouts against the gateway |
| Snapshot banking | Payout stores bank details as-of request time — mid-flight edits can't redirect it |

---

## Full lifecycle reference

| Moment | Earning status | Payout status | Available | Pending | Lifetime |
|---|---|---|---|---|---|
| Session completed, payment held | PENDING | — | — | +₹1,000 | +₹1,000 |
| Settlement passes | AVAILABLE | — | +₹1,000 | −₹1,000 | same |
| Expert clicks Withdraw | AVAILABLE (claimed) | PROCESSING | −₹1,000 | same | same |
| Webhook processed | PAID | SUCCESS | same | same | same |
| Webhook failed | AVAILABLE (released) | FAILED | +₹1,000 | same | same |
| Dispute/refund in progress | DISPUTED / blocked | — | blocked | in Pending | same |

**Key files:** `ExpertPayoutService` (withdraw + gateway), `SettlementService` (window + checks), `PricingService` (split formula), `RazorpayXPayoutGateway` (transfers), `RazorpayXPayoutWebhookController` (confirmations), `ExpertEarningsPage.tsx` (expert UI).
