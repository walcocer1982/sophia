"use client";
import { classifyTurn, isNoSe } from "@/engine/eval";
import { buildTraceEntry, computeFeedbackLabel } from "@/engine/feedbackSequencer";
import { makeHintMessage, makeReaskMessage } from "@/engine/hints";
import { DEFAULT_TEACHER_PROFILE } from "@/teacher/defaultProfile";
import FeedbackSequentialInjected, { type FeedbackSequentialInjectedProps } from "./FeedbackSequential.deps-injected";

export type AttemptOutcome = {
  label: "F0" | "F1" | "F2";
  kind: "HINT" | "PARTIAL" | "ACCEPT" | "REFOCUS";
  feedback: string;
  scoreDelta: 0 | 1 | 2;
};

export type FeedbackSequentialProps = Omit<FeedbackSequentialInjectedProps, "overrides"> & {
  teacherProfile?: any;
};

export default function FeedbackSequential(props: FeedbackSequentialProps) {
  const teacher = props.teacherProfile || DEFAULT_TEACHER_PROFILE;

  const overrides: NonNullable<FeedbackSequentialInjectedProps["overrides"]> = {
    maxAttempts: 3,
    isEmpty: (answer: string) => !String(answer || "").trim() || isNoSe(answer),
    evaluate: (answer, ctx) => {
      const res = classifyTurn(
        answer,
        { type: ctx.policyType as any },
        ctx.acceptable,
        ctx.expected,
        { maxEditDistance: 1, similarityMin: 0.35 }
      );
      return { kind: res.kind as any, matched: res.matched || [], missing: res.missing || [], reason: res.reason };
    },
    label: (kind, attempt) => computeFeedbackLabel(kind, attempt),
    makeHint: (opts) => makeHintMessage({
      questionText: opts.questionText,
      objective: opts.objective,
      expected: opts.expected,
      missing: opts.missing,
      answerType: props.answerType as any,
      hintsUsed: opts.hintsUsed,
      attempts: opts.attempts,
      coursePolicies: undefined,
      teacherProfile: teacher,
    }),
    makeReask: (opts) => makeReaskMessage({
      questionText: opts.questionText,
      objective: opts.objective,
      expected: opts.expected,
      answerType: props.answerType as any,
      coursePolicies: undefined,
      teacherProfile: teacher,
    }),
    buildTrace: (args) => buildTraceEntry(args as any),
    scorePolicy: ({ attempts, lastKind, hintsUsed, acceptedAt, exhausted, hadPartial }) => {
      if (lastKind === "ACCEPT") return { status: "cumplida", score: 2 } as const;
      if (exhausted) {
        if (hadPartial) return { status: props.finalExplanation ? "force_advance" : "pendiente", score: 1 } as const;
        return { status: props.finalExplanation ? "force_advance" : "pendiente", score: 0 } as const;
      }
      return { status: "pendiente", score: 0 } as const;
    },
  };

  return <FeedbackSequentialInjected {...props} overrides={overrides} teacherProfile={teacher} />;
}


