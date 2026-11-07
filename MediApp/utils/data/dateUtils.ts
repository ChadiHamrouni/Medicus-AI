/**
 * Calculate age from date of birth
 * @param dob - Date of birth string in ISO format or any valid date string
 * @returns Age in years, or undefined if dob is invalid
 */
export const calculateAge = (
  dob: string | null | undefined
): number | undefined => {
  if (!dob) return undefined;

  const birthDate = new Date(dob);

  // Check if date is valid
  if (isNaN(birthDate.getTime())) return undefined;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Adjust age if birthday hasn't occurred this year
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age >= 0 ? age : undefined;
};
