import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getAttributionForSubmit, readStoredAttribution } from "../src/lib/attribution/client";
import { ATTR_COOKIE, ATTR_STORAGE_KEY } from "../src/lib/attribution/types";

const originalGlobals = new Map(
  ["window", "document", "location"].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
);

afterEach(() => {
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

function browser(options: {
  local?: string;
  cookie?: string;
  search?: string;
  localBlocked?: boolean;
  cookieReadBlocked?: boolean;
  cookieWriteBlocked?: boolean;
  discardWrites?: boolean;
} = {}) {
  let local = options.local ?? null;
  let cookie = options.cookie ? `${ATTR_COOKIE}=${encodeURIComponent(options.cookie)}` : "";
  const denied = () => { throw new DOMException("Storage access denied", "SecurityError"); };
  const location = { protocol: "https:", pathname: "/en/get-a-quote", search: options.search ?? "" };
  const document = Object.defineProperty({}, "cookie", {
    get: () => options.cookieReadBlocked ? denied() : cookie,
    set: (value: string) => {
      if (options.cookieWriteBlocked) denied();
      if (!options.discardWrites) cookie = value.split(";")[0];
    },
  });
  const window = Object.defineProperty({ location }, "localStorage", {
    get: () => {
      if (options.localBlocked) return denied();
      return {
        getItem: (key: string) => key === ATTR_STORAGE_KEY ? local : null,
        setItem: (_key: string, value: string) => { if (!options.discardWrites) local = value; },
      };
    },
  });
  for (const [key, value] of Object.entries({ window, document, location })) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
}

test("server rendering has no attribution and does not touch browser storage", () => {
  Reflect.deleteProperty(globalThis, "window");
  assert.equal(readStoredAttribution(), null);
  assert.equal(getAttributionForSubmit(), null);
});

test("a blocked localStorage getter still allows the saved cookie", () => {
  browser({ localBlocked: true, cookie: JSON.stringify({ utm_source: "partner" }) });
  assert.equal(readStoredAttribution()?.utm_source, "partner");
});

test("a blocked cookie getter still allows saved localStorage", () => {
  browser({ cookieReadBlocked: true, local: JSON.stringify({ utm_source: "newsletter" }) });
  assert.equal(readStoredAttribution()?.utm_source, "newsletter");
});

test("cookie write rejection cannot interrupt form attribution preparation", () => {
  browser({ cookieWriteBlocked: true, search: "?utm_source=partner&utm_medium=referral" });
  const result = getAttributionForSubmit();
  assert.equal(result?.utm_source, "partner");
  assert.equal(result?.utm_medium, "referral");
});

test("current URL attribution reaches the submit payload when all storage is blocked", () => {
  browser({ localBlocked: true, cookieReadBlocked: true, cookieWriteBlocked: true,
    search: "?utm_source=partner&utm_campaign=electrical" });
  const result = getAttributionForSubmit();
  assert.equal(result?.utm_source, "partner");
  assert.equal(result?.utm_campaign, "electrical");
  assert.equal(result?.landing_path, "/en/get-a-quote");
  assert.ok(result?.captured_at);
});

test("silently discarded writes do not discard current URL attribution", () => {
  browser({ discardWrites: true, search: "?utm_source=partner" });
  assert.equal(getAttributionForSubmit()?.utm_source, "partner");
  assert.equal(readStoredAttribution(), null);
});

test("existing first-touch values survive a subsequent campaign URL", () => {
  browser({ local: JSON.stringify({ utm_source: "first", utm_campaign: "initial", landing_path: "/en" }),
    search: "?utm_source=later&utm_campaign=second" });
  const result = getAttributionForSubmit();
  assert.equal(result?.utm_source, "first");
  assert.equal(result?.utm_campaign, "initial");
  assert.equal(result?.landing_path, "/en");
});

test("malformed local JSON does not hide a valid cookie", () => {
  browser({ local: "invalid JSON", cookie: JSON.stringify({ utm_source: "partner" }) });
  assert.equal(readStoredAttribution()?.utm_source, "partner");
});

test("an untagged visit with blocked storage returns no invented attribution", () => {
  browser({ localBlocked: true, cookieReadBlocked: true, cookieWriteBlocked: true });
  assert.equal(getAttributionForSubmit(), null);
});
