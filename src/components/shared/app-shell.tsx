"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Footer } from "@/components/shared/Footer";
import { TopNav } from "@/components/shared/top-nav";
import { Component as LumaSpin } from "@/components/ui/luma-spin";
import { useLanguage } from "@/context/language-context";

const AUTH_ROUTES = new Set(["/login", "/register", "/forgot-password", "/auth/action"]);

function isDashboardRoute(pathname: string) {
  return pathname.startsWith("/dashboard");
}

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const hideChrome = AUTH_ROUTES.has(pathname) || isDashboardRoute(pathname);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLangTransitioning, setIsLangTransitioning] = useState(false);
  const prevLangRef = useRef(language);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsInitialLoading(false);
    }, 650);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (prevLangRef.current === language) return;
    prevLangRef.current = language;
    setIsLangTransitioning(true);
    const timer = window.setTimeout(() => {
      setIsLangTransitioning(false);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [language]);

  // Public and auth pages are always black, so force dark variants there;
  // dashboard routes follow the user's light/dark theme instead.
  return (
    <div className={`${isDashboardRoute(pathname) ? "" : "dark "}flex min-h-screen flex-col bg-black text-slate-100`}>
      {isInitialLoading ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black transition-opacity duration-300"
        >
          <LumaSpin />
        </div>
      ) : null}
      {hideChrome ? null : <TopNav />}
      <main
        className={`flex-1 bg-black transition-opacity duration-300 ease-out ${
          isLangTransitioning ? "opacity-40" : "opacity-100"
        }`}
      >
        {children}
      </main>
      {hideChrome ? null : <Footer />}
    </div>
  );
}
