import assert from "node:assert/strict";
import test from "node:test";
import { apiKeyAllows, canInvite, canReadPrivateDesk, issueApiKey, onboardingStatus, onboardingSteps, sameOrganization, usageReport } from "../src/lib/workspace";

test("a private desk stays inside the organization", () => {
  assert.equal(canReadPrivateDesk({ privateDesk: true, member: false, role: "researcher" }), false);
  assert.equal(canReadPrivateDesk({ privateDesk: true, member: true, role: "researcher" }), true);
  assert.equal(canReadPrivateDesk({ privateDesk: false, member: false, role: "reader" }), true);
  assert.equal(sameOrganization("a", "b", "editor"), false);
  assert.equal(sameOrganization("a", "b", "admin"), true);
});

test("invitations follow the role ladder", () => {
  assert.equal(canInvite("researcher", "viewer"), false);
  assert.equal(canInvite("org_admin", "researcher"), true);
  assert.equal(canInvite("org_admin", "admin"), false);
  assert.equal(canInvite("admin", "admin"), true);
});

test("an API key is stored as a hash and checked by scope", () => {
  const issued = issueApiKey();
  assert.notEqual(issued.raw, issued.hash);
  assert.equal(issued.hash.length, 64);
  assert.equal(apiKeyAllows(["catalogue"], "export"), false);
  assert.equal(apiKeyAllows(["catalogue", "search"], "search"), true);
});

test("onboarding has nine steps and usage counts actions", () => {
  assert.equal(onboardingSteps.length, 9);
  const open = onboardingStatus(["organization"]);
  assert.equal(open.complete, false);
  assert.equal(open.missing.length, 8);
  assert.equal(onboardingStatus([...onboardingSteps]).complete, true);
  assert.deepEqual(usageReport([{ action: "query" }, { action: "query" }, { action: "brief" }]), { query: 2, brief: 1 });
});
