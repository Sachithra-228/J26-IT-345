import { HomeHero } from "@/components/home/home-hero";
import { CoreModulesJourney } from "@/components/shared/core-modules-journey";

export default function HomePage() {
  return (
    <div className="bg-black">
      <HomeHero />
      <CoreModulesJourney />
    </div>
  );
}
