import { WellnessWorkspace } from "@/components/c2/wellness-workspace";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

export default function WellnessPage() {
  return (
    <div className="min-h-screen w-full bg-black">
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
        <ScrollReveal>
          <WellnessWorkspace />
        </ScrollReveal>
      </main>
    </div>
  );
}
