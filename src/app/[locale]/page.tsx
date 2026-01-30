// src/app/[locale]/page.tsx
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
import { Pricing, type PurchaseOptions, prices, PURCHASE_TARIFFS, formatPrice } from "@/components/Pricing";
import { ChatWidget } from "@/components/ChatWidget";
import { About } from "@/components/About";
import { FAQ } from "@/components/FAQ";
import { Testimonials } from "@/components/Testimonials";
import { courseNames, COURSE_TITLE_KEY } from "@/data/courses";
import { Footer } from "@/components/Footer";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";



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
  // если dial пустой/невалидный — просто вернём "как есть", валидация ниже не даст отправить
  return `${d}${n}`;
}

/**
 * БАЗОВАЯ валидация длины номера по стране (national part).
 * Это не идеальная библиотечная проверка, но решает вашу проблему:
 * "не дописал цифру / лишняя цифра" — покажем ошибку и не отправим.
 */
const PHONE_LENGTH_RULES: Record<
  string,
  { min: number; max: number }
> = {
  RU: { min: 10, max: 10 }, // +7 9xx xxx-xx-xx
  KZ: { min: 10, max: 10 }, // +7 7xx xxx xxxx
  BY: { min: 9, max: 9 }, // +375 29 xxx xx xx
  UA: { min: 9, max: 9 }, // +380 50 xxx xxxx
  AM: { min: 8, max: 8 }, // +374 77 xxx xxx
  US: { min: 10, max: 10 }, // +1 201 555 0123
  GB: { min: 10, max: 10 }, // +44 7400 000000 (без лидирующего 0)
  ES: { min: 9, max: 9 }, // +34 612 345 678
  DE: { min: 10, max: 11 }, // у DE часто 10–11 (очень упрощённо)
  FR: { min: 9, max: 9 }, // +33 6 12 34 56 78 (без лидирующего 0)
  OTHER: { min: 6, max: 15 }, // общий диапазон
};

function isLikelyValidDial(dial: string) {
  const d = dial.trim();
  if (!d) return false;
  if (!d.startsWith("+")) return false;
  return digitsOnly(d).length >= 1;
}

function validatePhoneByCountry(args: {
  iso: string;
  dial: string;
  national: string;
  locale: "ru" | "en";
}) {
  const { iso, dial, national, locale } = args;

  const texts =
    locale === "ru"
      ? {
          dialError: "Проверьте код страны (например, +34).",
          phoneError: "Проверьте номер телефона — похоже, не хватает цифр или есть лишние.",
        }
      : {
          dialError: "Please check the country code (for example, +34).",
          phoneError: "Please check your phone number — it looks incomplete or has extra digits.",
        };

  const nationalDigits = digitsOnly(national);
  const rule = PHONE_LENGTH_RULES[iso] ?? PHONE_LENGTH_RULES.OTHER;

  // Для OTHER дополнительно проверяем dial
  if (iso === "OTHER") {
    if (!isLikelyValidDial(dial)) {
      return { dialError: texts.dialError as string, phoneError: "" };
    }
  }

  if (nationalDigits.length < rule.min || nationalDigits.length > rule.max) {
    return { dialError: "", phoneError: texts.phoneError as string };
  }

  return { dialError: "", phoneError: "" };
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

type FormErrors = {
  fullName?: string;
  email?: string;
  dial?: string;
  phone?: string;
  course?: string;
};

type PurchaseModalContext = {
  preselectedCourse?: string;
  preselectedTariffId?: PurchaseOptions["tariffId"];
  currency: "EUR" | "USD" | "AMD";
  source: "pricing" | "courses" | "unknown";
};


function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function HomePage() {
  const t = useTranslations("home");
  const tErr = useTranslations("home.modals.errors");
  const tCourses = useTranslations("home.courses");
  const tPricing = useTranslations("home.pricing");
  const pathname = usePathname();
  const activeLocale: "en" | "ru" = pathname.startsWith("/ru") ? "ru" : "en";
  const site_language = activeLocale;
  const SHOW_LOGIN = false;

  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  type StrengthTestSource = "courses" | "pricing" | "unknown";
const [testContext, setTestContext] = useState<StrengthTestSource>("unknown");


  const [testCourse, setTestCourse] = useState("");
  const [testCoursePreselected, setTestCoursePreselected] = useState(false);

  const [testCountryIso, setTestCountryIso] = useState(COUNTRY_OPTIONS[0].iso);
  const [testDialCode, setTestDialCode] = useState(COUNTRY_OPTIONS[0].dial);
  const [testPhoneNational, setTestPhoneNational] = useState("");
  const [testCustomDial, setTestCustomDial] = useState("+");

  const [testFullName, setTestFullName] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testAgreed, setTestAgreed] = useState(false);
  const [isTestSubmitting, setIsTestSubmitting] = useState(false);

  const [testTriedSubmit, setTestTriedSubmit] = useState(false);
  const [testErrors, setTestErrors] = useState<FormErrors>({});

  function openPurchaseFromPricing(options: PurchaseOptions) {
    setPurchaseOptions(options);
    setActiveCurrency(options.currency);
    setPurchaseContext({
      preselectedTariffId: options.tariffId,
      preselectedCourse: selectedCourse || buyCourse || "",
      currency: options.currency,
      source: "pricing",
    });
    setIsPurchaseModalOpen(true);
    setBuyTariffId(options.tariffId);

  
    // проставим тариф/курс в локальные стейты формы
    setBuyCourse(selectedCourse || buyCourse || "");
  
    track("purchase_start", {
      site_language,
      product_type: "tariff",
      tariff_label: options.tariffLabel,
      currency: options.currency,
      value: options.amount,
      source: "pricing",
    });
  
    setBuyTriedSubmit(false);
    setBuyErrors({});
  }
  
  // ФЛОУ «Выбор курса → Шаг 1 (инфо о тесте) → Шаг 2 (оплата)»
  const [isFunnelMode, setIsFunnelMode] = useState(false);
  const [funnelStep, setFunnelStep] = useState<1 | 2>(1);
  const [funnelCourseName, setFunnelCourseName] = useState<string>("");
  const flipRef = useRef<HTMLDivElement | null>(null);
  const flipFrontRef = useRef<HTMLDivElement | null>(null);
  const flipBackRef = useRef<HTMLFormElement | null>(null);
  const [hideFrontFace, setHideFrontFace] = useState(false);
  const [hideBackFace, setHideBackFace] = useState(false);

  function openTestFlowStep1(courseName: string) {
    setSelectedCourse(courseName);
    setFunnelCourseName(courseName);
    setIsFunnelMode(true);
    setFunnelStep(1);

    // пока тариф не выбран
    setPurchaseOptions(null);
    setBuyTariffId("");

    setPurchaseContext({
      preselectedCourse: courseName,
      currency: activeCurrency,
      source: "courses",
    });

    setIsPurchaseModalOpen(true);
    setBuyCourse(courseName);

    track("strength_test_intro_open", {
      site_language,
      source: "courses",
      course_name: courseName,
    });

    setBuyTriedSubmit(false);
    setBuyErrors({});
  }  
  

  // Открыть оплату «Тест силы» из блока курсов:
  // - курс проставляем из карточки
  // - тариф сразу проставляем как 1 тренировка (review) по активной валюте
  function openStrengthTestPurchaseFromCourses(courseName: string | undefined) {
    const options: PurchaseOptions = {
      tariffId: "review",
      tariffLabel: tPricing("cards.test.tariffLabel"),
      amount: prices.review[activeCurrency].total,
      currency: activeCurrency,
    };
    setPurchaseOptions(options);
    setActiveCurrency(options.currency);
    setPurchaseContext({
      preselectedTariffId: options.tariffId,
      preselectedCourse: courseName || "",
      currency: options.currency,
      source: "courses",
    });
    setIsPurchaseModalOpen(true);
    setBuyTariffId(options.tariffId);
    setBuyCourse(courseName || "");
    track("purchase_start", {
      site_language,
      product_type: "tariff",
      tariff_label: options.tariffLabel,
      currency: options.currency,
      value: options.amount,
      source: "courses_strength_test",
      course_name: courseName || undefined,
    });
    setBuyTriedSubmit(false);
    setBuyErrors({});
  }

function openTestModal(opts?: {
  source?: "courses" | "pricing";
  course_name?: string;
}) {
  const source: StrengthTestSource = opts?.source ?? "unknown";
  const course_name = opts?.course_name;

  const course_preselected = !!course_name;

  setTestContext(source);
  setTestCoursePreselected(course_preselected);
  setTestCourse(course_name ?? "");

    setIsTestModalOpen(true);

  track("strength_test_start", {
    site_language,
    source,
    course_preselected,
    course_name: course_name || undefined,
  });

  setTestTriedSubmit(false);
  setTestErrors({});
  }

  function closeTestModal() {
    if (isTestSubmitting) return;
    setIsTestModalOpen(false);

  // опционально: сбрасывать курс/флаги при закрытии
  setTestCourse("");
  setTestCoursePreselected(false);

  setTestTriedSubmit(false);
  setTestErrors({});
}

  

  function validateTestForm(): FormErrors {
    const errs: FormErrors = {};

    if (!testFullName.trim()) errs.fullName = tErr("required");

    if (!testEmail.trim()) errs.email = tErr("required");
    else if (!isValidEmail(testEmail)) errs.email = tErr("invalidEmail");

    if (!testCoursePreselected && !testCourse) errs.course = tErr("chooseCourse");


    const dialToCheck = testCountryIso === "OTHER" ? testCustomDial : testDialCode;

    if (!digitsOnly(testPhoneNational)) {
      errs.phone = tErr("required");
    } else {
      const { dialError, phoneError } = validatePhoneByCountry({
        iso: testCountryIso,
        dial: dialToCheck,
        national: testPhoneNational,
        locale: activeLocale,
      });

      if (dialError) errs.dial = tErr("invalidDial");
      if (phoneError) errs.phone = tErr("invalidPhone");
    }

    return errs;
  }

  useEffect(() => {
    const el = document.getElementById("pricing");
    if (!el) return;

    let fired = false;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || fired) return;
        fired = true;

        const lastNavAt = (window as any).__pricingNavClickAt as number | undefined;
        const entry_point =
          lastNavAt && Date.now() - lastNavAt < 5000 ? "nav" : "scroll";

        track("pricing_view", { site_language, entry_point });
        obs.disconnect();
      },
      { threshold: 0.25 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [site_language]);


  useEffect(() => {
    if (!testTriedSubmit) return;
    setTestErrors(validateTestForm());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    testTriedSubmit,
    testFullName,
    testEmail,
    testCourse,
    testCountryIso,
    testDialCode,
    testCustomDial,
    testPhoneNational,
    activeLocale,
  ]);

  async function handleTestSubmit(e: FormEvent) {
    e.preventDefault();
    if (!testAgreed || isTestSubmitting) return;

    setTestTriedSubmit(true);

    const errs = validateTestForm();
    setTestErrors(errs);

    if (Object.keys(errs).length > 0) return;

    const dialToSend = testCountryIso === "OTHER" ? testCustomDial : testDialCode;

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
          courseName: testCourse ? testCourse : null,
        }),
      });

      if (!res.ok) {
        console.error("Ошибка отправки формы теста", await res.text());
      } else {
        track("strength_test_submit", {
          site_language,
          source: testContext ?? "unknown",
          course_name: testCourse || undefined,
        });
        
        setTestFullName("");
        setTestEmail("");
        setTestAgreed(false);
        setIsTestModalOpen(false);
        setTestCourse("");
        setTestCoursePreselected(false);
        setTestPhoneNational("");
        setTestCustomDial("+");

        // reset ошибок
        setTestTriedSubmit(false);
        setTestErrors({});
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

    const [purchaseContext, setPurchaseContext] =
  useState<PurchaseModalContext | null>(null);

// выбранный тариф внутри модалки (нужен для сценария "выбрал курс → выбери тариф")
const [buyTariffId, setBuyTariffId] =
  useState<PurchaseOptions["tariffId"] | "">("");


  const [buyFullName, setBuyFullName] = useState("");
  const [buyEmail, setBuyEmail] = useState("");
  const [activeCurrency, setActiveCurrency] =
  useState<"EUR" | "USD" | "AMD">("EUR");


  const [buyCountryIso, setBuyCountryIso] = useState(COUNTRY_OPTIONS[0].iso);
  const [buyDialCode, setBuyDialCode] = useState(COUNTRY_OPTIONS[0].dial);
  const [buyPhoneNational, setBuyPhoneNational] = useState("");
  const [buyCustomDial, setBuyCustomDial] = useState("+");

  const [buyCourse, setBuyCourse] = useState<string>("");
  const [buyAgreed, setBuyAgreed] = useState(false);
  const [isBuySubmitting, setIsBuySubmitting] = useState(false);

  const [buyTriedSubmit, setBuyTriedSubmit] = useState(false);
  const [buyErrors, setBuyErrors] = useState<FormErrors>({});

  useEffect(() => {
    const iso = guessCountryIso();
    const dial = countryToDial(iso);

    setTestCountryIso(iso);
    setTestDialCode(dial);

    setGiftCountryIso(iso);
    setGiftDialCode(dial);

    setBuyCountryIso(iso);
    setBuyDialCode(dial);
  }, []);
  // keep flip container height equal to the visible face
  useEffect(() => {
    if (!isFunnelMode) return;
    const flip = flipRef.current;
    if (!flip) return;
    const front = flipFrontRef.current;
    const back = flipBackRef.current;
    const node = funnelStep === 1 ? front : back;
    if (!node) return;
    flip.style.height = `${node.scrollHeight}px`;
  }, [isFunnelMode, funnelStep, activeCurrency]);

  useEffect(() => {
    if (!isFunnelMode) return;
    // скрываем невидимую сторону в середине анимации, чтобы убрать «призрак»
    setHideFrontFace(false);
    setHideBackFace(false);
    const timeout = setTimeout(() => {
      if (funnelStep === 2) {
        setHideFrontFace(true);
      } else {
        setHideBackFace(true);
      }
    }, 140);
    return () => clearTimeout(timeout);
  }, [isFunnelMode, funnelStep]);
  function openPurchaseModal(options: PurchaseOptions) {
    setPurchaseOptions(options);
    setIsPurchaseModalOpen(true);

    track("purchase_start", {
      site_language,
      product_type: "tariff",
      tariff_label: options.tariffLabel,
      currency: options.currency,
      value: options.amount,
    });

    // reset ошибок
    setBuyTriedSubmit(false);
    setBuyErrors({});
  }

  function closePurchaseModal() {
    if (isBuySubmitting) return;
    setIsPurchaseModalOpen(false);
    setIsFunnelMode(false);
    setFunnelStep(1);
  
    // ✅ чтобы не "прилипало" между сценариями
    setPurchaseOptions(null);
    setBuyTariffId("");
  
    setBuyTriedSubmit(false);
    setBuyErrors({});
  }
  

  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);

  function openGiftModal() {
    track("purchase_start", {
      site_language,
      product_type: "gift",
      tariff_label: "Gift Certificate", // можно и локализовать, но лучше фикс-строка
      currency: activeCurrency,
    });
    setIsGiftModalOpen(true);
  
    setGiftTriedSubmit(false);
    setGiftErrors({});
    setGiftAgreed(false);
    setGiftBuyerName("");
    setGiftRecipientName("");
    setGiftEmail("");
    setGiftAmount("");
    setGiftPhoneNational("");
    setGiftCustomDial("+");
  }
  
  function closeGiftModal() {
    if (isGiftSubmitting) return;
    setIsGiftModalOpen(false);
  
    setGiftTriedSubmit(false);
    setGiftErrors({});
  }
  

  // ---------------- GIFT FORM STATE ----------------
  const [giftBuyerName, setGiftBuyerName] = useState("");
  const [giftRecipientName, setGiftRecipientName] = useState("");
  const [giftEmail, setGiftEmail] = useState("");
  const [giftCountryIso, setGiftCountryIso] = useState(COUNTRY_OPTIONS[0].iso);
  const [giftDialCode, setGiftDialCode] = useState(COUNTRY_OPTIONS[0].dial);
  const [giftPhoneNational, setGiftPhoneNational] = useState("");
  const [giftCustomDial, setGiftCustomDial] = useState("+");

  const [giftAmount, setGiftAmount] = useState<string>("");

  const [giftAgreed, setGiftAgreed] = useState(false);
  const [isGiftSubmitting, setIsGiftSubmitting] = useState(false);

  const [giftTriedSubmit, setGiftTriedSubmit] = useState(false);
  const [giftErrors, setGiftErrors] = useState<
    FormErrors & { recipient?: string; amount?: string }
  >({});

 

  function validateBuyForm(): FormErrors {
    const errs: FormErrors = {};

    if (!buyFullName.trim()) errs.fullName = tErr("required");

    if (!buyEmail.trim()) errs.email = tErr("required");
    else if (!isValidEmail(buyEmail)) errs.email = tErr("invalidEmail");

    // Требование курса только когда модалка открыта из pricing
    if (purchaseContext?.source === "pricing" && !buyCourse) errs.course = tErr("chooseCourse");

    const dialToCheck = buyCountryIso === "OTHER" ? buyCustomDial : buyDialCode;

    if (!digitsOnly(buyPhoneNational)) {
      errs.phone = tErr("required");
    } else {
      const { dialError, phoneError } = validatePhoneByCountry({
        iso: buyCountryIso,
        dial: dialToCheck,
        national: buyPhoneNational,
        locale: activeLocale,
      });

      if (dialError) errs.dial = tErr("invalidDial");
      if (phoneError) errs.phone = tErr("invalidPhone");
    }

    return errs;
  }

  function validateGiftForm() {
    const errs: any = {};

    if (!giftBuyerName.trim()) errs.fullName = tErr("required");
    if (!giftEmail.trim()) errs.email = tErr("required");
    else if (!isValidEmail(giftEmail)) errs.email = tErr("invalidEmail");

    if (!giftRecipientName.trim()) errs.recipient = tErr("required");

    if (!giftAmount.trim()) errs.amount = tErr("required");
    else {
      const n = Number(giftAmount.replace(",", "."));
      if (!Number.isFinite(n) || n <= 0) errs.amount = activeLocale === "ru" ? "Введите корректную сумму." : "Please enter a valid amount.";
      // если хочешь минимум:
      // if (n < 10) errs.amount = activeLocale === "ru" ? "Минимальная сумма: 10." : "Minimum amount: 10.";
    }

    const dialToCheck = giftCountryIso === "OTHER" ? giftCustomDial : giftDialCode;

    if (!digitsOnly(giftPhoneNational)) {
      errs.phone = tErr("required");
    } else {
      const { dialError, phoneError } = validatePhoneByCountry({
        iso: giftCountryIso,
        dial: dialToCheck,
        national: giftPhoneNational,
        locale: activeLocale,
      });

      if (dialError) errs.dial = tErr("invalidDial");
      if (phoneError) errs.phone = tErr("invalidPhone");
    }

    return errs as FormErrors & { recipient?: string; amount?: string };
  }

  useEffect(() => {
    if (!giftTriedSubmit) return;
    setGiftErrors(validateGiftForm());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    giftTriedSubmit,
    giftBuyerName,
    giftRecipientName,
    giftEmail,
    giftAmount,
    giftCountryIso,
    giftDialCode,
    giftCustomDial,
    giftPhoneNational,
    activeLocale,
  ]);

  async function handleGiftSubmit(e: FormEvent) {
    e.preventDefault();
    if (!giftAgreed || isGiftSubmitting) return;

    setGiftTriedSubmit(true);

    const errs = validateGiftForm();
    setGiftErrors(errs);

    if (Object.keys(errs).length > 0) return;

    const dialToSend = giftCountryIso === "OTHER" ? giftCustomDial : giftDialCode;

    setIsGiftSubmitting(true);

    try {
      // ⚠️ валюта: беру ту же логику, что у тарифов.
      // Если gift всегда EUR — поставь "EUR".
      const currency: "EUR" | "USD" | "AMD" = activeCurrency;

      const res = await fetch("/api/create-gift-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale: activeLocale,
          amount: Number(giftAmount.replace(",", ".")),
          currency,

          buyerName: giftBuyerName,
          buyerEmail: giftEmail,
          buyerPhone: buildE164(dialToSend, giftPhoneNational),

          recipientName: giftRecipientName,
        }),
      });

      if (!res.ok) {
        console.error("Ошибка создания оплаты (gift)", await res.text());
        return;
      }

      const data = await res.json();
      if (data.paymentUrl) {
        track("purchase_url_created", {
          site_language,
          product_type: "gift",
          tariff_label: "Gift Certificate",
          currency,
          value: Number(giftAmount.replace(",", ".")),
          payment_id: data.paymentId,
        });
        window.location.href = data.paymentUrl;
      } else {
        console.error("paymentUrl не получен из API (gift)");
      }
    } catch (err) {
      console.error("Ошибка запроса (gift)", err);
    } finally {
      setIsGiftSubmitting(false);
    }
  }


  useEffect(() => {
    if (!buyTriedSubmit) return;
    setBuyErrors(validateBuyForm());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    buyTriedSubmit,
    buyFullName,
    buyEmail,
    buyCourse,
    buyCountryIso,
    buyDialCode,
    buyCustomDial,
    buyPhoneNational,
    activeLocale,
  ]);

  async function handlePurchaseSubmit(e: FormEvent) {
    e.preventDefault();
    if (!buyAgreed || isBuySubmitting) return;

    const selectedTariff =
  purchaseOptions ??
  (buyTariffId
    ? (() => {
        const tar = PURCHASE_TARIFFS.find((x) => x.id === buyTariffId);
        if (!tar || !purchaseContext) return null;

        const amount = prices[tar.amountKey][purchaseContext.currency].total;
        const tariffLabel = tPricing(tar.labelKey as any) || tar.id;

        return {
          tariffId: tar.id,
          tariffLabel,
          amount,
          currency: purchaseContext.currency,
        } as PurchaseOptions;
      })()
    : null);

if (!selectedTariff) {
  setBuyTriedSubmit(true);
  return;
}


    setBuyTriedSubmit(true);

    const errs = validateBuyForm();
    setBuyErrors(errs);

    if (Object.keys(errs).length > 0) return;


    const dialToSend = buyCountryIso === "OTHER" ? buyCustomDial : buyDialCode;

    setIsBuySubmitting(true);

    try {
      const res = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale: activeLocale,
          fullName: buyFullName,
          email: buyEmail,
          phone: buildE164(dialToSend, buyPhoneNational),
          courseName: buyCourse,
          tariffId: selectedTariff.tariffId,
          tariffLabel: selectedTariff.tariffLabel,
          amount: selectedTariff.amount,
          currency: selectedTariff.currency,
        }),
      });

      if (!res.ok) {
        console.error("Ошибка создания оплаты", await res.text());
      } else {
        const data = await res.json();
        if (data.paymentUrl) {
          track("purchase_url_created", {
            site_language,
            product_type: "tariff",
            tariff_label: selectedTariff.tariffLabel,
            currency: selectedTariff.currency,
            value: selectedTariff.amount,
            payment_id: data.paymentId, // важно!
          });
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
  const anyModalOpen = isTestModalOpen || isPurchaseModalOpen || isLoginModalOpen || isGiftModalOpen;

  useEffect(() => {
    if (!anyModalOpen) return;

    scrollYRef.current = window.scrollY || 0;

    const body = document.body;
    body.style.position = "fixed";
    body.style.top = `-${scrollYRef.current}px`;
    body.style.left = "0";
    body.style.right = "";
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

  // Anchor navigation: ensure /#section and /ru#section scroll correctly after hydration
  useEffect(() => {
    function scrollToHash(hash: string, behavior: ScrollBehavior = "auto") {
      if (!hash || hash === "#") return;
      const id = decodeURIComponent(hash.replace(/^#/, ""));
      const el = document.getElementById(id);
      if (!el) return;
      const html = document.documentElement;
      const prevBehavior = html.style.scrollBehavior;
      html.style.scrollBehavior = behavior;
      // do it on next frame to avoid layout race
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior });
        html.style.scrollBehavior = prevBehavior;
      });
      // late retry in case of late layout
      setTimeout(() => {
        const el2 = document.getElementById(id);
        if (el2) el2.scrollIntoView({ behavior });
      }, 180);
    }

    // initial hash on load
    if (typeof window !== "undefined" && window.location.hash) {
      scrollToHash(window.location.hash);
    }

    // respond to hash changes (client-side)
    const onHashChange = () => {
      const lastClickAt = (window as any).__anchorNavClickAt as number | undefined;
      const recentClick = lastClickAt && Date.now() - lastClickAt < 800;
      scrollToHash(window.location.hash, recentClick ? "smooth" : "auto");
      if (recentClick) (window as any).__anchorNavClickAt = 0;
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
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
              <a
                href="#how-top"
                className="hover:text-white transition-colors"
                onClick={() => {
                  (window as any).__anchorNavClickAt = Date.now();
                  track("menu_anchor_click", { site_language, anchor: "how" });
                }}
              >
                {t("header.nav.how")}
              </a>
              <a
                href="#courses-top"
                className="hover:text-white transition-colors"
                onClick={() => {
                  (window as any).__anchorNavClickAt = Date.now();
                  track("menu_anchor_click", { site_language, anchor: "courses" });
                }}
              >
                {t("header.nav.courses")}
              </a>
              <a
  href="#pricing-top"
  className="hover:text-white transition-colors"
  onClick={() => {
    (window as any).__anchorNavClickAt = Date.now();
    track("menu_pricing_click", { site_language, source: "header_menu" });
  }}
>
                {t("header.nav.pricing")}
              </a>

              <a
                href="#about-top"
                className="hover:text-white transition-colors"
                onClick={() => {
                  (window as any).__anchorNavClickAt = Date.now();
                  track("menu_anchor_click", { site_language, anchor: "about" });
                }}
              >
                {t("header.nav.about")}
              </a>
              <a
                href="#reviews-top"
                className="hover:text-white transition-colors"
                onClick={() => {
                  (window as any).__anchorNavClickAt = Date.now();
                  track("menu_anchor_click", { site_language, anchor: "reviews" });
                }}
              >
                {t("header.nav.reviews")}
              </a>
              <a
                href="#faq-top"
                className="hover:text-white transition-colors"
                onClick={() => {
                  (window as any).__anchorNavClickAt = Date.now();
                  track("menu_anchor_click", { site_language, anchor: "faq" });
                }}
              >
                {t("header.nav.faq")}
              </a>
            </nav>

            <LanguageSwitcher />

            {SHOW_LOGIN && (
            <button
              className="hidden md:inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 transition-colors"
              type="button"
              onClick={openLoginModal}
            >
              {t("header.login")}
            </button>
)}

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
                  href="#how-top"
                  className="rounded-2xl px-3 py-2 hover:bg-white/5"
                  onClick={() => setIsMobileNavOpen(false)}
                >
                  {t("header.nav.how")}
                </a>
                <a
                  href="#courses-top"
                  className="rounded-2xl px-3 py-2 hover:bg-white/5"
                  onClick={() => setIsMobileNavOpen(false)}
                >
                  {t("header.nav.courses")}
                </a>
                <a
                  href="#pricing-top"
                  className="rounded-2xl px-3 py-2 hover:bg-white/5"
  onClick={() => {
    (window as any).__pricingNavClickAt = Date.now();
    track("menu_pricing_click", { site_language, source: "header_menu" });
    setIsMobileNavOpen(false);
  }}
                >
                  {t("header.nav.pricing")}
                </a>

                <a
                  href="#about-top"
                  className="rounded-2xl px-3 py-2 hover:bg-white/5"
                  onClick={() => setIsMobileNavOpen(false)}
                >
                  {t("header.nav.about")}
                </a>
                <a
                  href="#reviews-top"
                  className="rounded-2xl px-3 py-2 hover:bg-white/5"
                  onClick={() => setIsMobileNavOpen(false)}
                >
                  {t("header.nav.reviews")}
                </a>
                <a
                  href="#faq-top"
                  className="rounded-2xl px-3 py-2 hover:bg-white/5"
                  onClick={() => setIsMobileNavOpen(false)}
                >
                  {t("header.nav.faq")}
                </a>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileNavOpen(false);
    track("mobile_menu_cta_click", { site_language, target: "courses" });
    document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="w-full rounded-full bg-brand-primary px-4 py-3 text-sm font-semibold text-white hover:bg-brand-primary/90 transition-colors"
                >
  {t("hero.ctaCourses")}
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

            <div className="pt-2">
  {/* Primary: Courses */}
              <a
                href="#courses"
    className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-brand-primary px-8 py-3 text-sm sm:text-base font-semibold text-white hover:bg-brand-primary/90 transition-colors"
    onClick={() => track("hero_cta_click", { site_language, target: "courses" })}
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
                          track("hero_card_cta_click", { site_language, target: "how" });
                          document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });
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

      <Courses onChooseCourse={openTestFlowStep1} />


      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20 lg:pb-24">
        <Pricing
  onOpenTestModal={() =>
    openTestModal({ source: "pricing" })}
    onOpenPurchaseModal={(opts) => {
      openPurchaseFromPricing(opts);
    }}
    
      onOpenGiftModal={() => openGiftModal()}
      onCurrencyChange={(c) => setActiveCurrency(c)}
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
                  className={[
                    "w-full rounded-2xl border bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary",
                    testErrors.fullName ? "border-rose-400/60" : "border-white/10",
                  ].join(" ")}
                  placeholder={t("modals.strengthTest.fullNamePlaceholder")}
                />
                {testErrors.fullName && (
                  <p className="text-[11px] sm:text-xs text-rose-300/90 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-3 py-2">
                    {testErrors.fullName}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-brand-muted">
                  {t("modals.strengthTest.emailLabel")}
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className={[
                    "w-full rounded-2xl border bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary",
                    testErrors.email ? "border-rose-400/60" : "border-white/10",
                  ].join(" ")}
                  placeholder="you@example.com"
                />
                {testErrors.email && (
                  <p className="text-[11px] sm:text-xs text-rose-300/90 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-3 py-2">
                    {testErrors.email}
                  </p>
                )}
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
                      aria-invalid={!!testErrors.dial}
                      className={[
                        "w-full rounded-2xl border bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary",
                        testErrors.dial ? "border-rose-400/60" : "border-white/10",
                      ].join(" ")}
                      placeholder={t("modals.strengthTest.customDialPlaceholder")}
                    />
                    <input
                      type="tel"
                      inputMode="tel"
                      value={testPhoneNational}
                      onChange={(e) => setTestPhoneNational(e.target.value)}
                      aria-invalid={!!testErrors.phone}
                      className={[
                        "w-full rounded-2xl border bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary",
                        testErrors.phone ? "border-rose-400/60" : "border-white/10",
                      ].join(" ")}
                      placeholder={t("modals.strengthTest.phonePlaceholderGeneric")}
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
                      aria-invalid={!!testErrors.phone}
                      className={[
                        "w-full rounded-2xl border bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary",
                        testErrors.phone ? "border-rose-400/60" : "border-white/10",
                      ].join(" ")}
                      placeholder={
                        COUNTRY_OPTIONS.find((c) => c.iso === testCountryIso)
                          ?.placeholder ?? t("modals.strengthTest.phonePlaceholderGeneric")
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

                {(testErrors.dial || testErrors.phone) && (
                  <p className="text-[11px] sm:text-xs text-rose-300/90 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-3 py-2">
                    {testErrors.dial || testErrors.phone}
                  </p>
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

              {!testCoursePreselected && (
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm text-brand-muted">
                    {t("modals.strengthTest.courseLabel")}
                  </label>

                  <div className="relative">
                    <select
                      value={testCourse}
                      onChange={(e) => {
                        const name = e.target.value;
                        setTestCourse(name);
                      
                        track("strength_test_course_select", {
                          site_language,
                          source: testContext,
                          course_name: name,
                        });                        
                      }}
                      className={[
                        "w-full rounded-2xl border bg-brand-dark px-3 py-2 pr-8 text-sm text-white outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary appearance-none",
                        testErrors.course ? "border-rose-400/60" : "border-brand-primary/60",
                      ].join(" ")}
                    >
                      <option value="" disabled>
                        {t("modals.strengthTest.coursePlaceholder")}
                      </option>

                      {courseNames.map((name) => (
                        <option key={name} value={name}>
                          {tCourses(COURSE_TITLE_KEY[name])}
                        </option>
                      ))}
                    </select>

                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-brand-muted">
                      ▾
                    </span>
                  </div>

                  {testErrors.course && (
                    <p className="text-[11px] sm:text-xs text-rose-300/90 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-3 py-2">
                      {testErrors.course}
                    </p>
                  )}
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
{isPurchaseModalOpen && purchaseContext && (
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
                {/* Заголовок/шапка зависит от шага воронки */}
                {isFunnelMode ? (
                  <>
                    <div className="text-[11px] sm:text-xs text-brand-muted">
                      {funnelStep === 1
                        ? (activeLocale === "ru" ? "Шаг 1 из 2" : "Step 1 of 2")
                        : (activeLocale === "ru" ? "Шаг 2 из 2" : "Step 2 of 2")}
                    </div>
                    <h2 className="text-lg sm:text-xl font-semibold">
                      {funnelStep === 1
                        ? t("modals.funnel.step1.title", { course: funnelCourseName })
                        : t("modals.funnel.step2.title")}
                    </h2>
                    {funnelStep === 2 ? (
                      <p className="mt-1 text-[12px] sm:text-sm text-brand-muted">
                        {t("modals.funnel.step2.subtitle", { course: funnelCourseName })}
                      </p>
                    ) : (
                      <>
                        <p className="mt-1 text-[12px] sm:text-sm text-brand-muted">
                          {t("modals.funnel.step1.subtitle")}
                        </p>
                        <ul className="mt-2 space-y-1.5 text-[12px] sm:text-sm text-brand-muted">
                          <li>• {t("modals.funnel.step1.bullets.0")}</li>
                          <li>• {t("modals.funnel.step1.bullets.1")}</li>
                          <li>• {t("modals.funnel.step1.bullets.2")}</li>
                        </ul>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[12px] sm:text-sm text-brand-muted">
                            {t("modals.funnel.step1.priceLabel")}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/15 px-2 py-1 text-[11px] text-white">
                            {formatPrice(prices.review[activeCurrency].total, activeCurrency)}
                          </span>
                          <span className="text-[11px] sm:text-xs text-brand-muted">
                            {t("modals.funnel.step1.oneTime")}
                          </span>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                <h2 className="text-lg sm:text-xl font-semibold">
                  {t("modals.purchase.title")}
                </h2>
                    {/* Тариф и цена */}
                    {(() => {
                      const selected =
                        purchaseOptions ??
                        (buyTariffId
                          ? (() => {
                              const tar = PURCHASE_TARIFFS.find((x) => x.id === buyTariffId);
                              if (!tar || !purchaseContext) return null;
                              const amount = prices[tar.amountKey][purchaseContext.currency].total;
                              const label =
                                tar.id === "review"
                                  ? tPricing("cards.test.tariffLabel")
                                  : (tPricing(tar.labelKey as any) || tar.id);
                              return {
                                tariffId: tar.id,
                                tariffLabel: label,
                                amount,
                                currency: purchaseContext.currency,
                              } as PurchaseOptions;
                            })()
                          : null);

                      if (!selected) {
                        return (
                <p className="mt-1 text-[11px] sm:text-xs text-brand-muted">
                            {activeLocale === "ru" ? "Выберите тариф" : "Choose a plan"}
                          </p>
                        );
                      }

                      return (
                        <>
                          <p className="mt-1 text-[12px] sm:text-sm text-white">
                            {selected.tariffLabel}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/15 px-2 py-1 text-[11px] text-white">
                              {formatPrice(selected.amount, selected.currency)}
                            </span>
                            <span className="text-[11px] sm:text-xs text-brand-muted">
                              {(() => {
                                const tid = (selected as any).tariffId as "review" | "short12" | "long12" | "long36" | undefined;
                                if (tid === "short12") return tPricing("cards.short12.perLabel");
                                if (tid === "long12") return tPricing("cards.bundle.long12.perLabel");
                                if (tid === "long36") return tPricing("cards.bundle.long36.perLabel");
                                return t("modals.purchase.oneTimeNote");
                              })()}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </>
                )}
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

            {/* Содержимое модалки: flip между шагами, если воронка; иначе — форма оплаты */}
            {isFunnelMode ? (
              <div>
                  {/* Front: Step 1 */}
                  {funnelStep === 1 ? (
                    <div className="space-y-4">
                      <button
                        type="button"
                        className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-brand-primary px-4 py-2.5 text-sm font-semibold hover:bg-brand-primary/90 transition-colors"
                        onClick={() => {
                          const amount = prices.review[activeCurrency].total;
                          const options: PurchaseOptions = {
                            tariffId: "review",
                            tariffLabel: tPricing("cards.test.tariffLabel"),
                            amount,
                            currency: activeCurrency,
                          };
                          setPurchaseOptions(options);
                          setBuyTariffId(options.tariffId);
                          setFunnelStep(2);
                          track("strength_test_intro_continue", {
                            site_language,
                            course_name: funnelCourseName,
                            currency: activeCurrency,
                            value: amount,
                          });
                        }}
                      >
                        {t("modals.funnel.step1.ctaSimple")}
                      </button>
                      <p className="text-[11px] sm:text-xs text-brand-muted text-center">{t("modals.funnel.step1.postCtaNote")}</p>
                    </div>
                  ) : (
            <form className="space-y-4" onSubmit={handlePurchaseSubmit}>
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          className="text-[12px] sm:text-sm text-brand-muted hover:text-white transition-colors underline decoration-dotted"
                          onClick={() => {
                            setFunnelStep(1);
                          }}
                        >
                          {t("modals.funnel.step2.back")}
                        </button>
                      </div>
              {/* выбор тарифа показываем только если пришли из Courses и тариф не предзаполнен */}
              {purchaseContext?.source === "courses" && !purchaseOptions ? (
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm text-brand-muted">
                    {activeLocale === "ru" ? "Выберите тариф" : "Choose a plan"}
                  </label>
                  <div className="space-y-2">
                    {PURCHASE_TARIFFS.filter((x) => x.id !== "review").map((tar) => {
                      const price =
                        prices[tar.amountKey][purchaseContext.currency].total;
                      const label = tPricing(tar.labelKey as any) || tar.id;
                      return (
                        <label
                          key={tar.id}
                          className={[
                            "flex items-center justify-between gap-3",
                            "w-full rounded-2xl border px-3 py-2 text-sm",
                            buyTariffId === tar.id ? "border-brand-primary bg-brand-primary/5" : "border-white/10 bg-white/5",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="tariff"
                              value={tar.id}
                              checked={buyTariffId === tar.id}
                              onChange={() => setBuyTariffId(tar.id)}
                              className="h-4 w-4 text-brand-primary focus:ring-0"
                            />
                            <span>{label}</span>
                          </div>
                          <span className="text-white/90">
                            {formatPrice(
                              price,
                              purchaseContext.currency
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {buyTriedSubmit && !buyTariffId ? (
                    <p className="text-[11px] sm:text-xs text-rose-300/90 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-3 py-2">
                      {activeLocale === "ru" ? "Выберите тариф." : "Please choose a plan."}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-brand-muted">
                  {t("modals.purchase.fullNameLabel")}
                </label>
                <input
                  type="text"
                  value={buyFullName}
                  onChange={(e) => setBuyFullName(e.target.value)}
                  className={[
                    "w-full rounded-2xl border bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary",
                    buyErrors.fullName ? "border-rose-400/60" : "border-white/10",
                  ].join(" ")}
                  placeholder={t("modals.purchase.fullNamePlaceholder")}
                />
                {buyErrors.fullName && (
                  <p className="text-[11px] sm:text-xs text-rose-300/90 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-3 py-2">
                    {buyErrors.fullName}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-brand-muted">
                  {t("modals.purchase.emailLabel")}
                </label>
                <input
                  type="email"
                  value={buyEmail}
                  onChange={(e) => setBuyEmail(e.target.value)}
                  className={[
                    "w-full rounded-2xl border bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary",
                    buyErrors.email ? "border-rose-400/60" : "border-white/10",
                  ].join(" ")}
                  placeholder="you@example.com"
                />
                {buyErrors.email && (
                  <p className="text-[11px] sm:text-xs text-rose-300/90 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-3 py-2">
                    {buyErrors.email}
                  </p>
                )}
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
                      aria-invalid={!!buyErrors.dial}
                      className={[
                        "w-full rounded-2xl border bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary",
                        buyErrors.dial ? "border-rose-400/60" : "border-white/10",
                      ].join(" ")}
                      placeholder={t("modals.strengthTest.customDialPlaceholder")}
                    />
                    <input
                      type="tel"
                      inputMode="tel"
                      value={buyPhoneNational}
                      onChange={(e) => setBuyPhoneNational(e.target.value)}
                      aria-invalid={!!buyErrors.phone}
                      className={[
                        "w-full rounded-2xl border bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary",
                        buyErrors.phone ? "border-rose-400/60" : "border-white/10",
                      ].join(" ")}
                      placeholder={t("modals.strengthTest.phonePlaceholderGeneric")}
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
                      aria-invalid={!!buyErrors.phone}
                      className={[
                        "w-full rounded-2xl border bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary",
                        buyErrors.phone ? "border-rose-400/60" : "border-white/10",
                      ].join(" ")}
                      placeholder={
                        COUNTRY_OPTIONS.find((c) => c.iso === buyCountryIso)
                          ?.placeholder ?? t("modals.strengthTest.phonePlaceholderGeneric")
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

                {(buyErrors.dial || buyErrors.phone) && (
                  <p className="text-[11px] sm:text-xs text-rose-300/90 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-3 py-2">
                    {buyErrors.dial || buyErrors.phone}
                  </p>
                )}
              </div>

              {/* выбор курса показываем только если пришли из Pricing */}
              {purchaseContext?.source === "pricing" ? (
              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-brand-muted">
                  {t("modals.purchase.courseLabel")}
                </label>

                <div className="relative">
                  <select
                    value={buyCourse}
                    onChange={(e) => setBuyCourse(e.target.value)}
                      className={[
                        "w-full rounded-2xl border bg-brand-dark px-3 py-2 pr-8 text-sm text-white outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary appearance-none",
                        buyErrors.course ? "border-rose-400/60" : "border-brand-primary/60",
                      ].join(" ")}
                  >
                    <option value="" disabled>
                      {t("modals.purchase.coursePlaceholder")}
                    </option>

                    {courseNames.map((name) => (
                      <option key={name} value={name}>
                          {tCourses(COURSE_TITLE_KEY[name])}
                      </option>
                    ))}
                  </select>

                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-brand-muted">
                    ▾
                  </span>
                </div>

                  {buyErrors.course && (
                    <p className="text-[11px] sm:text-xs text-rose-300/90 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-3 py-2">
                      {buyErrors.course}
                    </p>
                  )}
              </div>
              ) : null}

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
                {(() => {
                  if (isBuySubmitting) return t("modals.purchase.submitGoing");
                  const selected =
                    purchaseOptions ??
                    (buyTariffId
                      ? (() => {
                          const tar = PURCHASE_TARIFFS.find((x) => x.id === buyTariffId);
                          if (!tar || !purchaseContext) return null;
                          const amount = prices[tar.amountKey][purchaseContext.currency].total;
                          return {
                            amount,
                            currency: purchaseContext.currency,
                          } as { amount: number; currency: "EUR" | "USD" | "AMD" };
                        })()
                      : null);
                  if (!selected) return t("modals.purchase.submit");
                  const amt = formatPrice(selected.amount, selected.currency);
                  return t("modals.purchase.submitWithAmount", { amount: amt });
                })()}
              </button>
            </form>
                  )}
              </div>
            ) : (
            <form className="space-y-4" onSubmit={handlePurchaseSubmit}>
              {purchaseContext?.source === "courses" && !purchaseOptions ? (
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm text-brand-muted">
                    {activeLocale === "ru" ? "Выберите тариф" : "Choose a plan"}
                  </label>
                  <div className="space-y-2">
                    {PURCHASE_TARIFFS.filter((x) => x.id !== "review").map((tar) => {
                      const price =
                        prices[tar.amountKey][purchaseContext.currency].total;
                      const label = tPricing(tar.labelKey as any) || tar.id;
                      return (
                        <label
                          key={tar.id}
                          className={[
                            "flex items-center justify-between gap-3",
                            "w-full rounded-2xl border px-3 py-2 text-sm",
                            buyTariffId === tar.id ? "border-brand-primary bg-brand-primary/5" : "border-white/10 bg-white/5",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="tariff"
                              value={tar.id}
                              checked={buyTariffId === tar.id}
                              onChange={() => setBuyTariffId(tar.id)}
                              className="h-4 w-4 text-brand-primary focus:ring-0"
                            />
                            <span>{label}</span>
                          </div>
                          <span className="text-white/90">
                            {formatPrice(
                              price,
                              purchaseContext.currency
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {buyTriedSubmit && !buyTariffId ? (
                    <p className="text-[11px] sm:text-xs text-rose-300/90 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-3 py-2">
                      {activeLocale === "ru" ? "Выберите тариф." : "Please choose a plan."}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-brand-muted">
                  {t("modals.purchase.fullNameLabel")}
                </label>
                <input
                  type="text"
                  value={buyFullName}
                  onChange={(e) => setBuyFullName(e.target.value)}
                  className={[
                    "w-full rounded-2xl border bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary",
                    buyErrors.fullName ? "border-rose-400/60" : "border-white/10",
                  ].join(" ")}
                  placeholder={t("modals.purchase.fullNamePlaceholder")}
                />
                {buyErrors.fullName && (
                  <p className="text-[11px] sm:text-xs text-rose-300/90 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-3 py-2">
                    {buyErrors.fullName}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-brand-muted">
                  {t("modals.purchase.emailLabel")}
                </label>
                <input
                  type="email"
                  value={buyEmail}
                  onChange={(e) => setBuyEmail(e.target.value)}
                  className={[
                    "w-full rounded-2xl border bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary",
                    buyErrors.email ? "border-rose-400/60" : "border-white/10",
                  ].join(" ")}
                  placeholder="you@example.com"
                />
                {buyErrors.email && (
                  <p className="text-[11px] sm:text-xs text-rose-300/90 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-3 py-2">
                    {buyErrors.email}
                  </p>
                )}
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
                      aria-invalid={!!buyErrors.dial}
                      className={[
                        "w-full rounded-2xl border bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary",
                        buyErrors.dial ? "border-rose-400/60" : "border-white/10",
                      ].join(" ")}
                      placeholder={t("modals.strengthTest.customDialPlaceholder")}
                    />
                    <input
                      type="tel"
                      inputMode="tel"
                      value={buyPhoneNational}
                      onChange={(e) => setBuyPhoneNational(e.target.value)}
                      aria-invalid={!!buyErrors.phone}
                      className={[
                        "w-full rounded-2xl border bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary",
                        buyErrors.phone ? "border-rose-400/60" : "border-white/10",
                      ].join(" ")}
                      placeholder={t("modals.strengthTest.phonePlaceholderGeneric")}
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
                      aria-invalid={!!buyErrors.phone}
                      className={[
                        "w-full rounded-2xl border bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary",
                        buyErrors.phone ? "border-rose-400/60" : "border-white/10",
                      ].join(" ")}
                      placeholder={
                        COUNTRY_OPTIONS.find((c) => c.iso === buyCountryIso)
                          ?.placeholder ?? t("modals.strengthTest.phonePlaceholderGeneric")
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

                {(buyErrors.dial || buyErrors.phone) && (
                  <p className="text-[11px] sm:text-xs text-rose-300/90 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-3 py-2">
                    {buyErrors.dial || buyErrors.phone}
                  </p>
                )}
              </div>

              {/* выбор курса показываем только если пришли из Pricing */}
              {purchaseContext?.source === "pricing" ? (
              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-brand-muted">
                  {t("modals.purchase.courseLabel")}
                </label>

                <div className="relative">
                  <select
                    value={buyCourse}
                    onChange={(e) => setBuyCourse(e.target.value)}
                      className={[
                        "w-full rounded-2xl border bg-brand-dark px-3 py-2 pr-8 text-sm text-white outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary appearance-none",
                        buyErrors.course ? "border-rose-400/60" : "border-brand-primary/60",
                      ].join(" ")}
                  >
                    <option value="" disabled>
                      {t("modals.purchase.coursePlaceholder")}
                    </option>

                    {courseNames.map((name) => (
                      <option key={name} value={name}>
                          {tCourses(COURSE_TITLE_KEY[name])}
                      </option>
                    ))}
                  </select>

                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-brand-muted">
                    ▾
                  </span>
                </div>

                  {buyErrors.course && (
                    <p className="text-[11px] sm:text-xs text-rose-300/90 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-3 py-2">
                      {buyErrors.course}
                    </p>
                  )}
              </div>
              ) : null}

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
                {(() => {
                  if (isBuySubmitting) return t("modals.purchase.submitGoing");
                  const selected =
                    purchaseOptions ??
                    (buyTariffId
                      ? (() => {
                          const tar = PURCHASE_TARIFFS.find((x) => x.id === buyTariffId);
                          if (!tar || !purchaseContext) return null;
                          const amount = prices[tar.amountKey][purchaseContext.currency].total;
                          return {
                            amount,
                            currency: purchaseContext.currency,
                          } as { amount: number; currency: "EUR" | "USD" | "AMD" };
                        })()
                      : null);
                  if (!selected) return t("modals.purchase.submit");
                  const amt = formatPrice(selected.amount, selected.currency);
                  return t("modals.purchase.submitWithAmount", { amount: amt });
                })()}
              </button>
            </form>
            )}
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

      {/* MODAL: gift */}
      {isGiftModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 p-4 sm:p-0 flex items-center justify-center"
          onClick={closeGiftModal}
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
                {activeLocale === "ru" ? `Сумма (${activeCurrency})` : `Amount (${activeCurrency})`}
                </h2>
                <p className="mt-1 text-[11px] sm:text-xs text-brand-muted">
                  {activeLocale === "ru"
                    ? "Укажите данные плательщика и имя получателя. Сумму можно выбрать самостоятельно."
                    : "Enter payer details and recipient name. You can choose any amount."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeGiftModal}
                className="rounded-full bg-white/5 p-1 text-brand-muted hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Close"
              >
                <span className="block h-4 w-4 leading-none">✕</span>
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleGiftSubmit}>
              {/* buyer name */}
              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-brand-muted">
                  {activeLocale === "ru" ? "Ваше имя" : "Your name"}
                </label>
                <input
                  type="text"
                  value={giftBuyerName}
                  onChange={(e) => setGiftBuyerName(e.target.value)}
                  className={[
                    "w-full rounded-2xl border bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary",
                    giftErrors.fullName ? "border-rose-400/60" : "border-white/10",
                  ].join(" ")}
                />
                {giftErrors.fullName && (
                  <p className="text-[11px] sm:text-xs text-rose-300/90 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-3 py-2">
                    {giftErrors.fullName}
                  </p>
                )}
              </div>

              {/* recipient name */}
              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-brand-muted">
                  {activeLocale === "ru" ? "Имя получателя" : "Recipient name"}
                </label>
                <input
                  type="text"
                  value={giftRecipientName}
                  onChange={(e) => setGiftRecipientName(e.target.value)}
                  className={[
                    "w-full rounded-2xl border bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary",
                    (giftErrors as any).recipient ? "border-rose-400/60" : "border-white/10",
                  ].join(" ")}
                />
                {(giftErrors as any).recipient && (
                  <p className="text-[11px] sm:text-xs text-rose-300/90 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-3 py-2">
                    {(giftErrors as any).recipient}
                  </p>
                )}
              </div>

              {/* email */}
              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-brand-muted">
                  {activeLocale === "ru" ? "Email" : "Email"}
                </label>
                <input
                  type="email"
                  value={giftEmail}
                  onChange={(e) => setGiftEmail(e.target.value)}
                  className={[
                    "w-full rounded-2xl border bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary",
                    giftErrors.email ? "border-rose-400/60" : "border-white/10",
                  ].join(" ")}
                  placeholder="you@example.com"
                />
                {giftErrors.email && (
                  <p className="text-[11px] sm:text-xs text-rose-300/90 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-3 py-2">
                    {giftErrors.email}
                  </p>
                )}
              </div>

              {/* phone */}
              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-brand-muted">
                  {activeLocale === "ru" ? "Телефон" : "Phone"}
                </label>

                {giftCountryIso === "OTHER" ? (
                  <div className="grid grid-cols-[0.7fr_1.3fr] gap-2">
                    <input
                      type="tel"
                      inputMode="tel"
                      value={giftCustomDial}
                      onChange={(e) => setGiftCustomDial(e.target.value)}
                      aria-invalid={!!giftErrors.dial}
                      className={[
                        "w-full rounded-2xl border bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary",
                        giftErrors.dial ? "border-rose-400/60" : "border-white/10",
                      ].join(" ")}
                      placeholder={activeLocale === "ru" ? "Код (+34)" : "Code (+34)"}
                    />
                    <input
                      type="tel"
                      inputMode="tel"
                      value={giftPhoneNational}
                      onChange={(e) => setGiftPhoneNational(e.target.value)}
                      aria-invalid={!!giftErrors.phone}
                      className={[
                        "w-full rounded-2xl border bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary",
                        giftErrors.phone ? "border-rose-400/60" : "border-white/10",
                      ].join(" ")}
                      placeholder={activeLocale === "ru" ? "Номер" : "Number"}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-[1fr_1.2fr] gap-2">
                    <select
                      value={giftCountryIso}
                      onChange={(e) => {
                        const iso = e.target.value;
                        const dial = countryToDial(iso);
                        setGiftCountryIso(iso);
                        setGiftDialCode(dial);
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
                      value={giftPhoneNational}
                      onChange={(e) => setGiftPhoneNational(e.target.value)}
                      aria-invalid={!!giftErrors.phone}
                      className={[
                        "w-full rounded-2xl border bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary",
                        giftErrors.phone ? "border-rose-400/60" : "border-white/10",
                      ].join(" ")}
                      placeholder={
                        COUNTRY_OPTIONS.find((c) => c.iso === giftCountryIso)?.placeholder ??
                        (activeLocale === "ru" ? "Введите номер" : "Enter phone")
                      }
                    />
                  </div>
                )}

                {(giftErrors.dial || giftErrors.phone) && (
                  <p className="text-[11px] sm:text-xs text-rose-300/90 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-3 py-2">
                    {giftErrors.dial || giftErrors.phone}
                  </p>
                )}
              </div>

              {/* amount */}
              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-brand-muted">
                {activeLocale === "ru" ? `Сумма (${activeCurrency})` : `Amount (${activeCurrency})`}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={giftAmount}
                  onChange={(e) => setGiftAmount(e.target.value)}
                  className={[
                    "w-full rounded-2xl border bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-primary",
                    (giftErrors as any).amount ? "border-rose-400/60" : "border-white/10",
                  ].join(" ")}
                  placeholder={activeLocale === "ru" ? "Например, 50" : "e.g., 50"}
                />
                {(giftErrors as any).amount && (
                  <p className="text-[11px] sm:text-xs text-rose-300/90 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-3 py-2">
                    {(giftErrors as any).amount}
                  </p>
                )}
              </div>

              {/* agree */}
              <label className="flex items-start gap-2 text-[11px] sm:text-xs text-brand-muted">
                <input
                  type="checkbox"
                  checked={giftAgreed}
                  onChange={(e) => setGiftAgreed(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-white/20 bg-transparent text-brand-primary focus:ring-0"
                  required
                />
                <span>
                  {activeLocale === "ru" ? "Я согласен(на) с " : "I agree with "}
                  <a
                    href="/privacy"
                    target="_blank"
                    className="underline decoration-dotted hover:text-white"
                  >
                    {activeLocale === "ru" ? "политикой конфиденциальности" : "privacy policy"}
                  </a>
                  .
                </span>
              </label>

              <button
                type="submit"
                disabled={isGiftSubmitting || !giftAgreed}
                className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-brand-primary px-4 py-2.5 text-sm font-semibold disabled:opacity-60 disabled:pointer-events-none hover:bg-brand-primary/90 transition-colors"
              >
                {isGiftSubmitting
                  ? activeLocale === "ru"
                    ? "Переходим к оплате…"
                    : "Redirecting…"
                  : activeLocale === "ru"
                  ? "Оплатить сертификат"
                  : "Pay for gift"}
              </button>
            </form>
          </div>
        </div>
      )}



    </main>
  );
}
