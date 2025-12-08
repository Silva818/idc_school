// src/components/Footer.tsx
"use client";

import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-brand-dark/95">
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-[11px] sm:text-xs text-brand-muted">
        
        {/* Левая часть — копирайт */}
        <div className="flex flex-col gap-1">
          <span className="font-medium text-white/80">IDC School</span>
          <span className="text-[11px] text-brand-muted/80">
            © {currentYear}. Все права защищены.
          </span>
        </div>

        {/* Центр — ссылки на политики */}
        <nav className="flex flex-wrap gap-3 sm:gap-4">
          <Link
            href="/offer"
            className="hover:text-white transition-colors underline decoration-dotted underline-offset-2"
          >
            Публичная оферта
          </Link>
          <Link
            href="/consent"
            className="hover:text-white transition-colors underline decoration-dotted underline-offset-2"
          >
            Согласие на обработку персональных данных
          </Link>
          <Link
            href="/privacy"
            className="hover:text-white transition-colors underline decoration-dotted underline-offset-2"
          >
            Политика обработки персональных данных
          </Link>
        </nav>

        {/* Правая часть — пусто (убрали соцсети) */}
        <div className="h-4" /> 
      </div>
    </footer>
  );
}
