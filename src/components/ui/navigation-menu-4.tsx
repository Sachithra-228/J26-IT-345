"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { getUiTranslations } from "@/lib/ui-translations";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function NavigationMenu4() {
  const { user, signOutUser, loading } = useAuth();
  const { language } = useLanguage();
  const pathname = usePathname();
  const text = getUiTranslations(language).topNav;
  const isAuthenticated = !loading && Boolean(user);

  const navigationLinks = [
    { href: "/overview", label: text.overview },
    { href: "/university-connect", label: text.universities },
    { href: "/student-support", label: text.studentSupport },
    { href: "/stories", label: text.stories },
  ];

  const isRouteActive = (href: string) => {
    if (href === "/student-support") {
      return ["/student-support", "/financial-aid", "/career", "/mentorship", "/wellness"].some(
        (p) => pathname === p || pathname.startsWith(`${p}/`)
      );
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 px-4 backdrop-blur-xl md:px-8">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4">
        {/* Left side: Mobile trigger + Logo ONLY */}
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                className="group size-9 border border-white/15 bg-transparent text-white hover:bg-white/5 md:hidden"
                variant="ghost"
                size="icon"
                aria-label="Toggle navigation menu"
              >
                <svg
                  className="pointer-events-none"
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 12L20 12"
                    className="origin-center -translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[315deg]"
                  />
                  <path
                    d="M4 12H20"
                    className="origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
                  />
                  <path
                    d="M4 12H20"
                    className="origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[135deg]"
                  />
                </svg>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-60 border-white/15 bg-black/95 p-2 text-white shadow-2xl backdrop-blur-xl md:hidden"
            >
              <NavigationMenu className="max-w-none *:w-full">
                <NavigationMenuList className="flex-col items-start gap-1">
                  {navigationLinks.map((link) => (
                    <NavigationMenuItem key={link.href} className="w-full">
                      <NavigationMenuLink asChild>
                        <Link
                          href={link.href}
                          className={cn(
                            "block px-3 py-2 text-sm font-medium transition-colors",
                            isRouteActive(link.href)
                              ? "text-white"
                              : "text-neutral-400 hover:text-white"
                          )}
                        >
                          {link.label}
                        </Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  ))}
                </NavigationMenuList>
              </NavigationMenu>
            </PopoverContent>
          </Popover>

          <Link href="/" className="flex items-center" aria-label="UniCare Connect">
            <Image
              src="/logo.png"
              alt="UniCare Connect"
              width={500}
              height={500}
              className="h-8 w-16 object-contain object-center brightness-110 sm:w-20"
              priority
            />
          </Link>
        </div>

        {/* Center Navigation Menu (clean text links, no oval shapes, no dropdown) */}
        <div className="max-md:hidden">
          <NavigationMenu>
            <NavigationMenuList className="gap-7">
              {navigationLinks.map((link) => {
                const active = isRouteActive(link.href);
                return (
                  <NavigationMenuItem key={link.href}>
                    <NavigationMenuLink asChild>
                      <Link
                        href={link.href}
                        className={cn(
                          "relative py-1.5 text-sm font-medium transition-colors",
                          active
                            ? "text-white"
                            : "text-neutral-400 hover:text-white"
                        )}
                      >
                        {link.label}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Right side: Language switcher + Sign In only */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher compactOnMobile />

          {isAuthenticated ? (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="rounded-full border border-white/20 bg-transparent px-4 text-sm font-medium text-white hover:bg-white/10"
              >
                <Link href="/dashboard">{text.dashboard}</Link>
              </Button>
              <Button
                size="sm"
                onClick={() => signOutUser()}
                className="rounded-full bg-white px-4 text-sm font-semibold text-black hover:bg-neutral-200"
              >
                {text.signOut}
              </Button>
            </>
          ) : (
            <Button
              asChild
              size="sm"
              className="rounded-full bg-white px-5 text-sm font-semibold text-black transition-all hover:bg-neutral-200"
            >
              <Link href="/login">{text.signIn}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
