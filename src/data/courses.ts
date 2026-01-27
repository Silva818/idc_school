// src/data/courses.ts
export const courseNames = [
  "calisthenics_light",
  "calisthenics_classic",
  "pullups",
  "handstand",
  "calisthenics_for_crossfit",
] as const;

export type CourseName = (typeof courseNames)[number];

export const COURSE_TITLE_KEY: Record<CourseName, string> = {
  calisthenics_light: "cards.light.title",
  calisthenics_classic: "cards.super.title",
  pullups: "cards.pullupsGirls.title",
  handstand: "cards.handstand.title",
  calisthenics_for_crossfit: "cards.crossfit.title",
} as const;
