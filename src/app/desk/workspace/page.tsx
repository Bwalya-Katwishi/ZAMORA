import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { actorOrganization, onboardingFor } from "@/lib/ops";
import { onboardingStatus, onboardingSteps, pilotTypes } from "@/lib/workspace";

export const metadata = { title: "Workspace" };

export default async function WorkspacePage() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="frame" style={{ padding: "1.3rem 0 2.5rem" }}>
        <p className="kicker">Workspace</p>
        <h1 className="display" style={{ fontSize: "clamp(3rem, 6vw, 5rem)" }}>A private desk <em>waits for a pilot.</em></h1>
        <p>Four kinds are prepared: newsroom, university, mine or agricultural cooperative, and NGO or government. None is onboarded. The public reading room stays open. <Link href="/login">Sign in</Link> to see the checklist for your organization.</p>
      </div>
    );
  }
  let done: string[] = [];
  let org: string | null = null;
  try {
    org = await actorOrganization(user.id);
    if (org) done = await onboardingFor(org);
  } catch {
    done = [];
  }
  const status = onboardingStatus(done);
  return (
    <div className="frame" style={{ padding: "1.3rem 0 2.5rem" }}>
      <p className="kicker">Workspace · {user.role.replaceAll("_", " ")}</p>
      <h1 className="display" style={{ fontSize: "clamp(3rem, 6vw, 5rem)" }}>{user.name}</h1>
      <p>Organization {org ?? "not assigned"}. A private desk is visible to its members. Another organization does not see it.</p>
      <p>Pilot types on the register: {pilotTypes.join(", ").replaceAll("_", " ")}.</p>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>Onboarding</h2>
      <p>{status.complete ? "The checklist is complete." : `${status.missing.length} of ${status.steps} steps are still open. A second question is the one that counts.`}</p>
      <ol>
        {onboardingSteps.map((step) => (
          <li key={step}>{done.includes(step) ? "Done." : "Open."} {step.replaceAll("_", " ")}</li>
        ))}
      </ol>
      <p><Link href="/desk">Evidence desk</Link> · <Link href="/pricing">Pricing</Link></p>
    </div>
  );
}
