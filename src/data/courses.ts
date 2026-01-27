// src/data/courses.ts
export const courseNames = [
    "calisthenics_light",
    "super_calisthenics",
    "pullups",
    "handstand",
    "calisthenics_for_crossfit",
  ] as const;
  
  export type CourseName = (typeof courseNames)[number];
  