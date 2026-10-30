import assert from "node:assert/strict";
import test from "node:test";
import { acceptWebhook, draftInvoice, effectivePlan, FX_ZMW_PER_USD, gate, manualTransfer, plans, seatsAllowed } from "../src/lib/billing";

test("planning prices stay labeled and unpriced audiences have no number", () => {
  assert.equal(FX_ZMW_PER_USD, 27);
  assert.equal(plans.find((plan) => plan.id === "student")?.priceZmw, 1200);
  assert.equal(plans.find((plan) => plan.id === "newsroom")?.priceZmw, 54000);
  assert.equal(plans.find((plan) => plan.id === "mining")?.priceZmw, 540000);
  for (const id of ["university", "ngo", "cooperative", "government"]) {
    assert.equal(plans.find((plan) => plan.id === id)?.priceZmw, null);
  }
});

test("the public catalogue stays open and paid actions stay gated", () => {
  assert.equal(gate("public", "catalogue").allowed, true);
  assert.equal(gate("public", "desk").allowed, true);
  assert.equal(gate("public", "export").allowed, false);
  assert.equal(gate("public", "forecast").allowed, false);
  assert.equal(gate("public", "workspace").allowed, false);
  assert.equal(gate("newsroom", "export").allowed, true);
  assert.equal(gate("university", "export").allowed, false);
});

test("seats, trials, invoices, and webhooks do not charge a card", () => {
  assert.equal(seatsAllowed("student", 2).ok, false);
  assert.equal(seatsAllowed("newsroom", 15).ok, true);
  assert.equal(effectivePlan({ planId: "newsroom", status: "trial", trialEnds: "2026-10-01" }, "2026-10-15"), "public");
  assert.equal(effectivePlan({ planId: "newsroom", status: "trial", trialEnds: "2026-11-01" }, "2026-10-15"), "newsroom");
  assert.equal(effectivePlan({ planId: "newsroom", status: "cancelled", trialEnds: null }, "2026-10-15"), "public");
  const invoice = draftInvoice("newsroom", 10);
  assert.ok(!("error" in invoice));
  if (!("error" in invoice)) {
    assert.equal(invoice.amountZmw, 54000);
    assert.equal(invoice.planning, true);
    assert.equal(manualTransfer("inv-1", invoice.amountZmw).charged, false);
  }
  assert.ok("error" in draftInvoice("university", 1));
  const first = acceptWebhook([], "evt-1");
  const second = acceptWebhook(first.seen, "evt-1");
  assert.equal(first.accept, true);
  assert.equal(second.accept, false);
});
