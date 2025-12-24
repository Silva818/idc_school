// src/app/consent/page.tsx
import Link from "next/link";

export default function ConsentPage() {
  return (
    <main className="min-h-screen bg-brand-dark text-white">
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        {/* Хедер страницы */}
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] sm:text-xs text-brand-muted/80 uppercase tracking-wide">
              Документ
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Согласие на обработку персональных данных
            </h1>
          </div>
          <Link
            href="/"
            className="text-[11px] sm:text-xs text-brand-muted hover:text-white transition-colors underline underline-offset-4 decoration-dotted"
          >
            ← На главную
          </Link>
        </header>

        {/* Тело документа */}
        <section className="rounded-3xl border border-white/10 bg-black/30 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 text-[13px] sm:text-sm leading-relaxed text-brand-muted space-y-4">


          <p>
            Отправляя заявку или регистрируясь на сайте{" "}
            <a
              href="https://idocalisthenics.com/"
              target="_blank"
              rel="noreferrer"
              className="text-white underline decoration-dotted"
            >
              https://idocalisthenics.com/
            </a>{" "}
            Пользователь подтверждает согласие на обработку своих персональных
            данных Индивидуальным предпринимателем Амбарцумян Сирвард Сергеевна
            (далее - Оператор, ИНН: 26913722), в целях предоставления ответов на
            запросы, а также в целях оказания услуг Пользователю.
          </p>

          <p>
            Пользователь дает согласие Оператору на осуществление
            автоматизированной и неавтоматизированной обработки, включая сбор,
            запись, систематизацию, накопление, хранение, уточнение (обновление,
            изменение), использование, передачу (предоставление, доступ)
            следующих персональных данных:
          </p>

          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Фамилия Имя Отчество</li>
            <li>Адрес электронной почты</li>
            <li>Номер телефона/мессенджер</li>
          </ul>

          <p>
            Согласие действует до момента достижения целей обработки
            персональных данных либо до момента его отзыва Пользователем путем
            направления письменного уведомления Оператору по адресу электронной
            почты: <a href="mailto:info@idocalisthenics.com" className="text-white underline decoration-dotted">info@idocalisthenics.com</a>.
          </p>

          <p>
            Пользователь уведомлен о том, что в соответствии с законодательством
            Республики Армения Оператор вправе продолжить обработку персональных
            данных без согласия Пользователя в случаях, когда такая обработка
            предусмотрена законом, необходима для исполнения договора, стороной
            которого является Пользователь, либо для защиты законных интересов
            Оператора или третьих лиц.
          </p>

          <p>
            Пользователь подтверждает, что уведомлен о своих правах,
            предусмотренных Законом Республики Армения «О защите персональных
            данных», включая право на доступ к своим персональным данным, их
            исправление, удаление, ограничение обработки и отзыв согласия.
          </p>
        </section>
      </div>
    </main>
  );
}
