export function calculateAge(birthDate: string, today = new Date()): number {
  const [year, month, day] = birthDate.split('-').map(Number);
  const birthdayThisYear = new Date(today.getFullYear(), month - 1, day);
  return today.getFullYear() - year - Number(today < birthdayThisYear);
}

export function formatAge(age: number): string {
  const remainder = age % 100;
  if (remainder >= 11 && remainder <= 14) return `${age} лет`;
  switch (age % 10) {
    case 1:
      return `${age} год`;
    case 2:
    case 3:
    case 4:
      return `${age} года`;
    default:
      return `${age} лет`;
  }
}
