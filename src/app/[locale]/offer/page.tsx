// src/app/[locale]/offer/page.tsx
import Link from "next/link";

const LOCALES = ["en", "ru"] as const;
type Locale = (typeof LOCALES)[number];

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes((value as unknown) as Locale);
}

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

type RouteParams = { locale: string };
type OfferPageProps = { params: Promise<RouteParams> };

export default async function OfferPage(props: OfferPageProps) {
  const { locale } = await props.params;
  const raw = (locale ?? "en").toLowerCase();
  const safeLocale: Locale = isLocale(raw) ? (raw as Locale) : "en";

  const homeHref = safeLocale === "ru" ? "/ru" : "/";
  const metaLabel = safeLocale === "ru" ? "Документ" : "Document";
  const titleLabel = safeLocale === "ru" ? "Публичная оферта" : "Public Offer";
  const backLabel = safeLocale === "ru" ? "← На главную" : "← Back to home";

  if (safeLocale === "en") {
    return (
      <main className="min-h-screen bg-brand-dark text-white">
        <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <header className="mb-8 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[11px] sm:text-xs text-brand-muted/80 uppercase tracking-wide">
                {metaLabel}
              </p>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                {titleLabel}
              </h1>
            </div>
            <Link
              href={homeHref}
              className="text-[11px] sm:text-xs text-brand-muted hover:text-white transition-colors underline underline-offset-4 decoration-dotted"
            >
              {backLabel}
            </Link>
          </header>

          {/* English translation (convenience version; Russian original prevails) */}
          <section className="rounded-3xl border border-white/10 bg-black/30 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 text-[13px] sm:text-sm leading-relaxed text-brand-muted space-y-4">
            <p className="italic text-brand-muted/80">
              This English version of the Public Offer is provided for convenience. In case of any
              discrepancies, the original Russian version shall prevail.
            </p>

            <p>
              This document is a public offer (the “Offer”) issued by Individual Entrepreneur
              Ambartsumyan Sirvard Sergeevna (Tax ID: 26913722, hereinafter the “Provider”),
              addressed to any individual or legal entity (the “Customer”) to conclude a services
              agreement for organizing and delivering online physical training, wellness and other
              services within the IDC School project, information about which is published on the
              website{" "}
              <a
                href="https://idocalisthenics.com/"
                target="_blank"
                rel="noreferrer"
                className="text-white underline decoration-dotted"
              >
                https://idocalisthenics.com/
              </a>
              .
            </p>

            <p>
              In its activities, the Provider is guided by the applicable laws, including the Civil
              Code provisions on retail sale and consumer protection legislation, as well as other
              applicable regulations.
            </p>

            <p>
              The terms of this Offer may be unilaterally amended by the Provider without prior
              notice. The updated version takes effect upon publication on the website. The current
              version is available at{" "}
              <a
                href="https://idocalisthenics.com/offer"
                target="_blank"
                rel="noreferrer"
                className="text-white underline decoration-dotted"
              >
                https://idocalisthenics.com/offer
              </a>
              .
            </p>

            <p>
              This Offer contains all material terms of the services agreement for organizing and
              delivering physical training, wellness and sports events, and defines the procedure
              for their provision.
            </p>

            <h2 className="mt-4 text-base sm:text-lg font-semibold text-white">
              1. TERMS AND DEFINITIONS
            </h2>
            <p>For the purposes of this Offer, unless the context requires otherwise:</p>
            <ol className="list-decimal list-inside space-y-1 ml-1">
              <li>
                <span className="font-semibold">Offer</span> means this public offer by the
                Provider to conclude a services agreement with an indefinite circle of persons for
                organizing and delivering physical training, wellness and sports events.
              </li>
              <li>
                <span className="font-semibold">Agreement</span> means the Offer accepted by the
                Customer.
              </li>
              <li>
                <span className="font-semibold">Acceptance</span> means the Customer’s full and
                unconditional consent to the terms of the Offer, including (without limitation):
                <ul className="list-disc list-inside ml-4 space-y-1 mt-1">
                  <li>registration on the Website;</li>
                  <li>placing an Order on the Website without registration;</li>
                  <li>placing an Order via a chat-bot;</li>
                  <li>placing an Order via other communication channels of the Provider;</li>
                  <li>payment for the Services.</li>
                </ul>
              </li>
              <li>
                <span className="font-semibold">Customer</span> means any individual or legal
                entity with legal capacity expressing a will to conclude an Agreement for the
                provision of Services by the Provider remotely.
              </li>
              <li>
                <span className="font-semibold">Provider</span> means Individual Entrepreneur
                Ambartsumyan Sirvard Sergeevna.
              </li>
              <li>
                <span className="font-semibold">Services</span> means services provided by the
                Provider in organizing and delivering physical training, wellness and sports
                activities, information about which is published on the Website and/or in the
                chat-bot.
              </li>
              <li>
                <span className="font-semibold">Website</span> means the Provider’s website at{" "}
                <a
                  href="https://idocalisthenics.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white underline decoration-dotted"
                >
                  https://idocalisthenics.com
                </a>
                , intended for informing about Services and concluding the Agreement remotely based
                on the Customer’s review of the information provided by the Provider and on the
                terms of this Offer.
              </li>
              <li>
                <span className="font-semibold">Order</span> means a request by the Customer, made
                via the Website and/or the chat-bot, to receive the Services.
              </li>
              <li>
                <span className="font-semibold">Training Program</span> means the Customer’s
                training program chosen on the Website or in the chat-bot when placing an Order,
                containing information on the types, volume, cost and term of the Services.
              </li>
              <li>
                <span className="font-semibold">Software</span> means the mobile application
                through which the Provider may deliver the Services.
              </li>
              <li>
                <span className="font-semibold">Personal Account</span> means the chat-bot section
                reflecting information about the Customer and the Training Program.
              </li>
              <li>
                <span className="font-semibold">Personal Data</span> means any information relating
                to an identified or identifiable individual (the Customer) voluntarily provided
                during registration on the Website or use of the Website/chat-bot for placing an
                Order.
              </li>
            </ol>

            <h2 className="mt-4 text-base sm:text-lg font-semibold text-white">
              2. SUBJECT OF THE AGREEMENT
            </h2>
            <p>
              The Provider undertakes to provide, and the Customer undertakes to pay for, the
              Services on the terms of this Offer and in accordance with the Training Program
              chosen by the Customer. The Services may be rendered at a physical facility (the
              “Club”) or remotely via the Software, as specified in the Training Program and/or
              Personal Account.
            </p>

            <h2 className="mt-4 text-base sm:text-lg font-semibold text-white">3. RIGHTS AND OBLIGATIONS</h2>
            <p className="font-semibold text-white mt-2">Provider undertakes, among other things:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>to ensure proper quality of the Services;</li>
              <li>
                to maintain equipment necessary to render the Services at the Club (if applicable).
              </li>
            </ul>
            <p className="font-semibold text-white mt-2">Provider may, among other things:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>provide Services per this Offer and Club Rules; revise them unilaterally;</li>
              <li>set the list and prices of additional services;</li>
              <li>
                amend schedules, rules, opening hours, replace staff; the Customer tracks changes;
              </li>
              <li>refuse Services in absence of identity documents; engage third parties; assign rights;</li>
              <li>
                suspend/limit Services in emergencies/force majeure; introduce safety photo/video
                recording without collecting extra personal info;
              </li>
              <li>
                process personal data and use the Software to organize Orders, payments,
                notifications, and other purposes consistent with this Offer and applicable law.
              </li>
            </ul>

            <p className="font-semibold text-white mt-3">Customer undertakes, among other things:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>to pay for the Services and comply with this Offer and the Club Rules;</li>
              <li>to safeguard the Club’s property;</li>
              <li>to inform the Provider about health conditions that may affect training safety;</li>
              <li>to use designated storage areas while at the Club;</li>
              <li>to provide identity documents when required to access the Services.</li>
            </ul>

            <h2 className="mt-4 text-base sm:text-lg font-semibold text-white">4. FEES AND PAYMENTS</h2>
            <p>
              Unless otherwise stated, the Services are paid in advance at 100% prior to the start
              of the relevant Service period. Prices include applicable taxes and are published on
              the Website and/or in the chat-bot. The payment date is the date funds are credited
              to the Provider’s bank account.
            </p>

            <h2 className="mt-4 text-base sm:text-lg font-semibold text-white">5. LIABILITY</h2>
            <p>
              The Customer is liable for any damage caused to the Provider. The Provider is not
              liable in cases specified by law and this Offer, including (without limitation) for
              loss/damage to personal belongings, deterioration of health due to reasons beyond the
              Provider’s control, technical maintenance downtime, and other cases provided by the
              Club Rules and applicable law.
            </p>

            <h2 className="mt-4 text-base sm:text-lg font-semibold text-white">6. REFUNDS</h2>
            <p>
              Refunds (including for early termination) are made pursuant to this Offer and
              applicable law, generally within 10 (ten) days from the Provider’s receipt of a proper
              written request and required documents, by non-cash transfer to the same card/account
              used for payment. Cash refunds are not provided for non-cash payments.
            </p>

            <h2 className="mt-4 text-base sm:text-lg font-semibold text-white">7. MISCELLANEOUS</h2>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>
                The Customer is responsible for accuracy of data and must promptly inform the
                Provider of any changes.
              </li>
              <li>
                If the Customer does not declare refusal before the end of the Service period, the
                Services are deemed duly rendered in full, regardless of actual attendance.
              </li>
              <li>
                The Provider may notify via publication on the Website, email, phone/SMS, or
                messages in the Personal Account.
              </li>
              <li>
                Disputes: negotiations first; if unresolved — court per applicable law. The Offer
                is effective upon publication at{" "}
                <a
                  href="https://idocalisthenics.com/offer"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white underline decoration-dotted"
                >
                  https://idocalisthenics.com/offer
                </a>{" "}
                and remains in force until revoked.
              </li>
              <li>
                Acceptance includes, among other things: advance/partial payment; registration on
                the Website or chat-bot; booking of services; actual use of the Services.
              </li>
            </ul>
            {/* Expanded details to match RU text */}
            <p className="mt-2">
              Additionally, notifications/changes by the Provider are deemed duly made and effective upon: publication on the Website; sending to the Customer’s email; voice/SMS to the phone number provided; messages in the Personal Account; or any other method stated by the Provider. If contact details were not updated by the Customer before sending, the Customer is deemed duly notified at the time of sending.
            </p>
            <p>
              Written statements addressed to the Provider are deemed duly executed and received if they: contain the Customer’s full name, phone and email; are made on paper; contain the data subject’s signature; are delivered to the place of rendering Services and/or to the Provider’s registered address, or are sent via the Personal Account (if technically available) with required documents attached. The Provider may leave without consideration and/or refuse requests not complying with these requirements or containing corrections.
            </p>
            <p>
              Disputes are resolved by negotiations; failing that — in court per applicable law. The Offer is effective upon publication at https://idocalisthenics.com/offer and remains in force until revoked. Full and unconditional acceptance includes one of the following actions: payment (advance/full/partial) or receipt of a payment direction; registration on the Website; registration in the chat-bot; booking services; actual use of the Services and/or additional services; payment for the Services.
            </p>
          </section>
        </div>
      </main>
    );
  }

  // Russian original content (single-file, same route logic as consent)
  return (
    <main className="min-h-screen bg-brand-dark text-white">
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] sm:text-xs text-brand-muted/80 uppercase tracking-wide">
              {metaLabel}
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {titleLabel}
            </h1>
          </div>
          <Link
            href={homeHref}
            className="text-[11px] sm:text-xs text-brand-muted hover:text-white transition-colors underline underline-offset-4 decoration-dotted"
          >
            {backLabel}
          </Link>
        </header>

        {/* Тело оферты — исходный русский текст из прежнего `src/app/offer/page.tsx` */}
        <section className="rounded-3xl border border-white/10 bg-black/30 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 text-[13px] sm:text-sm leading-relaxed text-brand-muted space-y-4">
          <p>
            Настоящий документ является публичной офертой Индивидуального
            предпринимателя Амбарцумяна Сирварда Сергеевна{" "}
            (ИНН: 26913722; далее по тексту –
            «Исполнитель»), содержащей предложение о заключении с физическим
            или юридическим лицом (далее по тексту – «Получатель услуг»)
            договора оказания услуг по организации и проведению
            онлайн физкультурных, физкультурно-оздоровительных и иных услуг в рамках проекта IDC School,
            информация о которых размещена на сайте{" "}
            <a
              href="https://idocalisthenics.com/"
              target="_blank"
              rel="noreferrer"
              className="text-white underline decoration-dotted"
            >
              https://idocalisthenics.com/
            </a>{" "}
            .
          </p>

          <p>
            В своей деятельности Исполнитель руководствуется положениями
            Гражданского кодекса РА о розничной купле-продаже,
            Законом РА «О защите прав потребителей» и
            иными правовыми актами РА.
          </p>

          <p>
            Условия настоящей оферты могут быть изменены Исполнителем в
            одностороннем порядке без предварительного уведомления, новая
            редакция условий вступает в силу с момента её размещения на
            сайте. Действующая редакция условий находится на интернет-странице
            по адресу:{" "}
            <a
              href="https://idocalisthenics.com/offer"
              target="_blank"
              rel="noreferrer"
              className="text-white underline decoration-dotted"
            >
              https://idocalisthenics.com/offer
            </a>
            .
          </p>

          <p>
            Условия настоящей оферты содержат все существенные условия договора
            оказания услуг по организации и проведению физкультурных,
            физкультурно-оздоровительных, спортивных мероприятий и порядок
            их исполнения.
          </p>

          {/* Полный текст оферты (RU) */}

          {/* 1. ТЕРМИНЫ И ОПРЕДЕЛЕНИЯ */}
          <h2 className="mt-4 text-base sm:text-lg font-semibold text-white">
            1. ТЕРМИНЫ И ОПРЕДЕЛЕНИЯ
          </h2>
          <p>
            Для целей, предусмотренных настоящей офертой, если из контекста
            не вытекает иное, под терминами, использованными в тексте
            оферты, понимается следующее:
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-1">
            <li>
              Оферта – предложение Исполнителя, адресованное неограниченному
              кругу физических и юридических лиц заключить договор оказания
              услуг по организации и проведению физкультурных,
              физкультурно-оздоровительных, спортивных мероприятий.
            </li>
            <li>
              Соглашение – акцептованные Получателем услуг условия настоящей
              оферты.
            </li>
            <li>
              Акцепт – принятие Получателем услуг условий настоящей оферты,
              означает полное и безоговорочное согласие с её условиями, в
              том числе:
              <ul className="list-disc list-inside ml-4 space-y-1 mt-1">
                <li>регистрация на Сайте;</li>
                <li>оформление Заказа на Сайте без регистрации;</li>
                <li>оформление Заказа в чат-боте;</li>
                <li>оформление Заказа по иным средствам связи Исполнителя;</li>
                <li>оплата Услуг.</li>
              </ul>
            </li>
            <li>
              Получатель услуг – любое физическое или юридическое лицо из
              неограниченного круга лиц, обладающее правосубъектностью и
              изъявившее желание заключить с Исполнителем договор оказания
              услуг по организации и проведению физкультурных,
              физкультурно-оздоровительных, спортивных мероприятий
              дистанционным способом.
            </li>
            <li>
              Исполнитель – Индивидуальный предприниматель Амбарцумян Сирвард Сергеевна.
            </li>
            <li>
              Услуги – оказываемые Исполнителем услуги по организации и
              проведению физкультурных, физкультурно-оздоровительных,
              спортивных мероприятий, информация о которых размещена на
              Сайте и/или в Чат-боте.
            </li>
            <li>
              Сайт – сайт Исполнителя, расположенный в сети Интернет по
              адресу{" "}
              <a
                href="https://idocalisthenics.com/"
                target="_blank"
                rel="noreferrer"
                className="text-white underline decoration-dotted"
              >
                https://idocalisthenics.com
              </a>
              , предназначенный для информирования об услугах и заключения
              договоров оказания услуг дистанционным способом на основании
              ознакомления Получателя услуг с предложенным Исполнителем
              описанием и на условиях настоящей оферты.
            </li>
            {/* <li>
              Чат-бот – автоматизированный многофункциональный помощник,
              размещенный в мессенджере Телеграм по адресу{" "}
              <a
                href="https://t.me/idcmain_bot"
                target="_blank"
                rel="noreferrer"
                className="text-white underline decoration-dotted"
              >
                https://t.me/idcmain_bot
              </a>
              , который может показывать информацию пользователям, а также
              собирать информацию, в том числе Заказы.
            </li> */}
            <li>
              Заказ – заявка Получателя услуг, совершенная с использованием
              Сайта и/или чат-бота на получение услуг.
            </li>
            <li>
              Тренировочный курс – тренировочный курс Получателя услуг,
              который Получатель услуг выбирает на сайте или в чат-боте,
              совершая Заказ. Тренировочный курс содержит информацию о
              видах, объеме и стоимости услуг, а также о периоде их
              оказания.
            </li>
            <li>
              Программное обеспечение – мобильное приложение, посредством
              которого Исполнитель может оказывать услуги.
            </li>
            <li>
              Личный кабинет – часть Чат-бота, отражающая сведения о
              Тренировочном курсе и Получателе услуг.
            </li>
            <li>
              Персональные данные — любая информация, относящаяся прямо или
              косвенно к определенному или определяемому физическому лицу
              (субъекту персональных данных – Получателю услуг), добровольно
              и осознанно предоставляемая субъектом персональных данных при
              регистрации на Сайте, использовании сервисов Сайта, чат-бота
              для оформлении заказа.
            </li>
          </ol>

          {/* 2. ПРЕДМЕТ ДОГОВОРА */}
          <h2 className="mt-4 text-base sm:text-lg font-semibold text-white">
            2. ПРЕДМЕТ ДОГОВОРА
          </h2>
          <p>
            1. Исполнитель обязуется на условиях настоящей оферты обеспечить
            оказание самостоятельно или с привлечением третьих лиц
            Получателям услуг, услуги по организации и проведению
            физкультурных, физкультурно-оздоровительных, спортивных
            мероприятий и иных услуг (далее по тексту «Услуги»), перечень
            которых приведен в Тренировочном курсе, оформленному в пользу
            Получателя услуг, а Получатель услуг обязуется обеспечить оплату
            стоимости Услуг. Услуги оказываются в соответствии с условиями
            настоящей оферты, Правилами оказания услуг, положениями
            (регламентами) о физкультурных, физкультурно-оздоровительных и
            спортивных мероприятиях.
          </p>
          <p>
            2. Если иное не предусмотрено офертой, местом оказания Услуг
            (далее по тексту «Клуб») может являться объект недвижимого
            имущества, являющийся физкультурно-оздоровительным сооружением,
            адрес которого указан в приложении или дополнении к Контракту,
            оформленному в пользу Члена клуба, и который специально
            предназначен и содержит в себе площадки и/или помещения,
            оснащенные специальными техническими средствами для организации
            и проведения физкультурных, физкультурно-оздоровительных,
            спортивных мероприятий и иных услуг. Услуги могут быть оказаны с
            использованием Программного обеспечения. В случае оказания услуг
            с использованием средств программного обеспечения место их
            оказания Получатель услуг определяет самостоятельно.
          </p>
          <p>
            3. Если иное не предусмотрено офертой, Период оказания услуг
            (далее по тексту «Период оказания услуг») для каждого Получателя
            услуг устанавливается и отражается в Заказе и/или в Личном
            кабинете. На некоторые услуги могут быть установлены иные сроки
            оказания в Личном кабинете.
          </p>
          <p>
            4. Если в Заказе, оформленном Получателем услуг, предусмотрено
            ограничение количества Услуг в течение Периода оказания услуг
            и/или иного периода (далее по тексту «посещение»), то право
            пользования Услугами прекращается от даты наступления первого из
            нижеуказанных событий:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              Получатель услуг воспользовался Услугами с использованием
              программного обеспечения и/или посетил Клуб в целях получения
              Услуг указанное в Тренировочном курсе количество раз;
            </li>
            <li>Наступила дата окончания Периода оказания услуг.</li>
          </ul>
          <p>
            5. Часы времени работы Клуба, пользования Услугами в зависимости
            от вида доступа в Клуб размещаются Исполнителем на Сайте и/или в
            Чат-боте или доводятся до Получателя услуг иным способом,
            предусмотренным офертой.
          </p>
          <p>
            6. Если иное не предусмотрено офертой, Период оказания услуг в
            отношении каждого Получателя услуг при условии обеспечения им
            выполнения обязательства по оплате Услуг в порядке,
            предусмотренном офертой, исчисляется от даты наступления первого
            из нижеуказанных событий:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              дата, выбранная Получателем услуг, и зафиксированная в
              Тренировочном курсе. Дата также отражается в Личном кабинете
              Получателя услуг и/или в чат-боте;
            </li>
            <li>
              дата, когда Получатель услуг приступил к пользованию Услугами,
              что отражается в Личном кабинете Получателя услуг;
            </li>
            <li>
              количество дней, указанных в Тренировочном курсе, от даты
              оплаты Услуг;
            </li>
          </ul>
          <p>
            7. После внесения 100-процентной оплаты за Услуги, Получатель
            услуг может с помощью чат-бота проверить Период оказания услуг, а
            также объем не оказанных услуг.
          </p>

          {/* 3. ПРАВА И ОБЯЗАННОСТИ СТОРОН */}
          <h2 className="mt-4 text-base sm:text-lg font-semibold text-white">
            3. ПРАВА И ОБЯЗАННОСТИ СТОРОН
          </h2>
          <p className="font-semibold text-white mt-2">
            1. Исполнитель услуг обязуется:
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-1">
            <li>Обеспечивать надлежащее качество оказываемых Услуг.</li>
            <li>
              Обеспечить надлежащее функционирование оборудования и
              инвентаря, вспомогательного оборудования, предназначенного для
              оказания Услуг при оказании Услуг в Клубе.
            </li>
          </ol>

          <p className="font-semibold text-white mt-3">
            2. Исполнитель услуг вправе:
          </p>
          <p>2.1. Предоставлять Услуги в порядке и в соответствии с настоящей офертой, правилами посещения клуба, дополнительным разделом правил клуба, правилами пользования отдельными видами услуг, утвержденными Исполнителем (везде по тексту «Правила клуба»). Условия настоящей оферты и Правила клуба являются обязательными для исполнения Получателями услуг.</p>
          <p>2.2. В одностороннем порядке устанавливать перечень и стоимость дополнительных услуг, не входящих в стоимость Услуг (везде по тексту «Дополнительные услуги»), которые могут оказываться Получателям услуг Исполнителем или третьими лицами, в том числе, в рамках организации и проведения физкультурных, физкультурно-оздоровительных, спортивных мероприятий и иных услуг, но не ограничиваясь такими услугами.</p>
          <p>2.3. Устанавливать и изменять в одностороннем порядке Расписание, Правила клуба, условия оферты, часы работы Клуба или отдельных его частей, помещений, часы пользования Услугами, осуществлять замену заявленного в Расписании работника/исполнителя, при этом Получатель услуг обязан самостоятельно отслеживать такие изменения.</p>
          <p>2.4. Вправе отказать в предоставлении Услуг, Дополнительных услуг, в случае отсутствия у Получателя услуг документа, удостоверяющего личность.</p>
          <p>2.5. Привлекать третьих лиц для оказания Услуг, Дополнительных услуг.</p>
          <p>2.6. Без получения каких-либо дополнительных согласований с Получателем услуг переуступать свои права и обязанности в полном объеме и/или частично третьим лицам с обязательным сохранением в силе всех условий настоящей оферты.</p>
          <p>2.7. Досрочно в одностороннем внесудебном порядке расторгнуть настоящее соглашение без объяснения причин в части предоставления Услуг Получателю услуг.</p>
          <p>2.8. В случае выявления Исполнителем неисполнения и/или ненадлежащего исполнения со стороны Получателя услуг условий и/или требований, изложенных в оферте, Правилах клуба, требований работника Исполнителя, и/или требований Исполнителя на информационных, предупредительных, запрещающих надписях, табличках в Клубе, на Сайте, Исполнитель вправе в одностороннем, внесудебном порядке отказаться от исполнения настоящего соглашения в пользу соответствующего Получателя услуг и потребовать полного возмещения убытков, и/или отказать в заключение соглашения в пользу Получателя услуг.</p>
          <p>2.9. Уведомление о досрочном расторжении соглашения в части предоставления Услуг Получателя услуг вручается/направляется за 1 (один) день до даты расторжения соглашения. Соглашение в части предоставления Услуг Получателю услуг будет считаться расторгнутым в день, указанный в уведомлении Исполнителя, без дополнительного письменного оформления Сторонами расторжения соглашения в части предоставления Услуг Получателю услуг.</p>
          <p>2.10. В случае аварийных ситуаций, произошедших не по вине Исполнителя, и/или обстоятельств непреодолимой силы, в одностороннем порядке ограничивать объем и порядок предоставления Услуг, Дополнительных услуг Получателям услуг без какой-либо компенсации Получателям услуг.</p>
          <p>2.11. В случае реконструкции, ремонта здания, помещения Клуба или отдельной его части, а также в случае закрытия Клуба по независящим от Исполнителя обстоятельствам, в одностороннем порядке изменить условия настоящего соглашения и обеспечить оказание Получателям услуг аналогичных Услуг с использованием программного обеспечения или в аналогичном клубе на усмотрение Исполнителя.</p>
          <p>2.12. В одностороннем порядке приостанавливать Период оказания услуг, а также не предоставлять Дополнительные услуги, отказывать в допуске на территорию Клуба, прилегающую территорию к Клубу в случаях, если у Исполнителя имеется информация, о том, что Получатель услуг может быть причастен к совершению лично или опосредованно, в том числе, но не ограничиваясь: на территории Клуба или прилегающей территории к Клубу территории, действий и/или бездействий, которые повлекли или могут повлечь нарушение законных прав и/или интересов Исполнителя, работников Клуба, членов клуба, третьих лиц. Право пользования Услугами, Дополнительными услугами автоматически возобновляется Исполнителем с даты получения Исполнителем доказательств о непричастности Получателя услуг к описанным в настоящем пункте действиям/бездействиям или о том, что ранее полученная информация не подтвердилась.</p>
          <p>2.13. Открыто в целях сохранности имущества Исполнителя, обеспечения безопасности, контроля правомерного нахождения физических лиц на территории Исполнителя использовать в помещениях Исполнителя технические средства фото- и/или видео-фиксации. Осуществление данного права не преследует цель сбора информации о конкретном лице. При обнаружении противоправных действий материалы, полученные при использовании указанного в настоящем пункте оборудования, могут служить доказательством этих действий.</p>
          <p>2.14. Открыто в целях обеспечения безопасности, контроля качества и совершенствования оказываемых Услуг, Дополнительных услуг записывать и использовать информацию, полученную во время телефонных переговоров по используемым Исполнителем и/или привлекаемым для этого третьими лицами телефонным номерам. Осуществление данного права не преследует цель сбора информации о конкретном лице. При обнаружении противоправных действий записанная информация может служить доказательством этих действий.</p>
          <p>2.15. Использовать в целях исполнения обязательств по настоящему соглашению собственный программный комплекс и/или третьих лиц в следующих целях:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li> сбора и обработки персональных данных Получателей услуг;</li>
            <li> создания и оформления к Контракту приложений, дополнительных соглашений, счетов, счетов-оферт, направлений на оплату, заявлений и иных форм документов, утвержденных Исполнителем;</li>
            <li> осуществления записи Получателей услуг на Услуги, Дополнительные услуги и т.д.;</li>
            <li> учета оплат и задолженности перед Исполнителем за оказанные Услуги, Дополнительные услуги;</li>
            <li> информирования владельцев персональных данных об Услугах, Дополнительных услугах, анонсах, рекламных кампаниях и т.д.;</li>
            <li> для отражения в автоматическом режиме в Личном кабинете данных о приложениях, Заморозках, Услугах, Дополнительных услугах и иной информации, относящейся к пользователю Личного кабинета:</li>
            <li> в иных, не запрещенных действующим законодательством, целях.</li>
          </ul>
          <p>2.16. Отказать Получателю услуг в оказании услуг в случае, если Получатель услуг находится в состоянии алкогольного и/или наркотического опьянения.</p>
          <p>2.17. Пользоваться иными правами и/или возможностями, предусмотренными настоящей офертой, приложениями и/или дополнительными соглашениями к ней, Правилами клуба, действующим законодательством РA.</p>

          <p className="font-semibold text-white mt-3">
            3. Получатель услуг обязуется:
          </p>
          <p>3.1. Оплачивать Услуги, Дополнительные услуги в порядке и на условиях настоящего соглашения, приложений, дополнительных соглашений к нему, Правил клуба, а также соблюдать Правила клуба, условия настоящего соглашения, приложений, дополнительных соглашений к нему, а в случае оказания Услуг, Дополнительных услуг и/или проведение физкультурно- оздоровительных мероприятий за пределами Клуба, соблюдать также установленные и размещенные в местах проведения правила пользования такими услугами и/или посещения соответствующих объектов, в т.ч. рекомендации, запреты и т.д.</p>
          <p>3.2. Обеспечить сохранность имущества Клуба.</p>
          <p>3.3. Своевременно письменно информировать Исполнителя о наличии заболеваний, медицинских противопоказаний, которые могут сделать оказываемые Услуги, Дополнительные услуги небезопасными для здоровья Получателя услуг, обо всех изменениях состояния здоровья (в том числе о беременности), возникающих сложностях, побочных эффектах и т.п. в процессе, а также после предоставления Получателю услуг Услуг, Дополнительных услуг.</p>
          <p>3.4. На время нахождения в Клубе в порядке и на условиях, предусмотренных Правилами клуба, пользоваться специальными местами для хранения вещей.</p>
          <p>3.5. Ознакомиться с условиями настоящего соглашения, приложений и/или дополнительных соглашений к нему, Правилами клуба и иной информацией, касающейся предоставления Услуг, Дополнительных услуг.</p>
          <p>3.6. Для доступа в Клуб, получения Услуг/Дополнительных услуг, в том числе для изготовления средств доступа, предоставить Исполнителю документ, удостоверяющий личность.</p>

          <p className="font-semibold text-white mt-3">
            4. Получатель услуг вправе:
          </p>
          <p>4.1. Пользоваться Услугами, участвовать, в том числе в физкультурных, физкультурно-оздоровительных, спортивных мероприятий и иных услуг, проводимых и организуемых Исполнителем, или по его инициативе, или при его участии, на территории Клуба и за его пределами, а также по программного обеспечения.</p>
          <p>4.2. Получатель услуг вправе использовать чат-бот, который является Личныим кабинетом (везде по тексту «Личный кабинет»).</p>
          <p>4.3. В Личном кабинете Исполнителем может размещаться следующая информация и могут предоставляться следующие возможности пользователю ЛК включая, но не ограничиваясь:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li> персональные данные Пользователя ЛК;</li>
            <li> информация о месте оказания Услуг, Периоде оказания услуг, стоимости и перечне Услуг, их виды и т.д.;</li>
            <li> текст настоящего соглашения и оформленных Получателем услуг приложений, дополнительных соглашений к нему;</li>
            <li> запись на Дополнительные услуги и/или мероприятия, отмена соответствующей записи;</li>
            <li> пополнение аванса и/или оплата Услуг, Дополнительных услуг и т.д.;</li>
            <li> информационные сообщения Исполнителя, адресованные Получателю услуг;</li>
            <li> размещение информации/рекламы об Исполнителе, его деятельности и/или проводимых им акциях, мероприятиях, и/или деятельности его партнеров;</li>
            <li> иные возможности.</li>
          </ul>
          <p>4.4. Пользователь ЛК и Исполнитель соглашаются, что все действия в Личном кабинете, совершенные от имени:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li> Пользователя ЛК, достигшего 18-летнего возраста, будут считаться совершенными надлежащим образом Пользователем ЛК;</li>
            <li> Пользователя ЛК, не достигшего 18-летнего возраста, будут считаться совершенными надлежащим образом одним из родителей и/или законным представителем Пользователя ЛК.</li>
          </ul>

          {/* 4. ПОРЯДОК РАСЧЕТОВ */}
          <h2 className="mt-4 text-base sm:text-lg font-semibold text-white">
            4. ПОРЯДОК РАСЧЕТОВ
          </h2>
          <p>1. Если иное не предусмотрено настоящим соглашением, оплата стоимости Услуг производится Получателем услуг путем 100% предварительной оплаты не позднее дня начала Периода оказания услуг.</p>
          <p>2. Получатель услуг оплачивает Исполнителю Дополнительные услуги путем внесения 100% предварительной оплаты.</p>
          <p>3. Стоимость Услуг, Дополнительных услуг включает в себя все налоги, если такие применимы в соответствии с законодательством РA, и устанавливается на Сайте, а также в чат-боте.</p>
          <p>4. Датой оплаты считается дата поступления денежных средств на расчетный счет Исполнителя.</p>

          {/* 5. ОТВЕТСТВЕННОСТЬ СТОРОН */}
          <h2 className="mt-4 text-base sm:text-lg font-semibold text-white">
            5. ОТВЕТСТВЕННОСТЬ СТОРОН
          </h2>
          <p>1. Получатель услуг несет материальную ответственность за ущерб, причиненный Исполнителю. При причинении Получателем услуг Исполнителю ущерба, Получатель услуг обязан возместить Исполнителю стоимость поврежденного и/или утраченного имущества, установленную Исполнителем. В случае причинения ущерба Исполнителю составляется акт. В случае отказа Получателя услуг от подписания акта, Исполнитель подписывает его в одностороннем порядке. Получатель услуг в течение 5 (Пяти) календарных дней на основании акта обязан возместить Исполнителю причиненный ущерб в полном объеме, в противном случае сумма ущерба в безакцептном порядке вычитается Исполнителем из оплаченной стоимости Услуг с последующим соразмерным уменьшением Периода оказания услуг.</p>
          <p className="font-semibold text-white mt-3"> 2. Исполнитель не несет ответственности:</p>
          <p>2.1. За вред, причиненный жизни, здоровью или имуществу Получателя услуг в результате предоставления недостоверных и/или несвоевременного предоставления Исполнителю Получателем услуг достоверных сведений о состоянии здоровья Получателя услуг; и/или при нарушении или ненадлежащем выполнении Получателем услуг условий настоящего соглашения, Правил клуба и/или положений (регламентов) о физкультурных, физкультурно-оздоровительных, спортивных мероприятиях и/или правил техники безопасности при пользовании Услугами, Дополнительными услугами, инструкций и рекомендаций по пользованию оборудованием и инвентарем и т.д. Исполнителя, предупреждающих, ограничивающих и/или запрещающих
табличек и/или надписей, размещенных в Клубе и/или месте оказания Услуг; и/или по неосторожности Получателя услуг; за вред, нанесенный здоровью или причиненный имуществу Получателя услуг собственными действиями и/или бездействием, и/или во время самостоятельных занятий, и/или причиненный действиями третьих лиц;</p>
          <p>2.2. За утрату или повреждение личных вещей, в т.ч. оставленных в раздевалках или в других помещениях Клуба;</p>
          <p>2.3. За вред, связанный с ухудшением здоровья, если состояние здоровья Получателя услуг ухудшилось в результате острого заболевания, обострения травмы или хронического заболевания, собственных действий и/или бездействий Получателя услуг, третьих лиц;</p>
          <p>2.4. За технические неудобства, вызванные проведением Исполнителем, и/или уполномоченными организациями сезонных профилактических, ремонтно-строительных и иных работ, а также аварийными ситуациями, возникшими не по вине Исполнителя;</p>
          <p>2.5. В случаях, предусмотренных Правилами клуба, действующим законодательством.</p>
          <p>3. Окончание Периода оказания услуг не освобождает Стороны, Получателей услуг от ответственности за нарушение условий настоящего соглашения, приложений и/или дополнительных соглашений к нему, Правил клуба.</p>

          {/* 6. ПОРЯДОК ВОЗВРАТА ДЕНЕЖНЫХ СРЕДСТВ */}
          <h2 className="mt-4 text-base sm:text-lg font-semibold text-white">
            6. ПОРЯДОК ВОЗВРАТА ДЕНЕЖНЫХ СРЕДСТВ
          </h2>
          <p>
  1. Если иное не предусмотрено действующим законодательством, настоящим соглашением, в случае
  досрочного расторжения соглашения в части оказания Услуг Получателю услуг неиспользованные
  денежные средства подлежат возврату не позднее 10 (десяти) дней с даты получения Исполнителем
  соответствующего письменного заявления от плательщика денежных средств пропорционально
  внесенным плательщиками суммам.
          </p>

          <p>
  2. Если иное не предусмотрено действующим законодательством, соглашением, неиспользованные
  денежные средства за Дополнительные услуги или внесенные Исполнителю денежные средства в
  качестве аванса, и/или иные платежи подлежат возврату не позднее 10 (десяти) дней с даты
  получения Исполнителем соответствующего письменного заявления от плательщика денежных
  средств.
          </p>

          <p>
  3. При досрочном одностороннем расторжении соглашения, расчет неизрасходованных денежных
  средств определяется как сумма, полученная Исполнителем на дату расторжения соглашения в
  части оказания Услуг Получателю услуг, за вычетом: стоимости Услуг с даты начала Периода
  оказания услуг по дату досрочного расторжения соглашения в части предоставления Услуг Получателю
  услуг.
          </p>

          <p>
  4. Исполнитель вправе в одностороннем порядке удерживать из любых сумм, которые по соглашению
  подлежат возврату Получателю услуг и/или иным лицам, стоимость оказанных и не оплаченных
  Исполнителю Дополнительных услуг и иных сумм, подлежащих возмещению Исполнителю в
  соответствии с соглашением, приложением и/или дополнительным соглашением к соглашению,
  Правилами клуба.
          </p>

          <p>
  5. Если иное не предусмотрено действующим законодательством, соглашением, возврат
  неиспользованных денежных средств за Услуги, Дополнительные услуги или сумм
  неиспользованного аванса осуществляется Исполнителем плательщику в следующем порядке:
          </p>

          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
    в случае оплаты в Клубе платежной картой: на платежную карту, использованную при оплате,
    путем ее прокатки в терминале Клуба, в котором осуществлена оплата; если платежная карта,
    использованная при оплате, не может быть предъявлена, и/или технически невозможно
    осуществить возврат путем прокатки ее в терминале Клуба — на счет в Банк, к которому
    привязана платежная карта, использованная при оплате;
            </li>
            <li>
    в случае оплаты платежной картой через Личный кабинет — на счет в Банк, к которому привязана
    платежная карта, использованная при оплате;
            </li>
          </ul>

          <p>
  6. В исполнение Указания Банка России от 07.10.2013 No3073-У ИСПОЛНИТЕЛЬ НЕ ВОЗВРАЩАЕТ
  ДЕНЕЖНЫЕ СРЕДСТВА В НАЛИЧНОЙ ФОРМЕ, если денежных средств поступили Исполнителю в
  безналичной форме (платежная карта, банковский перевод и т.д.), а также в случаях, предусмотренных
  Контрактом.
          </p>

          <p>
  7. Для получения остатка неиспользованных денежных средств плательщику необходимо
  предоставить Исполнителю:
          </p>

          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>оригинал письменного заявления на возврат денежных средств;</li>
            <li>чек;</li>
            <li>действующий документ, удостоверяющий личность;</li>
          </ul>

          <p>
  8. Исполнитель не несет ответственность за действия банка-эмитента платежной карты, т.к. время
  фактического зачисления денежных средств на платежную карту регулируется договорными
  отношениями между держателем платежной карты и банком-эмитентом платежной карты.
          </p>

          <p>
  9. По договору между Исполнителем и Банком, предоставляющим услуги эквайринга, предусмотрен
  возврат денежных средств только на платежные карты, которые были использованы при оплате.
  Срок, установленный соглашением для возврата денежных средств, может быть увеличен в
  одностороннем порядке Банком, предоставляющим Исполнителю услуги по эквайрингу, в целях
  проверки обоснованности возврата денежных средств не на платежную карту, использованную при
  оплате, и Исполнитель не несет ответственность за данные действия Банка.
          </p>

          {/* 7. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ */}
          <h2 className="mt-4 text-base sm:text-lg font-semibold text-white">
            7. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ
          </h2>
          <p>
  1. Получатель услуг отвечает за достоверность указанных при регистрации на Сайте и/или в чат-боте
  приложениях и/или дополнительных соглашениях к соглашению персональных данных и в случае их
  изменения должен незамедлительно информировать Исполнителя.
          </p>

          <p>
  2. Если до окончания Периода оказания услуг Получатель услуг не заявил об отказе от исполнения
  соглашения, то Услуги, Дополнительные услуги будут считаться оказанными Исполнителем в течение
  Периода оказания услуг надлежащим образом в полном объеме, независимо от фактического посещения
  Клуба и/или пользования Услугами, Дополнительными услугами.
          </p>

          <p>
  3. Если на дату оплаты продления Периода оказания услуг Исполнитель утвердит настоящую оферту в
  новой редакции, то Стороны будут руководствоваться положениями оферты в редакции, которая будет
  утверждена на дату оплаты.
          </p>

          <p>
  4. Стороны соглашаются, что изменения, которые вправе совершать в одностороннем порядке Исполнитель
  на основании настоящей оферты, Правил клуба, а также уведомлять обо всех изменениях и/или направлять
  любые иные уведомления в адрес Получателя услуг, будут считаться надлежащим образом совершенными,
  оформленными, доведенными до сведения Получателя услуг и вступать в силу с момента их
  размещения/отправления/доведения, если иной срок не указан Исполнителем в сообщениях/уведомлениях,
  одним из следующих способов:
          </p>

          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>и/или с момента опубликования на Сайте,</li>
            <li>
    и/или с момента направления на электронный адрес Получателя услуг, указанный при регистрации;
            </li>
            <li>
    и/или с момента отправления голосового и/или смс-сообщения на указанный при регистрации и/или
    предоставленный Исполнителю иным способом телефонный номер Получателя услуг;
            </li>
            <li>
    и/или с момента отражения в Личном кабинете Исполнителем сообщения и/или информации;
            </li>
            <li>и/или с момента уведомления Получателя услуг иным способом.</li>
          </ul>

          <p>
  В таких случаях оформление дополнительных соглашений к Контракту не требуется.
          </p>

          <p>
  5. В случае, если Получатель услуг до даты направления Исполнителем уведомления не уведомил
  Исполнителя об изменении адреса для переписки, и/или телефонного номера, и/или адреса электронной
  почты, на которые Исполнитель направил уведомление, то Получатель услуг считается надлежащим
  образом уведомленным от даты соответствующего отправления.
          </p>

          <p>
  6. Стороны соглашаются, что все заявления Получателя услуг будут считаться надлежащим образом
  оформленными и полученными Исполнителем, если они:
          </p>

          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
    содержат следующие персональные данные (везде по тексту «ПДн») Получателя услуг: фамилию, имя,
    отчество, номер телефона, адрес электронной почты;
            </li>
            <li>оформлены в письменном виде на бумажном носителе;</li>
            <li>содержат подпись субъекта ПДн;</li>
            <li>
    получены уполномоченным лицом Исполнителя в месте оказания Услуг Исполнителем и/или доставлены
    на юридический адрес Исполнителя;
            </li>
            <li>
    направлены Исполнителю через Личный кабинет при наличии такой технической возможности;
            </li>
          </ul>

          <p>и к ним приложены документы, предусмотренные соглашением.</p>

          <p>
  7. Исполнитель вправе оставить без рассмотрения и/или отказать Получателю услуг в удовлетворении
  пожеланий/требований, изложенных в заявлении или ином документе, если оно оформлено и/или подано
  без соблюдения требований, предусмотренных соглашением, и/или оно содержит исправления.
          </p>

          <p>
  8. Стороны пришли к соглашению, что все споры и разногласия, связанные с заключением, исполнением
  и прекращением обязательств по настоящему соглашению Стороны будут стремиться решать путем
  переговоров, в случае невозможности разрешить возникшие разногласия, споры передаются на
  рассмотрение в суд.
          </p>

          <p>
  9. Оферта, выраженная в соглашении, вступает в силу с момента размещения в сети Интернет по адресу
  https://idocalisthenics.com/public_offer и действует до момента отзыва оферты Исполнителем.
          </p>

          <p>
  10. Полным и безоговорочным принятием (акцептом) всех условий соглашения, Правил клуба, созданных
  на основании соглашения приложений, дополнительных соглашений, счетов, счетов-оферт, направлений
  на оплату считается совершение Получателем услуг одного из следующих действий:
          </p>

          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
    внесение Исполнителю аванса, полной и/или частичной оплаты за Услуги, и/или направление на оплату,
    оформленных Исполнителем, и/или отраженных с использованием онлайн-ресурса, в Личном кабинете,
    счете, счете-оферте и/или распечатанных на бумажном носителе и/или предоставленных Исполнителем
    в электронном виде с использованием онлайн-ресурса документов на оплату;
            </li>
            <li>регистрация на Сайте;</li>
            <li>регистрация в чат-боте;</li>
            <li>запись на услуги;</li>
            <li>фактическое пользование Услугами, Дополнительными услугами;</li>
            <li>оплата Услуг.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}


