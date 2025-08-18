import { z } from 'zod';

export const TimelineStepSchema = z.object({
	code: z.string().optional(),
	order: z.number().int().optional(),
	type: z.string(),
	// ASK
	question: z.string().optional(),
	objective: z.string().optional(),
	expected: z.array(z.string()).optional(),
	acceptable_answers: z.array(z.string()).optional(),
	question_type: z.string().optional(),
	answer_type: z.enum(['open', 'list', 'definition', 'procedure', 'choice']).optional(),
	// CONTENT / CASE / NARRATION / KEY_* / TOPICS / REFLECTION_AREAS
	title: z.string().optional(),
	body: z.array(z.string()).optional(),
	text: z.string().optional(),
	description: z.string().optional(),
	items: z.array(z.string()).optional(),
	variables: z.array(z.string()).optional()
});

export const TimelineMomentSchema = z.object({
	code: z.string().optional(),
	order: z.number().int().optional(),
	title: z.string(),
	steps: z.array(TimelineStepSchema)
});

export const TimelineFileSchema = z.object({
	meta: z.object({
		lesson_id: z.string().optional(),
		lesson_name: z.string().optional(),
		version: z.string().optional(),
		language: z.string().optional(),
		ordered: z.boolean().optional(),
		generated_at: z.string().optional()
	}),
	moments: z.array(TimelineMomentSchema)
});

export type TimelineStep = z.infer<typeof TimelineStepSchema>;
export type TimelineMoment = z.infer<typeof TimelineMomentSchema>;
export type TimelineFile = z.infer<typeof TimelineFileSchema>;

export function assertTimeline(obj: unknown): TimelineFile {
	return TimelineFileSchema.parse(obj);
}


