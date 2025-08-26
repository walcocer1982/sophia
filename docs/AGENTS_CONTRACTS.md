Contracts: Tools, Guardrails y Sub‑Agentes

Tools
- PolicyTool.getHintWordLimit(policies, severityIndex): number
- OptionsTool.pickTwoOptions(source, fallback): string[] (max 2)
- InputGuardrail.decideForceAdvanceByNoSe({ noSeCount, forceNoSeThreshold, allowForcedOn, momentKind }): { shouldForceAdvance }

Guardrails
- Output: hint → { MICRO ≤8 palabras; PISTA sin interrogantes; alineado a objective }
- Output: advance → requiere PUENTE breve; sin re‑narraciones
- Output: feedback → 1–3 frases; sin preguntas si allowQuestions=false

Sub‑Agentes
- runExplainAgent(ctx): explain
- runAskAgent(ctx): ask
- runAskOptionsAgent(ctx): ask_options
- runHintAgent(ctx): hint
- runFeedbackAgent(ctx): feedback
- runAdvanceAgent(ctx): advance
- runEndAgent(ctx): end

Contexto mínimo (DocentePromptContext)
- language: 'es'
- action: 'explain' | 'ask' | 'ask_options' | 'hint' | 'feedback' | 'advance' | 'end'
- stepType: 'ASK' | 'CONTENT' | 'NARRATION' | 'END'
- objective: string
- questionText?: string
- contentBody?: string[]
- matched?/missing?: string[]
- recentHistory?: string[]
- hintWordLimit?: number
- allowQuestions?: boolean
- attempts?/hintsUsed?: number

Reglas de severidad (S1/S2/S3)
- S1: analogía si natural, MICRO directo; hintLimit = wordLimits[0]
- S2: opciones (2) desde expected/missing; hintLimit = wordLimits[1]
- S3: Elemento → función; hintLimit = wordLimits[2]


