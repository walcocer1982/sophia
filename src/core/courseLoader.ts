export type CourseLessonRef = { id: string; title?: string; order?: number; path: string };

export type CourseSpecialist = {
  role?: string;
  expertise?: string;
  years?: number;
  tone?: string;
  style_guidelines?: string;
};

export type CourseVM = {
  id: string;
  name: string;
  version: string;
  language: string;
  objectives: string[];
  specialist: CourseSpecialist;
  lessons: CourseLessonRef[];
  policiesUrl?: string;
  overridesUrl?: string;
};

export async function loadCourseVM(path = '/courses/SSO001/course.json'): Promise<CourseVM> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`No se pudo cargar el curso: ${path}`);
  const raw = await res.json();
  return {
    id: raw.id,
    name: raw.name,
    version: raw.version,
    language: raw.language || 'es',
    objectives: Array.isArray(raw.objectives) ? raw.objectives : [],
    specialist: (raw.specialist || {}) as CourseSpecialist,
    lessons: Array.isArray(raw.lessons) ? raw.lessons : [],
    policiesUrl: raw.policiesUrl || `/courses/${raw.id}/policies.json`,
    overridesUrl: raw.overridesUrl || `/courses/${raw.id}/overrides.json`,
  } as CourseVM;
}


