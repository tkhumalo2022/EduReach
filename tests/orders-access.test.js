import assert from "node:assert/strict";
import test from "node:test";

import {
  createOrder,
  getConfirmedOrder,
  getResourceAccessState,
  markOrderFailed,
  markOrderPaid,
  toPublicOrder
} from "../src/lib/orders.js";

test("grants access when a paid order contains the resource", () => {
  const order = {
    id: "ER-123",
    status: "paid",
    items: [{ type: "ebooks", slug: "sample-ebook" }]
  };

  const result = getResourceAccessState({ type: "ebooks", slug: "sample-ebook" }, [order]);

  assert.equal(result.accessGranted, true);
  assert.equal(result.order?.id, "ER-123");
});

test("does not grant access for a pending or cancelled order", () => {
  const pending = {
    id: "ER-pending",
    status: "pending",
    items: [{ type: "downloads", slug: "lesson-plan" }]
  };
  const cancelled = {
    id: "ER-cancelled",
    status: "cancelled",
    items: [{ type: "downloads", slug: "lesson-plan" }]
  };

  assert.equal(getResourceAccessState({ type: "downloads", slug: "lesson-plan" }, [pending]).accessGranted, false);
  assert.equal(getResourceAccessState({ type: "downloads", slug: "lesson-plan" }, [cancelled]).accessGranted, false);
});

test("moves downloads into confirmed access only after payment is marked paid", () => {
  const order = createOrder({
    customer: { name: "Test", surname: "Buyer", email: "buyer@example.com" },
    amountCents: 12500,
    items: [{
      id: "ebook-1",
      type: "ebooks",
      slug: "inclusive-classroom-guide",
      title: "Inclusive Classroom Guide",
      quantity: 1,
      unitAmountCents: 12500,
      amountCents: 12500,
      fileUrl: "https://example.com/paid-guide.pdf"
    }]
  });

  assert.equal(getConfirmedOrder(order.id), null);
  assert.equal(toPublicOrder(order, { includeDownloads: true }).items[0].downloadUrl, "");

  markOrderPaid(order.id, { pfPaymentId: "PF-1", amountGross: "125.00" });
  const confirmedOrder = getConfirmedOrder(order.id);

  assert.equal(confirmedOrder?.status, "paid");
  assert.equal(toPublicOrder(confirmedOrder, { includeDownloads: true }).items[0].downloadUrl, "https://example.com/paid-guide.pdf");
});

test("failed payment status cannot downgrade or unlock a paid order", () => {
  const order = createOrder({
    customer: { name: "Paid", surname: "Buyer", email: "paid@example.com" },
    amountCents: 5000,
    items: [{
      id: "download-1",
      type: "downloads",
      slug: "support-template",
      title: "Support Template",
      quantity: 1,
      unitAmountCents: 5000,
      amountCents: 5000,
      fileUrl: "https://example.com/support-template.pdf"
    }]
  });

  markOrderPaid(order.id, { pfPaymentId: "PF-2", amountGross: "50.00" });
  markOrderFailed(order.id, { status: "FAILED" });

  const confirmedOrder = getConfirmedOrder(order.id);
  assert.equal(confirmedOrder?.status, "paid");
  assert.equal(toPublicOrder(confirmedOrder, { includeDownloads: true }).items[0].downloadUrl, "https://example.com/support-template.pdf");
});
