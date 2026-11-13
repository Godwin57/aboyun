import Link from "next/link";
import {
  ArrowRight,
  Baby,
  BellRing,
  Building2,
  ClipboardList,
  HeartHandshake,
  Inbox,
  LayoutDashboard,
  Lock,
  MapPinned,
  MessageSquareText,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { EmergencyIllustration, HeroIllustration } from "./hero-illustration";

const cta =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function SignInLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/login"
      className={`${cta} bg-primary text-primary-foreground hover:bg-primary/90 ${className}`}
    >
      Sign in <ArrowRight className="size-5" aria-hidden />
    </Link>
  );
}

function Section({
  id,
  title,
  intro,
  children,
  tone,
}: {
  id: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
  tone?: "muted";
}) {
  return (
    <section id={id} className={tone === "muted" ? "bg-secondary/40" : ""}>
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h2>
        {intro && <p className="text-muted-foreground mt-3 max-w-2xl text-lg">{intro}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

function IconBadge({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-xl">
      <Icon className="size-6" aria-hidden />
    </span>
  );
}

const problems: { icon: LucideIcon; text: string }[] = [
  { icon: MapPinned, text: "Clinics are far away, and the roads are long." },
  { icon: TriangleAlert, text: "Warning signs are easy to miss or put off." },
  { icon: WifiOff, text: "Phones, signal and data are not always there." },
];

const audiences: {
  icon: LucideIcon;
  title: string;
  points: { icon: LucideIcon; text: string }[];
}[] = [
  {
    icon: Baby,
    title: "For mothers",
    points: [
      {
        icon: Smartphone,
        text: "Use the app on your phone, or dial a USSD code on any phone.",
      },
      { icon: BellRing, text: "Get SMS reminders for visits and tablets." },
      {
        icon: TriangleAlert,
        text: "Press the emergency button when something feels wrong.",
      },
      { icon: WifiOff, text: "Keeps working when the network does not." },
    ],
  },
  {
    icon: Building2,
    title: "For clinics",
    points: [
      { icon: LayoutDashboard, text: "See every mother in your care, sorted by risk." },
      { icon: ClipboardList, text: "Track who has come for visits and who is overdue." },
      { icon: Inbox, text: "An emergency inbox so no call for help is missed." },
    ],
  },
  {
    icon: HeartHandshake,
    title: "For the Aboyun team and health authorities",
    points: [
      { icon: Building2, text: "Set up and support clinics and their staff." },
      { icon: MapPinned, text: "See where care is reaching, and where it is not." },
      { icon: ShieldCheck, text: "Keep the service safe, reliable and accountable." },
    ],
  },
];

const features: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: WifiOff,
    title: "Works offline, installs like an app",
    text: "Add Aboyun to your home screen. What you enter is saved on your phone and sent when you are back online.",
  },
  {
    icon: MessageSquareText,
    title: "Works on basic phones",
    text: "No smartphone? Use USSD and SMS to check in and receive reminders.",
  },
  {
    icon: BellRing,
    title: "Early danger-sign alerts",
    text: "Mothers report how they feel, and clinics are told when a sign needs attention.",
  },
];

export function LandingPage() {
  return (
    <div className="bg-background text-foreground min-h-dvh">
      <header className="border-border/60 border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="font-heading text-primary text-2xl font-semibold">
            Aboyun
          </Link>
          <SignInLink className="min-h-11 px-4 text-sm" />
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-5xl items-center gap-8 px-4 py-12 sm:px-6 sm:py-20 md:grid-cols-2">
          <div>
            <h1 className="font-heading text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
              Spot danger early. Reach care in time.
            </h1>
            <p className="text-muted-foreground mt-5 text-lg">
              Aboyun helps pregnant and nursing mothers in remote Nigeria know when
              something is wrong, and get to a clinic that can help.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <SignInLink />
              <a
                href="#how-it-works"
                className={`${cta} border-border bg-card hover:bg-secondary/60 border`}
              >
                How it works
              </a>
            </div>
          </div>
          <HeroIllustration className="mx-auto w-full max-w-md" />
        </section>

        <Section
          id="problem"
          tone="muted"
          title="Danger is often noticed too late"
          intro="In many remote villages, the nearest clinic is hours away. A headache, swelling or bleeding can seem small, until it is not."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {problems.map(({ icon, text }) => (
              <div
                key={text}
                className="bg-card ring-border flex items-start gap-3 rounded-2xl p-5 ring-1"
              >
                <IconBadge icon={icon} />
                <p className="pt-2 text-base">{text}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="how-it-works"
          title="How Aboyun works"
          intro="One service, built around the people who use it."
        >
          <div className="grid gap-5 md:grid-cols-3">
            {audiences.map(({ icon, title, points }) => (
              <article key={title} className="bg-card ring-border rounded-2xl p-6 ring-1">
                <div className="flex items-center gap-3">
                  <IconBadge icon={icon} />
                  <h3 className="font-heading text-xl font-semibold">{title}</h3>
                </div>
                <ul className="mt-5 space-y-4">
                  {points.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-start gap-3">
                      <Icon className="text-primary mt-0.5 size-5 shrink-0" aria-hidden />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </Section>

        <Section
          id="features"
          tone="muted"
          title="Built for where care is hardest to reach"
        >
          <div className="grid gap-5 md:grid-cols-3">
            {features.map(({ icon, title, text }) => (
              <div key={title} className="bg-card ring-border rounded-2xl p-6 ring-1">
                <IconBadge icon={icon} />
                <h3 className="font-heading mt-4 text-xl font-semibold">{title}</h3>
                <p className="text-muted-foreground mt-2">{text}</p>
              </div>
            ))}
          </div>
          <div className="bg-card ring-destructive/30 mt-5 grid items-center gap-6 rounded-2xl p-6 ring-1 sm:grid-cols-[1fr_auto]">
            <div>
              <div className="text-destructive flex items-center gap-2 font-semibold">
                <TriangleAlert className="size-5" aria-hidden /> Emergency
              </div>
              <h3 className="font-heading mt-2 text-xl font-semibold">
                Emergency referral to a facility that can help
              </h3>
              <p className="text-muted-foreground mt-2">
                One press sends your alert to a clinic that can respond, so help can be
                arranged without long phone calls.
              </p>
            </div>
            <EmergencyIllustration className="mx-auto w-48" />
          </div>
        </Section>

        <Section id="privacy" title="Your records stay private">
          <div className="bg-card ring-border flex flex-col gap-4 rounded-2xl p-6 ring-1 sm:flex-row sm:items-start">
            <IconBadge icon={Lock} />
            <p className="max-w-2xl text-lg">
              Each person sees only the records they should: mothers see their own, and
              clinics see the mothers in their care. Aboyun is designed to align with the
              Nigeria Data Protection Act 2023.
            </p>
          </div>
        </Section>

        <section className="bg-primary text-primary-foreground">
          <div className="mx-auto flex max-w-5xl flex-col items-start gap-5 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
            <h2 className="font-heading text-3xl font-semibold">Ready to get started?</h2>
            <Link
              href="/login"
              className={`${cta} bg-accent text-accent-foreground hover:bg-accent/90`}
            >
              Sign in <ArrowRight className="size-5" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-border border-t">
        <div className="text-muted-foreground mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-sm sm:flex-row sm:justify-between sm:px-6">
          <p>
            <span className="font-heading text-foreground font-semibold">Aboyun</span> ·
            Care for mothers, wherever they are.
          </p>
          <p>In an emergency, go to the nearest clinic.</p>
        </div>
      </footer>
    </div>
  );
}
