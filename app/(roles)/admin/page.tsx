import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

async function getStartOfWeek(): Promise<Date> {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

function formatDateTime(at: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(at);
}

export default async function AdminOverview() {
  const [totalFacilities, totalMothers, visitsThisWeek, openEmergencies, recentActivity] =
    await Promise.all([
      db.facility.count(),
      db.mother.count(),
      db.visit.count({
        where: { createdAt: { gte: await getStartOfWeek() } },
      }),
      db.emergency.count({ where: { status: "OPEN" } }),
      db.auditLog.findMany({
        orderBy: { at: "desc" },
        take: 10,
        include: { actor: { select: { name: true, email: true, role: true } } },
      }),
    ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Overview
          </h1>
          <p className="text-muted-foreground">
            Real-time view of clinic operations and system activity.
          </p>
        </div>
        <Link href="/admin/clinics/new">
          <Button>Invite a Clinic</Button>
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-teal-200 bg-teal-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-teal-700">
              Total Facilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {totalFacilities}
            </div>
          </CardContent>
        </Card>

        <Card className="border-teal-200 bg-teal-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-teal-700">
              Registered Mothers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {totalMothers}
            </div>
          </CardContent>
        </Card>

        <Card className="border-teal-200 bg-teal-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-teal-700">
              Visits This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {visitsThisWeek}
            </div>
          </CardContent>
        </Card>

        <Card className="border-teal-200 bg-teal-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-teal-700">
              Open Emergencies
            </CardTitle>
            <Badge variant="outline" className="text-teal-700 border-teal-200">
              Open
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {openEmergencies}
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="border-t pt-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Recent System Activity
            </h2>
            <p className="text-sm text-muted-foreground">
              Latest 10 audit log entries
            </p>
          </div>
        </div>

        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b text-left">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Time
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actor
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Entity
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentActivity.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-muted-foreground"
                    colSpan={4}
                  >
                    No recent activity.
                  </td>
                </tr>
              ) : (
                recentActivity.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(log.at)}
                    </td>
                    <td className="px-4 py-3">
                      {log.actor ? (
                        <div>
                          <div className="text-foreground font-medium">
                            {log.actor.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {log.actor.email}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground italic">
                          System
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground capitalize">
                      {log.action.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {log.entity}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
