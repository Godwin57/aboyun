import { Wordmark } from "@/components/auth/auth-shell";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ClinicNav } from "@/components/clinic/clinic-nav";

/** Sidebar + content frame for every clinic screen. */
export function ClinicShell({
  userName,
  facilityName,
  openEmergencies,
  children,
}: {
  userName: string;
  facilityName: string;
  openEmergencies: number;
  children: React.ReactNode;
}) {
  return (
    <div className="app-bg flex min-h-screen flex-wrap">
      <aside className="glass-sidebar flex min-h-full flex-none basis-full flex-col gap-7 p-4 pt-6 lg:basis-[248px]">
        <div className="px-2">
          <Wordmark />
        </div>
        <ClinicNav openEmergencies={openEmergencies} />
        <div className="mt-auto flex flex-col gap-2.5 border-t border-[#e6dfd2] px-2 pt-4">
          <div>
            <div className="font-semibold">{userName}</div>
            <div className="text-muted-foreground text-sm">{facilityName}</div>
          </div>
          <SignOutButton className="neu-raised h-11 justify-start gap-2.5 rounded-xl" />
        </div>
      </aside>
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-6 px-5 py-8 sm:px-10 sm:pb-12">
        {children}
      </main>
    </div>
  );
}
