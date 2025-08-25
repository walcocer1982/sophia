export type DocenteAction = 'explain' | 'ask' | 'hint' | 'ok' | 'advance' | 'end' | 'ask_simple' | 'ask_options' | 'feedback';

export type TeacherAptitudes = {
  claridad?: number;    // 0..1 afecta longitudes máximas, concisión
  socratismo?: number;  // 0..1 probabilidad de re-ask vs hint
  calidez?: number;     // 0..1 tono de feedback/apertura
  rigor?: number;       // 0..1 umbrales de ACCEPT/PARTIAL
  ritmo?: number;       // 0..1 afterAttempts para force_advance
};

export type DocentePromptContext = {
  language?: string;
  course?: { role?: string; tone?: string; style_guidelines?: string };
  action: DocenteAction;
  stepType: string;
  momentTitle?: string;
  objective?: string;
  contentBody?: string[];
  narrationText?: string;
  caseText?: string;
  questionText?: string;
  acceptable?: string[];
  userAnswer?: string;
  matched?: string[];
  missing?: string[];
  recentHistory?: string[];
  hintWordLimit?: number;
  simpleOptions?: string[];
  optionItems?: string[];
  kind?: 'ACCEPT' | 'PARTIAL' | 'HINT' | 'REFOCUS';
  closureCriteria?: string;
  allowQuestions?: boolean;
  attempts?: number;
  hintsUsed?: number;
  aptitudes?: TeacherAptitudes;
};


