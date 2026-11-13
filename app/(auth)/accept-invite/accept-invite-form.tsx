"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { acceptInvite, type AcceptInviteState } from "./actions";

const initial: AcceptInviteState = {};

export function AcceptInviteForm({ token }: { token: string }) {
  const t = useTranslations("Auth.invite");
  const te = useTranslations("Errors");
  const [state, formAction, pending] = useActionState(acceptInvite, initial);
  const { password, confirm } = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <Field data-invalid={!!password}>
        <FieldLabel htmlFor="password">{t("newPassword")}</FieldLabel>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          autoFocus
          aria-invalid={!!password}
          className="h-12 text-base"
        />
        <FieldDescription>{t("hint")}</FieldDescription>
        <FieldError errors={password ? [{ message: te(password) }] : undefined} />
      </Field>
      <Field data-invalid={!!confirm}>
        <FieldLabel htmlFor="confirm">{t("confirm")}</FieldLabel>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!confirm}
          className="h-12 text-base"
        />
        <FieldError errors={confirm ? [{ message: te(confirm) }] : undefined} />
      </Field>
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {t(state.error)}
        </p>
      )}
      <Button type="submit" className="h-12 w-full text-base" disabled={pending}>
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
