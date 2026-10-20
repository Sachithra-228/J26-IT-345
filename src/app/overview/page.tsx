"use client";

import Link from "next/link";
import Image from "next/image";
import { GraduationCap, ShieldCheck, UserCheck } from "lucide-react";
import { EcosystemShowcase } from "@/components/shared/ecosystem-showcase";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { useLanguage } from "@/context/language-context";

const partnerUniversities = [
  { name: "University of Colombo", logo: "/colombo.jpg" },
  { name: "University of Peradeniya", logo: "/peradeniya.jpg" },
  { name: "University of Moratuwa", logo: "/moratuwa.jpg" },
  { name: "University of Sri Jayewardenepura", logo: "/jayawardenapura.jpg" },
  { name: "University of Kelaniya", logo: "/kelaniya.jpg" },
  { name: "University of Ruhuna", logo: "/ruhuna.jpg" },
  { name: "University of Jaffna", logo: "/jaffna.jpg" },
  { name: "Eastern University", logo: "/eastern.jpg" },
  { name: "Sabaragamuwa University", logo: "/sabaragamuwa.jpg" },
  { name: "Wayamba University", logo: "/wayamba.jpg" },
  { name: "Rajarata University", logo: "/rajarata.jpg" },
  { name: "Open University of Sri Lanka", logo: "/open.jpg" },
  { name: "University of the Visual & Performing Arts", logo: "/visual.jpg" },
  { name: "South Eastern University", logo: "/southeastern.jpg" },
  { name: "Uva Wellassa University", logo: "/uvawellassa.jpg" },
  { name: "University of Vavuniya", logo: "/vavuniya.jpg" },
  { name: "Gampaha Wickramarachchi University", logo: "/gampaha.jpg" }
];

export default function OverviewPage() {
  const { language } = useLanguage();
  const text =
    language === "si"
      ? {
          bentoTitle: "සෑම පාර්ශවකරුවෙකුටම ගැළපෙන පරිදි නිර්මාණය කර ඇත",
          bentoSubtitle: "ශිෂ්‍යයන්, උපදේශකවරුන් සහ විශ්වවිද්‍යාල පරිපාලනය එකම ආරක්ෂිත පද්ධතියකින් සම්බන්ධ කරයි.",
          roles: [
            {
              title: "ශිෂ්‍යයන් සඳහා (Students)",
              desc: "හදිසි මූල්‍ය ආධාර, ශිෂ්‍යත්ව ගැළපීම්, වෘත්තීය සූදානම සහ පුද්ගලික මානසික සුවතා සහාය එකම ගිණුමකින් ලබාගන්න.",
              points: ["තත්‍ය කාලීන අයදුම්පත් නිරීක්ෂණය", "AI මූල්‍ය හා වෘත්තීය මාර්ගෝපදේශනය", "රහස්‍ය මානසික සුවතා පරීක්ෂාව"]
            },
            {
              title: "උපදේශකයන් සහ මෙන්ටර්වරුන් සඳහා (Advisors & Mentors)",
              desc: "ශිෂ්‍ය ඉල්ලීම් ඉක්මනින් හඳුනාගෙන ප්‍රමුඛතාවය ලබාදීමට සහ නිවැරදි මාර්ගෝපදේශනය ලබාදීමට විශේෂිත වැඩබිමක්.",
              points: ["හදිසි අවස්ථා කලින්ම හඳුනාගැනීම", "ආදි ශිෂ්‍ය හා ආචාර්ය මෙන්ටර් සම්බන්ධතා", "පැහැදිලි ප්‍රගති වාර්තා"]
            },
            {
              title: "පරිත්‍යාගශීලීන් සහ පරිපාලනය සඳහා (Donors & Admins)",
              desc: "සෑම ශිෂ්‍යත්වයක් සහ ආධාර මුදලක්ම නිසි ශිෂ්‍යයා වෙත ගිය බව තහවුරු කරන විනිවිදභාවයෙන් යුත් පද්ධතියක්.",
              points: ["විශ්වවිද්‍යාල මට්ටමේ සත්‍යාපනය", "විනිවිද පෙනෙන අරමුදල් ලෙජරය", "ආරක්ෂිත දත්ත කළමනාකරණය"]
            }
          ],
          workflowTitle: "පියවර 3 කින් ඔබේ සහාය ගමන",
          workflowSubtitle: "ගිණුමක් සාදා, ඔබට ගැළපෙන සේවාවන් තෝරාගෙන තත්‍ය කාලීනව ප්‍රගතිය බලන්න.",
          steps: [
            {
              step: "01",
              title: "ලියාපදිංචි වීම සහ පැතිකඩ",
              description: "ගිණුමක් සාදා, ඔබේ ඉලක්ක සහ අවශ්‍ය සහාය අංශ තෝරාගන්න."
            },
            {
              step: "02",
              title: "පුද්ගලීකරණය කළ පුවරුව",
              description: "ඔබට ගැළපෙන ආධාර, වෘත්තීය අවස්ථා සහ සුවතා සේවා එකම තැනකින් බලන්න."
            },
            {
              step: "03",
              title: "අයදුම් කිරීම සහ නිරීක්ෂණය",
              description: "ඉල්ලීම් යොමු කර සෑම පියවරකම ප්‍රගතිය තත්‍ය කාලීනව දැකගන්න."
            }
          ],
          trusted: "රට පුරා විශ්වවිද්‍යාල 25+ ක විශ්වාසය",
          trustedSubtitle: "ශ්‍රී ලංකාවේ රාජ්‍ය සහ පෞද්ගලික උසස් අධ්‍යාපන ආයතන සමඟ සහයෝගීතාවය.",
          ctaTitle: "ඔබේ විශ්වවිද්‍යාල අත්දැකීම වෙනස් කරගැනීමට සූදානම්ද?",
          ctaBody: "මූල්‍ය ආධාර, වෘත්තීය වර්ධනය සහ මානසික සුවතා සහාය එකම වේදිකාවකින් ලබාගන්නා 10,000+ සිසුන් සමඟ එක්වන්න.",
          badges: ["එකම ගිණුමක්", "තත්‍ය කාලීන නිරීක්ෂණය", "විශ්වවිද්‍යාල තහවුරු කළ"],
          button: "නොමිලේ ආරම්භ කරන්න"
        }
      : language === "ta"
        ? {
            bentoTitle: "ஒவ்வொரு பங்குதாரருக்கும் ஏற்றவாறு வடிவமைக்கப்பட்டுள்ளது",
            bentoSubtitle: "மாணவர்கள், ஆலோசகர்கள் மற்றும் பல்கலைக்கழக நிர்வாகத்தை ஒரே பாதுகாப்பான தளத்தில் இணைக்கிறது.",
            roles: [
              {
                title: "மாணவர்களுக்காக (Students)",
                desc: "அவசர நிதி உதவி, உதவித்தொகை பொருத்தம், தொழில் வழிகாட்டல் மற்றும் மனநல ஆதரவை ஒரே கணக்கில் பெறுங்கள்.",
                points: ["நேரடி விண்ணப்ப கண்காணிப்பு", "AI நிதி மற்றும் தொழில் வழிகாட்டல்", "தனிப்பட்ட மனநல பரிசோதனை"]
              },
              {
                title: "ஆலோசகர்கள் மற்றும் வழிகாட்டிகளுக்கு (Advisors & Mentors)",
                desc: "மாணவர் கோரிக்கைகளுக்கு முன்னுரிமை அளித்து விரைவான வழிகாட்டலை வழங்கும் ஒருங்கிணைந்த தளம்.",
                points: ["அவசர தேவைகளை முன்கூட்டியே கண்டறிதல்", "முன்னாள் மாணவர் வழிகாட்டி இணைப்பு", "தெளிவான முன்னேற்ற அறிக்கைகள்"]
              },
              {
                title: "நன்கொடையாளர்கள் மற்றும் நிர்வாகத்திற்கு (Donors & Admins)",
                desc: "ஒவ்வொரு உதவித்தொகையும் தகுதியான மாணவருக்குச் சென்றடைவதை உறுதிப்படுத்தும் வெளிப்படையான அமைப்பு.",
                points: ["பல்கலைக்கழக சரிபார்ப்பு", "வெளிப்படையான நிதி கண்காணிப்பு", "பாதுகாப்பான தரவு மேலாண்மை"]
              }
            ],
            workflowTitle: "3 படிகளில் உங்கள் ஆதரவு பயணம்",
            workflowSubtitle: "கணக்கை உருவாக்கி, உங்களுக்கு ஏற்ற சேவைகளைத் தேர்ந்தெடுத்து நேரடியாக கண்காணிக்கவும்.",
            steps: [
              {
                step: "01",
                title: "பதிவு மற்றும் சுயவிவரம்",
                description: "உங்கள் கணக்கை உருவாக்கி, இலக்குகளையும் ஆதரவு தேவைகளையும் அமைக்கவும்."
              },
              {
                step: "02",
                title: "தனிப்பயன் டாஷ்போர்டு",
                description: "உங்களுக்கு ஏற்ற நிதி உதவி, தொழில் பாதைகள் மற்றும் நலன் வளங்களை ஒரே பார்வையில் பெறுங்கள்."
              },
              {
                step: "03",
                title: "விண்ணப்பித்து கண்காணிக்கவும்",
                description: "கோரிக்கைகளை சமர்ப்பித்து ஒவ்வொரு முடிவையும் நேரடியாக கண்காணிக்கவும்."
              }
            ],
            trusted: "நாட்டளவில் 25+ பல்கலைக்கழகங்கள் நம்பும் தளம்",
            trustedSubtitle: "இலங்கையின் அரசு மற்றும் தனியார் உயர்கல்வி நிறுவனங்களுடனான ஒத்துழைப்பு.",
            ctaTitle: "உங்கள் பல்கலைக்கழக அனுபவத்தை மாற்றத் தயாரா?",
            ctaBody: "நிதி உதவி, தொழில் வளர்ச்சி மற்றும் மனநல ஆதரவை ஒரே தளத்தில் பெறும் 10,000+ மாணவர்களுடன் இணையுங்கள்.",
            badges: ["ஒரே கணக்கு", "நேரடி கண்காணிப்பு", "பல்கலைக்கழகம் சரிபார்த்தது"],
            button: "இலவசமாக தொடங்குங்கள்"
          }
        : {
            bentoTitle: "Built for every stakeholder on campus",
            bentoSubtitle: "Connecting students, advisors, and university leadership in one transparent ecosystem.",
            roles: [
              {
                title: "For Students",
                desc: "Access emergency financial aid, smart scholarship matching, career readiness tools, and confidential wellness care from a single account.",
                points: ["Real-time application tracking", "AI-assisted financial & career guidance", "Private wellbeing check-ins"]
              },
              {
                title: "For Advisors & Mentors",
                desc: "Triage urgent student requests faster, review explainable readiness insights, and guide learners through structured mentorship.",
                points: ["Early intervention visibility", "Alumni & faculty mentor matching", "Unified student progress view"]
              },
              {
                title: "For Donors & University Admins",
                desc: "Ensure every grant and scholarship reaches verified students with full accountability and tamper-evident audit trails.",
                points: ["University-verified eligibility", "Transparent disbursement tracking", "Privacy-preserving audit records"]
              }
            ],
            workflowTitle: "How UniCare Connect works in 3 steps",
            workflowSubtitle: "Move from onboarding to verified support outcomes in one transparent workflow.",
            steps: [
              {
                step: "01",
                title: "Sign Up & Profile",
                description: "Create your account, set goals, and personalize your support journey."
              },
              {
                step: "02",
                title: "Personalized Dashboard",
                description:
                  "Get curated aid options, career paths, and wellness resources in one view."
              },
              {
                step: "03",
                title: "Apply & Track",
                description:
                  "Submit requests, monitor status updates, and follow every outcome in real time."
              }
            ],
            trusted: "Trusted by 25+ universities nationwide",
            trustedSubtitle: "Collaboration across Sri Lanka with public and private institutions.",
            ctaTitle: "Ready to Transform Your University Experience?",
            ctaBody:
              "Join 10,000+ students already using UniCare to access funding, career growth, and wellbeing support from one trusted platform.",
            badges: ["One account", "Real-time tracking", "University verified"],
            button: "Get Started Free"
          };

  const roleIcons = [GraduationCap, UserCheck, ShieldCheck];

  return (
    <div className="min-h-screen w-full bg-black text-white">
      <div className="mx-auto w-full max-w-6xl space-y-20 px-4 pb-20 pt-12 md:space-y-24 md:pt-16">
        {/* Role-Based Bento Grid before Core Modules */}
        <section className="space-y-10">
          <ScrollReveal className="space-y-3 text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {text.bentoTitle}
            </h1>
            <p className="max-w-2xl text-sm text-neutral-400 sm:text-base">
              {text.bentoSubtitle}
            </p>
          </ScrollReveal>

          <div className="grid gap-6 lg:grid-cols-3">
            {text.roles.map((role, index) => {
              const Icon = roleIcons[index] ?? GraduationCap;
              return (
                <ScrollReveal key={role.title} delay={index * 0.12}>
                  <div className="group flex h-full flex-col justify-between rounded-3xl border border-white/15 bg-neutral-950 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-white/35">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-white transition-colors group-hover:bg-white group-hover:text-black">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="font-mono text-xs font-bold tracking-widest text-neutral-500">
                          0{index + 1}
                        </span>
                      </div>

                      <h2 className="mt-6 text-xl font-bold text-white">{role.title}</h2>
                      <p className="mt-3 text-sm leading-relaxed text-neutral-400">{role.desc}</p>
                    </div>

                    <ul className="mt-6 space-y-2.5 border-t border-white/10 pt-5 text-xs font-medium text-neutral-300">
                      {role.points.map((pt) => (
                        <li key={pt} className="flex items-center gap-2.5">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </section>

        {/* Core Modules Around One Student Experience */}
        <EcosystemShowcase />

        {/* 3-Step Workflow */}
        <ScrollReveal>
          <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-neutral-950 p-6 text-white shadow-2xl md:p-10">
            <div className="mx-auto max-w-2xl space-y-2 text-center">
              <h2 className="text-2xl font-semibold text-white">{text.workflowTitle}</h2>
              <p className="text-sm text-neutral-400">{text.workflowSubtitle}</p>
            </div>
            <div className="mt-8 rounded-2xl border border-white/10 bg-black/60 p-6 md:p-8">
              <div className="relative">
                <div className="absolute left-7 right-7 top-7 hidden h-px bg-white/15 md:block" />

                <div className="grid gap-7 md:grid-cols-3 md:gap-6">
                  {text.steps.map((item, index) => (
                    <ScrollReveal key={item.step} delay={index * 0.12} yOffset={24}>
                      <div className="relative">
                        <div
                          className={`relative z-10 mb-4 flex items-center gap-3 md:mb-5 md:flex-col ${
                            index === 0 ? "md:items-start" : index === 1 ? "md:items-center" : "md:items-end"
                          }`}
                        >
                          <div className="grid h-14 w-14 place-items-center rounded-full border border-white/30 bg-white text-sm font-bold text-black shadow-sm">
                            {item.step}
                          </div>
                          {index < 2 ? (
                            <div className="h-px flex-1 bg-white/20 md:hidden" />
                          ) : null}
                        </div>

                        <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-neutral-400">
                          {item.description}
                        </p>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Partner Universities Marquee */}
        <ScrollReveal>
          <section>
            <div className="mx-auto max-w-3xl space-y-2 text-center">
              <h2 className="text-2xl font-semibold text-white">{text.trusted}</h2>
              <p className="text-sm text-neutral-400">{text.trustedSubtitle}</p>
            </div>
            <div className="marquee-wrap mt-6 overflow-hidden py-5">
              <div className="marquee-track">
                {[...partnerUniversities, ...partnerUniversities].map((university, index) => (
                  <div
                    key={`${university.name}-${index}`}
                    className="marquee-item rounded-2xl border border-white/15 bg-neutral-950 px-3 py-3"
                  >
                    <div className="marquee-item-inner">
                      <div className="marquee-logo relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-white p-1">
                        <Image
                          src={university.logo}
                          alt={`${university.name} logo`}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <p className="marquee-name text-sm font-semibold leading-5 text-neutral-200">
                        {university.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Bottom CTA */}
        <ScrollReveal>
          <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-neutral-950 p-6 text-white shadow-2xl sm:p-7 md:p-10">
            <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold leading-tight md:text-3xl">
                  {text.ctaTitle}
                </h2>
                <p className="max-w-2xl text-sm text-neutral-400 md:text-base">
                  {text.ctaBody}
                </p>
                <div className="flex flex-wrap gap-2 pt-1 text-xs text-neutral-300">
                  {text.badges.map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black shadow-lg transition-all hover:-translate-y-0.5 hover:bg-neutral-200"
              >
                {text.button}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>
        </ScrollReveal>
      </div>
    </div>
  );
}
