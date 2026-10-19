/**
 * C1 - Fictional sample students for demonstrations and evidence.
 *
 * These are NOT real students and are not drawn from any dataset. Each case is a
 * hand-written profile chosen to cover a situation the welfare office meets in
 * practice (rural single-parent family, high GPA but low income, a large family,
 * a comfortable household...), so the Vulnerability Index, its main factors and
 * the ranked scholarships can be shown and checked case by case.
 *
 * Used by the "Try a sample student" picker in the assessment tool and by
 * `npm run c1:demo-cases`, which writes docs/c1/evidence/demo-cases.json.
 *
 * Sinhala and Tamil labels are machine-assisted and need native-speaker review,
 * like the rest of src/lib/c1/i18n.ts.
 */
import type { Language } from "@/context/language-context";
import type { StudentFinancialProfile } from "./vulnerability";

export type DemoCase = {
  id: string;
  label: Record<Language, string>;
  /** One-line situation, used in the evidence report and speaker notes. */
  situation: string;
  profile: StudentFinancialProfile;
};

export const demoCases: DemoCase[] = [
  {
    id: "S01",
    label: {
      en: "Rural single-parent family, recent job loss",
      si: "ගම්බද තනි දෙමාපිය පවුල, මෑතකදී රැකියාව අහිමි වීම",
      ta: "கிராமப்புற ஒற்றைப் பெற்றோர் குடும்பம், சமீபத்திய வேலை இழப்பு"
    },
    situation: "Mother works informally; household lost income last year; student boards near campus.",
    profile: {
      monthlyHouseholdIncomeLkr: 28_000, householdSize: 4, dependents: 2, siblingsInEducation: 1,
      guardianEmployment: "informal", singleParent: true, hasEducationLoan: false, loanAmountLkr: 0,
      monthlyExpensesLkr: 30_000, accommodation: "boarding", ruralDistrict: true,
      financialShockLastYear: true, currentScholarship: false, gpa: 3.1, yearOfStudy: 3
    }
  },
  {
    id: "S02",
    label: {
      en: "Guardian deceased, education loan",
      si: "භාරකරු මියගොස්, අධ්‍යාපන ණයක් ඇත",
      ta: "பாதுகாவலர் இறந்துவிட்டார், கல்விக் கடன் உள்ளது"
    },
    situation: "Father deceased; three dependants; final-year student repaying an education loan.",
    profile: {
      monthlyHouseholdIncomeLkr: 22_000, householdSize: 5, dependents: 3, siblingsInEducation: 2,
      guardianEmployment: "deceased", singleParent: true, hasEducationLoan: true, loanAmountLkr: 600_000,
      monthlyExpensesLkr: 26_000, accommodation: "boarding", ruralDistrict: true,
      financialShockLastYear: false, currentScholarship: false, gpa: 2.8, yearOfStudy: 4
    }
  },
  {
    id: "S03",
    label: {
      en: "High GPA, low income",
      si: "ඉහළ GPA, අඩු ආදායම",
      ta: "உயர் GPA, குறைந்த வருமானம்"
    },
    situation: "Strong academic record from a low-income urban family; lives at home.",
    profile: {
      monthlyHouseholdIncomeLkr: 40_000, householdSize: 5, dependents: 2, siblingsInEducation: 1,
      guardianEmployment: "informal", singleParent: false, hasEducationLoan: false, loanAmountLkr: 0,
      monthlyExpensesLkr: 35_000, accommodation: "home", ruralDistrict: false,
      financialShockLastYear: false, currentScholarship: false, gpa: 3.8, yearOfStudy: 3
    }
  },
  {
    id: "S04",
    label: {
      en: "Unemployed guardian, hostel student",
      si: "රැකියා විරහිත භාරකරු, නේවාසිකාගාර සිසුවා",
      ta: "வேலையில்லாத பாதுகாவலர், விடுதி மாணவர்"
    },
    situation: "No regular household earner; student lives in a hostel far from a rural home.",
    profile: {
      monthlyHouseholdIncomeLkr: 18_000, householdSize: 4, dependents: 2, siblingsInEducation: 1,
      guardianEmployment: "unemployed", singleParent: false, hasEducationLoan: false, loanAmountLkr: 0,
      monthlyExpensesLkr: 20_000, accommodation: "hostel", ruralDistrict: true,
      financialShockLastYear: true, currentScholarship: false, gpa: 2.6, yearOfStudy: 4
    }
  },
  {
    id: "S05",
    label: {
      en: "Urban family hit by a financial shock",
      si: "මූල්‍ය කම්පනයකට ලක් වූ නාගරික පවුල",
      ta: "நிதி அதிர்ச்சியால் பாதிக்கப்பட்ட நகர்ப்புற குடும்பம்"
    },
    situation: "Six-member household, informal work, expenses close to income, loan taken last year.",
    profile: {
      monthlyHouseholdIncomeLkr: 55_000, householdSize: 6, dependents: 3, siblingsInEducation: 2,
      guardianEmployment: "informal", singleParent: false, hasEducationLoan: true, loanAmountLkr: 300_000,
      monthlyExpensesLkr: 52_000, accommodation: "home", ruralDistrict: false,
      financialShockLastYear: true, currentScholarship: false, gpa: 2.9, yearOfStudy: 3
    }
  },
  {
    id: "S06",
    label: {
      en: "Large family, retired guardian",
      si: "විශාල පවුල, විශ්‍රාමික භාරකරු",
      ta: "பெரிய குடும்பம், ஓய்வுபெற்ற பாதுகாவலர்"
    },
    situation: "Eight members living on a pension; three siblings also studying.",
    profile: {
      monthlyHouseholdIncomeLkr: 60_000, householdSize: 8, dependents: 5, siblingsInEducation: 3,
      guardianEmployment: "retired", singleParent: false, hasEducationLoan: false, loanAmountLkr: 0,
      monthlyExpensesLkr: 55_000, accommodation: "home", ruralDistrict: true,
      financialShockLastYear: false, currentScholarship: false, gpa: 3.0, yearOfStudy: 3
    }
  },
  {
    id: "S07",
    label: {
      en: "Low GPA, high need",
      si: "අඩු GPA, ඉහළ අවශ්‍යතාවය",
      ta: "குறைந்த GPA, அதிக தேவை"
    },
    situation: "Very low income and a recent shock, but a GPA below several scholarships' minimum.",
    profile: {
      monthlyHouseholdIncomeLkr: 25_000, householdSize: 5, dependents: 3, siblingsInEducation: 2,
      guardianEmployment: "informal", singleParent: true, hasEducationLoan: false, loanAmountLkr: 0,
      monthlyExpensesLkr: 27_000, accommodation: "boarding", ruralDistrict: true,
      financialShockLastYear: true, currentScholarship: false, gpa: 2.1, yearOfStudy: 3
    }
  },
  {
    id: "S08",
    label: {
      en: "Already receiving a scholarship",
      si: "දැනටමත් ශිෂ්‍යත්වයක් ලබන",
      ta: "ஏற்கனவே உதவித்தொகை பெறுபவர்"
    },
    situation: "Low-income rural student who already holds one scholarship.",
    profile: {
      monthlyHouseholdIncomeLkr: 35_000, householdSize: 4, dependents: 2, siblingsInEducation: 1,
      guardianEmployment: "informal", singleParent: false, hasEducationLoan: false, loanAmountLkr: 0,
      monthlyExpensesLkr: 30_000, accommodation: "boarding", ruralDistrict: true,
      financialShockLastYear: false, currentScholarship: true, gpa: 3.4, yearOfStudy: 4
    }
  },
  {
    id: "S09",
    label: {
      en: "Borderline: formal job, rural, boarding",
      si: "සීමාවේ: විධිමත් රැකියාව, ගම්බද, බෝඩිම",
      ta: "எல்லைநிலை: முறையான வேலை, கிராமப்புறம், தங்குமிடம்"
    },
    situation: "Middle income with a formal job, but boarding costs and a small loan.",
    profile: {
      monthlyHouseholdIncomeLkr: 75_000, householdSize: 4, dependents: 2, siblingsInEducation: 1,
      guardianEmployment: "formal", singleParent: false, hasEducationLoan: true, loanAmountLkr: 200_000,
      monthlyExpensesLkr: 60_000, accommodation: "boarding", ruralDistrict: true,
      financialShockLastYear: false, currentScholarship: false, gpa: 3.2, yearOfStudy: 3
    }
  },
  {
    id: "S10",
    label: {
      en: "Middle income, large education loan",
      si: "මධ්‍යම ආදායම, විශාල අධ්‍යාපන ණයක්",
      ta: "நடுத்தர வருமானம், பெரிய கல்விக் கடன்"
    },
    situation: "Comfortable salary, but a large loan taken for university fees.",
    profile: {
      monthlyHouseholdIncomeLkr: 120_000, householdSize: 4, dependents: 1, siblingsInEducation: 1,
      guardianEmployment: "formal", singleParent: false, hasEducationLoan: true, loanAmountLkr: 1_500_000,
      monthlyExpensesLkr: 85_000, accommodation: "boarding", ruralDistrict: false,
      financialShockLastYear: false, currentScholarship: false, gpa: 3.3, yearOfStudy: 4
    }
  },
  {
    id: "S11",
    label: {
      en: "Comfortable household, high GPA",
      si: "සුවපහසු පවුල, ඉහළ GPA",
      ta: "வசதியான குடும்பம், உயர் GPA"
    },
    situation: "Small family with a high formal income; excellent academic record.",
    profile: {
      monthlyHouseholdIncomeLkr: 220_000, householdSize: 3, dependents: 0, siblingsInEducation: 0,
      guardianEmployment: "formal", singleParent: false, hasEducationLoan: false, loanAmountLkr: 0,
      monthlyExpensesLkr: 90_000, accommodation: "home", ruralDistrict: false,
      financialShockLastYear: false, currentScholarship: false, gpa: 3.9, yearOfStudy: 4
    }
  },
  {
    id: "S12",
    label: {
      en: "Comfortable urban household",
      si: "සුවපහසු නාගරික පවුල",
      ta: "வசதியான நகர்ப்புற குடும்பம்"
    },
    situation: "High household income, lives at home in Colombo, no loans.",
    profile: {
      monthlyHouseholdIncomeLkr: 350_000, householdSize: 4, dependents: 1, siblingsInEducation: 0,
      guardianEmployment: "formal", singleParent: false, hasEducationLoan: false, loanAmountLkr: 0,
      monthlyExpensesLkr: 120_000, accommodation: "home", ruralDistrict: false,
      financialShockLastYear: false, currentScholarship: false, gpa: 3.5, yearOfStudy: 3
    }
  }
];
