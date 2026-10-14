type IconProps = { size?: number };

export function LogoMark() {
  return (
    <svg className="logo-mark" width="38" height="42" viewBox="0 0 48 52" aria-hidden="true">
      <defs>
        <linearGradient id="authfa-shield" x1="8" y1="2" x2="40" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4a4a4a" />
          <stop offset="0.42" stopColor="#1c1c1c" />
          <stop offset="1" stopColor="#0c0c0c" />
        </linearGradient>
      </defs>
      <path
        fill="url(#authfa-shield)"
        d="M24 2.2c7.4 2.4 15 3.8 20.2 4.6.2 11.2-.6 20.4-7 28.2C32.4 42 28.2 47.2 24 50.6 19.8 47.2 15.6 42 10.8 35 4.4 27.2 3.6 18 3.8 6.8 9 6 16.6 4.6 24 2.2Z"
      />
      <path
        d="M31.2 16.6a9.2 9.2 0 1 0 .2 14.2"
        fill="none"
        stroke="white"
        strokeWidth="3.1"
        strokeLinecap="round"
      />
      <circle cx="22.6" cy="23.6" r="2.5" fill="white" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 9a6 6 0 1 1 12 0c0 7 2 7 2 7H4s2 0 2-7Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" />
    </svg>
  );
}

export function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}

export function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 8h.01" />
    </svg>
  );
}

export function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M10 14a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
      <path d="M14 10a5 5 0 0 0-7.1-.1l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1" />
    </svg>
  );
}

export function MoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="6" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="18" cy="12" r="1.4" />
    </svg>
  );
}

export function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function DocIcon({ tone }: { tone: "blue" | "green" | "red" | "orange" | "violet" }) {
  const fill = { blue: "#5B8DEF", green: "#22A06B", red: "#E5484D", orange: "#F5A524", violet: "#8B5CF6" }[tone];
  return (
    <svg className="doc-icon" viewBox="0 0 22 26" aria-hidden="true">
      <path d="M2 1.5h11l7 7V24a1.5 1.5 0 0 1-1.5 1.5h-16.5A1.5 1.5 0 0 1 1 24V3A1.5 1.5 0 0 1 2.5 1.5H2Z" fill={fill} />
      <path d="M13 1.5V8h7" fill="white" opacity=".9" />
    </svg>
  );
}

const navPaths = {
  home: "M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-5H10v5H5a1 1 0 0 1-1-1v-8.5Z",
  users: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM4 19c.4-2.4 2.4-4 5-4s4.6 1.6 5 4M14 15c1.8.2 3.3 1.2 3.8 3",
  clients: "M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3 5h4M8 14h8M8 17h5",
  roles: "M12 3 5 6v6c0 4.2 2.8 6.8 7 8 4.2-1.2 7-3.8 7-8V6l-7-3Z",
  groups: "M4 8.5A2.5 2.5 0 0 1 6.5 6H9v12H6.5A2.5 2.5 0 0 1 4 15.5v-7Zm6-2.5h8A2 2 0 0 1 20 8v9a2 2 0 0 1-2 2h-8V6Z",
  sessions: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  events: "M5 6h14v12H5V6Zm0 4h14M8 4v2M16 4v2",
} as const;

export function NavIcon({ name }: { name: keyof typeof navPaths }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d={navPaths[name]} />
    </svg>
  );
}

export function MonitorIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}
