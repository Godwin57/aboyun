import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/login-form";

export async function LoginCard() {
  const t = await getTranslations("Auth.login");
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <LoginForm />
    </div>
  );
}
