import { after } from "next/server";
import { normalizeNgPhone } from "@/lib/phone";
import { parseSmsCommand } from "@/lib/sms-commands";
import { identifyCaller } from "@/lib/services/channel-identity";
import { triggerEmergency } from "@/lib/services/emergency";
import { trySms } from "@/lib/services/notifications";
import { confirmLatestReminderByPhone } from "@/lib/services/reminders";
import { fill, USSD_TEXTS } from "@/lib/ussd-texts";
import { checkCallbackSecret, textResponse } from "@/lib/webhook";

// Africa's Talking inbound SMS callback. POST, form-encoded: from, to, text, date, id, linkId.
// The callback URL carries ?secret=<AT_CALLBACK_SECRET>.
//
//   "1"                          confirm her latest reminder (mothers only)
//   "E", "E BLEEDING", "E FITS"  raise an emergency (the mother, or a family contact for her)
//
// Africa's Talking ignores our response body, so any reply goes out as a separate SMS, after
// this response, so the webhook answers fast. Texts from unknown numbers that are not
// commands get no reply at all (no loops, no spam).

export async function POST(request: Request) {
  const check = checkCallbackSecret(request);
  if (check === "unconfigured") return textResponse("Service is not configured.", 503);
  if (check === "forbidden") return textResponse("Forbidden", 403);

  try {
    const form = await request.formData();
    const from = String(form.get("from") ?? "");
    const text = String(form.get("text") ?? "");

    const phone = normalizeNgPhone(from);
    const command = parseSmsCommand(text);
    const caller = await identifyCaller(from);
    const t = USSD_TEXTS[caller.lang];

    const reply = (message: string) => {
      if (phone) after(() => trySms(phone, message));
    };

    if (caller.kind === "unknown") {
      if (command.kind !== "unknown") reply(t.unknownEnd);
      return textResponse("OK");
    }

    if (command.kind === "confirm") {
      // Family contacts cannot confirm a mother's reminders.
      if (caller.kind === "mother" && phone) {
        const { confirmed } = await confirmLatestReminderByPhone(phone);
        if (confirmed) reply(t.smsConfirmed);
      }
      return textResponse("OK");
    }

    if (command.kind === "emergency") {
      try {
        await triggerEmergency({
          motherId: caller.motherId,
          kind: command.emergencyKind,
          source: "SMS",
          actor: { type: "SMS" },
          deferAlerts: true,
        });
        reply(
          caller.kind === "family"
            ? fill(t.familyEmergencySent, { name: caller.name })
            : t.emergencySent,
        );
      } catch (error) {
        console.error("SMS emergency failed", error);
        reply(t.actionFailed);
      }
      return textResponse("OK");
    }

    // A known number sent something we do not understand: tell them how it works.
    reply(t.smsHelp);
    return textResponse("OK");
  } catch (error) {
    console.error("Inbound SMS failed", error);
    return textResponse("Error", 500);
  }
}
