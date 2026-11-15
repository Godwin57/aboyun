import { getTranslations } from "next-intl/server";
import { MotherHome } from "@/components/mother/mother-home";

export async function generateMetadata() {
  const t = await getTranslations("Mother.home");
  return { title: t("checkTitle") };
}

// Home, symptom check and emergency are all screens of this one page, so the whole
// mother app opens offline from a single cached page. Her data comes from IndexedDB.
export default function MotherPage() {
  return <MotherHome />;
}
