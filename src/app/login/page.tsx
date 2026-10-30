import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="frame" style={{ padding: "1.6rem 0 3rem" }}>
      <p className="kicker">Desk</p>
      <h1 className="display" style={{ fontSize: "clamp(3rem, 6vw, 4.6rem)" }}>Sign the <em>slip.</em></h1>
      <p>Reading the catalog does not require an account. A desk does. Accounts are created by an administrator; there is no public registration.</p>
      <LoginForm />
    </div>
  );
}
