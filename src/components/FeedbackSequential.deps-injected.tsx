"use client";
import React, { useCallback, useMemo, useState } from "react";

// Tipos compartidos entre versiones
export type AttemptOutcome = {
  label: "F0" | "F1" | "F2";
  kind: "HINT" | "PARTIAL" | "ACCEPT" | "REFOCUS";
  feedback: string;
  scoreDelta: 0 | 1 | 2;
};

export type FeedbackSequentialInjectedProps = {
  code?: string;
  prompts: [string, string, string];
  objective: string;
  acceptable: string[];
  expected?: string[];
  answerType?: "open" | "list" | "definition" | "procedure" | "choice";
  finalExplanation?: string;
  teacherProfile?: any;
  onComplete?: (result: {
    status: "cumplida" | "pendiente" | "force_advance";
    score: 0 | 1 | 2;
    hints: number;
    attempts: number;
    trace: Array<any>;
  }) => void;
  uiText?: {
    inputPlaceholder?: string;
    sendLabel?: string;
  };
  overrides?: {
    maxAttempts?: number;
    isEmpty?: (answer: string) => boolean;
    evaluate?: (
      answer: string,
      ctx: {
        policyType: string;
        acceptable: string[];
        expected: string[];
        answerType: FeedbackSequentialInjectedProps["answerType"];
        hintsUsed: number;
        attempt: number;
      }
    ) => { kind: "HINT" | "PARTIAL" | "ACCEPT" | "REFOCUS"; matched: string[]; missing: string[]; reason?: string };
    label?: (kind: AttemptOutcome["kind"], attempt: number) => AttemptOutcome["label"];
    makeHint?: (opts: {
      questionText: string;
      objective: string;
      expected: string[];
      missing: string[];
      answerType?: FeedbackSequentialInjectedProps["answerType"];
      hintsUsed: number;
      attempts: number;
      teacherProfile?: any;
    }) => string;
    makeReask?: (opts: {
      questionText: string;
      objective: string;
      expected: string[];
      answerType?: FeedbackSequentialInjectedProps["answerType"];
      teacherProfile?: any;
    }) => string;
    buildTrace?: (args: {
      question: string;
      response: string;
      feedback: string;
      kind: AttemptOutcome["kind"];
      attempt: number;
      hintsUsed?: number;
      stepCode?: string;
    }) => any;
    scorePolicy?: (args: {
      attempts: number;
      lastKind: AttemptOutcome["kind"];
      hintsUsed: number;
      acceptedAt?: number | null;
      exhausted: boolean;
      hadPartial?: boolean;
    }) => { status: "cumplida" | "pendiente" | "force_advance"; score: 0 | 1 | 2 };
  };
};

function usePolicyType(answerType?: FeedbackSequentialInjectedProps["answerType"]) {
  // Map flexible, se puede sobreescribir desde overrides.evaluate
  return useMemo(() => {
    switch (answerType) {
      case "list":
        return "listado";
      case "procedure":
        return "aplicacion";
      case "choice":
        return "identificacion";
      case "definition":
      case "open":
      default:
        return "conceptual";
    }
  }, [answerType]);
}

export default function FeedbackSequentialInjected(props: FeedbackSequentialInjectedProps) {
  const {
    code = "",
    prompts,
    objective,
    acceptable,
    expected = [],
    answerType = "list",
    finalExplanation,
    teacherProfile,
    onComplete,
    uiText,
    overrides,
  } = props;

  const policyType = usePolicyType(answerType);
  const maxAttempts = overrides?.maxAttempts ?? 3;
  const [attempt, setAttempt] = useState<number>(0);
  const [input, setInput] = useState<string>("");
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [trace, setTrace] = useState<any[]>([]);
  const [done, setDone] = useState<boolean>(false);
  const [outcomes, setOutcomes] = useState<AttemptOutcome[]>([]);

  const currentQuestion = prompts[Math.min(attempt, prompts.length - 1)] || "";

  const buildFeedbackText = useCallback((kind: AttemptOutcome["kind"], ctx: { missing: string[]; matched: string[] }) => {
    // HINT/REFOCUS → usar generadores; PARTIAL → guía + reask; ACCEPT → reforzar con matched (si hay)
    if (kind === "HINT" || kind === "REFOCUS") {
      const hintMsg = overrides?.makeHint?.({
        questionText: currentQuestion,
        objective,
        expected,
        missing: ctx.missing,
        answerType,
        hintsUsed,
        attempts: attempt,
        teacherProfile,
      }) || "";
      const reask = overrides?.makeReask?.({
        questionText: currentQuestion,
        objective,
        expected,
        answerType,
        teacherProfile,
      }) || "";
      return [hintMsg, reask].filter(Boolean).join(" ").trim();
    }
    if (kind === "PARTIAL") {
      const reask = overrides?.makeReask?.({
        questionText: currentQuestion,
        objective,
        expected,
        answerType,
        teacherProfile,
      }) || "";
      // Mensaje centrado en completar elementos faltantes, evitando cadenas estáticas
      const dynamicSuffix = ctx.missing.length ? ctx.missing.join(", ") : "";
      return [reask, dynamicSuffix].filter(Boolean).join(" · ").trim();
    }
    // ACCEPT → sin reask; devolver señales/matched como refuerzo mínimo
    return (ctx.matched || []).join(", ");
  }, [answerType, attempt, currentQuestion, expected, objective, overrides, teacherProfile, hintsUsed]);

  const handleSend = useCallback(() => {
    if (done) return;
    const value = String(input || "").trim();
    if (!value) {
      // vacío explícito → HINT
      const kind: AttemptOutcome["kind"] = "HINT";
      const label = overrides?.label ? overrides.label(kind, attempt) : ("F0" as AttemptOutcome["label"]);
      const feedback = buildFeedbackText(kind, { matched: [], missing: acceptable.slice(0, 3) });
      const outcome: AttemptOutcome = { label, kind, feedback, scoreDelta: 0 };
      setOutcomes(prev => [...prev, outcome]);
      setHintsUsed(h => h + 1);
      const t = overrides?.buildTrace?.({
        question: currentQuestion,
        response: value,
        feedback,
        kind,
        attempt,
        hintsUsed,
        stepCode: code,
      });
      if (t) setTrace(prev => [...prev, t]);
      setAttempt(a => a + 1);
      setInput("");
      return;
    }

    const res = overrides?.evaluate?.(value, {
      policyType,
      acceptable,
      expected,
      answerType,
      hintsUsed,
      attempt,
    }) || { kind: "HINT" as const, matched: [], missing: acceptable.slice(0, 3) };

    const label = overrides?.label ? overrides.label(res.kind, attempt) : ("F2" as AttemptOutcome["label"]);
    const feedback = buildFeedbackText(res.kind, { matched: res.matched || [], missing: res.missing || [] });
    const outcome: AttemptOutcome = {
      label,
      kind: res.kind,
      feedback,
      scoreDelta: res.kind === "ACCEPT" ? 2 : res.kind === "PARTIAL" ? 1 : 0,
    };
    setOutcomes(prev => [...prev, outcome]);
    if (res.kind === "HINT" || res.kind === "REFOCUS") setHintsUsed(h => h + 1);

    const t = overrides?.buildTrace?.({
      question: currentQuestion,
      response: value,
      feedback,
      kind: res.kind,
      attempt,
      hintsUsed,
      stepCode: code,
    });
    if (t) setTrace(prev => [...prev, t]);

    const nextAttempt = attempt + 1;
    const exhausted = nextAttempt >= maxAttempts;
    const accepted = res.kind === "ACCEPT";

    if (accepted || exhausted) {
      const hadPartial = (!accepted && outcomes.some(o => o.kind === "PARTIAL")) || res.kind === "PARTIAL";
      const decision = overrides?.scorePolicy?.({
        attempts: nextAttempt,
        lastKind: res.kind,
        hintsUsed: hintsUsed + (res.kind === "HINT" || res.kind === "REFOCUS" ? 1 : 0),
        acceptedAt: accepted ? nextAttempt : null,
        exhausted,
        hadPartial,
      }) || { status: accepted ? "cumplida" : (finalExplanation ? "force_advance" : "pendiente"), score: accepted ? 2 : (hadPartial ? 1 : 0) };

      // En caso de fuerza de avance con explicación final, registrar una última entrada F2 sin respuesta
      let extraTrace: any | null = null;
      if (!accepted && exhausted && finalExplanation) {
        const fk: AttemptOutcome["kind"] = "REFOCUS";
        const flabel = overrides?.label ? overrides.label(fk, nextAttempt) : ("F2" as AttemptOutcome["label"]);
        const extraOutcome: AttemptOutcome = { label: flabel, kind: fk, feedback: finalExplanation, scoreDelta: 0 };
        setOutcomes(prev => [...prev, extraOutcome]);
        const te = overrides?.buildTrace?.({
          question: currentQuestion,
          response: "",
          feedback: finalExplanation,
          kind: fk,
          attempt: nextAttempt,
          hintsUsed: hintsUsed,
          stepCode: code,
        });
        if (te) { setTrace(prev => [...prev, te]); extraTrace = te; }
      }

      setDone(true);
      // Ensamblar traza final localmente para no depender del setState asíncrono
      const finalTrace = [
        ...trace,
        ...(t ? [t] : []),
        ...(extraTrace ? [extraTrace] : []),
      ];
      onComplete?.({
        status: decision.status,
        score: decision.score as 0 | 1 | 2,
        hints: hintsUsed + (res.kind === "HINT" || res.kind === "REFOCUS" ? 1 : 0),
        attempts: nextAttempt,
        trace: finalTrace,
      });
    } else {
      setAttempt(nextAttempt);
    }
    setInput("");
  }, [acceptable, expected, answerType, attempt, buildFeedbackText, code, currentQuestion, done, finalExplanation, hintsUsed, maxAttempts, objective, onComplete, overrides, policyType, input, trace, outcomes]);

  // UI mínima (tailwind), sin textos fijos: usa uiText cuando aplique
  return (
    <div className="w-full">
      <div className="space-y-3">
        <div className="text-sm text-slate-700">
          <span className="font-medium">{code ? `${code} · ` : ""}</span>
          <span>{currentQuestion}</span>
        </div>

        <div className="space-y-2">
          {outcomes.map((o, idx) => (
            <div key={idx} className="border rounded-lg p-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{o.label}</span>
                <span className="text-xs uppercase tracking-wide text-slate-500">{o.kind}</span>
              </div>
              {o.feedback ? (
                <div className="mt-1 text-slate-800 whitespace-pre-wrap">{o.feedback}</div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex gap-2 items-center">
          <input
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            placeholder={uiText?.inputPlaceholder || ""}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={done}
          />
          <button
            className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white disabled:opacity-50"
            onClick={handleSend}
            disabled={done}
          >
            {uiText?.sendLabel || "→"}
          </button>
        </div>
      </div>
    </div>
  );
}


