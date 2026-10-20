"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type DropdownPortalProps = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
};

/**
 * Renders children in a portal, positioned below the anchor element.
 * Uses fixed positioning so the dropdown is not clipped by overflow:hidden parents.
 */
export function DropdownPortal({
  open,
  anchorRef,
  children,
  onClose,
  className = ""
}: DropdownPortalProps) {
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const updatePosition = () => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 200)
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target) || contentRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === "undefined") return null;

  const panel = (
    <div
      ref={contentRef}
      role="presentation"
      className={`z-[9999] overflow-hidden rounded-xl border border-white/15 bg-neutral-950 text-white shadow-2xl ${className}`}
      style={
        position
          ? {
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: "min(320px, 70vh)"
            }
          : { visibility: "hidden" }
      }
    >
      {children}
    </div>
  );

  return createPortal(panel, document.body);
}
