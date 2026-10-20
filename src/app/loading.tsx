import { Component as LumaSpin } from "@/components/ui/luma-spin";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex min-h-screen w-full items-center justify-center bg-black">
      <LumaSpin />
    </div>
  );
}
