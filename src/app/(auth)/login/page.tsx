"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useLanguage, type Language } from "@/context/language-context";
import { Input } from "@/components/shared/Input";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { getDashboardPathForRole } from "@/lib/auth-redirect";
import { loginSchema, registerSchema, optionalUrlSchema, sriLankaPhoneSchema } from "@/lib/validation";
import {
  OTHER_UNIVERSITY_VALUE,
  getDegreeProgramsForUniversity,
  isOtherSelection,
  localizeSignupOptionLabel
} from "@/lib/signup-data";
import { getRoleConfigs, type UserRole } from "@/lib/signup-role-config";
import { UniversityPicker } from "@/components/auth/university-picker";
import { RolePicker } from "@/components/auth/role-picker";
import { DegreePicker } from "@/components/auth/degree-picker";
import { LanguageSwitcher } from "@/components/shared/language-switcher";

type AuthMode = "signin" | "signup";

type SignUpData = {
  role: UserRole | "";
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  fieldA: string;
  fieldB: string;
  fieldC: string;
  fieldAOther: string;
  fieldBOther: string;
  acceptedTerms: boolean;
};

const INITIAL_SIGNUP_DATA: SignUpData = {
  role: "",
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  fieldA: "",
  fieldB: "",
  fieldC: "",
  fieldAOther: "",
  fieldBOther: "",
  acceptedTerms: false
};

function sanitizeFullNameInput(value: string): string {
  return value.replace(/[^\p{L}\s'-]/gu, "");
}

function resolveFieldA(data: SignUpData): string {
  if (data.fieldA === OTHER_UNIVERSITY_VALUE) return data.fieldAOther.trim();
  return data.fieldA.trim();
}
function resolveFieldB(data: SignUpData): string {
  if (isOtherSelection(data.fieldB)) return data.fieldBOther.trim();
  return data.fieldB.trim();
}

const AUTH_TEXT: Record<
  Language,
  {
    verifyEmailFirst: string;
    noAccountProfile: string;
    accountDeleted: string;
    accountBlocked: string;
    dbConnectionFailed: string;
    unableValidateStatus: string;
    incorrectEmailOrPassword: string;
    noAccountForEmail: string;
    incorrectPassword: string;
    tooManyLoginAttempts: string;
    networkIssue: string;
    invalidEmail: string;
    unableSignIn: string;
    accountCreationFailed: string;
    verificationEmailFailed: string;
    emailAlreadyInUse: string;
    strongerPassword: string;
    emailPasswordSignupDisabled: string;
    authMisconfigured: string;
    tooManyAttempts: string;
    unableCreateAccount: string;
    validEmailPasswordRequired: string;
    adminSignupDisabled: string;
    selectRoleContinue: string;
    fullNameRequired: string;
    atLeastTwoChars: string;
    emailRequired: string;
    passwordRequired: string;
    passwordAtLeast6: string;
    confirmPasswordRequired: string;
    passwordsMismatch: string;
    completeRequiredFixErrors: string;
    selectOrEnterUniversity: string;
    selectOrEnterDegree: string;
    enterField: (fieldLabel: string) => string;
    invalidUrl: string;
    invalidPhone: string;
    acceptTerms: string;
    accountCreatedSuccess: string;
    selectRole: string;
    rolePlaceholder: string;
    roleAria: string;
    fullName: string;
    yourFullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    min6Chars: string;
    reenterPassword: string;
    universityPlaceholder: string;
    universityAria: string;
    enterUniversityName: string;
    degreePlaceholder: string;
    degreeAria: string;
    enterDegreeProgram: string;
    pleaseSpecify: string;
    optionalLabel: string;
    reviewDetails: string;
    name: string;
    role: string;
    termsStatement: string;
    signInTab: string;
    signUpTab: string;
    welcomeBack: string;
    createUniCareAccount: string;
    signInSubtitle: string;
    signUpSubtitle: string;
    emailVerifiedSuccess: string;
    signInButton: string;
    signingIn: string;
    signInWithGoogle: string;
    forgotPassword: string;
    createAccountLink: string;
    step: string;
    back: string;
    alreadyHaveAccount: string;
    continue: string;
    createAccountButton: string;
    accountCreatedTitle: string;
    ok: string;
  }
> = {
  en: {
    verifyEmailFirst: "Please verify your email first, then sign in.",
    noAccountProfile: "No account profile found. Please contact support.",
    accountDeleted: "This account has been deleted.",
    accountBlocked: "Your account is blocked. Please contact support.",
    dbConnectionFailed: "Database connection failed. Please try again in a minute.",
    unableValidateStatus: "Unable to validate account status right now. Please try again.",
    incorrectEmailOrPassword: "Incorrect email or password. Please try again.",
    noAccountForEmail: "No account found for this email.",
    incorrectPassword: "Incorrect password. Please try again.",
    tooManyLoginAttempts: "Too many login attempts. Please wait and try again.",
    networkIssue: "Network issue. Check your connection and try again.",
    invalidEmail: "Please enter a valid email address.",
    unableSignIn: "Unable to sign in. Please try again.",
    accountCreationFailed: "Account creation failed while saving your profile. Please try again.",
    verificationEmailFailed: "Your account was created, but verification email failed. Please try again.",
    emailAlreadyInUse: "An account with this email already exists. Sign in instead or use a different email.",
    strongerPassword: "Use a stronger password (at least 6 characters).",
    emailPasswordSignupDisabled: "Email/password sign-up is not enabled. Enable it in Firebase Console under Authentication -> Sign-in method.",
    authMisconfigured: "Authentication is misconfigured. Check your Firebase API key.",
    tooManyAttempts: "Too many attempts. Please try again later.",
    unableCreateAccount: "Unable to create account. Please try again.",
    validEmailPasswordRequired: "Please provide a valid email and password.",
    adminSignupDisabled:
      "University Admin / Faculty accounts require approval. Please contact support to create this role.",
    selectRoleContinue: "Please select your role to continue.",
    fullNameRequired: "Full name is required.",
    atLeastTwoChars: "Please enter at least 2 characters.",
    emailRequired: "Email is required.",
    passwordRequired: "Password is required.",
    passwordAtLeast6: "Password must be at least 6 characters.",
    confirmPasswordRequired: "Please confirm your password.",
    passwordsMismatch: "Passwords do not match.",
    completeRequiredFixErrors: "Please complete all required fields and fix any errors.",
    selectOrEnterUniversity: "Please select or enter your university.",
    selectOrEnterDegree: "Please select or enter your degree program.",
    enterField: (fieldLabel) => `Please enter ${fieldLabel.toLowerCase()}.`,
    invalidUrl: "Invalid URL.",
    invalidPhone: "Invalid phone number.",
    acceptTerms: "Please accept the terms to create your account.",
    accountCreatedSuccess:
      "Your account was created successfully. Please check your email and verify your account before signing in.",
    selectRole: "Select your role",
    rolePlaceholder: "Choose your role",
    roleAria: "Role",
    fullName: "Full name",
    yourFullName: "Your full name",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm password",
    min6Chars: "Minimum 6 characters",
    reenterPassword: "Re-enter password",
    universityPlaceholder: "Choose your university",
    universityAria: "University",
    enterUniversityName: "Enter university name",
    degreePlaceholder: "Select degree program",
    degreeAria: "Degree program",
    enterDegreeProgram: "Enter degree program",
    pleaseSpecify: "Please specify",
    optionalLabel: "(Optional)",
    reviewDetails: "Review details",
    name: "Name",
    role: "Role",
    termsStatement: "I agree to UniCare Connect terms and understand this account is for verified support access.",
    signInTab: "Sign in",
    signUpTab: "Sign up",
    welcomeBack: "Welcome back to UniCare Connect",
    createUniCareAccount: "Create your UniCare account",
    signInSubtitle: "Sign in to continue your support journey.",
    signUpSubtitle: "Complete a simple 4-step setup based on your role.",
    emailVerifiedSuccess: "Email verified successfully. You can now sign in.",
    signInButton: "Sign in",
    signingIn: "Signing in...",
    signInWithGoogle: "Sign in with Google",
    forgotPassword: "Forgot password?",
    createAccountLink: "Create account",
    step: "Step",
    back: "Back",
    alreadyHaveAccount: "Already have an account?",
    continue: "Continue",
    createAccountButton: "Create account",
    accountCreatedTitle: "Account Created",
    ok: "OK"
  },
  si: {
    verifyEmailFirst: "පළමුව ඔබගේ ඊමේල් ලිපිනය තහවුරු කර පිවිසෙන්න.",
    noAccountProfile: "ගිණුම් පැතිකඩක් හමු නොවීය. සහාය අමතන්න.",
    accountDeleted: "මෙම ගිණුම මකා දමා ඇත.",
    accountBlocked: "ඔබගේ ගිණුම අවහිර කර ඇත. සහාය අමතන්න.",
    dbConnectionFailed: "දත්ත සමුදා සම්බන්ධතාවය අසමත් විය. මිනිත්තුවකින් නැවත උත්සාහ කරන්න.",
    unableValidateStatus: "දැනට ගිණුම් තත්ත්වය තහවුරු කළ නොහැක. නැවත උත්සාහ කරන්න.",
    incorrectEmailOrPassword: "ඊමේල් හෝ මුරපදය වැරදියි. නැවත උත්සාහ කරන්න.",
    noAccountForEmail: "මෙම ඊමේල් සඳහා ගිණුමක් නොමැත.",
    incorrectPassword: "මුරපදය වැරදියි. නැවත උත්සාහ කරන්න.",
    tooManyLoginAttempts: "ප්‍රවේශ උත්සාහයන් වැඩියි. ටිකක් රැඳී නැවත උත්සාහ කරන්න.",
    networkIssue: "ජාල ගැටළුවක් ඇත. සම්බන්ධතාවය පරීක්ෂා කර නැවත උත්සාහ කරන්න.",
    invalidEmail: "කරුණාකර වලංගු ඊමේල් ලිපිනයක් ඇතුළත් කරන්න.",
    unableSignIn: "පිවිසීමට නොහැකි විය. නැවත උත්සාහ කරන්න.",
    accountCreationFailed: "ඔබගේ පැතිකඩ සුරකින අතරතුර ගිණුම සෑදීම අසමත් විය. නැවත උත්සාහ කරන්න.",
    verificationEmailFailed: "ගිණුම සෑදිණි, නමුත් තහවුරු කිරීමේ ඊමේල් යැවීම අසමත් විය.",
    emailAlreadyInUse: "මෙම ඊමේල් සමඟ ගිණුමක් දැනටමත් ඇත. පිවිසෙන්න හෝ වෙනත් ඊමේල් භාවිතා කරන්න.",
    strongerPassword: "වඩා ශක්තිමත් මුරපදයක් භාවිතා කරන්න (අවම අක්ෂර 6ක්).",
    emailPasswordSignupDisabled: "Email/password ලියාපදිංචිය සක්‍රීය කර නැත.",
    authMisconfigured: "Authentication සැකසුම වැරදියි.",
    tooManyAttempts: "උත්සාහයන් වැඩියි. පසුව නැවත උත්සාහ කරන්න.",
    unableCreateAccount: "ගිණුම සෑදීමට නොහැකි විය. නැවත උත්සාහ කරන්න.",
    validEmailPasswordRequired: "කරුණාකර වලංගු ඊමේල් සහ මුරපදයක් ලබා දෙන්න.",
    adminSignupDisabled: "පරිපාලක ගිණුම් සඳහා අනුමැතිය අවශ්‍ය වේ.",
    selectRoleContinue: "ඉදිරියට යාමට ඔබගේ භූමිකාව තෝරන්න.",
    fullNameRequired: "සම්පූර්ණ නම අනිවාර්යයි.",
    atLeastTwoChars: "අවම වශයෙන් අක්ෂර 2ක් ඇතුළත් කරන්න.",
    emailRequired: "ඊමේල් අනිවාර්යයි.",
    passwordRequired: "මුරපදය අනිවාර්යයි.",
    passwordAtLeast6: "මුරපදය අවම වශයෙන් අක්ෂර 6ක් විය යුතුය.",
    confirmPasswordRequired: "කරුණාකර මුරපදය තහවුරු කරන්න.",
    passwordsMismatch: "මුරපද ගැළපෙන්නේ නැත.",
    completeRequiredFixErrors: "අවශ්‍ය ක්ෂේත්‍ර පුරවා දෝෂ නිවැරදි කරන්න.",
    selectOrEnterUniversity: "ඔබගේ විශ්වවිද්‍යාලය තෝරන්න හෝ ඇතුළත් කරන්න.",
    selectOrEnterDegree: "ඔබගේ උපාධි වැඩසටහන තෝරන්න හෝ ඇතුළත් කරන්න.",
    enterField: (fieldLabel) => `${fieldLabel} ඇතුළත් කරන්න.`,
    invalidUrl: "වලංගු නොවන URL එකකි.",
    invalidPhone: "වලංගු නොවන දුරකථන අංකය.",
    acceptTerms: "ගිණුම සෑදීමට පෙර කොන්දේසි පිළිගන්න.",
    accountCreatedSuccess: "ඔබගේ ගිණුම සාර්ථකව සෑදිණි. පිවිසීමට පෙර ඊමේල් තහවුරු කිරීම සම්පූර්ණ කරන්න.",
    selectRole: "ඔබගේ භූමිකාව තෝරන්න",
    rolePlaceholder: "ඔබගේ භූමිකාව තෝරන්න",
    roleAria: "භූමිකාව",
    fullName: "සම්පූර්ණ නම",
    yourFullName: "ඔබගේ සම්පූර්ණ නම",
    email: "ඊමේල්",
    password: "මුරපදය",
    confirmPassword: "මුරපදය තහවුරු කරන්න",
    min6Chars: "අවම අක්ෂර 6ක්",
    reenterPassword: "මුරපදය නැවත ඇතුළත් කරන්න",
    universityPlaceholder: "ඔබගේ විශ්වවිද්‍යාලය තෝරන්න",
    universityAria: "විශ්වවිද්‍යාලය",
    enterUniversityName: "විශ්වවිද්‍යාල නම ඇතුළත් කරන්න",
    degreePlaceholder: "උපාධි වැඩසටහන තෝරන්න",
    degreeAria: "උපාධි වැඩසටහන",
    enterDegreeProgram: "උපාධි වැඩසටහන ඇතුළත් කරන්න",
    pleaseSpecify: "විස්තර කරන්න",
    optionalLabel: "(විකල්ප)",
    reviewDetails: "තොරතුරු සමාලෝචනය",
    name: "නම",
    role: "භූමිකාව",
    termsStatement: "මම UniCare Connect කොන්දේසි පිළිගනිමි සහ මෙම ගිණුම තහවුරු කළ සහය ප්‍රවේශයට බව අවබෝධ කරමි.",
    signInTab: "පිවිසෙන්න",
    signUpTab: "ලියාපදිංචි වන්න",
    welcomeBack: "UniCare Connect වෙත නැවත සාදරයෙන් පිළිගනිමු",
    createUniCareAccount: "ඔබගේ UniCare ගිණුම සාදන්න",
    signInSubtitle: "ඔබගේ සහය ගමන ඉදිරියට ගෙන යාමට පිවිසෙන්න.",
    signUpSubtitle: "ඔබගේ භූමිකාව අනුව පියවර 4ක සරල සැකසුම සම්පූර්ණ කරන්න.",
    emailVerifiedSuccess: "ඊමේල් සාර්ථකව තහවුරු විය. දැන් ඔබට පිවිසිය හැක.",
    signInButton: "පිවිසෙන්න",
    signingIn: "පිවිසෙමින්...",
    signInWithGoogle: "Google මඟින් පිවිසෙන්න",
    forgotPassword: "මුරපදය අමතකද?",
    createAccountLink: "ගිණුම සාදන්න",
    step: "පියවර",
    back: "ආපසු",
    alreadyHaveAccount: "දැනටමත් ගිණුමක් තිබේද?",
    continue: "ඉදිරියට",
    createAccountButton: "ගිණුම සාදන්න",
    accountCreatedTitle: "ගිණුම සෑදිණි",
    ok: "හරි"
  },
  ta: {
    verifyEmailFirst: "முதலில் உங்கள் மின்னஞ்சலை சரிபார்த்து பின்னர் உள்நுழையவும்.",
    noAccountProfile: "கணக்கு சுயவிவரம் கிடைக்கவில்லை. ஆதரவைக் தொடர்பு கொள்ளவும்.",
    accountDeleted: "இந்த கணக்கு நீக்கப்பட்டுள்ளது.",
    accountBlocked: "உங்கள் கணக்கு தடுக்கப்பட்டுள்ளது. ஆதரவைக் தொடர்பு கொள்ளவும்.",
    dbConnectionFailed: "தரவுத்தள இணைப்பு தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.",
    unableValidateStatus: "இப்போது கணக்கு நிலையை சரிபார்க்க முடியவில்லை.",
    incorrectEmailOrPassword: "மின்னஞ்சல் அல்லது கடவுச்சொல் தவறு.",
    noAccountForEmail: "இந்த மின்னஞ்சலுக்கு கணக்கு இல்லை.",
    incorrectPassword: "கடவுச்சொல் தவறு. மீண்டும் முயற்சிக்கவும்.",
    tooManyLoginAttempts: "மிக அதிக உள்நுழைவு முயற்சிகள். சிறிது நேரம் காத்திருந்து முயற்சிக்கவும்.",
    networkIssue: "நெட்வொர்க் சிக்கல். இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.",
    invalidEmail: "சரியான மின்னஞ்சல் முகவரியை உள்ளிடவும்.",
    unableSignIn: "உள்நுழைய முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
    accountCreationFailed: "கணக்கு உருவாக்கம் தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.",
    verificationEmailFailed: "கணக்கு உருவாக்கப்பட்டது, ஆனால் சரிபார்ப்பு மின்னஞ்சல் அனுப்பல் தோல்வியடைந்தது.",
    emailAlreadyInUse: "இந்த மின்னஞ்சலுடன் ஏற்கனவே ஒரு கணக்கு உள்ளது.",
    strongerPassword: "வலுவான கடவுச்சொல்லைப் பயன்படுத்தவும் (குறைந்தது 6 எழுத்துகள்).",
    emailPasswordSignupDisabled: "Email/password பதிவு செயல்படுத்தப்படவில்லை.",
    authMisconfigured: "Authentication தவறாக அமைக்கப்பட்டுள்ளது.",
    tooManyAttempts: "மிக அதிக முயற்சிகள். பின்னர் மீண்டும் முயற்சிக்கவும்.",
    unableCreateAccount: "கணக்கை உருவாக்க முடியவில்லை.",
    validEmailPasswordRequired: "சரியான மின்னஞ்சல் மற்றும் கடவுச்சொல்லை வழங்கவும்.",
    adminSignupDisabled: "நிர்வாக கணக்கு பதிவுக்கு அனுமதி தேவை.",
    selectRoleContinue: "தொடர உங்கள் பங்கை தேர்ந்தெடுக்கவும்.",
    fullNameRequired: "முழுப்பெயர் அவசியம்.",
    atLeastTwoChars: "குறைந்தது 2 எழுத்துகளை உள்ளிடவும்.",
    emailRequired: "மின்னஞ்சல் அவசியம்.",
    passwordRequired: "கடவுச்சொல் அவசியம்.",
    passwordAtLeast6: "கடவுச்சொல் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்.",
    confirmPasswordRequired: "தயவுசெய்து உங்கள் கடவுச்சொல்லை உறுதிப்படுத்தவும்.",
    passwordsMismatch: "கடவுச்சொற்கள் பொருந்தவில்லை.",
    completeRequiredFixErrors: "தேவையான புலங்களை பூர்த்தி செய்து பிழைகளைச் சரிசெய்யவும்.",
    selectOrEnterUniversity: "உங்கள் பல்கலைக்கழகத்தை தேர்ந்தெடுக்கவும் அல்லது உள்ளிடவும்.",
    selectOrEnterDegree: "உங்கள் பட்டப்படிப்பு திட்டத்தை தேர்ந்தெடுக்கவும் அல்லது உள்ளிடவும்.",
    enterField: (fieldLabel) => `${fieldLabel} ஐ உள்ளிடவும்.`,
    invalidUrl: "தவறான URL.",
    invalidPhone: "தவறான தொலைபேசி எண்.",
    acceptTerms: "கணக்கை உருவாக்க விதிமுறைகளை ஏற்கவும்.",
    accountCreatedSuccess: "உங்கள் கணக்கு வெற்றிகரமாக உருவாக்கப்பட்டது. உள்நுழைவதற்கு முன் மின்னஞ்சல் சரிபார்ப்பை முடிக்கவும்.",
    selectRole: "உங்கள் பங்கை தேர்ந்தெடுக்கவும்",
    rolePlaceholder: "உங்கள் பங்கை தேர்ந்தெடுக்கவும்",
    roleAria: "பங்கு",
    fullName: "முழுப்பெயர்",
    yourFullName: "உங்கள் முழுப்பெயர்",
    email: "மின்னஞ்சல்",
    password: "கடவுச்சொல்",
    confirmPassword: "கடவுச்சொல்லை உறுதிப்படுத்தவும்",
    min6Chars: "குறைந்தது 6 எழுத்துகள்",
    reenterPassword: "கடவுச்சொல்லை மீண்டும் உள்ளிடவும்",
    universityPlaceholder: "உங்கள் பல்கலைக்கழகத்தை தேர்ந்தெடுக்கவும்",
    universityAria: "பல்கலைக்கழகம்",
    enterUniversityName: "பல்கலைக்கழக பெயரை உள்ளிடவும்",
    degreePlaceholder: "பட்டப்படிப்பு திட்டத்தை தேர்ந்தெடுக்கவும்",
    degreeAria: "பட்டப்படிப்பு திட்டம்",
    enterDegreeProgram: "பட்டப்படிப்பு திட்டத்தை உள்ளிடவும்",
    pleaseSpecify: "தயவுசெய்து குறிப்பிடவும்",
    optionalLabel: "(விருப்பம்)",
    reviewDetails: "விவரங்களை சரிபார்க்கவும்",
    name: "பெயர்",
    role: "பங்கு",
    termsStatement: "UniCare Connect விதிமுறைகளை ஏற்கிறேன், மேலும் இந்த கணக்கு சரிபார்க்கப்பட்ட ஆதரவு அணுகலுக்கானது என்பதை புரிந்துகொள்கிறேன்.",
    signInTab: "உள்நுழை",
    signUpTab: "பதிவு செய்",
    welcomeBack: "UniCare Connect க்கு மீண்டும் வரவேற்கிறோம்",
    createUniCareAccount: "உங்கள் UniCare கணக்கை உருவாக்கவும்",
    signInSubtitle: "உங்கள் ஆதரவு பயணத்தை தொடர உள்நுழைக.",
    signUpSubtitle: "உங்கள் பங்கை அடிப்படையாகக் கொண்ட எளிய 4 படி அமைப்பை முடிக்கவும்.",
    emailVerifiedSuccess: "மின்னஞ்சல் வெற்றிகரமாக சரிபார்க்கப்பட்டது. இப்போது உள்நுழையலாம்.",
    signInButton: "உள்நுழை",
    signingIn: "உள்நுழைகிறது...",
    signInWithGoogle: "Google மூலம் உள்நுழை",
    forgotPassword: "கடவுச்சொல் மறந்துவிட்டதா?",
    createAccountLink: "கணக்கை உருவாக்கவும்",
    step: "படி",
    back: "பின்னுக்கு",
    alreadyHaveAccount: "ஏற்கனவே கணக்கு உள்ளதா?",
    continue: "தொடரவும்",
    createAccountButton: "கணக்கை உருவாக்கவும்",
    accountCreatedTitle: "கணக்கு உருவாக்கப்பட்டது",
    ok: "சரி"
  }
};

export default function LoginPage() {
  const { signInWithEmail, signInWithGoogle, registerWithEmail, user, firebaseUser, loading } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = AUTH_TEXT[language];
  const roleConfigs = getRoleConfigs(language);
  const defaultMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const isVerifiedRedirect = searchParams.get("verified") === "1";
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState<string | null>(null);
  const [signUpPopupMessage, setSignUpPopupMessage] = useState<string | null>(null);
  const [signUpStep, setSignUpStep] = useState(1);
  const [signUpData, setSignUpData] = useState<SignUpData>(INITIAL_SIGNUP_DATA);
  const [recentlyRegisteredEmail, setRecentlyRegisteredEmail] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ fieldA?: string; fieldB?: string; fieldC?: string }>({});
  const [step2Errors, setStep2Errors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);

  const selectedRoleConfig = signUpData.role ? roleConfigs[signUpData.role] : null;
  const isStudent = signUpData.role === "student";
  const isUniversityRole = signUpData.role === "student" || signUpData.role === "faculty";
  const degreePrograms = isStudent
    ? getDegreeProgramsForUniversity(
        signUpData.fieldA === OTHER_UNIVERSITY_VALUE ? "" : signUpData.fieldA
      )
    : [];

  const isDatabaseErrorMessage = (msg: string) =>
    /Mongo|MONGODB|connection|ECONNREFUSED|ETIMEDOUT|timed out|not configured/i.test(msg);

  const getReadableAuthError = (error: unknown) => {
    if (error instanceof Error && error.message === "EMAIL_NOT_VERIFIED") {
      return t.verifyEmailFirst;
    }
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return t.noAccountProfile;
    }
    if (error instanceof Error && error.message === "ACCOUNT_DELETED") {
      return t.accountDeleted;
    }
    if (error instanceof Error && error.message === "ACCOUNT_BLOCKED") {
      return t.accountBlocked;
    }
    if (error instanceof Error && error.message === "DB_CONNECTION_FAILED") {
      return t.dbConnectionFailed;
    }
    if (error instanceof Error && isDatabaseErrorMessage(error.message)) {
      return `${t.dbConnectionFailed} ${error.message}`;
    }
    if (error instanceof Error && error.message === "SIGNIN_PRECHECK_FAILED") {
      return t.unableValidateStatus;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
    ) {
      const code = (error as { code: string }).code;

      if (code === "auth/invalid-credential") {
        return t.incorrectEmailOrPassword;
      }
      if (code === "auth/user-not-found") {
        return t.noAccountForEmail;
      }
      if (code === "auth/wrong-password") {
        return t.incorrectPassword;
      }
      if (code === "auth/too-many-requests") {
        return t.tooManyLoginAttempts;
      }
      if (code === "auth/network-request-failed") {
        return t.networkIssue;
      }
      if (code === "auth/invalid-email") {
        return t.invalidEmail;
      }
    }

    return t.unableSignIn;
  };

  const [pendingRedirect, setPendingRedirect] = useState(false);
  const [signInBusy, setSignInBusy] = useState(false);

  useEffect(() => {
    if (!pendingRedirect || loading) return;

    if (firebaseUser && !user) {
      return;
    }

    if (!firebaseUser) {
      setPendingRedirect(false);
      setSignInBusy(false);
      setSignInError(t.accountBlocked);
      return;
    }

    const nextPath = user
      ? user.needsProfileCompletion
        ? "/auth/complete-profile"
        : getDashboardPathForRole(user.role)
      : "/dashboard";

    setPendingRedirect(false);
    setSignInBusy(false);
    router.push(nextPath);
  }, [pendingRedirect, loading, firebaseUser, user, router, t.accountBlocked]);

  const getReadableSignUpError = (error: unknown) => {
    if (error instanceof Error && error.message === "ACCOUNT_SYNC_FAILED") {
      return t.accountCreationFailed;
    }
    if (error instanceof Error && error.message === "DB_CONNECTION_FAILED") {
      return t.dbConnectionFailed;
    }
    if (error instanceof Error && isDatabaseErrorMessage(error.message)) {
      return `${t.dbConnectionFailed} ${error.message}`;
    }
    if (error instanceof Error && error.message === "VERIFICATION_EMAIL_SEND_FAILED") {
      return t.verificationEmailFailed;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
    ) {
      const code = (error as { code: string }).code;

      if (code === "auth/email-already-in-use") {
        return t.emailAlreadyInUse;
      }
      if (code === "auth/invalid-email") {
        return t.invalidEmail;
      }
      if (code === "auth/weak-password") {
        return t.strongerPassword;
      }
      if (code === "auth/network-request-failed") {
        return t.networkIssue;
      }
      if (code === "auth/operation-not-allowed") {
        return t.emailPasswordSignupDisabled;
      }
      if (code === "auth/invalid-api-key" || code === "auth/api-key-not-valid") {
        return t.authMisconfigured;
      }
      if (code === "auth/too-many-requests") {
        return t.tooManyAttempts;
      }
    }

    return t.unableCreateAccount;
  };

  const handleSignInSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignInError(null);
    setSignInBusy(true);

    const data = new FormData(event.currentTarget);
    const values = {
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? "")
    };

    const result = loginSchema.safeParse(values);
    if (!result.success) {
      setSignInError(t.validEmailPasswordRequired);
      setSignInBusy(false);
      return;
    }

    try {
      await signInWithEmail(result.data.email, result.data.password);
      setPendingRedirect(true);
    } catch (error) {
      setSignInError(getReadableAuthError(error));
      setSignInBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSignInError(null);
    setSignInBusy(true);
    try {
      await signInWithGoogle();
      setPendingRedirect(true);
    } catch (error) {
      setSignInError(getReadableAuthError(error));
      setSignInBusy(false);
    }
  };

  const updateSignUpField = (field: keyof SignUpData, value: string | boolean) => {
    setSignUpData((previous) => ({ ...previous, [field]: value }));
  };

  const validateSignUpStep = (step: number): string | null => {
    setFieldErrors({});
    if (step === 1) {
      if (!signUpData.role) return t.selectRoleContinue;
      if (signUpData.role === "admin") return t.adminSignupDisabled;
      return null;
    }

    if (step === 2) {
      setStep2Errors({});
      const err: { name?: string; email?: string; password?: string; confirmPassword?: string } = {};
      if (!signUpData.name.trim()) err.name = t.fullNameRequired;
      else if (signUpData.name.trim().length < 2) err.name = t.atLeastTwoChars;
      else {
        const nameResult = registerSchema.shape.name.safeParse(signUpData.name);
        if (!nameResult.success) {
          err.name = nameResult.error.errors[0]?.message ?? "Name can only contain letters.";
        }
      }
      const emailResult = registerSchema.shape.email.safeParse(signUpData.email);
      if (!signUpData.email.trim()) err.email = t.emailRequired;
      else if (!emailResult.success) err.email = t.invalidEmail;
      if (!signUpData.password) err.password = t.passwordRequired;
      else if (signUpData.password.length < 6) err.password = t.passwordAtLeast6;
      if (!signUpData.confirmPassword) err.confirmPassword = t.confirmPasswordRequired;
      else if (signUpData.password !== signUpData.confirmPassword)
        err.confirmPassword = t.passwordsMismatch;
      if (Object.keys(err).length > 0) {
        setStep2Errors(err);
        return t.completeRequiredFixErrors;
      }
      return null;
    }

    if (step === 3 && selectedRoleConfig) {
      const a = resolveFieldA(signUpData);
      const b = resolveFieldB(signUpData);
      const c = signUpData.fieldC.trim();
      const err: { fieldA?: string; fieldB?: string; fieldC?: string } = {};

      if (!a) {
        err.fieldA =
          selectedRoleConfig.field1Kind === "university"
            ? t.selectOrEnterUniversity
            : t.enterField(selectedRoleConfig.fields[0].label.replace(" (Optional)", ""));
      }
      if (!b) {
        err.fieldB =
          selectedRoleConfig.field2Kind === "degree"
            ? t.selectOrEnterDegree
            : t.enterField(selectedRoleConfig.fields[1].label.replace(" (Optional)", ""));
      }

      const field3Optional = selectedRoleConfig.fields[2].optional;
      if (!field3Optional && !c) {
        err.fieldC = t.enterField(selectedRoleConfig.fields[2].label.replace(" (Optional)", ""));
      } else if (c) {
        if (selectedRoleConfig.fields[2].type === "url") {
          const urlResult = optionalUrlSchema.safeParse(c);
          if (!urlResult.success) err.fieldC = urlResult.error.errors[0]?.message ?? t.invalidUrl;
        } else if (selectedRoleConfig.fields[2].type === "tel") {
          const phoneResult = sriLankaPhoneSchema.safeParse(c);
          if (!phoneResult.success) err.fieldC = phoneResult.error.errors[0]?.message ?? t.invalidPhone;
        }
      }

      if (Object.keys(err).length > 0) {
        setFieldErrors(err);
        return t.completeRequiredFixErrors;
      }
      return null;
    }

    if (!signUpData.acceptedTerms) {
      return t.acceptTerms;
    }
    return null;
  };

  const goToNextSignUpStep = () => {
    setSignUpError(null);
    const error = validateSignUpStep(signUpStep);
    if (error) {
      setSignUpError(error);
      return;
    }

    setSignUpStep((previous) => Math.min(4, previous + 1));
  };

  const goToPreviousSignUpStep = () => {
    setSignUpError(null);
    setFieldErrors({});
    setStep2Errors({});
    setSignUpStep((previous) => Math.max(1, previous - 1));
  };

  const handleSignUpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignUpError(null);
    setSignUpSuccess(null);

    const error = validateSignUpStep(4);
    if (error) {
      setSignUpError(error);
      return;
    }

    try {
      await registerWithEmail(signUpData.email, signUpData.password, {
        name: signUpData.name,
        role: signUpData.role || undefined,
        fieldA: resolveFieldA(signUpData),
        fieldB: resolveFieldB(signUpData),
        fieldC: signUpData.fieldC.trim()
      });
      const successMessage = t.accountCreatedSuccess;
      setRecentlyRegisteredEmail(signUpData.email);
      setSignUpSuccess(successMessage);
      setSignUpPopupMessage(successMessage);
      setMode("signin");
      setSignUpStep(1);
      setSignUpData(INITIAL_SIGNUP_DATA);
    } catch (error) {
      setSignUpError(getReadableSignUpError(error));
    }
  };

  const darkInputClass =
    "border-white/15 bg-neutral-900 text-white placeholder:text-neutral-500 focus:border-white/40 dark:border-white/15 dark:bg-neutral-900";

  const renderSignUpStep = () => {
    if (signUpStep === 1) {
      const signupRoles: UserRole[] = [
        "student",
        "faculty",
        "mentor",
        "donor",
        "employer",
        "ngo",
        "parent"
      ];
      const roleOptions = signupRoles.map((role) => ({
        value: role,
        label: roleConfigs[role].label
      }));
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-200" htmlFor="role">
            {t.selectRole}
          </label>
          <RolePicker
            id="role"
            options={roleOptions}
            value={signUpData.role}
            onChange={(v) => updateSignUpField("role", v)}
            placeholder={t.rolePlaceholder}
            aria-label={t.roleAria}
          />
          {selectedRoleConfig ? (
            <p className="text-xs text-neutral-400">{selectedRoleConfig.helper}</p>
          ) : null}
        </div>
      );
    }

    if (signUpStep === 2) {
      return (
        <div className="grid gap-3.5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-neutral-200" htmlFor="signup-name">
              {t.fullName} <span className="text-rose-400">*</span>
            </label>
            <Input
              id="signup-name"
              value={signUpData.name}
              onChange={(event) => {
                updateSignUpField("name", sanitizeFullNameInput(event.target.value));
                if (step2Errors.name) setStep2Errors((e) => ({ ...e, name: undefined }));
              }}
              placeholder={t.yourFullName}
              required
              className={`${darkInputClass} ${step2Errors.name ? "border-rose-400" : ""}`}
            />
            {step2Errors.name && <p className="text-xs text-rose-400">{step2Errors.name}</p>}
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-neutral-200" htmlFor="signup-email">
              {t.email} <span className="text-rose-400">*</span>
            </label>
            <Input
              id="signup-email"
              type="email"
              value={signUpData.email}
              onChange={(event) => {
                updateSignUpField("email", event.target.value);
                if (step2Errors.email) setStep2Errors((e) => ({ ...e, email: undefined }));
              }}
              placeholder="name@domain.com"
              required
              className={`${darkInputClass} ${step2Errors.email ? "border-rose-400" : ""}`}
            />
            {step2Errors.email && <p className="text-xs text-rose-400">{step2Errors.email}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-200" htmlFor="signup-password">
              {t.password} <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Input
                id="signup-password"
                type={showSignUpPassword ? "text" : "password"}
                value={signUpData.password}
                onChange={(event) => {
                  updateSignUpField("password", event.target.value);
                  if (step2Errors.password) setStep2Errors((e) => ({ ...e, password: undefined }));
                }}
                placeholder={t.min6Chars}
                required
                className={`pr-10 ${darkInputClass} ${step2Errors.password ? "border-rose-400" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowSignUpPassword((v) => !v)}
                aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-400 hover:text-white"
              >
                {showSignUpPassword ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5.52 0-10.19-3.51-11.83-8.38a10.93 10.93 0 0 1 5.17-6.07" />
                    <path d="M1 1l22 22" />
                    <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1.5 12s4.5-7 10.5-7 10.5 7 10.5 7-4.5 7-10.5 7-10.5-7-10.5-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {step2Errors.password && <p className="text-xs text-rose-400">{step2Errors.password}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-200" htmlFor="signup-confirm-password">
              {t.confirmPassword} <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Input
                id="signup-confirm-password"
                type={showSignUpConfirmPassword ? "text" : "password"}
                value={signUpData.confirmPassword}
                onChange={(event) => {
                  updateSignUpField("confirmPassword", event.target.value);
                  if (step2Errors.confirmPassword) setStep2Errors((e) => ({ ...e, confirmPassword: undefined }));
                }}
                placeholder={t.reenterPassword}
                required
                className={`pr-10 ${darkInputClass} ${step2Errors.confirmPassword ? "border-rose-400" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowSignUpConfirmPassword((v) => !v)}
                aria-label={showSignUpConfirmPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-400 hover:text-white"
              >
                {showSignUpConfirmPassword ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5.52 0-10.19-3.51-11.83-8.38a10.93 10.93 0 0 1 5.17-6.07" />
                    <path d="M1 1l22 22" />
                    <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1.5 12s4.5-7 10.5-7 10.5 7 10.5 7-4.5 7-10.5 7-10.5-7-10.5-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {step2Errors.confirmPassword && (
              <p className="text-xs text-rose-400">{step2Errors.confirmPassword}</p>
            )}
          </div>
        </div>
      );
    }

    if (signUpStep === 3 && selectedRoleConfig) {
      const config = selectedRoleConfig;
      const f1 = config.fields[0];
      const f2 = config.fields[1];
      const f3 = config.fields[2];
      const showFieldAOther = isUniversityRole && signUpData.fieldA === OTHER_UNIVERSITY_VALUE;
      const isFieldBOther = isOtherSelection(signUpData.fieldB);
      const showFieldBOther =
        (isStudent && isFieldBOther) ||
        (!isStudent && config.field2Kind === "dropdown" && isOtherSelection(signUpData.fieldB));

      return (
        <div className="grid gap-3">
          {/* Field 1 - University dropdown or text */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-200" htmlFor="fieldA">
              {f1.label}
              {!f1.optional && <span className="text-rose-400"> *</span>}
            </label>
            {config.field1Kind === "university" ? (
              <>
                <UniversityPicker
                  id="fieldA"
                  value={signUpData.fieldA}
                  onChange={(v) => {
                    updateSignUpField("fieldA", v);
                    if (v !== OTHER_UNIVERSITY_VALUE) updateSignUpField("fieldB", "");
                  }}
                  placeholder={t.universityPlaceholder}
                  aria-label={t.universityAria}
                />
                {showFieldAOther && (
                  <Input
                    value={signUpData.fieldAOther}
                    onChange={(e) => updateSignUpField("fieldAOther", e.target.value)}
                    placeholder={t.enterUniversityName}
                    className={`mt-2 ${darkInputClass}`}
                  />
                )}
              </>
            ) : (
              <Input
                id="fieldA"
                value={signUpData.fieldA}
                onChange={(e) => updateSignUpField("fieldA", e.target.value)}
                placeholder={f1.placeholder}
                className={darkInputClass}
              />
            )}
            {fieldErrors.fieldA && <p className="text-xs text-rose-400">{fieldErrors.fieldA}</p>}
          </div>

          {/* Field 2 - Degree (dynamic), dropdown, or text */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-200" htmlFor="fieldB">
              {f2.label}
              {!f2.optional && <span className="text-rose-400"> *</span>}
            </label>
            {config.field2Kind === "degree" ? (
              <>
                <DegreePicker
                  id="fieldB"
                  options={degreePrograms}
                  value={signUpData.fieldB}
                  onChange={(v) => updateSignUpField("fieldB", v)}
                  placeholder={t.degreePlaceholder}
                  disabled={!resolveFieldA(signUpData)}
                  aria-label={t.degreeAria}
                />
                {showFieldBOther && (
                  <Input
                    value={signUpData.fieldBOther}
                    onChange={(e) => updateSignUpField("fieldBOther", e.target.value)}
                    placeholder={t.enterDegreeProgram}
                    className={`mt-2 ${darkInputClass}`}
                  />
                )}
              </>
            ) : config.field2Kind === "dropdown" && config.field2Options ? (
              <>
                <RolePicker
                  id="fieldB"
                  options={config.field2Options.map((opt) => ({
                    value: opt,
                    label: localizeSignupOptionLabel(opt, language)
                  }))}
                  value={signUpData.fieldB}
                  onChange={(v) => updateSignUpField("fieldB", v)}
                  placeholder={f2.placeholder}
                  aria-label={f2.label}
                />
                {showFieldBOther && (
                  <Input
                    value={signUpData.fieldBOther}
                    onChange={(e) => updateSignUpField("fieldBOther", e.target.value)}
                    placeholder={t.pleaseSpecify}
                    className={`mt-2 ${darkInputClass}`}
                  />
                )}
              </>
            ) : (
              <Input
                id="fieldB"
                value={signUpData.fieldB}
                onChange={(e) => updateSignUpField("fieldB", e.target.value)}
                placeholder={f2.placeholder}
                className={darkInputClass}
              />
            )}
            {fieldErrors.fieldB && <p className="text-xs text-rose-400">{fieldErrors.fieldB}</p>}
          </div>

          {/* Field 3 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-200" htmlFor="fieldC">
              {f3.label}
              {!f3.optional && <span className="text-rose-400"> *</span>}
              {f3.optional && <span className="ml-1 text-neutral-500">{t.optionalLabel}</span>}
            </label>
            {f3.type === "tel" ? (
              <Input
                id="fieldC"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                value={signUpData.fieldC}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                  updateSignUpField("fieldC", digits);
                }}
                placeholder={f3.placeholder}
                className={`${darkInputClass} ${fieldErrors.fieldC ? "border-rose-400" : ""}`}
              />
            ) : (
              <Input
                id="fieldC"
                type={f3.type ?? "text"}
                value={signUpData.fieldC}
                onChange={(e) => updateSignUpField("fieldC", e.target.value)}
                placeholder={f3.placeholder}
                className={darkInputClass}
              />
            )}
            {f3.helpText && <p className="text-xs text-neutral-400">{f3.helpText}</p>}
            {fieldErrors.fieldC && <p className="text-xs text-rose-400">{fieldErrors.fieldC}</p>}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm">
          <p className="font-semibold text-white">{t.reviewDetails}</p>
          <ul className="mt-2 space-y-1 text-neutral-300">
            <li>{t.name}: {signUpData.name}</li>
            <li>{t.email}: {signUpData.email}</li>
            <li>{t.role}: {signUpData.role ? roleConfigs[signUpData.role].label : "-"}</li>
            <li>{selectedRoleConfig?.fields[0].label}: {resolveFieldA(signUpData) || "-"}</li>
            <li>{selectedRoleConfig?.fields[1].label}: {resolveFieldB(signUpData) || "-"}</li>
            <li>{selectedRoleConfig?.fields[2].label}: {signUpData.fieldC.trim() || "-"}</li>
          </ul>
        </div>
        <label className="flex items-start gap-2.5 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={signUpData.acceptedTerms}
            onChange={(event) => {
              updateSignUpField("acceptedTerms", event.target.checked);
              if (signUpError === t.acceptTerms) setSignUpError(null);
            }}
            className="mt-1 h-4 w-4 rounded border-white/25 bg-neutral-900 accent-white"
          />
          {t.termsStatement}
        </label>
      </div>
    );
  };

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px]" />

      {/* Minimal Top Bar: Logo left, Language switcher right */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl shrink-0 items-center justify-between px-6 pt-5">
        <Link href="/" aria-label="Go to landing page" className="inline-flex items-center">
          <Image
            src="/logo.png"
            alt="UniCare Connect"
            width={150}
            height={44}
            className="h-9 w-auto object-contain"
            priority
          />
        </Link>
        <LanguageSwitcher />
      </header>

      {/* Centered Sleek Dark Auth Card */}
      <section className="relative z-10 mx-auto flex flex-1 w-full max-w-lg items-center justify-center px-4 py-2">
        <ScrollReveal className="w-full">
          <div className="w-full rounded-3xl border border-white/15 bg-neutral-950/95 shadow-2xl">
            <div className="border-b border-white/10 p-5 sm:p-6">
              <div className="flex items-center gap-6 border-b border-white/10 pb-2.5">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`relative pb-1.5 text-sm font-semibold transition-colors ${
                    mode === "signin"
                      ? "text-white after:absolute after:bottom-[-11px] after:left-0 after:right-0 after:h-0.5 after:bg-white"
                      : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  {t.signInTab}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`relative pb-1.5 text-sm font-semibold transition-colors ${
                    mode === "signup"
                      ? "text-white after:absolute after:bottom-[-11px] after:left-0 after:right-0 after:h-0.5 after:bg-white"
                      : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  {t.signUpTab}
                </button>
              </div>
              <h1 className="mt-4 text-xl font-bold tracking-tight text-white sm:text-2xl">
                {mode === "signin" ? t.welcomeBack : t.createUniCareAccount}
              </h1>
              <p className="mt-1 text-xs text-neutral-400 sm:text-sm">
                {mode === "signin" ? t.signInSubtitle : t.signUpSubtitle}
              </p>
            </div>

            <div className="p-5 sm:p-6">
              {mode === "signin" ? (
                <form className="space-y-4" onSubmit={handleSignInSubmit}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-200" htmlFor="email">
                      {t.email}
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      aria-required="true"
                      placeholder="name@domain.com"
                      defaultValue={recentlyRegisteredEmail ?? ""}
                      className={`h-11 ${darkInputClass}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-200" htmlFor="password">
                      {t.password}
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showSignInPassword ? "text" : "password"}
                        required
                        aria-required="true"
                        className={`h-11 pr-10 ${darkInputClass}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword((v) => !v)}
                        aria-label={showSignInPassword ? "Hide password" : "Show password"}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-400 hover:text-white"
                      >
                        {showSignInPassword ? (
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5.52 0-10.19-3.51-11.83-8.38a10.93 10.93 0 0 1 5.17-6.07" />
                            <path d="M1 1l22 22" />
                            <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1.5 12s4.5-7 10.5-7 10.5 7 10.5 7-4.5 7-10.5 7-10.5-7-10.5-7z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  {isVerifiedRedirect ? (
                    <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-sm text-emerald-300">
                      {t.emailVerifiedSuccess}
                    </p>
                  ) : null}
                  {signUpSuccess ? (
                    <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-sm text-emerald-300">
                      {signUpSuccess}
                    </p>
                  ) : null}
                  {signInError ? (
                    <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-sm text-rose-300">
                      {signInError}
                    </p>
                  ) : null}
                  <div className="grid gap-3 pt-1 sm:grid-cols-2">
                    <button
                      type="submit"
                      disabled={signInBusy || pendingRedirect || loading}
                      className="h-11 rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-50"
                    >
                      {signInBusy || pendingRedirect || loading ? t.signingIn : t.signInButton}
                    </button>
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={signInBusy || pendingRedirect || loading}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-neutral-900 px-5 text-sm font-medium text-white transition hover:border-white/35 hover:bg-neutral-800 disabled:opacity-50"
                    >
                      {signInBusy || pendingRedirect || loading ? (
                        t.signingIn
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                            <path
                              fill="#EA4335"
                              d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.6 12 2.6a9.4 9.4 0 1 0 0 18.8c5.4 0 9-3.8 9-9.1 0-.6-.1-1.1-.2-1.6H12Z"
                            />
                            <path
                              fill="#34A853"
                              d="M3.6 7.7 6.8 10c.9-1.8 2.8-3.1 5.2-3.1 1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.6 12 2.6c-3.6 0-6.7 2-8.4 5.1Z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M12 21.4c2.6 0 4.9-.9 6.5-2.4l-3-2.4c-.8.6-1.9 1-3.5 1-3 0-5.5-2-6.4-4.7l-3.1 2.4c1.7 3.2 5 5.1 9.5 5.1Z"
                            />
                            <path
                              fill="#4285F4"
                              d="M21 12.3c0-.6-.1-1.1-.2-1.6H12v3.9h5.4c-.2 1.1-.9 2.1-1.9 2.8l3 2.4c1.7-1.6 2.5-4 2.5-7.5Z"
                            />
                          </svg>
                          <span>{t.signInWithGoogle}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-2 text-sm text-neutral-400">
                    <Link href="/forgot-password" className="hover:text-white">
                      {t.forgotPassword}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signup");
                        setSignInError(null);
                      }}
                      className="font-semibold text-white hover:underline"
                    >
                      {t.createAccountLink}
                    </button>
                  </div>
                </form>
              ) : (
                <form className="space-y-5" onSubmit={handleSignUpSubmit}>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((step) => (
                      <div key={step} className="space-y-2">
                        <div
                          className={`h-1 rounded-full transition-colors ${
                            signUpStep >= step ? "bg-white" : "bg-white/15"
                          }`}
                        />
                        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-400">
                          {t.step} {step}
                        </p>
                      </div>
                    ))}
                  </div>

                  {renderSignUpStep()}
                  {signUpError ? (
                    <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-sm text-rose-300">
                      {signUpError}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={goToPreviousSignUpStep}
                      disabled={signUpStep === 1}
                      className={`rounded-full border border-white/15 bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:border-white/35 ${
                        signUpStep === 1 ? "cursor-not-allowed opacity-40" : ""
                      }`}
                    >
                      {t.back}
                    </button>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setMode("signin")}
                        className="text-sm font-medium text-neutral-400 hover:text-white"
                      >
                        {t.alreadyHaveAccount}
                      </button>
                      {signUpStep < 4 ? (
                        <button
                          type="button"
                          onClick={goToNextSignUpStep}
                          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200"
                        >
                          {t.continue}
                        </button>
                      ) : (
                        <button
                          type="submit"
                          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200"
                        >
                          {t.createAccountButton}
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {signUpPopupMessage ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-neutral-950 p-6 text-white shadow-2xl">
            <h2 className="text-lg font-semibold text-white">{t.accountCreatedTitle}</h2>
            <p className="mt-2 text-sm text-neutral-300">{signUpPopupMessage}</p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSignUpPopupMessage(null)}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200"
              >
                {t.ok}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
