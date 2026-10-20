"use client";

import { TestimonialsCarousel } from "@/components/shared/testimonials-carousel";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { useLanguage } from "@/context/language-context";

export default function StoriesPage() {
  const { language } = useLanguage();
  const text =
    language === "si"
      ? {
          title: "අපේ ශිෂ්‍ය ප්‍රජාවේ කතා",
          subtitle: "UniCare භාවිතා කරන ශිෂ්‍යයන්, උපදේශකයන් සහ දෙමාපියන්ගේ සැබෑ අත්දැකීම්.",
          testimonials: [
            {
              name: "Sachithra Wijesinghe",
              title: "අවසන් වසර ඉංජිනේරු ශිෂ්‍යයෙකු, කොළඹ විශ්වවිද්‍යාලය",
              quote: "UniCare මට එකම මාසයේ හදිසි ප්‍රදානයක් සහ කැම්පස් රැකියාවක් ලබාගන්න උදව් කළා."
            },
            {
              name: "Imasha Ransinghe",
              title: "වෘත්තීය උපදේශක, මොරටුව විශ්වවිද්‍යාලය",
              quote:
                "මෙම වේදිකාව ශිෂ්‍යයන්ට පැහැදිලි පුහුණු මාර්ග ලබාදෙන අතර උපදේශකයන්ට කලින්ම මැදිහත් වීමට උදව් කරයි."
            },
            {
              name: "Kusum Karunarathna",
              title: "දෙමාපිය ප්‍රජා මෙන්ටර්, පේරාදෙණිය විශ්වවිද්‍යාලය",
              quote:
                "උපදේශන සහාය සහ නිරන්තර මෙන්ටර් සම්බන්ධතා නිසා මගේ පුතාට අවධානය සහ විශ්වාසය රැකගන්න පුළුවන් වුණා."
            }
          ]
        }
      : language === "ta"
        ? {
            title: "எங்கள் மாணவர் சமூகத்தின் கதைகள்",
            subtitle: "UniCare பயன்படுத்தும் மாணவர்கள், ஆலோசகர்கள், மற்றும் பெற்றோரின் உண்மையான அனுபவங்கள்.",
            testimonials: [
              {
                name: "Sachithra Wijesinghe",
                title: "இறுதி ஆண்டு பொறியியல் மாணவர், கொழும்பு பல்கலைக்கழகம்",
                quote: "UniCare ஒரே மாதத்தில் அவசர உதவித்தொகையும் வளாக வேலை வாய்ப்பும் பெற உதவியது."
              },
              {
                name: "Imasha Ransinghe",
                title: "தொழில் ஆலோசகர், மொரட்டுவ பல்கலைக்கழகம்",
                quote:
                  "இந்த தளம் மாணவர்களுக்கு தெளிவான இன்டர்ன்ஷிப் பாதைகளை வழங்கி, ஆலோசகர்கள் முன்கூட்டியே தலையிட உதவுகிறது."
              },
              {
                name: "Kusum Karunarathna",
                title: "பெற்றோர் சமூக வழிகாட்டி, பேராதனை பல்கலைக்கழகம்",
                quote:
                  "ஆலோசனை ஆதரவும் வழிகாட்டி சந்திப்புகளும் என் மகன் கவனத்துடன் நம்பிக்கையுடன் தொடர உதவின."
              }
            ]
          }
        : {
            title: "Stories from our student community",
            subtitle:
              "Real voices from students, advisors, and parents using UniCare across Sri Lankan campuses.",
            testimonials: [
              {
                name: "Sachithra Wijesinghe",
                title: "Final-year Engineering Student, University of Colombo",
                quote: "UniCare helped me secure an emergency grant and a campus job in the same month."
              },
              {
                name: "Imasha Ransinghe",
                title: "Career Advisor, University of Moratuwa",
                quote:
                  "The platform gives students clear internship pathways and helps advisors intervene early."
              },
              {
                name: "Kusum Karunarathna",
                title: "Parent Community Mentor, University of Peradeniya",
                quote:
                  "Counseling support and regular mentor check-ins helped my son stay focused and confident."
              }
            ]
          };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black text-white">
      <div className="relative mx-auto w-full max-w-6xl space-y-10 px-4 py-14">
        <ScrollReveal className="mb-8 space-y-2 text-center">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{text.title}</h1>
          <p className="text-sm text-neutral-400 sm:text-base">{text.subtitle}</p>
        </ScrollReveal>
        <ScrollReveal delay={0.15}>
          <TestimonialsCarousel
            testimonials={[
              {
                name: text.testimonials[0].name,
                title: text.testimonials[0].title,
                quote: text.testimonials[0].quote,
                avatar: "/sachithra.jpeg",
                image: "/sachithra.jpeg"
              },
              {
                name: text.testimonials[1].name,
                title: text.testimonials[1].title,
                quote: text.testimonials[1].quote,
                avatar: "/imasha.jpeg",
                image: "/imasha.jpeg"
              },
              {
                name: text.testimonials[2].name,
                title: text.testimonials[2].title,
                quote: text.testimonials[2].quote,
                avatar: "/kusum.jpeg",
                image: "/kusum.jpeg"
              }
            ]}
          />
        </ScrollReveal>
      </div>
    </div>
  );
}
