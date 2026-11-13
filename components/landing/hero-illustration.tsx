/** Simple SVG: a mother with a phone, a sun rising, and a path to a clinic. */
export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 320"
      role="img"
      aria-label="A mother holding a phone at dawn, with a path leading to a clinic"
      className={className}
    >
      <circle cx="290" cy="110" r="70" className="fill-accent/30" />
      <circle cx="290" cy="110" r="44" className="fill-accent" />
      <path d="M0 250 Q100 210 200 240 T400 230 V320 H0Z" className="fill-secondary" />
      <path
        d="M150 320 Q190 270 270 245"
        className="stroke-background"
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      />
      {/* clinic */}
      <rect x="296" y="190" width="70" height="56" rx="6" className="fill-primary" />
      <path d="M288 192 L331 164 L374 192Z" className="fill-primary" />
      <rect
        x="323"
        y="205"
        width="16"
        height="16"
        rx="2"
        className="fill-primary-foreground"
      />
      <rect x="329" y="207" width="4" height="12" className="fill-primary" />
      <rect x="325" y="211" width="12" height="4" className="fill-primary" />
      <rect x="322" y="228" width="18" height="18" rx="3" className="fill-accent" />
      {/* mother */}
      <circle cx="110" cy="150" r="22" className="fill-primary" />
      <path d="M70 262 Q70 190 110 182 Q150 190 150 262Z" className="fill-primary" />
      <ellipse cx="110" cy="232" rx="30" ry="34" className="fill-accent" opacity="0.9" />
      {/* phone */}
      <rect
        x="124"
        y="200"
        width="22"
        height="38"
        rx="5"
        className="fill-card stroke-foreground"
        strokeWidth="2.5"
      />
      <circle cx="135" cy="219" r="4" className="fill-accent" />
    </svg>
  );
}

/** The one place red is allowed: an emergency alert. */
export function EmergencyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 120"
      role="img"
      aria-label="An emergency button sending an alert to a clinic"
      className={className}
    >
      <circle cx="50" cy="60" r="44" className="fill-destructive/10" />
      <circle cx="50" cy="60" r="30" className="fill-destructive/20" />
      <circle cx="50" cy="60" r="20" className="fill-destructive" />
      <path
        d="M50 50 V62 M50 68 V70"
        className="stroke-primary-foreground"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M85 60 H130"
        className="stroke-muted-foreground"
        strokeWidth="3"
        strokeDasharray="2 8"
        strokeLinecap="round"
      />
      <rect x="138" y="42" width="40" height="36" rx="5" className="fill-primary" />
      <path d="M133 44 L158 28 L183 44Z" className="fill-primary" />
      <rect
        x="152"
        y="52"
        width="12"
        height="12"
        rx="1.5"
        className="fill-primary-foreground"
      />
    </svg>
  );
}
