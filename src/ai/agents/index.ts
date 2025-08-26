import type { DocentePromptContext } from '@/ai/prompt_parts/types';
import { runDocenteLLM } from '@/ai/orchestrator';

export async function runExplainAgent(ctx: DocentePromptContext) {
	return runDocenteLLM({ ...ctx, action: 'explain' });
}

export async function runAskAgent(ctx: DocentePromptContext) {
	return runDocenteLLM({ ...ctx, action: 'ask' });
}

export async function runAskOptionsAgent(ctx: DocentePromptContext & { optionItems?: string[] }) {
	return runDocenteLLM({ ...ctx, action: 'ask_options' as any });
}

export async function runHintAgent(ctx: DocentePromptContext) {
	return runDocenteLLM({ ...ctx, action: 'hint' });
}

export async function runFeedbackAgent(ctx: DocentePromptContext) {
	return runDocenteLLM({ ...ctx, action: 'feedback' });
}

export async function runAdvanceAgent(ctx: DocentePromptContext) {
	return runDocenteLLM({ ...ctx, action: 'advance' });
}

export async function runEndAgent(ctx: DocentePromptContext) {
	return runDocenteLLM({ ...ctx, action: 'end' as any });
}


