// src/app/page.tsx
"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";

import { HowItWorks } from "@/components/HowItWorks";
import { Courses } from "@/components/Courses";
import { Pricing, type PurchaseOptions } from "@/components/Pricing";
import { ChatWidget } from "@/components/ChatWidget";
import { About } from "@/components/About";
import { FAQ } from "@/components/FAQ";
import { Testimonials } from "@/components/Testimonials";
import { TestSignupButton } from "@/components/TestSignupButton";
import { courseNames } from "@/data/courses";
import { Footer } from "@/components/Footer";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslations } from "next-intl";

function HowStepCard({
  children,
  className,
  delayClass = "delay-0",
}: {
  children: ReactNode;
  className?: string;
  delayClass?: string;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className={[
        "relative rounded-3xl border p-5 sm:p-6 flex flex-col gap-3",
        "transform-gpu transition-all duration-700 ease-out",
        delayClass,
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        "hover:-translate-y-1.5",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

type CountryOption = {
  iso: string;
  label: string;
  flag: string;
  dial: string;
  placeholder: string;
};

const COUNTRY_OPTIONS: CountryOption[] = [
  { iso: "RU", label: "Россия", flag: "🇷🇺", dial: "+7", placeholder: "900 000-00-00" },
  { iso: "AM", label: "Армения", flag: "🇦🇲", dial: "+374", placeholder: "77 123 456" },
  { iso: "GB", label: "UK", flag: "🇬🇧", dial: "+44", placeholder: "7400 000000" },
  { iso: "US", label: "USA", flag: "🇺🇸", dial: "+1", placeholder: "201 555 0123" },
  { iso: "BY", label: "Беларусь", flag: "🇧🇾", dial: "+375", placeholder: "29 123 45 67" },
  { iso: "KZ", label: "Казахстан", flag: "🇰🇿", dial: "+7", placeholder: "701 000 0000" },
  { iso: "UA", label: "Украина", flag: "🇺🇦", dial: "+380", placeholder: "50 000 0000" },
  { iso: "ES", label: "España", flag: "🇪🇸", dial: "+34", placeholder: "612 345 678" },
  { iso: "DE", label: "Deutschland", flag: "🇩🇪", dial: "+49", placeholder: "1512 3456789" },
  { iso: "FR", label: "France", flag: "🇫🇷", dial: "+33", placeholder: "6 12 34 56 78" },
  { iso: "OTHER", label: "Другая", flag: "🌍", dial: "", placeholder: "Введите номер" },
];

function digitsOnly(v: string) {
  return v.replace(/\D/g, "");
}

function buildE164(dial: string, national: string) {
  const d = dial.startsWith("+") ? dial : `+${dial}`;
  const n = digitsOnly(national);
  return `${d}${n}`;
}

function isLikelyValidPhone(national: string) {
  return digitsOnly(national).length >= 6;
}

function isLikelyValidDial(dial: string) {
  const d = dial.trim();
  if (!d) return false;
  if (!d.startsWith("+")) return false;
  return digitsOnly(d).length >= 1;
}

function countryToDial(iso: string) {
  return (
    COUNTRY_OPTIONS.find((c) => c.iso === iso)?.dial ?? COUNTRY_OPTIONS[0].dial
  );
}

function guessCountryIso(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";

  const tzMap: Array<[RegExp, string]> = [
    [/^Europe\/Madrid$/, "ES"],
    [/^Europe\/Berlin$/, "DE"],
    [/^Europe\/Paris$/, "FR"],
    [/^Europe\/London$/, "GB"],
    [/^Asia\/Yerevan$/, "AM"],
    [/^Europe\/Minsk$/, "BY"],
    [/^Europe\/Kiev$|^Europe\/Kyiv$/, "UA"],
    [/^Europe\/Moscow$|^Asia\/Yekaterinburg$|^Asia\/Novosibirsk$/, "RU"],
    [/^America\/(New_York|Chicago|Denver|Los_Angeles)/, "US"],
  ];

  for (const [re, iso] of tzMap) {
    if (re.test(tz)) return iso;
  }

  const lang =
    typeof navigator !== "undefined" && navigator.language ? navigator.language : "";
  const m = lang.match(/-([A-Z]{2})$/);
  if (m?.[1]) return m[1];

  return "RU";
}

export default function HomePage() {
  const t = useTranslations("home");

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testContext, setTestContext] = useState<string | undefined>();

  const [testCourse, setTestCourse] = useState("");
  const [testNeedsCourse, setTestNeedsCourse] = useState(false);

  const [testCountryIso, setTestCountryIso] = useState(COUNTRY_OPTIONS[0].iso);
  const [testDialCode, setTestDialCode] = useState(COUNTRY_OPTIONS[0].dial);
  const [testPhoneNational, setTestPhoneNational] = useState("");
  const [testCustomDial, setTestCustomDial] = useState("+");

  const [testFullName, setTestFullName] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testAgreed, setTestAgreed] = useState(false);
  const [isTestSubmitting, setIsTestSubmitting] = useState(false);

  function openTestModal(context?: string, opts?: { needsCourse?: boolean }) {
    setTestContext(context);
    setTestNeedsCourse(!!opts?.needsCourse);
    if (opts?.needsCourse) setTestCourse("");
    setIsTestModalOpen(true);
  }

  function closeTestModal() {
    if (isTestSubmitting) return;
    setIsTestModalOpen(false);
    setTestNeedsCourse(false);
  }

  async function handleTestSubmit(e: FormEvent) {
    e.preventDefault();
    if (!testAgreed || isTestSubmitting) return;

    const dialToSend = testCountryIso === "OTHER" ? testCustomDial : testDialCode;
    if (testCountryIso === "OTHER" && !isLikelyValidDial(testCustomDial)) return;

    if (!isLikelyValidPhone(testPhoneNational)) return;
    if (testNeedsCourse && !testCourse) return;

    setIsTestSubmitting(true);

    try {
      const res = await fetch("/api/test-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: testFullName,
          email: testEmail,
          phone: buildE164(dialToSend, testPhoneNational),
          context: testContext ?? "",
          courseName: testNeedsCourse ? testCourse : null,
        }),
      });

      if (!res.ok) {
        console.error("Ошибка отправки формы теста", await res.text());
      } else {
        setTestFullName("");
        setTestEmail("");
        setTestAgreed(false);
        setIsTestModalOpen(false);
        setTestCourse("");
        setTestNeedsCourse(false);
        setTestPhoneNational("");
        setTestCustomDial("+");
      }
    } catch (err) {
      console.error("Ошибка запроса (тест силы)", err);
    } finally {
      setIsTestSubmitting(false);
    }
  }

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseOptions, setPurchaseOptions] =
    useState<PurchaseOptions | null>(null);

  const [buyFullName, setBuyFullName] = useState("");
  const [buyEmail, setBuyEmail] = useState("");

  const [buyCountryIso, setBuyCountryIso] = useState(COUNTRY_OPTIONS[0].iso);
  const [buyDialCode, setBuyDialCode] = useState(COUNTRY_OPTIONS[0].dial);
  const [buyPhoneNational, setBuyPhoneNational] = useState("");
  const [buyCustomDial, setBuyCustomDial] = useState("+");

  const [buyCourse, setBuyCourse] = useState<string>("");
  const [buyAgreed, setBuyAgreed] = useState(false);
  const [isBuySubmitting, setIsBuySubmitting] = useState(false);

  useEffect(() => {
    const iso = guessCountryIso();
    const dial = countryToDial(iso);

    setTestCountryIso(iso);
    setTestDialCode(dial);

    setBuyCountryIso(iso);
    setBuyDialCode(dial);
  }, []);

  function openPurchaseModal(options: PurchaseOptions) {
    setPurchaseOptions(options);
    setIsPurchaseModalOpen(true);
  }

  function closePurchaseModal() {
    if (isBuySubmitting) return;
    setIsPurchaseModalOpen(false);
  }

  async function handlePurchaseSubmit(e: FormEvent) {
    e.preventDefault();
    if (!purchaseOptions || !buyAgreed || isBuySubmitting) return;

    const dialToSend = buyCountryIso === "OTHER" ? buyCustomDial : buyDialCode;
    if (buyCountryIso === "OTHER" && !isLikelyValidDial(buyCustomDial)) return;

    if (!isLikelyValidPhone(buyPhoneNational)) return;

    setIsBuySubmitting(true);

    try {
      const res = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: buyFullName,
          email: buyEmail,
          phone: buildE164(dialToSend, buyPhoneNational),
          courseName: buyCourse,
          tariffId: purchaseOptions.tariffId,
          tariffLabel: purchaseOptions.tariffLabel,
          amount: purchaseOptions.amount,
          currency: purchaseOptions.currency,
        }),
      });

      if (!res.ok) {
        console.error("Ошибка создания оплаты", await res.text());
      } else {
        const data = await res.json();
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
        } else {
          console.error("paymentUrl не получен из API");
        }
      }
    } catch (err) {
      console.error("Ошибка запроса (покупка тарифа)", err);
    } finally {
      setIsBuySubmitting(false);
    }
  }

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");

  function openLoginModal() {
    setLoginEmail("");
    setLoginPassword("");
    setLoginMessage("");
    setIsLoginModalOpen(true);
  }

  function closeLoginModal() {
    if (isLoginSubmitting) return;
    setIsLoginModalOpen(false);
  }

  function handleLoginSubmit(e: FormEvent) {
    e.preventDefault();
    if (isLoginSubmitting) return;

    setIsLoginSubmitting(true);

    setTimeout(() => {
      setIsLoginSubmitting(false);
      setLoginMessage(t("modals.login.message"));
    }, 400);
  }

  const scrollYRef = useRef(0);
  const anyModalOpen = isTestModalOpen || isPurchaseModalOpen || isLoginModalOpen;

  useEffect(() => {
    if (!anyModalOpen) return;

    scrollYRef.current = window.scrollY || 0;

    const body = document.body;
    body.style.position = "fixed";
    body.style.top = `-${scrollYRef.current}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      const y = scrollYRef.current;

      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      body.style.overflow = "";

      const html = document.documentElement;
      const prev = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";

      window.scrollTo({ top: y, left: 0, behavior: "auto" });

      html.style.scrollBehavior = prev;
    };
  }, [anyModalOpen]);

  return (
    <main className="min-h-screen bg-brand-dark text-white">
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 py-8 sm:py-16 lg:py-20">
        <header className="sticky top-0 z-40 mb-8 sm:mb-12 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-2">
              <Image
                src="/logo-idc-white1.svg"
                alt="I Do Calisthenics"
                width={150}
                height={40}
                className="h-7 w-auto sm:h-8 lg:h-9"
                priority
              />
              <span className="text-base sm:text-lg font-medium tracking-tight">
                I Do Calisthenics
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-6 text-sm text-brand-muted">
              <a href="#how" className="hover:text-white transition-colors">
                {t("header.nav.how")}
              </a>
              <a href="#courses" className="hover:text-white transition-colors">
                {t("header.nav.courses")}
              </a>
              <a href="#pricing" className="hover:text-white transition-colors">
                {t("header.nav.pricing")}
              </a>
              <a href="#about" className="hover:text-white transition-colors">
                {t("header.nav.about")}
              </a>
              <a href="#reviews" className="hover:text-white transition-colors">
                {t("header.nav.reviews")}
              </a>
              <a href="#faq" className="hover:text-white transition-colors">
                {t("header.nav.faq")}
              </a>
            </nav>

            <LanguageSwitcher />

            <button
              className="hidden md:inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 transition-colors"
              type="button"
              onClick={openLoginModal}
            >
              {t("header.login")}
            </button>

            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/5 md:hidden"
              onClick={() => setIsMobileNavOpen(true)}
              aria-label={t("header.openMenu")}
            >
              <span className="sr-only">{t("header.openMenu")}</span>
              <div className="flex flex-col items-center justify-center gap-1.5">
                <span className="block h-0.5 w-5 rounded-full bg-white" />
                <span className="block h-0.5 w-5 rounded-full bg-white" />
                <span className="block h-0.5 w-5 rounded-full bg-white" />
              </div>
            </button>
          </div>
        </header>

        {isMobileNavOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/70 md:hidden"
            onClick={() => setIsMobileNavOpen(false)}
          >
            <nav
              className="absolute left-4 right-4 top-6 rounded-3xl bg-brand-dark border border-white/10 p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="text-base font-medium">
                  {t("header.menuTitle")}
                </span>

                <button
                  type="button"
                  onClick={() => setIsMobileNavOpen(false)}
                  className="h-10 w-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xl leading-none hover:bg-white/20 transition-colors"
                  aria-label={t("header.closeMenu")}
                >
                  ×
                </button>
              </div>

              <div className="flex flex-col gap-2 mb-4 text-[16px]">
                <a
                  href="#how"
                  className="rounded-2xl px-3 py-2 hover:bg-white/5"
                  onClick={() => setIsMobileNavOpen(false)}
                >
                  {t("mobileMenu.how")}
                </a>
                <a
                  href="#courses"
                  className="rounded-2xl px-3 py-2 hover:bg-white/5"
                  onClick={() => setIsMobileNavOpen(false)}
                >
                  {t("mobileMenu.courses")}
                </a>
                <a
                  href="#pricing"
                  className="rounded-2xl px-3 py-2 hover:bg-white/5"
                  onClick={() => setIsMobileNavOpen(false)}
                >
                  {t("mobileMenu.pricing")}
                </a>
                <a
                  href="#locations"
                  className="rounded-2xl px-3 py-2 hover:bg-white/5"
                  onClick={() => setIsMobileNavOpen(false)}
                >
                  {t("mobileMenu.locations")}
                </a>
                <a
                  href="#about"
                  className="rounded-2xl px-3 py-2 hover:bg-white/5"
                  onClick={() => setIsMobileNavOpen(false)}
                >
                  {t("mobileMenu.about")}
                </a>
                <a
                  href="#reviews"
                  className="rounded-2xl px-3 py-2 hover:bg-white/5"
                  onClick={() => setIsMobileNavOpen(false)}
                >
                  {t("mobileMenu.reviews")}
                </a>
                <a
                  href="#faq"
                  className="rounded-2xl px-3 py-2 hover:bg-white/5"
                  onClick={() => setIsMobileNavOpen(false)}
                >
                  {t("mobileMenu.faq")}
                </a>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    openTestModal(t("contexts.mobileMenuStrengthTest"));
                  }}
                  className="w-full rounded-full bg-brand-primary px-4 py-3 text-sm font-semibold text-white hover:bg-brand-primary/90 transition-colors"
                >
                  {t("header.takeStrengthTest")}
                </button>
              </div>
            </nav>
          </div>
        )}

        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center mb-16 lg:mb-24">
          <div className="space-y-6 sm:space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[12px] sm:text-sm text-brand-muted border border-white/10">
              <span className="h-2 w-2 rounded-full bg-brand-accent" />
              {t("hero.badge")}
            </div>

            <h1 className="text-[30px] sm:text-4xl lg:text-6xl font-semibold leading-tight tracking-tight">
              {t("hero.titleLine1")}
              <br />
              {t("hero.titleLine2")}
              <span className="block text-[17px] sm:text-xl lg:text-2xl text-brand-accent mt-3 lg:mt-4">
                {t("hero.subtitle")}
              </span>
            </h1>

            <p className="max-w-xl text-[15px] sm:text-base text-brand-muted leading-relaxed">
              {t("hero.desc")}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
              <TestSignupButton
                onClick={() => openTestModal(t("contexts.heroStrengthTest"))}
              />

              <a
                href="#courses"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm sm:text-base font-semibold hover:bg-white/5 transition-colors"
              >
                {t("hero.ctaCourses")}
              </a>
            </div>

            <div className="flex flex-wrap gap-4 pt-4 text-[13px] sm:text-sm text-brand-muted">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-white/5 flex items-center justify-center text-[11px]">
                  ✔
                </span>
                <span>{t("hero.benefitPlan")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-white/5 flex items-center justify-center text-[11px]">
                  24/7
                </span>
                <span>{t("hero.benefitChat")}</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative rounded-4xl bg-gradient-to-br from-brand-blue to-[#111827] p-1 shadow-soft">
              <div className="rounded-4xl bg-brand-dark/90 border border-white/10 p-4 sm:p-5 lg:p-6">
                <div className="relative overflow-hidden rounded-3xl bg-black/60 h-56 sm:h-64 lg:h-72 mb-4 sm:mb-5">
                  <video
                    className="absolute inset-0 h-full w-full object-cover"
                    src="/hero-preview1.mp4"
                    playsInline
                    muted
                    autoPlay
                    loop
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div className="rounded-2xl bg-white/5 border border-white/10 px-3 py-3">
                    <div className="text-brand-muted mb-1">
                      {t("hero.cardWorkoutsTitle")}
                    </div>
                    <div className="text-lg sm:text-xl font-semibold">
                      {t("hero.cardWorkoutsValue")}
                    </div>
                    <div className="mt-1 text-[11px] text-brand-muted">
                      {t("hero.cardWorkoutsNote")}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/5 border border-white/10 px-3 py-3">
                    <div className="text-brand-muted mb-1">
                      {t("hero.cardProgressTitle")}
                    </div>
                    <div className="text-lg sm:text-xl font-semibold">
                      {t("hero.cardProgressValue")}
                    </div>
                    <div className="mt-1 text-[11px] text-brand-muted">
                      {t("hero.cardProgressNote")}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-brand-accent/10 border border-brand-accent/40 px-3 py-3 col-span-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-brand-muted mb-1">
                          {t("hero.nextStepLabel")}
                        </div>
                        <div className="text-sm font-semibold">
                          {t("hero.nextStepTitle")}
                        </div>
                      </div>
                      <button
                        className="shrink-0 rounded-full bg-brand-accent text-brand-dark px-4 py-2 text-xs font-semibold hover:bg-brand-accent/90 transition-colors"
                        onClick={() => {
                          document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        {t("hero.start")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute -top-8 -right-10 h-32 w-32 rounded-full bg-brand-blue/40 blur-3xl" />
          </div>
        </section>

        <HowItWorks />
      </div>

      <Courses onOpenTestModal={openTestModal} />

      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20 lg:pb-24">
        <Pricing
          onOpenTestModal={(context) => openTestModal(context, { needsCourse: true })}
          onOpenPurchaseModal={openPurchaseModal}
        />
        <About />
        <Testimonials />
        <FAQ />
      </div>

      <Footer />

      {/* MODAL: strength test */}
      {isTestModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 p-4 sm:p-0 flex items-center justify-center"
          onClick={closeTestModal}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-brand-dark border border-white/10 p-5 sm:p-6 shadow-xl
                       max-h-[calc(100dvh-2rem)] overflow-y-auto
                       pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="text-lg sm:text-xl font-semibold">
                {t("modals.strengthTest.title")}
              </h2>

              <button
                type="button"
                onClick={closeTestModal}
                className="rounded-full bg-white/5 p-1 text-brand-muted hover:bg-white/10 hover:text-white transition-colors"
                aria-label={t("modals.strengthTest.close")}
              >
                <span className="block h-4 w-4 leading-none">✕</span>
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleTestSubmit}>
              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-brand-muted">
                  {t("modals.strengthTest.fullNameLabel")}
                </label>
                <input
                  type="text"
                  value={testFullName}
                  onChange={(e) => setTestFullName(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary"
                  placeholder={t("modals.strengthTest.fullNamePlaceholder")}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-brand-muted">
                  {t("modals.strengthTest.emailLabel")}
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary"
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-brand-muted">
                  {t("modals.strengthTest.phoneLabel")}
                </label>

                {testCountryIso === "OTHER" ? (
                  <div className="grid grid-cols-[0.7fr_1.3fr] gap-2">
                    <input
                      type="tel"
                      inputMode="tel"
                      value={testCustomDial}
                      onChange={(e) => setTestCustomDial(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary"
                      placeholder={t("modals.strengthTest.customDialPlaceholder")}
                    />
                    <input
                      type="tel"
                      inputMode="tel"
                      value={testPhoneNational}
                      onChange={(e) => setTestPhoneNational(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary"
                      placeholder={t("modals.strengthTest.phonePlaceholder")}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-[1fr_1.2fr] gap-2">
                    <select
                      value={testCountryIso}
                      onChange={(e) => {
                        const iso = e.target.value;
                        const dial = countryToDial(iso);
                        setTestCountryIso(iso);
                        setTestDialCode(dial);
                      }}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-brand-primary"
                    >
                      {COUNTRY_OPTIONS.map((c) => (
                        <option key={c.iso} value={c.iso}>
                          {c.flag} {c.dial || c.label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="tel"
                      inputMode="tel"
                      value={testPhoneNational}
                      onChange={(e) => setTestPhoneNational(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary"
                      placeholder={
                        COUNTRY_OPTIONS.find((c) => c.iso === testCountryIso)
                          ?.placeholder ?? t("modals.strengthTest.phonePlaceholder")
                      }
                    />
                  </div>
                )}

                {testCountryIso === "OTHER" && (
                  <div className="mt-2">
                    <select
                      value={testCountryIso}
                      onChange={(e) => {
                        const iso = e.target.value;
                        const dial = countryToDial(iso);
                        setTestCountryIso(iso);
                        setTestDialCode(dial);
                      }}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-brand-primary"
                    >
                      {COUNTRY_OPTIONS.map((c) => (
                        <option key={c.iso} value={c.iso}>
                          {c.flag} {c.dial || c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <p className="text-[11px] text-brand-muted">
                  {t("modals.strengthTest.phoneWillBeSentAs")}{" "}
                  {buildE164(
                    testCountryIso === "OTHER" ? testCustomDial : testDialCode,
                    testPhoneNational
                  ) ||
                    (testCountryIso === "OTHER" ? testCustomDial : testDialCode)}
                </p>
              </div>

              <input type="hidden" name="context" value={testContext ?? ""} />

              {testNeedsCourse && (
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm text-brand-muted">
                    {t("modals.strengthTest.courseLabel")}
                  </label>

                  <div className="relative">
                    <select
                      value={testCourse}
                      onChange={(e) => setTestCourse(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-brand-primary/60 bg-brand-dark px-3 py-2 pr-8 text-sm text-white outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary appearance-none"
                    >
                      <option value="" disabled>
                        {t("modals.strengthTest.coursePlaceholder")}
                      </option>

                      {courseNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>

                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-brand-muted">
                      ▾
                    </span>
                  </div>
                </div>
              )}

              <label className="flex items-start gap-2 text-[11px] sm:text-xs text-brand-muted">
                <input
                  type="checkbox"
                  checked={testAgreed}
                  onChange={(e) => setTestAgreed(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-white/20 bg-transparent text-brand-primary focus:ring-0"
                  required
                />
                <span>
                  {t("modals.strengthTest.agreeTextPrefix")}{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    className="underline decoration-dotted hover:text-white"
                  >
                    {t("modals.strengthTest.privacyPolicy")}
                  </a>
                  {t("modals.strengthTest.agreeDot")}
                </span>
              </label>

              <button
                type="submit"
                disabled={isTestSubmitting || !testAgreed}
                className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-brand-primary px-4 py-2.5 text-sm font-semibold disabled:opacity-60 disabled:pointer-events-none hover:bg-brand-primary/90 transition-colors"
              >
                {isTestSubmitting
                  ? t("modals.strengthTest.submitSending")
                  : t("modals.strengthTest.submit")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: purchase */}
      {isPurchaseModalOpen && purchaseOptions && (
        <div
          className="fixed inset-0 z-50 bg-black/60 p-4 sm:p-0 flex items-center justify-center"
          onClick={closePurchaseModal}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-brand-dark border border-white/10 p-5 sm:p-6 shadow-xl
                       max-h-[calc(100dvh-2rem)] overflow-y-auto
                       pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold">
                  {t("modals.purchase.title")}
                </h2>
                <p className="mt-1 text-[11px] sm:text-xs text-brand-muted">
                  {t("modals.purchase.tariffLabelPrefix")} {purchaseOptions.tariffLabel} ·{" "}
                  {purchaseOptions.amount.toLocaleString("ru-RU")}{" "}
                  {purchaseOptions.currency === "EUR" ? "€" : "$"}
                </p>
              </div>

              <button
                type="button"
                onClick={closePurchaseModal}
                className="rounded-full bg-white/5 p-1 text-brand-muted hover:bg-white/10 hover:text-white transition-colors"
                aria-label={t("modals.purchase.close")}
              >
                <span className="block h-4 w-4 leading-none">✕</span>
              </button>
            </div>

            <form className="space-y-4" onSubmit={handlePurchaseSubmit}>
              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-brand-muted">
                  {t("modals.purchase.fullNameLabel")}
                </label>
                <input
                  type="text"
                  value={buyFullName}
                  onChange={(e) => setBuyFullName(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary"
                  placeholder={t("modals.purchase.fullNamePlaceholder")}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-brand-muted">
                  {t("modals.purchase.emailLabel")}
                </label>
                <input
                  type="email"
                  value={buyEmail}
                  onChange={(e) => setBuyEmail(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary"
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-brand-muted">
                  {t("modals.purchase.phoneLabel")}
                </label>

                {buyCountryIso === "OTHER" ? (
                  <div className="grid grid-cols-[0.7fr_1.3fr] gap-2">
                    <input
                      type="tel"
                      inputMode="tel"
                      value={buyCustomDial}
                      onChange={(e) => setBuyCustomDial(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary"
                      placeholder={t("modals.purchase.customDialPlaceholder")}
                    />
                    <input
                      type="tel"
                      inputMode="tel"
                      value={buyPhoneNational}
                      onChange={(e) => setBuyPhoneNational(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary"
                      placeholder={t("modals.purchase.phonePlaceholder")}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-[1fr_1.2fr] gap-2">
                    <select
                      value={buyCountryIso}
                      onChange={(e) => {
                        const iso = e.target.value;
                        const dial = countryToDial(iso);
                        setBuyCountryIso(iso);
                        setBuyDialCode(dial);
                      }}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-brand-primary"
                    >
                      {COUNTRY_OPTIONS.map((c) => (
                        <option key={c.iso} value={c.iso}>
                          {c.flag} {c.dial || c.label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="tel"
                      inputMode="tel"
                      value={buyPhoneNational}
                      onChange={(e) => setBuyPhoneNational(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary"
                      placeholder={
                        COUNTRY_OPTIONS.find((c) => c.iso === buyCountryIso)
                          ?.placeholder ?? t("modals.purchase.phonePlaceholder")
                      }
                    />
                  </div>
                )}

                {buyCountryIso === "OTHER" && (
                  <div className="mt-2">
                    <select
                      value={buyCountryIso}
                      onChange={(e) => {
                        const iso = e.target.value;
                        const dial = countryToDial(iso);
                        setBuyCountryIso(iso);
                        setBuyDialCode(dial);
                      }}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-brand-primary"
                    >
                      {COUNTRY_OPTIONS.map((c) => (
                        <option key={c.iso} value={c.iso}>
                          {c.flag} {c.dial || c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-brand-muted">
                  {t("modals.purchase.courseLabel")}
                </label>

                <div className="relative">
                  <select
                    value={buyCourse}
                    onChange={(e) => setBuyCourse(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-brand-primary/60 bg-brand-dark px-3 py-2 pr-8 text-sm text-white outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary appearance-none"
                  >
                    <option value="" disabled>
                      {t("modals.purchase.coursePlaceholder")}
                    </option>

                    {courseNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>

                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-brand-muted">
                    ▾
                  </span>
                </div>
              </div>

              <label className="flex items-start gap-2 text-[11px] sm:text-xs text-brand-muted">
                <input
                  type="checkbox"
                  checked={buyAgreed}
                  onChange={(e) => setBuyAgreed(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-white/20 bg-transparent text-brand-primary focus:ring-0"
                  required
                />
                <span>
                  {t("modals.purchase.agreeTextPrefix")}{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    className="underline decoration-dotted hover:text-white"
                  >
                    {t("modals.purchase.privacyPolicy")}
                  </a>{" "}
                  {t("modals.purchase.andPaymentTerms")}
                </span>
              </label>

              <button
                type="submit"
                disabled={isBuySubmitting || !buyAgreed}
                className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-brand-primary px-4 py-2.5 text-sm font-semibold disabled:opacity-60 disabled:pointer-events-none hover:bg-brand-primary/90 transition-colors"
              >
                {isBuySubmitting
                  ? t("modals.purchase.submitGoing")
                  : t("modals.purchase.submit")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: login */}
      {isLoginModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 p-4 sm:p-0 flex items-center justify-center"
          onClick={closeLoginModal}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-brand-dark border border-white/10 p-5 sm:p-6 shadow-xl
                       max-h-[calc(100dvh-2rem)] overflow-y-auto
                       pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold">
                  {t("modals.login.title")}
                </h2>
                <p className="mt-1 text-[11px] sm:text-xs text-brand-muted">
                  {t("modals.login.desc")}
                </p>
              </div>

              <button
                type="button"
                onClick={closeLoginModal}
                className="rounded-full bg-white/5 p-1 text-brand-muted hover:bg-white/10 hover:text-white transition-colors"
                aria-label={t("modals.login.close")}
              >
                <span className="block h-4 w-4 leading-none">✕</span>
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-brand-muted">
                  {t("modals.login.emailLabel")}
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary"
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-brand-muted">
                  {t("modals.login.passwordLabel")}
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary"
                  placeholder={t("modals.login.passwordPlaceholder")}
                />
              </div>

              {loginMessage && (
                <p className="text-[11px] sm:text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-3 py-2">
                  {loginMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoginSubmitting}
                className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-white/90 px-4 py-2.5 text-sm font-semibold text-brand-dark disabled:opacity-60 disabled:pointer-events-none hover:bg-white transition-colors"
              >
                {isLoginSubmitting
                  ? t("modals.login.submitChecking")
                  : t("modals.login.submit")}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="hidden md:block">
        {/* <ChatWidget /> */}
      </div>
    </main>
  );
}
