import { assertTimeline, TimelineFile } from '@/schema/timeline';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { LessonPlan, PlanStep, StepType } from './types';

function toStepType(t?: string): StepType {
	const u = String(t || '').toUpperCase();
	return (['NARRATION','CONTENT','ASK','CASE','KEY_CONTENT','KEY_POINTS','KEY_ELEMENTS','TOPICS','EXPECTED_LEARNING','REFLECTION_AREAS'] as StepType[])
		.find(x => x === u) || 'CONTENT';
}

export function compilePlan(tl: TimelineFile): LessonPlan {
	const moments = (tl.moments || []).map((m, mi) => {
		const steps: PlanStep[] = (m.steps || [])
			.sort((a, b) => (a.order || 0) - (b.order || 0))
			.map((s, si) => ({ momentIndex: mi, stepIndex: si, code: s.code, order: s.order, type: toStepType(s.type), data: s }));
		return { title: m.title, code: m.code, order: m.order, steps };
	});
	const allSteps = moments.flatMap(m => m.steps);
	// Construir ciclos CONTENT->ASK por proximidad
	const contentCycles: Array<{ contentStepIndex: number; askStepIndices: number[] }> = [];
	let current: { contentStepIndex: number; askStepIndices: number[] } | null = null;
	for (let i = 0; i < allSteps.length; i++) {
		const s = allSteps[i];
		if (s.type === 'CONTENT') {
			if (current) contentCycles.push(current);
			current = { contentStepIndex: i, askStepIndices: [] };
		} else if (s.type === 'ASK') {
			if (!current) current = { contentStepIndex: -1, askStepIndices: [] };
			current.askStepIndices.push(i);
		}
	}
	if (current) contentCycles.push(current);
	// Catálogo de preguntas
	const askCatalog = allSteps
		.map((s, idx) => ({
			globalIndex: idx,
			momentIndex: s.momentIndex,
			stepIndex: s.stepIndex,
			code: s.code,
			question: s.data.question || '',
			acceptable: s.data.acceptable_answers || []
		}))
		.filter(x => !!x.question);
	return { meta: tl.meta, moments, allSteps, contentCycles, askCatalog };
}

export async function loadAndCompile(url: string): Promise<LessonPlan> {
	let obj: any;
	// Soporte server-side: si es ruta absoluta del sitio (/courses/..), leer desde /public
	if (/^https?:/i.test(url)) {
		const res = await fetch(url);
		obj = await res.json();
	} else if (url.startsWith('/')) {
		const filePath = path.join(process.cwd(), 'public', url.replace(/^\//, ''));
		const raw = await fs.readFile(filePath, 'utf-8');
		obj = JSON.parse(raw);
	} else {
		const filePath = path.isAbsolute(url) ? url : path.join(process.cwd(), url);
		const raw = await fs.readFile(filePath, 'utf-8');
		obj = JSON.parse(raw);
	}
	const tl = assertTimeline(obj);
	return compilePlan(tl);
}


