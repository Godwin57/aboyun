"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { syncLanguageAfterLogin } from "@/i18n/actions";
import { authClient } from "@/lib/auth-client";
import { looksLikeEmail, normalizeNgPhone } from "@/lib/phone";
import { useHydrated } from "@/lib/use-hydrated";
import { loginSchema, type AuthErrorKey } from "@/lib/validation";

type Values = z.input<typeof loginSchema>;

/**
 * One sign-in form for mothers, clinics and admins: phone number or email, plus
 * password. The role decides where they land after signing in.
 */
export function LoginForm() {
  const t = useTranslations("Auth.login");
  const te = useTranslations("Errors");
  const router = useRouter();
  const hydrated = useHydrated();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const message = (error?: { message?: string }) =>
    error?.message ? [{ message: te(error.message as AuthErrorKey) }] : undefined;

  async function onSubmit({ identifier, password }: Values) {
    const id = identifier.trim();
    const { error } = looksLikeEmail(id)
      ? await authClient.signIn.email({ email: id.toLowerCase(), password })
      : await authClient.signIn.phoneNumber({
          phoneNumber: normalizeNgPhone(id) ?? id,
          password,
        });

    if (error) {
      // Same message whether the account is unknown or the password is wrong.
      toast.error(t("wrong"));
      return;
    }
    try {
      await syncLanguageAfterLogin();
    } catch {
      // Best effort: never let a language-sync problem block a successful sign-in.
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      // If the script has not run, a native submit must never put the password in the URL.
      method="post"
      className="space-y-5"
      noValidate
    >
      <Field data-invalid={!!errors.identifier}>
        <FieldLabel htmlFor="identifier">{t("identifier")}</FieldLabel>
        <Input
          id="identifier"
          autoComplete="username"
          inputMode="email"
          placeholder={t("identifierPlaceholder")}
          autoFocus
          aria-invalid={!!errors.identifier}
          className="h-12 text-base"
          {...register("identifier")}
        />
        <FieldError errors={message(errors.identifier)} />
      </Field>
      <Field data-invalid={!!errors.password}>
        <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          className="h-12 text-base"
          {...register("password")}
        />
        <FieldError errors={message(errors.password)} />
      </Field>
      <Button
        type="submit"
        className="h-12 w-full text-base"
        disabled={isSubmitting || !hydrated}
      >
        {isSubmitting ? t("submitting") : t("submit")}
      </Button>
      <p className="text-muted-foreground text-center text-sm">{t("help")}</p>
      {/* TODO: "Forgot password?" (deferred until the core product is built). */}
    </form>
  );
}
