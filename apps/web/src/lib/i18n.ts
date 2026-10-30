/**
 * UI strings for the three official languages. Content itself comes from the
 * CMS; these cover navigation and labels only.
 *
 * Sinhala and Tamil strings must be reviewed by the Media Directorate's
 * translators before launch.
 */
export const locales = ["en", "si", "ta"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const isLocale = (v: string): v is Locale => (locales as readonly string[]).includes(v);

export const localeNames: Record<Locale, string> = { en: "English", si: "සිංහල", ta: "தமிழ்" };

const en = {
  siteName: "Sri Lanka Air Force",
  tagline: "Guardians of the skies",
  heroLead: "Defending the island's airspace, and flying for the nation in every emergency.",
  skip: "Skip to main content",
  officialSite: "Official website of the Sri Lanka Air Force",
  mission: "We defend Sri Lanka's airspace, support the Army and Navy, and fly for the nation in every emergency, from flood rescue to disaster relief.",
  aboutUs: "About the Air Force",
  servicesTitle: "Find what you need",
  services: {
    join: ["Join the Air Force", "Careers for officers, airmen and airwomen, and civilians"],
    tenders: ["Tenders and procurement", "Open bids, bidding documents and results"],
    bases: ["Bases and stations", "Find an Air Force base near you"],
    events: ["Events", "Ceremonies, open days and public events"],
  },
  nav: {
    home: "Home",
    about: "About",
    news: "News",
    fleet: "Fleet",
    bases: "Bases",
    tenders: "Tenders",
    events: "Events",
    search: "Search",
  },
  join: "Join the Air Force",
  viewTenders: "View open tenders",
  mapCaption: (n: number) => `${n} bases and stations across the island`,
  latestNews: "Latest news",
  allNews: "All news",
  openTenders: "Open tenders",
  allTenders: "All tenders",
  upcomingEvents: "Coming up",
  allEvents: "All events",
  theFleet: "The fleet",
  closes: "Closes",
  closed: "Closed",
  daysLeft: (n: number) => (n <= 0 ? "Closes today" : n === 1 ? "1 day left" : `${n} days left`),
  reference: "Reference",
  method: "Method",
  bidSecurity: "Bid security",
  biddingDocuments: "Bidding documents",
  checksum: "SHA-256 checksum",
  download: "Download",
  noDocuments: "No documents have been published for this tender.",
  published: "Published",
  notTranslated: "This page is not yet available in English.",
  notTranslatedOther: "This page has not been translated yet. It is shown in English.",
  noResults: "Nothing matched your search. Try a different word, or search in another language.",
  searchPlaceholder: "Search news, tenders, bases and aircraft",
  searchResults: (n: number, q: string) => `${n} result${n === 1 ? "" : "s"} for “${q}”`,
  empty: "There is nothing to show here yet.",
  previous: "Previous",
  next: "Next",
  state: { open: "Open", closed: "Closed", cancelled: "Cancelled", awarded: "Awarded" } as Record<string, string>,
  filterAll: "All",
  upcoming: "Upcoming",
  past: "Past",
  venue: "Venue",
  province: "Province",
  established: "Established",
  manufacturer: "Manufacturer",
  origin: "Origin",
  inducted: "Inducted",
  a11y: { label: "Display", contrast: "High contrast", text: "Text size" },
  footer: {
    rights: "Sri Lanka Air Force. All rights reserved.",
    contact: "Air Force Headquarters, Colombo 02, Sri Lanka",
    links: "Information",
  },
  types: { news: "News", tenders: "Tender", bases: "Base", aircraft: "Aircraft", events: "Event", pages: "Page" } as Record<string, string>,
  notFound: "We couldn't find that page. It may have been moved or withdrawn.",
  backHome: "Go to the home page",
};

type Dict = typeof en;

const si: Dict = {
  ...en,
  siteName: "ශ්‍රී ලංකා ගුවන් හමුදාව",
  tagline: "අහසේ ආරක්ෂකයෝ",
  heroLead: "දිවයිනේ ගුවන් සීමාව ආරක්ෂා කරමින්, සෑම හදිසි අවස්ථාවකදීම ජාතිය වෙනුවෙන් පියාසර කරමු.",
  skip: "ප්‍රධාන අන්තර්ගතයට යන්න",
  officialSite: "ශ්‍රී ලංකා ගුවන් හමුදාවේ නිල වෙබ් අඩවිය",
  mission: "අපි ශ්‍රී ලංකාවේ ගුවන් සීමාව ආරක්ෂා කරමු, යුද හමුදාවට සහ නාවික හමුදාවට සහාය වෙමු, ගංවතුර බේරාගැනීමේ සිට ආපදා සහන දක්වා සෑම හදිසි අවස්ථාවකදීම ජාතිය වෙනුවෙන් පියාසර කරමු.",
  aboutUs: "ගුවන් හමුදාව ගැන",
  servicesTitle: "ඔබට අවශ්‍ය දේ සොයන්න",
  services: {
    join: ["ගුවන් හමුදාවට බැඳෙන්න", "නිලධාරීන්, ගුවන් භටයින් සහ සිවිල් වෘත්තීන්"],
    tenders: ["ලංසු සහ ප්‍රසම්පාදන", "විවෘත ලංසු, ලංසු ලේඛන සහ ප්‍රතිඵල"],
    bases: ["කඳවුරු සහ ස්ථාන", "ඔබට ආසන්න ගුවන් හමුදා කඳවුර සොයන්න"],
    events: ["උත්සව", "උත්සව, විවෘත දින සහ මහජන අවස්ථා"],
  },
  nav: { home: "මුල් පිටුව", about: "අප ගැන", news: "පුවත්", fleet: "ගුවන් යානා", bases: "කඳවුරු", tenders: "ලංසු", events: "උත්සව", search: "සොයන්න" },
  join: "ගුවන් හමුදාවට බැඳෙන්න",
  viewTenders: "විවෘත ලංසු බලන්න",
  mapCaption: (n) => `දිවයින පුරා කඳවුරු සහ ස්ථාන ${n}ක්`,
  latestNews: "නවතම පුවත්",
  allNews: "සියලු පුවත්",
  openTenders: "විවෘත ලංසු",
  allTenders: "සියලු ලංසු",
  upcomingEvents: "ඉදිරි උත්සව",
  allEvents: "සියලු උත්සව",
  theFleet: "ගුවන් යානා බලඇණිය",
  closes: "අවසන් වන්නේ",
  closed: "අවසන්",
  daysLeft: (n) => (n <= 0 ? "අද අවසන් වේ" : `දින ${n}ක් ඉතිරිය`),
  reference: "යොමු අංකය",
  method: "ක්‍රමය",
  bidSecurity: "ලංසු ඇපය",
  biddingDocuments: "ලංසු ලේඛන",
  download: "බාගන්න",
  noDocuments: "මෙම ලංසුව සඳහා ලේඛන පළ කර නැත.",
  published: "පළ කළේ",
  notTranslatedOther: "මෙම පිටුව තවම සිංහලට පරිවර්තනය කර නැත. ඉංග්‍රීසියෙන් පෙන්වයි.",
  noResults: "ඔබගේ සෙවුමට ගැළපෙන කිසිවක් හමු නොවීය. වෙනත් වචනයක් උත්සාහ කරන්න.",
  searchPlaceholder: "පුවත්, ලංසු, කඳවුරු සහ ගුවන් යානා සොයන්න",
  searchResults: (n, q) => `“${q}” සඳහා ප්‍රතිඵල ${n}ක්`,
  empty: "තවම පෙන්වීමට කිසිවක් නැත.",
  previous: "පෙර",
  next: "ඊළඟ",
  state: { open: "විවෘත", closed: "අවසන්", cancelled: "අවලංගු", awarded: "ප්‍රදානය කළ" },
  filterAll: "සියල්ල",
  upcoming: "ඉදිරියට",
  past: "පසුගිය",
  venue: "ස්ථානය",
  province: "පළාත",
  established: "ස්ථාපිත",
  manufacturer: "නිෂ්පාදක",
  origin: "නිෂ්පාදිත රට",
  inducted: "සේවයට එක්කළේ",
  a11y: { label: "දර්ශනය", contrast: "ඉහළ වෙනස", text: "අකුරු ප්‍රමාණය" },
  footer: { rights: "ශ්‍රී ලංකා ගුවන් හමුදාව. සියලු හිමිකම් ඇවිරිණි.", contact: "ගුවන් හමුදා මූලස්ථානය, කොළඹ 02, ශ්‍රී ලංකාව", links: "තොරතුරු" },
  types: { news: "පුවත", tenders: "ලංසුව", bases: "කඳවුර", aircraft: "ගුවන් යානය", events: "උත්සවය", pages: "පිටුව" },
  notFound: "එම පිටුව සොයාගත නොහැකි විය.",
  backHome: "මුල් පිටුවට යන්න",
};

const ta: Dict = {
  ...en,
  siteName: "இலங்கை விமானப்படை",
  tagline: "வானின் காவலர்கள்",
  heroLead: "தீவின் வான்பரப்பைப் பாதுகாத்து, ஒவ்வொரு அவசர நிலையிலும் தேசத்திற்காகப் பறக்கிறோம்.",
  skip: "முதன்மை உள்ளடக்கத்திற்குச் செல்லவும்",
  officialSite: "இலங்கை விமானப்படையின் உத்தியோகபூர்வ இணையத்தளம்",
  mission: "நாம் இலங்கையின் வான்பரப்பைப் பாதுகாக்கிறோம், இராணுவத்திற்கும் கடற்படைக்கும் ஆதரவளிக்கிறோம், வெள்ள மீட்பு முதல் அனர்த்த நிவாரணம் வரை ஒவ்வொரு அவசர நிலையிலும் தேசத்திற்காகப் பறக்கிறோம்.",
  aboutUs: "விமானப்படை பற்றி",
  servicesTitle: "உங்களுக்குத் தேவையானதைக் கண்டறியுங்கள்",
  services: {
    join: ["விமானப்படையில் இணையுங்கள்", "அதிகாரிகள், விமானப்படை வீரர்கள் மற்றும் சிவில் தொழில்கள்"],
    tenders: ["கேள்விப்பத்திரங்களும் கொள்முதலும்", "திறந்த கேள்விகள், ஆவணங்கள் மற்றும் முடிவுகள்"],
    bases: ["தளங்களும் நிலையங்களும்", "உங்களுக்கு அருகிலுள்ள விமானப்படைத் தளத்தைக் கண்டறியுங்கள்"],
    events: ["நிகழ்வுகள்", "விழாக்கள், திறந்த நாட்கள் மற்றும் பொது நிகழ்வுகள்"],
  },
  nav: { home: "முகப்பு", about: "எம்மைப் பற்றி", news: "செய்திகள்", fleet: "விமானங்கள்", bases: "தளங்கள்", tenders: "கேள்விப்பத்திரங்கள்", events: "நிகழ்வுகள்", search: "தேடல்" },
  join: "விமானப்படையில் இணையுங்கள்",
  viewTenders: "திறந்த கேள்விப்பத்திரங்கள்",
  mapCaption: (n) => `தீவு முழுவதும் ${n} தளங்கள் மற்றும் நிலையங்கள்`,
  latestNews: "அண்மைய செய்திகள்",
  allNews: "அனைத்துச் செய்திகளும்",
  openTenders: "திறந்த கேள்விப்பத்திரங்கள்",
  allTenders: "அனைத்துக் கேள்விப்பத்திரங்களும்",
  upcomingEvents: "வரவிருக்கும் நிகழ்வுகள்",
  allEvents: "அனைத்து நிகழ்வுகளும்",
  theFleet: "விமானத் தொகுதி",
  closes: "முடிவடைவது",
  closed: "முடிவடைந்தது",
  daysLeft: (n) => (n <= 0 ? "இன்று முடிவடைகிறது" : `${n} நாட்கள் உள்ளன`),
  reference: "குறிப்பு இலக்கம்",
  method: "முறை",
  bidSecurity: "கேள்வி உத்தரவாதம்",
  biddingDocuments: "கேள்விப் பத்திரங்கள்",
  download: "பதிவிறக்கு",
  noDocuments: "இக்கேள்விப்பத்திரத்திற்கு ஆவணங்கள் வெளியிடப்படவில்லை.",
  published: "வெளியிடப்பட்டது",
  notTranslatedOther: "இப்பக்கம் இன்னும் தமிழில் மொழிபெயர்க்கப்படவில்லை. ஆங்கிலத்தில் காட்டப்படுகிறது.",
  noResults: "உங்கள் தேடலுக்குப் பொருந்தும் எதுவும் கிடைக்கவில்லை. வேறு சொல்லை முயற்சிக்கவும்.",
  searchPlaceholder: "செய்திகள், கேள்விப்பத்திரங்கள், தளங்கள், விமானங்களைத் தேடுக",
  searchResults: (n, q) => `“${q}” க்கு ${n} முடிவுகள்`,
  empty: "இங்கு காட்ட இன்னும் எதுவும் இல்லை.",
  previous: "முந்தைய",
  next: "அடுத்த",
  state: { open: "திறந்துள்ளது", closed: "முடிவடைந்தது", cancelled: "ரத்து செய்யப்பட்டது", awarded: "வழங்கப்பட்டது" },
  filterAll: "அனைத்தும்",
  upcoming: "வரவிருப்பவை",
  past: "கடந்தவை",
  venue: "இடம்",
  province: "மாகாணம்",
  established: "நிறுவப்பட்டது",
  manufacturer: "உற்பத்தியாளர்",
  origin: "உற்பத்தி நாடு",
  inducted: "சேவையில் இணைக்கப்பட்டது",
  a11y: { label: "காட்சி", contrast: "உயர் மாறுபாடு", text: "எழுத்து அளவு" },
  footer: { rights: "இலங்கை விமானப்படை. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.", contact: "விமானப்படைத் தலைமையகம், கொழும்பு 02, இலங்கை", links: "தகவல்" },
  types: { news: "செய்தி", tenders: "கேள்விப்பத்திரம்", bases: "தளம்", aircraft: "விமானம்", events: "நிகழ்வு", pages: "பக்கம்" },
  notFound: "அந்தப் பக்கத்தைக் கண்டுபிடிக்க முடியவில்லை.",
  backHome: "முகப்புக்குச் செல்லவும்",
};

const dictionaries: Record<Locale, Dict> = { en, si, ta };

export function t(locale: Locale): Dict {
  return dictionaries[locale];
}

const intlLocale: Record<Locale, string> = { en: "en-GB", si: "si-LK", ta: "ta-LK" };

/** Dates are shown in Sri Lanka time regardless of server time zone. */
export function formatDate(iso: string | null | undefined, locale: Locale, withTime = false) {
  if (!iso) return "";
  return new Intl.DateTimeFormat(intlLocale[locale], {
    dateStyle: "long",
    ...(withTime ? { timeStyle: "short" } : {}),
    timeZone: "Asia/Colombo",
  }).format(new Date(iso));
}

export function formatTime(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale[locale], { timeStyle: "short", timeZone: "Asia/Colombo" }).format(new Date(iso));
}

export function formatNumber(n: number, locale: Locale) {
  return new Intl.NumberFormat(intlLocale[locale]).format(n);
}
