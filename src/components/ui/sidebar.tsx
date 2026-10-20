"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type ComponentPropsWithoutRef
} from "react";
import { clsx } from "clsx";

const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_COLLAPSED = "3.75rem";
const MOBILE_BREAKPOINT = 1024;

type SidebarContextValue = {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  isMobile: boolean;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}

type SidebarProviderProps = { children: ReactNode; defaultCollapsed?: boolean };

export function SidebarProvider({ children, defaultCollapsed = false }: SidebarProviderProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const syncViewport = () => {
      setIsMobile(mediaQuery.matches);
      if (!mediaQuery.matches) setMobileOpen(false);
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);
    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("overflow-hidden", isMobile && mobileOpen);
    return () => document.body.classList.remove("overflow-hidden");
  }, [isMobile, mobileOpen]);

  const toggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen((open) => !open);
      return;
    }
    setCollapsed((value) => !value);
  }, [isMobile]);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, isMobile, mobileOpen, setMobileOpen, toggle }}>
      <div className="flex min-h-screen w-full">{children}</div>
    </SidebarContext.Provider>
  );
}

type SidebarProps = ComponentPropsWithoutRef<"aside">;

export function Sidebar({ className, style, children, ...props }: SidebarProps) {
  const { collapsed, isMobile, mobileOpen, setMobileOpen } = useSidebar();
  const isCompact = !isMobile && collapsed;

  return (
    <>
      {isMobile && mobileOpen ? (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      ) : null}
      <aside
        data-collapsed={isCompact}
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-white/10 bg-black text-white transition-[width,transform,background-color,color,border-color] duration-200 ease-linear dark:border-white/15 dark:bg-gradient-to-b dark:from-neutral-200/90 dark:via-neutral-300/85 dark:to-neutral-400/80 dark:text-neutral-900 dark:backdrop-blur-xl",
          isMobile ? clsx("w-64 shadow-2xl", mobileOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0",
          className
        )}
        style={{
          width: isMobile ? SIDEBAR_WIDTH : isCompact ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
          ...style
        }}
        {...props}
      >
        {children}
      </aside>
    </>
  );
}

export function SidebarHeader({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={clsx(
        "flex shrink-0 items-center justify-between border-b border-white/10 bg-transparent px-4 py-4 transition-colors dark:border-neutral-400/40",
        className
      )}
      {...props}
    />
  );
}

export function SidebarContent({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={clsx("flex min-h-0 flex-1 flex-col overflow-hidden py-3", className)}
      {...props}
    />
  );
}

export function SidebarFooter({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={clsx(
        "shrink-0 border-t border-white/10 bg-transparent p-3 transition-colors dark:border-neutral-400/40",
        className
      )}
      {...props}
    />
  );
}

export function SidebarGroup({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={clsx("flex flex-1 flex-col px-3 py-1", className)} {...props} />;
}

export function SidebarGroupLabel({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  const { collapsed, isMobile } = useSidebar();
  if (!isMobile && collapsed) return null;
  return (
    <div
      className={clsx(
        "mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/50 dark:text-neutral-600",
        className
      )}
      {...props}
    />
  );
}

export function SidebarMenu({ className, ...props }: ComponentPropsWithoutRef<"nav">) {
  return (
    <nav
      className={clsx("flex flex-1 flex-col justify-between", className)}
      aria-label="Dashboard sections"
      {...props}
    />
  );
}

export function SidebarMenuItem({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={clsx("relative", className)} {...props} />;
}

type SidebarMenuButtonProps = ComponentPropsWithoutRef<"button"> & {
  isActive?: boolean;
  asChild?: boolean;
};

export function SidebarMenuButton({
  className,
  isActive,
  asChild,
  children,
  ...props
}: SidebarMenuButtonProps) {
  const { collapsed, isMobile } = useSidebar();
  const isCompact = !isMobile && collapsed;
  const base = clsx(
    "flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-left text-[13.5px] font-medium transition-colors",
    isCompact && "justify-center px-2"
  );
  const active = isActive
    ? "bg-white/15 text-white font-semibold dark:bg-neutral-900/90 dark:text-white dark:shadow-sm"
    : "text-white/80 hover:bg-white/10 hover:text-white dark:text-neutral-800 dark:hover:bg-black/10 dark:hover:text-black";
  const combined = clsx(base, active, className);

  if (asChild && typeof children === "object" && children !== null && "props" in children) {
    return (
      <div data-sidebar="menu-button" className={combined}>
        {children}
      </div>
    );
  }

  return (
    <button type="button" className={combined} data-active={isActive} {...props}>
      {children}
    </button>
  );
}

export function SidebarTrigger({ className, children, ...props }: ComponentPropsWithoutRef<"button">) {
  const { toggle } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggle}
      className={clsx(
        "inline-flex size-8 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white dark:text-neutral-700 dark:hover:bg-black/10 dark:hover:text-black",
        className
      )}
      aria-label="Toggle sidebar"
      {...props}
    >
      {children}
    </button>
  );
}

export function SidebarInset({ className, ...props }: ComponentPropsWithoutRef<"main">) {
  const { collapsed, isMobile } = useSidebar();
  return (
    <main
      className={clsx("min-h-screen flex-1 transition-[margin] duration-200", className)}
      style={{ marginLeft: isMobile ? 0 : collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH }}
      {...props}
    />
  );
}

export { useSidebar };
