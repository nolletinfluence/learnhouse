import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

const originalModules = new Map();
for (const name of [
  "next/headers",
  "@services/billing/orgPlan",
  "@services/billing/packs",
  "@services/billing/activeUserBilling",
  "@services/billing/emails",
  "@services/billing/stripe",
]) {
  originalModules.set(name, { ...await import(name) });
}

afterAll(() => {
  for (const [name, exports] of originalModules) {
    mock.module(name, () => exports);
  }
});

let originalWebhookSecret;

const planWrites = [];
let sessionRetrieveQueue = [];
let sessionRetrieveCalls = 0;
let signatureValid = true;

mock.module("next/headers", () => ({
  headers: async () => new Map([["stripe-signature", "sig_test"]]),
}));

mock.module("@services/billing/orgPlan", () => ({
  updateOrganizationConfigInternally: async (orgId, plan) => {
    planWrites.push({ orgId, plan });
    return { ok: true };
  },
}));

mock.module("@services/billing/packs", () => ({
  activatePackInternally: async () => ({}),
  deactivatePackInternally: async () => ({}),
  deactivateAllPacksInternally: async () => ({}),
  markPackCancelingInternally: async () => ({}),
}));

mock.module("@services/billing/activeUserBilling", () => ({
  billOverageForInvoice: async () => ({}),
}));

mock.module("@services/billing/emails", () => ({
  sendPurchaseCompleteMail: async () => ({}),
  sendPackActivatedMail: async () => ({}),
  sendPaymentFailedMail: async () => ({}),
}));

let currentEvent = null;
mock.module("@services/billing/stripe", () => ({
  planForPriceId: async (priceId) =>
    priceId === "price_test_pro" ? { plan: "pro", isPack: false } : undefined,
  getStripeSecretKey: () => "sk_test_stub",
  stripeClient: {
    webhooks: {
      constructEvent: () => {
        if (!signatureValid) throw new Error("No signatures found matching the expected signature");
        return currentEvent;
      },
    },
    checkout: {
      sessions: {
        retrieve: async () => {
          sessionRetrieveCalls += 1;
          return sessionRetrieveQueue.shift() ?? { customer_details: {}, subscription: null };
        },
      },
    },
    customers: { retrieve: async () => ({ email: "billing@example.test" }) },
  },
}));

const { POST } = await import("../app/api/billing/webhook/route.ts");

let eventCounter = 0;
function nextEventId() {
  eventCounter += 1;
  return `evt_test_${eventCounter}`;
}

function subscriptionFixture(overrides = {}) {
  return {
    id: "sub_test",
    status: "active",
    cancel_at_period_end: false,
    metadata: { org_id: "4242", plan: "pro", billing: "monthly" },
    items: { data: [{ price: { id: "price_test_pro" } }] },
    ...overrides,
  };
}

async function deliver(event) {
  currentEvent = event;
  return POST(new Request("https://example.test/api/billing/webhook", { method: "POST", body: "{}" }));
}

beforeEach(() => {
  originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  planWrites.length = 0;
  sessionRetrieveQueue = [];
  sessionRetrieveCalls = 0;
  signatureValid = true;
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

afterEach(() => {
  currentEvent = null;
  if (originalWebhookSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
  else process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
});

describe("signature verification", () => {
  test("an unsigned or mis-signed payload is rejected without touching the plan", async () => {
    signatureValid = false;
    const res = await deliver({ id: nextEventId(), type: "checkout.session.completed" });
    expect(res.status).toBe(400);
    expect(planWrites).toHaveLength(0);
  });
});

describe("checkout.session.completed", () => {
  test("upgrades the org when the subscription is present", async () => {
    sessionRetrieveQueue = [{ customer_details: {}, subscription: subscriptionFixture() }];
    const res = await deliver({
      id: nextEventId(),
      type: "checkout.session.completed",
      data: { object: { id: "cs_test", payment_status: "paid" } },
    });
    expect(res.status).toBe(200);
    expect(planWrites).toEqual([{ orgId: "4242", plan: "pro" }]);
  });

  test("retries a briefly-deferred subscription instead of dropping the upgrade", async () => {
    sessionRetrieveQueue = [
      { customer_details: {}, subscription: null },
      { customer_details: {}, subscription: subscriptionFixture() },
    ];
    const res = await deliver({
      id: nextEventId(),
      type: "checkout.session.completed",
      data: { object: { id: "cs_test", payment_status: "paid" } },
    });
    expect(res.status).toBe(200);
    expect(sessionRetrieveCalls).toBeGreaterThan(1);
    expect(planWrites).toEqual([{ orgId: "4242", plan: "pro" }]);
  });

  test("asks Stripe to redeliver when the subscription never materializes", async () => {
    sessionRetrieveQueue = [];
    const res = await deliver({
      id: nextEventId(),
      type: "checkout.session.completed",
      data: { object: { id: "cs_test", payment_status: "paid" } },
    });
    expect(res.status).toBe(500);
    expect(planWrites).toHaveLength(0);
  });

  test("asks Stripe to redeliver when the price maps to no known plan", async () => {
    sessionRetrieveQueue = [
      {
        customer_details: {},
        subscription: subscriptionFixture({
          metadata: { org_id: "4242" },
          items: { data: [{ price: { id: "price_unmapped" } }] },
        }),
      },
    ];
    const res = await deliver({
      id: nextEventId(),
      type: "checkout.session.completed",
      data: { object: { id: "cs_test", payment_status: "paid" } },
    });
    expect(res.status).toBe(500);
    expect(planWrites).toHaveLength(0);
  });

  test("acks a foreign checkout carrying no org_id", async () => {
    sessionRetrieveQueue = [
      { customer_details: {}, subscription: subscriptionFixture({ metadata: { label: "other-product" } }) },
    ];
    const res = await deliver({
      id: nextEventId(),
      type: "checkout.session.completed",
      data: { object: { id: "cs_test", payment_status: "paid" } },
    });
    expect(res.status).toBe(200);
    expect(planWrites).toHaveLength(0);
  });
});

describe("customer.subscription.created", () => {
  test("upgrades the org — it is the recovery path when checkout.session.completed is dropped", async () => {
    const res = await deliver({
      id: nextEventId(),
      type: "customer.subscription.created",
      data: { object: subscriptionFixture() },
    });
    expect(res.status).toBe(200);
    expect(planWrites).toEqual([{ orgId: "4242", plan: "pro" }]);
  });
});

describe("customer.subscription.updated / deleted", () => {
  test("an active subscription reconciles to the price's plan", async () => {
    const res = await deliver({
      id: nextEventId(),
      type: "customer.subscription.updated",
      data: { object: subscriptionFixture() },
    });
    expect(res.status).toBe(200);
    expect(planWrites).toEqual([{ orgId: "4242", plan: "pro" }]);
  });

  test("deletion downgrades to free", async () => {
    const res = await deliver({
      id: nextEventId(),
      type: "customer.subscription.deleted",
      data: { object: subscriptionFixture() },
    });
    expect(res.status).toBe(200);
    expect(planWrites).toEqual([{ orgId: "4242", plan: "free" }]);
  });
});

describe("idempotency", () => {
  test("a redelivery of a successful event is not applied twice", async () => {
    const event = {
      id: nextEventId(),
      type: "customer.subscription.created",
      data: { object: subscriptionFixture() },
    };
    await deliver(event);
    const res = await deliver(event);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ result: "duplicate" });
    expect(planWrites).toHaveLength(1);
  });

  test("a redelivery after a FAILED delivery is reprocessed, not called a duplicate", async () => {
    const event = {
      id: nextEventId(),
      type: "checkout.session.completed",
      data: { object: { id: "cs_test", payment_status: "paid" } },
    };
    sessionRetrieveQueue = [];
    const first = await deliver(event);
    expect(first.status).toBe(500);

    sessionRetrieveQueue = [{ customer_details: {}, subscription: subscriptionFixture() }];
    const second = await deliver(event);
    expect(second.status).toBe(200);
    expect(planWrites).toEqual([{ orgId: "4242", plan: "pro" }]);
  });
});
