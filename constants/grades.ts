export const GRADES: string[] = [
  '4a', '4b', '4c',
  '5a', '5a+', '5b', '5b+', '5c', '5c+',
  '6a', '6a+', '6b', '6b+', '6c', '6c+',
  '7a', '7a+', '7b', '7b+', '7c', '7c+',
  '8a', '8a+', '8b', '8b+', '8c', '8c+',
  '9a', '9a+', '9b', '9b+', '9c', '9c+',
];

export const DEFAULT_GRADE = '5b+';

export function gradeIndex(grade: string): number {
  return GRADES.indexOf(grade);
}

export function nextGrade(grade: string): string {
  const idx = gradeIndex(grade);
  if (idx === -1 || idx === GRADES.length - 1) return grade;
  return GRADES[idx + 1];
}

export function prevGrade(grade: string): string {
  const idx = gradeIndex(grade);
  if (idx <= 0) return grade;
  return GRADES[idx - 1];
}

export function averageGradeFromList(grades: string[]): string | null {
  if (grades.length === 0) return null;
  const indices = grades.map(gradeIndex).filter((i) => i >= 0);
  if (indices.length === 0) return null;
  const avg = Math.round(indices.reduce((a, b) => a + b, 0) / indices.length);
  return GRADES[Math.min(avg, GRADES.length - 1)];
}
