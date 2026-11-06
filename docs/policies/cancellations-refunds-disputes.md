# Cancellations, refunds and disputes — draft for review

Status: **Draft v2, in use as the default for Phase 3; §6 still open (ROADMAP decision D10)** · 2026-10-31

This sets the rules Phase 3 (checkout and payments) and Phase 4 (fulfilment and disputes) enforce in code. The Phase 3 numbers are in `src/modules/ordering/config.ts`. Every number in **bold** is a proposal you can change. Plain-language buyer terms will be written from this once it's agreed. This isn't legal advice: have a lawyer check the buyer-facing version before launch, alongside D11, D12 and D14.

**Starting point (D1):** Akuafo manages every farm's stock. Stock shown in the app is available, so paying confirms the order. There's no "waiting for the farm to confirm" step. Anything not available shows as out of stock and can't be bought.

## 1. How an order moves

1. **Checkout.** The buyer pays by mobile money or card through Paystack. The stock is held for **30 minutes** while they approve the payment. If payment doesn't arrive in that time, the hold ends, the stock goes back on sale, and nothing is charged.
2. **Paid = confirmed.** The stock is taken off sale and the order is confirmed straight away. The buyer gets a confirmation.
3. **Preparation.** Akuafo arranges pickup from each farm in the order.
4. **Delivery** to the buyer's address, anywhere in Ghana.
5. **Complete** when the buyer confirms receipt, or automatically **48 hours** after delivery if no problem is reported.

## 2. Cancellations

| When                     | Who    | What happens                                                                                                                                                   |
| ------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Before payment           | Buyer  | Leave checkout or let it expire. Nothing is charged.                                                                                                           |
| Paid, not yet picked up  | Buyer  | Cancel in the app. **Full refund** during the pilot. The stock goes back on sale.                                                                              |
| Picked up or on the way  | Buyer  | Can't be cancelled. Report a problem on arrival instead (§4).                                                                                                  |
| Any time before delivery | Akuafo | If produce turns out not to be there, fails quality at pickup, or can't be delivered: **full refund** of the affected items. The rest of the order goes ahead. |

## 3. Refunds

- **In full, without the buyer asking:** items Akuafo cancels before delivery (§2). The buyer is told which items and why.
- **If losing some items makes the order less useful,** the buyer can cancel the rest within **2 hours** of being told, for a full refund of them.
- **Refunds go back to the original payment method:** mobile money usually within **1–3 working days**, cards **5–10 working days**, depending on the bank.
- **Delivery fees** are refunded when every item in that delivery is refunded, or when Akuafo or the farm caused the problem.
- **Payment fees:** Akuafo absorbs Paystack's fee on every refund during the pilot.
- **Refunds after a dispute need staff approval** (§4). Staff can't approve a refund on an order they handled.

## 4. Problems on delivery (disputes)

- **Report within 24 hours of delivery** (produce is perishable), in the app, with **at least one photo**, the items affected and the quantity.
- **Valid reasons:** missing items; damaged items; wrong product, variety or grade; quality below the Akuafo grade description shown on the listing; short weight against the stated weight per unit.
- **The standard is the listing:** grade descriptions, photos and stated weights are what the buyer was promised.
- **Akuafo replies within 1 working day and decides within 3 working days.** The outcome is a full or partial refund to the original payment method, or a credit note if the buyer prefers.
- **While a dispute is open,** the farm isn't paid for the disputed items. The rest of the order settles normally.
- **No disputes after 24 hours** or after the buyer confirmed receipt, except for missing items, which can be raised within **72 hours**.

## 5. Stock accuracy and farms

- Because buyers pay for stock shown in the app, **stock is updated as soon as a farm's situation changes** (a sale elsewhere, spoilage, harvest delays). Staff see a reminder for listings not updated in 3 days.
- When produce isn't there at pickup, it's recorded against the farm. **3 shortfalls in 30 days** triggers a staff review and possible suspension, using the existing verification controls.
- Farms are paid only for what was delivered and not successfully disputed, minus Akuafo's commission (D2). The payout schedule depends on D9.

## 6. Questions for you

1. **Free cancellation until pickup:** keep it free during the pilot (proposed), or charge something once the farm has started harvesting?
2. **Delivery promise:** what should buyers be told, e.g. next-day delivery for orders paid before a cut-off time?
3. **Is 24 hours long enough to report quality problems?** Some hotels check produce only at the next prep shift.
4. **Credit notes:** offer them at all in the pilot, or refunds only (simpler for the ledger)?
5. **Minimum order value:** set one to make delivery worthwhile, or leave it at per-listing minimums for now?
6. **Who approves refunds:** any staff member except the one involved (proposed), or admins only?
