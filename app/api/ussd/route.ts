import { db } from "@/lib/db";
import { formatDay } from "@/lib/format";
import { logAudit } from "@/lib/services/audit";
import { identifyCaller } from "@/lib/services/channel-identity";
import { triggerEmergency } from "@/lib/services/emergency";
import { ussdMenu, type UssdAction, type UssdContext } from "@/lib/ussd-menu";
import { USSD_TEXTS } from "@/lib/ussd-texts";
import { checkCallbackSecret, textResponse } from "@/lib/webhook";
import { reportedSigns } from "@/lib/symptoms";

// Africa's Talking USSD callback. POST, form-encoded: sessionId, serviceCode, phoneNumber,
// networkCode and `text` (everything typed so far, joined with "*"). We answer in plain text
// starting with "CON " (keep the session open) or "END " (close it).
//
// The callback URL carries ?secret=<AT_CALLBACK_SECRET>. The caller is identified by their
// phone number. Only a registered mother can use the menu; anyone else (family contacts
// included, who only receive emergency alerts) is told the number is not registered.

export async function POST(request: Request) {
  const check = checkCallbackSecret(request);
  if (check === "unconfigured")
    return textResponse("END Service is not configured.", 503);
  if (check === "forbidden") return textResponse("Forbidden", 403);

  try {
    const form = await request.formData();
    const phone = String(form.get("phoneNumber") ?? "");
    const text = String(form.get("text") ?? "");

    const caller = await identifyCaller(phone);

    let ctx: UssdContext;
    if (caller.kind === "mother") {
      const next = await db.visit.findFirst({
        where: { motherId: caller.motherId, kind: "ANC", attendedAt: null },
        orderBy: { dueDate: "asc" },
        select: { dueDate: true, contactNo: true },
      });
      ctx = {
        actor: "mother",
        lang: caller.lang,
        nextVisit: next
          ? { dateText: formatDay(next.dueDate), contactNo: next.contactNo }
          : null,
      };
    } else {
      ctx = { actor: "unknown", lang: caller.lang };
    }

    const reply = ussdMenu(text, ctx);

    if (reply.action) {
      const done = await perform(reply.action, caller);
      // Never tell someone help is coming if it was not recorded.
      if (!done) return textResponse(`END ${USSD_TEXTS[ctx.lang].actionFailed}`);
    }

    return textResponse(`${reply.type} ${reply.text}`);
  } catch (error) {
    console.error("USSD request failed", error);
    return textResponse("END Sorry, something went wrong. Please call your clinic.");
  }
}

async function perform(
  action: UssdAction,
  caller: Awaited<ReturnType<typeof identifyCaller>>,
): Promise<boolean> {
  if (action.kind === "setLanguage") {
    // Saved to her profile, so the app, SMS and her next USSD session all use it.
    if (caller.kind !== "mother") return false;
    await db.mother.update({
      where: { id: caller.motherId },
      data: { language: action.lang },
    });
    await logAudit({
      actorType: "USSD",
      action: "mother.language",
      entity: "Mother",
      entityId: caller.motherId,
    });
    return true;
  }

  if (action.kind === "emergency") {
    if (caller.kind !== "mother") return false;

    await triggerEmergency({
      motherId: caller.motherId,
      kind: action.emergencyKind,
      source: "USSD",
      actor: { type: "USSD" },
      // The alert texts go out after this reply, so the USSD session answers quickly.
      deferAlerts: true,
    });
    return true;
  }

  if (caller.kind !== "mother") return false;
  const signs = reportedSigns(action.answers);
  const report = await db.symptomReport.create({
    data: {
      motherId: caller.motherId,
      source: "USSD",
      signs: Object.fromEntries(signs.map((s) => [s, true])),
      result: action.result,
    },
  });
  await logAudit({
    actorType: "USSD",
    action: "symptom.report",
    entity: "SymptomReport",
    entityId: report.id,
  });
  return true;
}
