import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { ResendInviteButton } from "./resend-invite-button";

// TODO: users and audit log sections.
export default async function AdminHome() {
  const clinics = await db.facility.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      area: true,
      users: {
        where: { role: "CLINIC" },
        select: {
          id: true,
          email: true,
          active: true,
          accounts: { where: { providerId: "credential" }, select: { id: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Clinics</h1>
          <p className="text-muted-foreground">
            Register a clinic and we email its contact an invite to set a password.
          </p>
        </div>
        <Link href="/admin/clinics/new" className={buttonVariants({ className: "h-11" })}>
          <Plus className="size-4" />
          New clinic
        </Link>
      </div>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Clinic</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clinics.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-muted-foreground py-10 text-center"
                >
                  No clinics yet. Create the first one.
                </TableCell>
              </TableRow>
            )}
            {clinics.map((clinic) => {
              const contact = clinic.users[0];
              const joined = !!contact && contact.accounts.length > 0;
              return (
                <TableRow key={clinic.id}>
                  <TableCell className="font-medium">{clinic.name}</TableCell>
                  <TableCell>
                    {clinic.area.lga}, {clinic.area.state}
                  </TableCell>
                  <TableCell>{contact?.email ?? clinic.email ?? "-"}</TableCell>
                  <TableCell>
                    {joined ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">Invite pending</Badge>
                        {contact && <ResendInviteButton userId={contact.id} />}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
