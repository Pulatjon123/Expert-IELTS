import { PenLine, Mic, ArrowRight, Brain, BookMarked, Layers, MessagesSquare, LineChart, Plus } from "lucide-react";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getHomepageContent } from "@/lib/site";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { HOME_TEXT, wordOfTheDay } from "@/lib/home-content";
import { HeroDemo } from "@/components/home/HeroDemo";
import { LearningPath } from "@/components/home/LearningPath";
import { LevelQuiz } from "@/components/home/LevelQuiz";
import { WordCard } from "@/components/home/WordCard";
import { CountUp } from "@/components/home/CountUp";
import { Reveal } from "@/components/home/Reveal";

export const dynamic = "force-dynamic";

/** Real counts only — a counter that is still zero is simply not shown. */
async function getStats() {
  try {
    const [wq, st, wa, sa, students] = await Promise.all([
      prisma.writingQuestion.count({ where: { isActive: true } }),
      prisma.speakingTopic.count({ where: { isActive: true } }),
      prisma.writingAssessment.count(),
      prisma.speakingAssessment.count(),
      prisma.user.count({ where: { role: "STUDENT" } }),
    ]);
    return { questions: wq + st, assessed: wa + sa, students };
  } catch {
    return { questions: 0, assessed: 0, students: 0 };
  }
}

export default async function Home() {
  const [{ t, locale }, content, user, stats] = await Promise.all([getT(), getHomepageContent(), getCurrentUser(), getStats()]);
  const title = content[locale]?.title || t("home.title");
  const subtitle = content[locale]?.subtitle || t("home.subtitle");
  const h = HOME_TEXT[locale];

  const features = [
    { icon: Brain, title: t("home.feature.weakness"), desc: t("home.feature.weakness.desc") },
    { icon: BookMarked, title: t("home.feature.vocab"), desc: t("home.feature.vocab.desc") },
    { icon: Layers, title: t("home.feature.bands"), desc: t("home.feature.bands.desc") },
    { icon: MessagesSquare, title: t("home.feature.interview"), desc: t("home.feature.interview.desc") },
    { icon: LineChart, title: t("home.feature.report"), desc: t("home.feature.report.desc") },
  ];
  const counters = [
    { value: stats.questions, label: h.stats.questions },
    { value: stats.assessed, label: h.stats.assessed },
    { value: stats.students, label: h.stats.students },
  ].filter((c) => c.value > 0);

  return (
    <div className="relative overflow-x-clip">
      {/* Soft background shapes */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px]">
        <div className="float-soft absolute -left-24 top-10 h-80 w-80 rounded-full bg-primary-soft opacity-70 blur-3xl" />
        <div className="float-soft absolute right-0 top-40 h-72 w-72 rounded-full bg-accent-soft opacity-70 blur-3xl" style={{ animationDelay: "-6s" }} />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero */}
        <section className="grid items-center gap-10 pb-12 pt-14 sm:pt-20 lg:grid-cols-[1.05fr_1fr]">
          <div className="text-center lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> {t("common.free")}
            </p>
            <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight sm:text-6xl">{title}</h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted sm:text-xl lg:mx-0">{subtitle}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              {user ? (
                <>
                  <Link href="/writing" className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 font-medium text-primary-fg hover:bg-primary-hover">
                    {t("home.writing.cta")} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/dashboard" className="inline-flex h-12 items-center rounded-lg border border-border bg-surface px-6 font-medium hover:bg-surface-2">
                    {t("nav.dashboard")}
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/register" className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 font-medium text-primary-fg hover:bg-primary-hover">
                    {t("nav.register")} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/login" className="inline-flex h-12 items-center rounded-lg border border-border bg-surface px-6 font-medium hover:bg-surface-2">
                    {t("nav.login")}
                  </Link>
                </>
              )}
            </div>
            {counters.length > 0 && (
              <dl className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 lg:justify-start">
                {counters.map((c) => (
                  <div key={c.label} className="flex items-baseline gap-1.5">
                    <dt className="sr-only">{c.label}</dt>
                    <dd className="font-display text-2xl font-semibold text-text">
                      <CountUp value={c.value} />
                    </dd>
                    <span className="text-sm text-muted">{c.label}</span>
                  </div>
                ))}
              </dl>
            )}
          </div>
          <Reveal>
            <HeroDemo locale={locale} />
          </Reveal>
        </section>

        {/* Writing / Speaking */}
        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <Reveal>
            <SkillCard href="/writing" icon={<PenLine className="h-6 w-6" />} title={t("home.writing.title")} desc={t("home.writing.desc")} cta={t("home.writing.cta")} tags={["Task 1", "Task 2"]} />
          </Reveal>
          <Reveal delay={120}>
            <SkillCard href="/speaking" icon={<Mic className="h-6 w-6" />} title={t("home.speaking.title")} desc={t("home.speaking.desc")} cta={t("home.speaking.cta")} tags={["Part 1", "Part 2", "Part 3"]} />
          </Reveal>
        </section>

        <LearningPath locale={locale} />

        {/* Level check + word of the day */}
        <section className="mt-24 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Reveal>
            <LevelQuiz locale={locale} loggedIn={Boolean(user)} />
          </Reveal>
          <Reveal delay={120}>
            <WordCard locale={locale} word={wordOfTheDay()} />
          </Reveal>
        </section>

        {/* Features */}
        <section className="mt-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 80}>
              <div className="h-full rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft">
                  <f.icon className="h-5 w-5 text-accent" />
                </span>
                <h3 className="mt-3 font-semibold leading-snug">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </section>

        {/* FAQ */}
        <section className="mx-auto mt-24 max-w-3xl">
          <h2 className="text-center font-display text-3xl font-semibold sm:text-4xl">{h.faq.title}</h2>
          <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-surface">
            {h.faq.items.map((item) => (
              <details key={item.q} className="group px-5 py-4 sm:px-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <Plus className="h-4 w-4 shrink-0 text-muted transition-transform duration-300 group-open:rotate-45" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SkillCard({ href, icon, title, desc, cta, tags }: { href: string; icon: React.ReactNode; title: string; desc: string; cta: string; tags: string[] }) {
  return (
    <Link
      href={href}
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-surface p-8 transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"
    >
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary-soft opacity-60 transition-transform duration-300 group-hover:scale-110" />
      <div className="relative grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-fg">{icon}</div>
      <h2 className="relative mt-6 font-display text-3xl font-semibold">{title}</h2>
      <div className="relative mt-2 flex gap-2">
        {tags.map((tag) => (
          <span key={tag} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted">{tag}</span>
        ))}
      </div>
      <p className="relative mt-4 flex-1 text-muted">{desc}</p>
      <span className="relative mt-6 inline-flex items-center gap-2 font-medium text-primary">
        {cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
