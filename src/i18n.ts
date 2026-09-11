import type { CariesClass, FindingKind, Language, ToothKind } from "./model";

interface Messages {
  title: string;
  permanent: string;
  primary: string;
  dentition: string;
  findings: Record<FindingKind, string>;
  toothKinds: Record<ToothKind, string>;
  classDescriptions: Record<CariesClass, string>;
  tooth: string;
  selectedTooth: string;
  selectTooth: string;
  selectHelp: string;
  cariesClasses: string;
  classLabel: string;
  instantHelp: string;
  otherFindings: string;
  upperJaw: string;
  lowerJaw: string;
  patientRight: string;
  patientLeft: string;
  upperRight: string;
  upperLeft: string;
  lowerRight: string;
  lowerLeft: string;
  chart: string;
  chartHelp: string;
  keyboardHelp: string;
  wholeTooth: string;
  legacyCaries: string;
  note: string;
  noteHelp: string;
  addNote: string;
  editNote: string;
  currentFindings: string;
  noFindings: string;
  remove: string;
  undo: string;
  reset: string;
  confirmPermanent: string;
  confirmPrimary: string;
  added: string;
  alreadyRecorded: string;
  removed: string;
  undone: string;
  resetDone: string;
  noteSaved: string;
  teeth: string;
  marked: string;
  selected: string;
}

export const MESSAGES: Record<Language, Messages> = {
  en: {
    title: "Dental chart",
    permanent: "Permanent",
    primary: "Primary",
    dentition: "Dentition",
    findings: {
      caries: "Caries", filling: "Filling / Restoration", crown: "Crown",
      rootCanal: "Root Canal", implant: "Implant", missing: "Missing",
      extraction: "Extraction"
    },
    toothKinds: {
      centralIncisor: "Central incisor", lateralIncisor: "Lateral incisor",
      canine: "Canine", premolar: "Premolar", molar: "Molar"
    },
    classDescriptions: {
      I: "Pits and fissures",
      II: "Posterior proximal",
      III: "Anterior proximal, without incisal angle",
      IV: "Anterior proximal, including incisal angle",
      V: "Cervical third"
    },
    tooth: "Tooth",
    selectedTooth: "Selected tooth",
    selectTooth: "Select a tooth",
    selectHelp: "Tap a tooth, then choose a class.",
    cariesClasses: "Caries classes",
    classLabel: "Class",
    instantHelp: "Tap a class to mark instantly.",
    otherFindings: "Other findings",
    upperJaw: "Upper jaw",
    lowerJaw: "Lower jaw",
    patientRight: "Patient's right",
    patientLeft: "Patient's left",
    upperRight: "Upper right",
    upperLeft: "Upper left",
    lowerRight: "Lower right",
    lowerLeft: "Lower left",
    chart: "Odontogram",
    chartHelp: "Select. Classify. Continue.",
    keyboardHelp: "Arrow keys move between teeth. Enter or Space selects a tooth.",
    wholeTooth: "Whole tooth",
    legacyCaries: "Existing caries · not yet classified",
    note: "Short note",
    noteHelp: "Optional · saved when you leave the field",
    addNote: "Add note",
    editNote: "Edit note",
    currentFindings: "Current findings",
    noFindings: "No findings recorded for this tooth.",
    remove: "Remove finding",
    undo: "Undo",
    reset: "Reset dentition",
    confirmPermanent:
      "Clear every finding and note in the permanent dentition? Primary teeth will be preserved. You can undo this change.",
    confirmPrimary:
      "Clear every finding and note in the primary dentition? Permanent teeth will be preserved. You can undo this change.",
    added: "Recorded",
    alreadyRecorded: "Already recorded",
    removed: "Finding removed",
    undone: "Last chart change undone",
    resetDone: "Active dentition reset",
    noteSaved: "Note saved",
    teeth: "teeth",
    marked: "findings",
    selected: "Selected"
  },
  ar: {
    title: "مخطط الأسنان",
    permanent: "الأسنان الدائمة",
    primary: "الأسنان اللبنية",
    dentition: "نوع الأسنان",
    findings: {
      caries: "تسوّس", filling: "حشوة / ترميم", crown: "تاج",
      rootCanal: "علاج جذور", implant: "زرعة", missing: "سن مفقود",
      extraction: "خلع"
    },
    toothKinds: {
      centralIncisor: "قاطع مركزي", lateralIncisor: "قاطع جانبي",
      canine: "ناب", premolar: "ضاحك", molar: "ضرس"
    },
    classDescriptions: {
      I: "الحفر والشقوق",
      II: "الأسطح التقاربية للأسنان الخلفية",
      III: "الأسطح التقاربية للأسنان الأمامية دون الزاوية القاطعة",
      IV: "الأسطح التقاربية للأسنان الأمامية مع الزاوية القاطعة",
      V: "الثلث العنقي"
    },
    tooth: "السن",
    selectedTooth: "السن المحدد",
    selectTooth: "اختر سنًّا",
    selectHelp: "اختر السن ثم اختر فئة التسوّس.",
    cariesClasses: "فئات التسوّس",
    classLabel: "الفئة",
    instantHelp: "اضغط على الفئة لتسجيلها فورًا.",
    otherFindings: "حالات أخرى",
    upperJaw: "الفك العلوي",
    lowerJaw: "الفك السفلي",
    patientRight: "يمين المريض",
    patientLeft: "يسار المريض",
    upperRight: "علوي أيمن",
    upperLeft: "علوي أيسر",
    lowerRight: "سفلي أيمن",
    lowerLeft: "سفلي أيسر",
    chart: "المخطط السني",
    chartHelp: "اختر السن. حدّد الفئة. تابع.",
    keyboardHelp: "استخدم الأسهم للتنقل بين الأسنان، ثم Enter أو المسافة لتحديد السن.",
    wholeTooth: "السن بالكامل",
    legacyCaries: "تسوّس سابق · لم يُصنّف بعد",
    note: "ملاحظة قصيرة",
    noteHelp: "اختيارية · تُحفظ عند مغادرة الحقل",
    addNote: "إضافة ملاحظة",
    editNote: "تعديل الملاحظة",
    currentFindings: "الحالات المسجلة",
    noFindings: "لا توجد حالات مسجلة لهذا السن.",
    remove: "إزالة الحالة",
    undo: "تراجع",
    reset: "مسح النوع الحالي",
    confirmPermanent:
      "هل تريد مسح جميع الحالات والملاحظات للأسنان الدائمة؟ ستبقى الأسنان اللبنية محفوظة. يمكنك التراجع عن هذا التغيير.",
    confirmPrimary:
      "هل تريد مسح جميع الحالات والملاحظات للأسنان اللبنية؟ ستبقى الأسنان الدائمة محفوظة. يمكنك التراجع عن هذا التغيير.",
    added: "تم التسجيل",
    alreadyRecorded: "مسجلة بالفعل",
    removed: "تمت إزالة الحالة",
    undone: "تم التراجع عن آخر تغيير",
    resetDone: "تم مسح حالات النوع الحالي",
    noteSaved: "تم حفظ الملاحظة",
    teeth: "سن",
    marked: "حالات",
    selected: "محدد"
  }
};
