import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewClinicForm } from "./new-clinic-form";

export const metadata: Metadata = { title: "New clinic" };

export default function NewClinicPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link
        href="/admin/clinics"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        Back to clinics
      </Link>
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">New clinic</h1>
        <p className="text-muted-foreground">
          The contact person gets an email to set their password and open the clinic
          dashboard.
        </p>
      </div>
      <NewClinicForm />
    </div>
  );
}
