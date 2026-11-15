// SMS / email texts for visit reminders, in the five languages the app supports.
// DRAFTS: the Pidgin, Yorùbá, Igbo and Hausa texts must be reviewed by native speakers
// before they go to real mothers. Keep each message short (about 160 characters).

export type ReminderLanguage = "en" | "pcm" | "yo" | "ig" | "ha";

type Template = (v: { name: string; date: string; facility: string }) => string;

const TEXTS: Record<ReminderLanguage, Template> = {
  en: ({ name, date, facility }) =>
    `Hello ${name}, your antenatal visit is on ${date} at ${facility}. Reply 1 to confirm you will come.`,
  pcm: ({ name, date, facility }) =>
    `Hello ${name}, your antenatal visit na ${date} for ${facility}. Reply 1 if you go come.`,
  yo: ({ name, date, facility }) =>
    `Pẹlẹ o ${name}, ọjọ ibẹwo oyun rẹ ni ${date} ni ${facility}. Fesi 1 lati jẹrisi pe iwọ yoo wa.`,
  ig: ({ name, date, facility }) =>
    `Ndewo ${name}, ụbọchị nleta nlekọta afọ ime gị bụ ${date} na ${facility}. Zaghachi 1 ka ị kwenye na ị ga-abịa.`,
  ha: ({ name, date, facility }) =>
    `Sannu ${name}, ranar ziyarar kula da ciki ita ce ${date} a ${facility}. Aika 1 don tabbatar da cewa za ki zo.`,
};

const SUBJECTS: Record<ReminderLanguage, string> = {
  en: "Your antenatal visit",
  pcm: "Your antenatal visit",
  yo: "Ibẹwo oyun rẹ",
  ig: "Nleta nlekọta afọ ime gị",
  ha: "Ziyarar kula da ciki",
};

export function isReminderLanguage(value: string): value is ReminderLanguage {
  return Object.hasOwn(TEXTS, value);
}

/** The first word of her name; "Mama" if the name is empty. */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "Mama";
}

/** The reminder text in her language (English if the language is not known). */
export function visitReminderText(opts: {
  language: string;
  name: string;
  date: string;
  facility: string;
}): { subject: string; text: string } {
  const lang: ReminderLanguage = isReminderLanguage(opts.language) ? opts.language : "en";
  return {
    subject: SUBJECTS[lang],
    text: TEXTS[lang]({
      name: firstName(opts.name),
      date: opts.date,
      facility: opts.facility,
    }),
  };
}
