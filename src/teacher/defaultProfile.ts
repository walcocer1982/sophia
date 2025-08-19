export const DEFAULT_TEACHER_PROFILE = {
  lang: { stopwords: ["de","la","y","el","en","que","por","para","con","un","una"] },
  feedback: { openers: { hint: ["Gracias por intentarlo.","Vas por buen camino.","Hagámoslo paso a paso."] } },
  hints: {
    mentionCount: 2,
    wordLimits: [18, 28, 40],
    templates: {
      objective: "Enfócate en: {{keywords}}. {{cueLine}}",
      reask: {
        list: "Menciona en pocas palabras {{base}} (2 elementos).",
        definition: "Define brevemente {{base}}.",
        procedure: "Enumera 2 pasos clave de {{base}}.",
        choice: "Elige la opción que aplica en {{base}} y di por qué."
      },
      open: {
        hint: "Comparte tus ideas (≥{{minWords}} palabras). Guíate por: {{cues}}.",
        reask: "En {{minWords}}–{{maxWords}} palabras, cuéntame tus ideas sobre “{{objective}}”."
      }
    }
  },
  advance: {
    partial: { enabled: true, thresholds: { minMatched: 2, maxMissing: 1, minSem: 0.55 } },
    force:   { enabled: true, afterAttempts: 3 }
  },
  questions: {
    studentAskPhrases: ["te puedo hacer una pregunta","tengo una duda","una consulta","no entiendo","puedes aclarar"],
    resumeAffirmatives: ["sí","si","ok","listo","entendido","claro","ya"],
    intentCorpus: [
      "tengo una pregunta","tengo una duda","puedo preguntar","quisiera preguntar",
      "puedes aclarar","me puedes explicar","no entiendo esto","necesito aclaración"
    ],
    intentTau: 0.55
  },
  eval: {
    values: { EMPTY: 0, PARTIAL: 1, ACCEPT: 2 },
    suffixHelp: true,
    vagueCenter: {
      corpus: [
        "no se","no sé","no lo se","no lo sé","no estoy seguro","no tengo idea",
        "no recuerdo","no me acuerdo","mmm","n/a","no sé bien","no entendí",
        "ninguna idea","no sabría decir","no sabria decir"
      ],
      tauVagueMin: 0.60,
      delta: 0.05,
      tauObjOpen: 0.28,
      tauObjClosed: 0.44
    }
  }
} as const;

export type TeacherProfile = typeof DEFAULT_TEACHER_PROFILE;


