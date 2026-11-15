// Screen texts for the USSD menu, in the five supported languages.
// Each USSD screen must stay under about 182 characters (a test checks this).
// The Pidgin, Yorùbá, Igbo and Hausa text is a draft and needs review by native speakers.
// Kept as a plain TypeScript module (no imports) so it works in the webhook and in tests.

export const LANGS = ["en", "pcm", "yo", "ig", "ha"] as const;
export type Lang = (typeof LANGS)[number];

/** Each language written in itself, in the order of the language menu (1 to 5). */
export const LANG_NAMES: Record<Lang, string> = {
  en: "English",
  pcm: "Pidgin",
  yo: "Yorùbá",
  ig: "Igbo",
  ha: "Hausa",
};

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value);
}

/** The symptom questions are asked in this order. Bleeding and fits come first. */
export const USSD_SYMPTOM_ORDER = [
  "bleeding",
  "fits",
  "headache",
  "vision",
  "movement",
  "fever",
  "swelling",
  "pain",
] as const;
export type UssdSign = (typeof USSD_SYMPTOM_ORDER)[number];

export type UssdTexts = {
  main: string;
  /** Menu for a family contact: `{name}` is the mother's name. */
  familyMain: string;
  emergencyAsk: string;
  emergencySent: string;
  /** `{name}` is the mother's name. */
  familyEmergencySent: string;
  /** One full question per sign, each ending with the yes/no choices. */
  question: Record<UssdSign, string>;
  resultOk: string;
  resultSoon: string;
  resultNow: string;
  /** `{date}` and `{n}` are filled in. */
  nextVisit: string;
  noVisit: string;
  wrong: string;
  unknownMenu: string;
  unknownEnd: string;
  familyAskPhone: string;
  familyNotFound: string;
  /** The alert could not be saved: she must not believe help is coming. */
  actionFailed: string;
  /** SMS replies. */
  smsConfirmed: string;
  smsHelp: string;
  /** Words for the welcome screen, shown beside the English ones ("Welcome to Aboyun / Nnọọ"). */
  welcomeWord: string;
  continueWord: string;
  languageWord: string;
  chooseLanguage: string;
};

export const USSD_TEXTS: Record<Lang, UssdTexts> = {
  en: {
    main: "Aboyun\n1. Emergency\n2. Check my symptoms\n3. My next visit",
    familyMain: "Aboyun\nFor {name}:\n1. Emergency",
    emergencyAsk:
      "What is happening?\n1. Bleeding\n2. Labour\n3. Fits\n4. Problem with the baby\n5. Something else",
    emergencySent:
      "Help is being sent. Your clinic and your family have been told. If you can, go to the clinic now.",
    familyEmergencySent:
      "Help is being sent for {name}. Her clinic and her family have been told.",
    question: {
      bleeding: "Do you have vaginal bleeding?\n1. Yes\n2. No",
      fits: "Have you had fits?\n1. Yes\n2. No",
      headache: "Do you have a severe headache?\n1. Yes\n2. No",
      vision: "Is your vision blurred?\n1. Yes\n2. No",
      movement: "Is the baby moving less?\n1. Yes\n2. No",
      fever: "Do you have a fever?\n1. Yes\n2. No",
      swelling: "Are your face or hands swollen?\n1. Yes\n2. No",
      pain: "Do you have severe belly pain?\n1. Yes\n2. No",
    },
    resultOk:
      "You have no danger signs. Keep going to your clinic visits. Dial again any time.",
    resultSoon:
      "Please go to your clinic in the next day or two and tell them how you feel.",
    resultNow:
      "Go to the clinic now. If you cannot get there, dial again and choose 1 so help is sent.",
    nextVisit: "Your next visit is {date} (visit {n} of 8). Please come.",
    noVisit: "You have no visit planned. Ask your clinic.",
    wrong: "Wrong choice. Please dial again.",
    unknownMenu: "Aboyun\n1. Help a mother (enter her phone number)",
    unknownEnd: "This number is not registered. Please ask your clinic to register you.",
    familyAskPhone: "Enter the mother's phone number (for example 08031234567)",
    familyNotFound: "We could not find that mother. Check the number and dial again.",
    actionFailed: "We could not send the alert. Please call your clinic now.",
    smsConfirmed: "Thank you. We have noted that you will come to your visit.",
    smsHelp:
      "Aboyun: reply 1 to confirm a visit. In an emergency text E (or E BLEEDING, E LABOUR, E FITS, E BABY).",
    welcomeWord: "Welcome",
    continueWord: "Continue",
    languageWord: "Language",
    chooseLanguage: "Choose language",
  },
  pcm: {
    main: "Aboyun\n1. Emergency\n2. Check how body dey\n3. My next visit",
    familyMain: "Aboyun\nFor {name}:\n1. Emergency",
    emergencyAsk:
      "Wetin dey happen?\n1. Blood dey comot\n2. Labour\n3. Fits\n4. Wahala for pikin\n5. Another thing",
    emergencySent:
      "We don send help. We don tell your clinic and your family. If you fit, go clinic now.",
    familyEmergencySent:
      "We don send help for {name}. We don tell her clinic and her family.",
    question: {
      bleeding: "Blood dey comot from down?\n1. Yes\n2. No",
      fits: "You don get fits?\n1. Yes\n2. No",
      headache: "You get serious headache?\n1. Yes\n2. No",
      vision: "Your eye dey blur?\n1. Yes\n2. No",
      movement: "Pikin no dey move well?\n1. Yes\n2. No",
      fever: "You get fever?\n1. Yes\n2. No",
      swelling: "Your face or hand don swell?\n1. Yes\n2. No",
      pain: "You get serious belly pain?\n1. Yes\n2. No",
    },
    resultOk: "You no get danger sign. Keep to go clinic visits. Dial again any time.",
    resultSoon:
      "Abeg go your clinic inside one or two days. Tell dem wetin you dey feel.",
    resultNow:
      "Go clinic now. If you no fit reach, dial again press 1 make dem send help.",
    nextVisit: "Your next visit na {date} (visit {n} of 8). Abeg come.",
    noVisit: "You no get visit wey dem plan. Ask your clinic.",
    wrong: "Wrong choice. Abeg dial again.",
    unknownMenu: "Aboyun\n1. Help one mama (put her phone number)",
    unknownEnd: "Dem never register this number. Ask your clinic make dem register you.",
    familyAskPhone: "Put the mama phone number (like 08031234567)",
    familyNotFound: "We no see that mama. Check the number and dial again.",
    actionFailed: "We no fit send the alert. Abeg call your clinic now.",
    smsConfirmed: "Thank you. We don note say you go come your visit.",
    smsHelp:
      "Aboyun: reply 1 to confirm your visit. For emergency text E (or E BLEEDING, E LABOUR, E FITS, E BABY).",
    welcomeWord: "Oya, welcome",
    continueWord: "Make we continue",
    languageWord: "Change language",
    chooseLanguage: "Choose language",
  },
  yo: {
    main: "Aboyun\n1. Pàjáwìrì\n2. Ṣàyẹ̀wò àwọn àmì ara mi\n3. Ìbẹ̀wò mi tó kàn",
    familyMain: "Aboyun\nFún {name}:\n1. Pàjáwìrì",
    emergencyAsk:
      "Kí ló ń ṣẹlẹ̀?\n1. Ẹ̀jẹ̀ ń jáde\n2. Ìrọbí\n3. Ara ń gbọ̀n\n4. Ìṣòro pẹ̀lú ọmọ\n5. Nǹkan mìíràn",
    emergencySent:
      "A ń fi ìrànlọ́wọ́ ránṣẹ́. A ti sọ fún ilé ìwòsàn rẹ àti ẹbí rẹ. Tí o bá lè, lọ sí ilé ìwòsàn nísinsìnyí.",
    familyEmergencySent:
      "A ń fi ìrànlọ́wọ́ ránṣẹ́ sí {name}. A ti sọ fún ilé ìwòsàn àti ẹbí rẹ̀.",
    question: {
      bleeding: "Ṣé ẹ̀jẹ̀ ń jáde ní ìsàlẹ̀?\n1. Bẹ́ẹ̀ ni\n2. Rárá",
      fits: "Ṣé ara rẹ ti gbọ̀n rí?\n1. Bẹ́ẹ̀ ni\n2. Rárá",
      headache: "Ṣé orí ń fọ́ ọ gidigidi?\n1. Bẹ́ẹ̀ ni\n2. Rárá",
      vision: "Ṣé ojú rẹ ń dì?\n1. Bẹ́ẹ̀ ni\n2. Rárá",
      movement: "Ṣé ọmọ ń yí ṣẹ́ kéré?\n1. Bẹ́ẹ̀ ni\n2. Rárá",
      fever: "Ṣé o ní ibà?\n1. Bẹ́ẹ̀ ni\n2. Rárá",
      swelling: "Ṣé ojú tàbí ọwọ́ rẹ wú?\n1. Bẹ́ẹ̀ ni\n2. Rárá",
      pain: "Ṣé ikùn ń dùn ọ́ gidigidi?\n1. Bẹ́ẹ̀ ni\n2. Rárá",
    },
    resultOk:
      "O kò ní àmì ewu kankan. Tẹ̀síwájú láti máa lọ sí ilé ìwòsàn. Pe lẹ́ẹ̀kan sí i nígbàkúùgbà.",
    resultSoon:
      "Jọ̀wọ́ lọ sí ilé ìwòsàn rẹ láàárín ọjọ́ kan tàbí méjì, kí o sì sọ ohun tí ò ń rí.",
    resultNow:
      "Lọ sí ilé ìwòsàn nísinsìnyí. Tí o kò bá lè dé ibẹ̀, tún pè kí o yan 1 kí á fi ìrànlọ́wọ́ ránṣẹ́.",
    nextVisit: "Ìbẹ̀wò rẹ tó kàn ni {date} (ìbẹ̀wò {n} nínú 8). Jọ̀wọ́ wá.",
    noVisit: "Kò sí ìbẹ̀wò tí a ṣètò fún ọ. Béèrè ní ilé ìwòsàn rẹ.",
    wrong: "Yíyàn tí kò tọ́. Jọ̀wọ́ tún pè.",
    unknownMenu: "Aboyun\n1. Ran ìyá kan lọ́wọ́ (fi nọ́ńbà fóònù rẹ̀ sí)",
    unknownEnd: "A kò tíì forúkọ nọ́ńbà yìí sílẹ̀. Bẹ ilé ìwòsàn rẹ kí wọ́n forúkọ rẹ sílẹ̀.",
    familyAskPhone: "Fi nọ́ńbà fóònù ìyá náà sí (bíi 08031234567)",
    familyNotFound: "A kò rí ìyá náà. Ṣàyẹ̀wò nọ́ńbà náà kí o tún pè.",
    actionFailed: "A kò lè fi ìkìlọ̀ ránṣẹ́. Jọ̀wọ́ pe ilé ìwòsàn rẹ nísinsìnyí.",
    smsConfirmed: "O ṣé. A ti kọ sílẹ̀ pé o máa wá sí ìbẹ̀wò rẹ.",
    smsHelp:
      "Aboyun: fèsì 1 láti jẹ́rìí ìbẹ̀wò. Nínú pàjáwìrì kọ E (tàbí E BLEEDING, E LABOUR, E FITS, E BABY).",
    welcomeWord: "Káàbọ̀",
    continueWord: "Tẹ̀síwájú",
    languageWord: "Èdè",
    chooseLanguage: "Yan èdè",
  },
  ig: {
    main: "Aboyun\n1. Ihe mberede\n2. Lelee ihe m na-enwe\n3. Nleta m ọzọ",
    familyMain: "Aboyun\nMaka {name}:\n1. Ihe mberede",
    emergencyAsk:
      "Gịnị na-eme?\n1. Ọbara na-apụta\n2. Ime na-agba\n3. Ọdịdọ\n4. Nsogbu nwa\n5. Ihe ọzọ",
    emergencySent:
      "Anyị na-eziga enyemaka. Anyị agwala ụlọ ọgwụ gị na ezinụlọ gị. Ọ bụrụ na ị nwere ike, gaa ụlọ ọgwụ ugbu a.",
    familyEmergencySent:
      "Anyị na-eziga enyemaka maka {name}. Anyị agwala ụlọ ọgwụ ya na ezinụlọ ya.",
    question: {
      bleeding: "Ọbara na-apụta n'ala?\n1. Ee\n2. Mba",
      fits: "Ị nwere ọdịdọ?\n1. Ee\n2. Mba",
      headache: "Ị nwere isi ọwụwa dị njọ?\n1. Ee\n2. Mba",
      vision: "Anya gị na-adịghị ahụ nke ọma?\n1. Ee\n2. Mba",
      movement: "Nwa na-akpagharị obere?\n1. Ee\n2. Mba",
      fever: "Ị nwere ahụ ọkụ?\n1. Ee\n2. Mba",
      swelling: "Ihu ma ọ bụ aka gị fụrụ afụ?\n1. Ee\n2. Mba",
      pain: "Ị nwere afọ mgbu dị njọ?\n1. Ee\n2. Mba",
    },
    resultOk:
      "Ị nweghị ihe ize ndụ. Gaa n'ihu na-aga nleta ụlọ ọgwụ. Kpọọ ọzọ oge ọ bụla.",
    resultSoon:
      "Biko gaa ụlọ ọgwụ gị n'ime otu ụbọchị ma ọ bụ abụọ, gwa ha ihe ị na-enwe.",
    resultNow:
      "Gaa ụlọ ọgwụ ugbu a. Ọ bụrụ na ị enweghị ike ịga, kpọọ ọzọ họrọ 1 ka e zipụ enyemaka.",
    nextVisit: "Nleta gị na-esote bụ {date} (nleta {n} n'ime 8). Biko bia.",
    noVisit: "Enweghị nleta ahaziri gị. Jụọ ụlọ ọgwụ gị.",
    wrong: "Nhọrọ ezighi ezi. Biko kpọọ ọzọ.",
    unknownMenu: "Aboyun\n1. Nyere nne aka (tinye ọnụọgụ ekwentị ya)",
    unknownEnd: "Edeghị ọnụọgụ a. Jụọ ụlọ ọgwụ gị ka ha dee gị aha.",
    familyAskPhone: "Tinye ọnụọgụ ekwentị nne ahụ (dị ka 08031234567)",
    familyNotFound: "Anyị ahụghị nne ahụ. Lelee ọnụọgụ ahụ ma kpọọ ọzọ.",
    actionFailed: "Anyị enweghị ike izipu ọkwa. Biko kpọọ ụlọ ọgwụ gị ugbu a.",
    smsConfirmed: "Daalụ. Edeela anyị na ị ga-abịa nleta gị.",
    smsHelp:
      "Aboyun: zaa 1 iji kwenye nleta. N’ọnọdụ mberede dee E (ma ọ bụ E BLEEDING, E LABOUR, E FITS, E BABY).",
    welcomeWord: "Nnọọ",
    continueWord: "Gaa n'ihu",
    languageWord: "Asụsụ",
    chooseLanguage: "Họrọ asụsụ",
  },
  ha: {
    main: "Aboyun\n1. Gaggawa\n2. Duba alamomina\n3. Ziyara ta ta gaba",
    familyMain: "Aboyun\nGa {name}:\n1. Gaggawa",
    emergencyAsk:
      "Me ke faruwa?\n1. Zubar jini\n2. Naƙuda\n3. Farfaɗiya\n4. Matsalar jariri\n5. Wani abu daban",
    emergencySent:
      "Ana aika taimako. An gaya wa asibitinku da iyalinku. Idan za ku iya, ku je asibiti yanzu.",
    familyEmergencySent: "Ana aika taimako ga {name}. An gaya wa asibitinta da iyalinta.",
    question: {
      bleeding: "Kina zubar da jini?\n1. Eh\n2. A'a",
      fits: "Kin yi farfaɗiya?\n1. Eh\n2. A'a",
      headache: "Kina da ciwon kai mai tsanani?\n1. Eh\n2. A'a",
      vision: "Kina ganin a lulluɓe?\n1. Eh\n2. A'a",
      movement: "Jariri yana motsi kaɗan?\n1. Eh\n2. A'a",
      fever: "Kina da zazzaɓi?\n1. Eh\n2. A'a",
      swelling: "Fuskarki ko hannayenki sun kumbura?\n1. Eh\n2. A'a",
      pain: "Kina da ciwon ciki mai tsanani?\n1. Eh\n2. A'a",
    },
    resultOk:
      "Ba ki da alamar haɗari. Ci gaba da zuwa asibiti. Ki sake kira kowane lokaci.",
    resultSoon:
      "Don Allah ki je asibiti cikin kwana ɗaya ko biyu, ki gaya musu abin da kike ji.",
    resultNow:
      "Ki je asibiti yanzu. Idan ba za ki iya zuwa ba, ki sake kira ki zaɓi 1 a aiko taimako.",
    nextVisit: "Ziyararki ta gaba ita ce {date} (ziyara {n} cikin 8). Don Allah ki zo.",
    noVisit: "Babu ziyarar da aka tsara miki. Ki tambayi asibitinki.",
    wrong: "Zaɓi ba daidai ba. Don Allah ki sake kira.",
    unknownMenu: "Aboyun\n1. Taimaki wata uwa (shigar da lambar wayarta)",
    unknownEnd:
      "Ba a yi wa wannan lambar rajista ba. Ki tambayi asibitinki ya yi miki rajista.",
    familyAskPhone: "Shigar da lambar wayar uwar (misali 08031234567)",
    familyNotFound: "Ba mu sami uwar ba. Duba lambar ki sake kira.",
    actionFailed: "Ba mu iya aika saƙon ba. Don Allah ki kira asibitinki yanzu.",
    smsConfirmed: "Na gode. Mun lura za ki zo ziyararki.",
    smsHelp:
      "Aboyun: ki amsa 1 don tabbatar da ziyara. Cikin gaggawa ki aika E (ko E BLEEDING, E LABOUR, E FITS, E BABY).",
    welcomeWord: "Barka da zuwa",
    continueWord: "Ci gaba",
    languageWord: "Harshe",
    chooseLanguage: "Zaɓi harshe",
  },
};

/** Replace {name}, {date}, {n} placeholders. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}
