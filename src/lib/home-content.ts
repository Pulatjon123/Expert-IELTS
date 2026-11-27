import type { Locale } from "./i18n/dict";

/** Homepage-only text (demo, learning path, level check, word of the day, FAQ) in English and Uzbek. */

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
}

export interface HomeText {
  demo: {
    label: string;
    before: string;
    after: string;
    grammar: string;
    vocab: string;
    band: string;
    estimate: string;
  };
  path: { title: string; subtitle: string; steps: { title: string; desc: string }[] };
  quiz: {
    title: string;
    subtitle: string;
    start: string;
    questionOf: (n: number, total: number) => string;
    resultTitle: string;
    resultNote: string;
    score: (n: number, total: number) => string;
    retry: string;
    cta: string;
    questions: QuizQuestion[];
  };
  word: { title: string; tapHint: string; example: string; translation: string; back: string };
  stats: { questions: string; assessed: string; students: string };
  faq: { title: string; items: { q: string; a: string }[] };
}

// The quiz questions themselves stay in English: they test English.
const QUIZ: QuizQuestion[] = [
  { q: "Choose the correct sentence.", options: ["The number of students have increased.", "The number of students has increased.", "The number of student has increased."], answer: 1 },
  { q: "The plan was expensive; ___, it was approved.", options: ["because", "therefore", "however"], answer: 2 },
  { q: "Governments should pay more ___ to public health.", options: ["attention", "focus", "notice"], answer: 0 },
  { q: "Sales rose ___ from 20% to 45% between 2010 and 2020.", options: ["dramatic", "dramatically", "drama"], answer: 1 },
  { q: "Which word is best for a formal essay?", options: ["kids", "a lot of", "children"], answer: 2 },
];

const en: HomeText = {
  demo: {
    label: "How your essay is checked",
    before: "Nowadays many people thinks that technology make our life more easier.",
    after: "Many people believe that technology makes our lives considerably easier.",
    grammar: "Grammar",
    vocab: "Vocabulary",
    band: "Band",
    estimate: "Example only — every score on the site is an AI estimate.",
  },
  path: {
    title: "Your path to a higher band",
    subtitle: "Every practice session follows the same simple cycle.",
    steps: [
      { title: "Practise", desc: "Answer a real-style Writing or Speaking question." },
      { title: "Analyse", desc: "Get a band estimate for each criterion." },
      { title: "Learn", desc: "See ideas, vocabulary and a model answer." },
      { title: "Record", desc: "Try the same question again." },
      { title: "Improve", desc: "Fix the mistakes you made the first time." },
      { title: "Compare", desc: "See your first and second attempts side by side." },
      { title: "Track", desc: "Watch your weaknesses shrink week by week." },
      { title: "Repeat", desc: "A new question, a little stronger each time." },
    ],
  },
  quiz: {
    title: "Check your level in 60 seconds",
    subtitle: "Five quick questions. No account needed.",
    start: "Start",
    questionOf: (n, total) => `Question ${n} of ${total}`,
    resultTitle: "Your rough starting point",
    resultNote: "A very rough guide from 5 questions — not an IELTS score. Practise a full task to get a real estimate.",
    score: (n, total) => `${n} of ${total} correct`,
    retry: "Try again",
    cta: "Start practising",
    questions: QUIZ,
  },
  word: { title: "Word of the day", tapHint: "Tap to see the meaning", example: "Example", translation: "In Uzbek", back: "Tap to flip back" },
  stats: { questions: "practice questions", assessed: "answers assessed", students: "students" },
  faq: {
    title: "Questions people ask",
    items: [
      { q: "Is it really free?", a: "Yes. Every feature is free for every student. There are no plans, credits or payments. A fair-use daily limit on AI requests is the same for everyone." },
      { q: "How accurate are the band scores?", a: "They are AI estimates for practice, based on the official IELTS criteria. They are useful for finding what to improve, but they are not official IELTS results." },
      { q: "Do I need an account?", a: "You need a free account to practise and save your essays, recordings and progress. The level check and the word of the day work without one." },
      { q: "Is my pronunciation scored?", a: "Only when audio pronunciation analysis is switched on. Otherwise Pronunciation is shown as “not assessed” — it is never guessed from text." },
      { q: "Can I use the site in Uzbek?", a: "Yes. Switch the language at the top of the page. Practice questions and answers stay in English, as in the real exam." },
    ],
  },
};

const uz: HomeText = {
  demo: {
    label: "Inshoingiz qanday tekshiriladi",
    before: en.demo.before,
    after: en.demo.after,
    grammar: "Grammatika",
    vocab: "Lug‘at",
    band: "Band",
    estimate: "Bu faqat namuna — saytdagi barcha ballar AI bahosidir.",
  },
  path: {
    title: "Yuqori bandga yo‘lingiz",
    subtitle: "Har bir mashg‘ulot shu oddiy siklga asoslanadi.",
    steps: [
      { title: "Mashq", desc: "Imtihonga o‘xshash Writing yoki Speaking savoliga javob bering." },
      { title: "Tahlil", desc: "Har bir mezon bo‘yicha band bahosini oling." },
      { title: "O‘rganish", desc: "G‘oyalar, lug‘at va namunaviy javobni ko‘ring." },
      { title: "Qayta yozish", desc: "Xuddi shu savolga yana javob bering." },
      { title: "Yaxshilash", desc: "Birinchi safardagi xatolarni tuzating." },
      { title: "Solishtirish", desc: "Birinchi va ikkinchi urinishni yonma-yon ko‘ring." },
      { title: "Kuzatish", desc: "Zaif tomonlaringiz haftadan haftaga kamayishini kuzating." },
      { title: "Takrorlash", desc: "Yangi savol — har safar biroz kuchliroq." },
    ],
  },
  quiz: {
    title: "60 soniyada darajangizni tekshiring",
    subtitle: "Beshta qisqa savol. Ro‘yxatdan o‘tish shart emas.",
    start: "Boshlash",
    questionOf: (n, total) => `${total} tadan ${n}-savol`,
    resultTitle: "Taxminiy boshlang‘ich darajangiz",
    resultNote: "5 ta savolga asoslangan juda taxminiy ko‘rsatkich — IELTS bahosi emas. Haqiqiy baho uchun to‘liq topshiriq bajaring.",
    score: (n, total) => `${total} tadan ${n} ta to‘g‘ri`,
    retry: "Qayta urinish",
    cta: "Mashqni boshlash",
    questions: QUIZ,
  },
  word: { title: "Kun so‘zi", tapHint: "Ma’nosini ko‘rish uchun bosing", example: "Misol", translation: "O‘zbekcha", back: "Orqaga qaytarish uchun bosing" },
  stats: { questions: "ta mashq savoli", assessed: "ta javob baholandi", students: "ta talaba" },
  faq: {
    title: "Ko‘p beriladigan savollar",
    items: [
      { q: "Haqiqatan ham bepulmi?", a: "Ha. Barcha imkoniyatlar har bir talaba uchun bepul. Tariflar, kreditlar yoki to‘lovlar yo‘q. AI so‘rovlari uchun kunlik cheklov hamma uchun bir xil." },
      { q: "Band ballari qanchalik aniq?", a: "Bu rasmiy IELTS mezonlariga asoslangan, mashq uchun AI bahosi. Nimani yaxshilash kerakligini topishga yordam beradi, lekin rasmiy IELTS natijasi emas." },
      { q: "Ro‘yxatdan o‘tish kerakmi?", a: "Mashq qilish va insholar, yozuvlar hamda natijalaringizni saqlash uchun bepul akkaunt kerak. Daraja testi va kun so‘zi akkauntsiz ishlaydi." },
      { q: "Talaffuz baholanadimi?", a: "Faqat audio orqali talaffuz tahlili yoqilgan bo‘lsa. Aks holda Pronunciation “baholanmadi” deb ko‘rsatiladi — u hech qachon matndan taxmin qilinmaydi." },
      { q: "Saytdan o‘zbek tilida foydalansa bo‘ladimi?", a: "Ha. Tilni sahifa tepasida almashtiring. Mashq savollari va javoblar real imtihondagidek ingliz tilida qoladi." },
    ],
  },
};

export const HOME_TEXT: Record<Locale, HomeText> = { en, uz };

/** Rough band from the 5-question level check. Deliberately conservative. */
export function quizBand(correct: number) {
  return ["4.5–5.0", "5.0–5.5", "5.5–6.0", "6.0–6.5", "6.5–7.0", "7.0+"][Math.max(0, Math.min(5, correct))];
}

export interface DailyWord {
  word: string;
  kind: string;
  uz: string;
  example: string;
}

export const WORDS: DailyWord[] = [
  { word: "mitigate", kind: "verb", uz: "yumshatmoq, kamaytirmoq", example: "Planting trees can mitigate the effects of air pollution." },
  { word: "detrimental", kind: "adjective", uz: "zararli", example: "Too much screen time can be detrimental to children’s sleep." },
  { word: "substantial", kind: "adjective", uz: "sezilarli, katta", example: "There was a substantial increase in online sales." },
  { word: "alleviate", kind: "verb", uz: "yengillashtirmoq", example: "Public transport can alleviate traffic congestion." },
  { word: "inevitable", kind: "adjective", uz: "muqarrar", example: "Some job losses are inevitable as technology develops." },
  { word: "sustainable", kind: "adjective", uz: "barqaror", example: "Cities need a more sustainable approach to energy." },
  { word: "unprecedented", kind: "adjective", uz: "misli ko‘rilmagan", example: "The city grew at an unprecedented rate." },
  { word: "fluctuate", kind: "verb", uz: "o‘zgarib turmoq", example: "Prices fluctuated throughout the year." },
  { word: "predominantly", kind: "adverb", uz: "asosan", example: "The workforce is predominantly young." },
  { word: "exacerbate", kind: "verb", uz: "yomonlashtirmoq, kuchaytirmoq", example: "Poor diet can exacerbate health problems." },
  { word: "feasible", kind: "adjective", uz: "amalga oshirsa bo‘ladigan", example: "Free public transport is not financially feasible for every city." },
  { word: "compelling", kind: "adjective", uz: "ishonarli", example: "There is compelling evidence that exercise improves mood." },
  { word: "consequently", kind: "adverb", uz: "natijada", example: "Fewer people cook at home; consequently, fast food sales have grown." },
  { word: "adverse", kind: "adjective", uz: "salbiy, noxush", example: "The policy had several adverse effects on small businesses." },
  { word: "enhance", kind: "verb", uz: "yaxshilamoq, oshirmoq", example: "Travelling can enhance a person’s understanding of other cultures." },
  { word: "crucial", kind: "adjective", uz: "hal qiluvchi, juda muhim", example: "Early education plays a crucial role in a child’s development." },
  { word: "diminish", kind: "verb", uz: "kamaymoq", example: "The importance of printed newspapers has diminished." },
  { word: "widespread", kind: "adjective", uz: "keng tarqalgan", example: "Smartphone use is now widespread among teenagers." },
  { word: "advocate", kind: "verb", uz: "qo‘llab-quvvatlamoq, yoqlamoq", example: "Many experts advocate a shorter working week." },
  { word: "curb", kind: "verb", uz: "cheklamoq, jilovlamoq", example: "The government introduced taxes to curb sugar consumption." },
  { word: "prosperity", kind: "noun", uz: "farovonlik", example: "Tourism has brought prosperity to the region." },
  { word: "disparity", kind: "noun", uz: "tafovut, nomutanosiblik", example: "There is a growing disparity between rich and poor." },
  { word: "plummet", kind: "verb", uz: "keskin tushib ketmoq", example: "Car sales plummeted in 2020." },
  { word: "surge", kind: "noun", uz: "keskin o‘sish", example: "There was a surge in demand for online courses." },
  { word: "ubiquitous", kind: "adjective", uz: "hamma joyda uchraydigan", example: "Mobile phones have become ubiquitous." },
  { word: "viable", kind: "adjective", uz: "hayotiy, amalga oshirsa bo‘ladigan", example: "Solar power is now a viable alternative to coal." },
  { word: "pivotal", kind: "adjective", uz: "asosiy, hal qiluvchi", example: "Teachers play a pivotal role in shaping young minds." },
  { word: "deteriorate", kind: "verb", uz: "yomonlashmoq", example: "Air quality has deteriorated in many large cities." },
  { word: "foster", kind: "verb", uz: "rivojlantirmoq, qo‘llab-quvvatlamoq", example: "Team sports foster cooperation among children." },
  { word: "profound", kind: "adjective", uz: "chuqur, kuchli", example: "The internet has had a profound impact on education." },
];

/** The same word for everyone on a given day (UTC). */
export function wordOfTheDay(date = new Date()) {
  const day = Math.floor(date.getTime() / 86_400_000);
  return WORDS[day % WORDS.length];
}
