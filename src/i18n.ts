import type {
  FindingKind,
  Language,
  Surface,
  ToothKind
} from "./model";

interface Messages {
  title: string;
  subtitle: string;
  workspace: string;
  permanent: string;
  primary: string;
  dentition: string;
  findings: Record<FindingKind, string>;
  surfaces: Record<Surface, string>;
  toothKinds: Record<ToothKind, string>;
  tooth: string;
  selectedTooth: string;
  findingToolbar: string;
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
  scrollHelp: string;
  surfacesTitle: string;
  surfacesHelp: string;
  chooseSurfaces: string;
  wholeTooth: string;
  wholeToothHelp: string;
  note: string;
  noteHelp: string;
  apply: string;
  currentFindings: string;
  noFindings: string;
  remove: string;
  undo: string;
  reset: string;
  confirmPermanent: string;
  confirmPrimary: string;
  legend: string;
  legendHelp: string;
  applied: string;
  removed: string;
  undone: string;
  resetDone: string;
  localOnly: string;
  teeth: string;
  marked: string;
  selected: string;
}

export const MESSAGES: Record<Language, Messages> = {
  en: {
    title: "Dental chart",
    subtitle: "A clear view. One tooth at a time.",
    workspace: "Standalone workspace",
    permanent: "Permanent",
    primary: "Primary",
    dentition: "Dentition",
    findings: {
      caries: "Caries",
      filling: "Filling / Restoration",
      crown: "Crown",
      rootCanal: "Root Canal",
      implant: "Implant",
      missing: "Missing",
      extraction: "Extraction"
    },
    surfaces: {
      O: "Occlusal",
      M: "Mesial",
      D: "Distal",
      B: "Buccal",
      L: "Lingual"
    },
    toothKinds: {
      centralIncisor: "Central incisor",
      lateralIncisor: "Lateral incisor",
      canine: "Canine",
      premolar: "Premolar",
      molar: "Molar"
    },
    tooth: "Tooth",
    selectedTooth: "Selected tooth",
    findingToolbar: "Choose a finding",
    upperJaw: "Upper jaw",
    lowerJaw: "Lower jaw",
    patientRight: "Patient’s right",
    patientLeft: "Patient’s left",
    upperRight: "Upper right",
    upperLeft: "Upper left",
    lowerRight: "Lower right",
    lowerLeft: "Lower left",
    chart: "Odontogram",
    chartHelp: "Select a tooth to record or review findings.",
    scrollHelp: "On small screens, swipe the chart horizontally.",
    surfacesTitle: "Surfaces",
    surfacesHelp: "Select one or more surfaces.",
    chooseSurfaces: "Choose a surface before applying.",
    wholeTooth: "Whole tooth",
    wholeToothHelp: "This finding applies to the whole tooth.",
    note: "Short note",
    noteHelp: "Optional · saved with this finding",
    apply: "Apply finding",
    currentFindings: "Current findings",
    noFindings: "No findings recorded for this tooth.",
    remove: "Remove finding",
    undo: "Undo",
    reset: "Reset dentition",
    confirmPermanent:
      "Clear every finding and note in the permanent dentition? Primary teeth will be preserved. You can undo this change.",
    confirmPrimary:
      "Clear every finding and note in the primary dentition? Permanent teeth will be preserved. You can undo this change.",
    legend: "Clinical legend",
    legendHelp:
      "Caries and restorations use surfaces; other findings use the whole tooth. Colored dots show all recorded categories. The latest mark is shown on each surface.",
    applied: "Finding applied.",
    removed: "Finding removed.",
    undone: "Last chart change undone.",
    resetDone: "Active dentition reset.",
    localOnly: "Session only · no server storage",
    teeth: "teeth",
    marked: "recorded",
    selected: "Selected"
  },
  ar: {
    title: "مخطط الأسنان",
    subtitle: "صورة واضحة، سنًّا بعد سن.",
    workspace: "مساحة عمل مستقلة",
    permanent: "الأسنان الدائمة",
    primary: "الأسنان اللبنية",
    dentition: "نوع الأسنان",
    findings: {
      caries: "تسوّس",
      filling: "حشوة / ترميم",
      crown: "تاج",
      rootCanal: "علاج جذور",
      implant: "زرعة",
      missing: "سن مفقود",
      extraction: "خلع"
    },
    surfaces: {
      O: "إطباقي",
      M: "أنسي",
      D: "وحشي",
      B: "شدقي",
      L: "لساني"
    },
    toothKinds: {
      centralIncisor: "قاطع مركزي",
      lateralIncisor: "قاطع جانبي",
      canine: "ناب",
      premolar: "ضاحك",
      molar: "ضرس"
    },
    tooth: "السن",
    selectedTooth: "السن المحدد",
    findingToolbar: "اختر الحالة",
    upperJaw: "الفك العلوي",
    lowerJaw: "الفك السفلي",
    patientRight: "يمين المريض",
    patientLeft: "يسار المريض",
    upperRight: "علوي أيمن",
    upperLeft: "علوي أيسر",
    lowerRight: "سفلي أيمن",
    lowerLeft: "سفلي أيسر",
    chart: "المخطط السني",
    chartHelp: "اختر سنًّا لتسجيل الحالات أو مراجعتها.",
    scrollHelp: "على الشاشات الصغيرة، اسحب المخطط أفقيًا.",
    surfacesTitle: "أسطح السن",
    surfacesHelp: "اختر سطحًا واحدًا أو أكثر.",
    chooseSurfaces: "اختر سطحًا قبل تطبيق الحالة.",
    wholeTooth: "السن بالكامل",
    wholeToothHelp: "تُطبّق هذه الحالة على السن بالكامل.",
    note: "ملاحظة قصيرة",
    noteHelp: "اختيارية · تُحفظ مع هذه الحالة",
    apply: "تطبيق الحالة",
    currentFindings: "الحالات المسجلة",
    noFindings: "لا توجد حالات مسجلة لهذا السن.",
    remove: "إزالة الحالة",
    undo: "تراجع",
    reset: "مسح النوع الحالي",
    confirmPermanent:
      "هل تريد مسح جميع الحالات والملاحظات للأسنان الدائمة؟ ستبقى الأسنان اللبنية محفوظة. يمكنك التراجع عن هذا التغيير.",
    confirmPrimary:
      "هل تريد مسح جميع الحالات والملاحظات للأسنان اللبنية؟ ستبقى الأسنان الدائمة محفوظة. يمكنك التراجع عن هذا التغيير.",
    legend: "دليل الحالات",
    legendHelp:
      "يُحدَّد سطح السن للتسوّس والترميم، وتُطبَّق بقية الحالات على السن بالكامل. تُظهر النقاط الملوّنة جميع الفئات المسجلة، ويظهر آخر تسجيل على كل سطح.",
    applied: "تم تطبيق الحالة.",
    removed: "تمت إزالة الحالة.",
    undone: "تم التراجع عن آخر تغيير في المخطط.",
    resetDone: "تم مسح حالات النوع الحالي.",
    localOnly: "لهذه الجلسة فقط · دون تخزين على خادم",
    teeth: "سن",
    marked: "مسجلة",
    selected: "محدد"
  }
};