import Image from "next/image";
import Link from "next/link";

type Props = { subtitle?: string };

export default function AppHeader({ subtitle }: Props) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "16px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(0,0,0,0.70), rgba(0,0,0,0.25))",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Image
          src="/brand/gjnml-logo.png"
          alt="Gus Johnson’s National Money League"
          width={64}
          height={64}
          priority
          style={{ objectFit: "contain" }}
        />
        <div>
          <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>
            Gus Johnson’s National Money League
          </div>
          {subtitle ? (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>

      <nav style={{ display: "flex", gap: 14, fontSize: 14 }}>
        <Link href="/app" style={{ color: "rgba(255,255,255,0.92)", textDecoration: "none" }}>
          My Leagues
        </Link>
        <Link href="/app/leagues/join" style={{ color: "rgba(255,255,255,0.92)", textDecoration: "none" }}>
          Join
        </Link>
        <Link href="/app/leagues/new" style={{ color: "rgba(255,255,255,0.92)", textDecoration: "none" }}>
          Create
        </Link>
      </nav>
    </header>
  );
}
