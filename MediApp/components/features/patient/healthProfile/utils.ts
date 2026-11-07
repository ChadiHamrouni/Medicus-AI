export type VitalType =
  | 'blood_pressure'
  | 'heart_rate'
  | 'oxygen'
  | 'temperature'
  | 'weight'
  | 'bmi'
  | 'height'
  | 'blood_type'
  | 'steps'
  | 'sleep'
  | 'calories'
  | 'hydration'
  | 'exercise'
  | 'smoking'
  | 'alcohol'
  | 'diet'
  | 'blood_glucose'
  | 'pain_score'
  | 'respiratory_rate'
  | 'body_composition'
  | 'stress_level'
  | 'diet_notes';

export const getVitalLabel = (type: VitalType): string => {
  const labels: Record<VitalType, string> = {
    blood_pressure: 'Blood Pressure',
    heart_rate: 'Heart Rate',
    oxygen: 'Oxygen Saturation',
    temperature: 'Temperature',
    weight: 'Weight',
    bmi: 'BMI',
    height: 'Height',
    blood_type: 'Blood Type',
    steps: 'Steps',
    sleep: 'Sleep Hours',
    calories: 'Calories Burned',
    hydration: 'Hydration',
    exercise: 'Exercise Frequency',
    smoking: 'Smoking Status',
    alcohol: 'Alcohol Use',
    diet: 'Diet Type',
    blood_glucose: 'Blood Glucose',
    pain_score: 'Pain Score',
    respiratory_rate: 'Respiratory Rate',
    body_composition: 'Body Composition',
    stress_level: 'Stress Level',
    diet_notes: 'Diet Notes',
  };
  return labels[type];
};

export const formatHistoryValue = (type: VitalType, value: any): string => {
  switch (type) {
    case 'blood_pressure':
      return `${value.systolic}/${value.diastolic} mmHg`;
    case 'heart_rate':
      return `${value} bpm`;
    case 'oxygen':
      return `${value}%`;
    case 'temperature':
      return `${value}°C`;
    case 'weight':
      return `${value} kg`;
    case 'bmi':
      return value.toFixed(1);
    case 'height':
      return `${value} cm`;
    case 'blood_type':
      return value;
    case 'steps':
      return `${value} steps`;
    case 'sleep':
      return `${value} hours`;
    case 'calories':
      return `${value} kcal`;
    case 'hydration':
      return `${value} L`;
    case 'blood_glucose':
      return `${value} mg/dL`;
    case 'pain_score':
      return `${value}/10`;
    case 'respiratory_rate':
      return `${value} bpm`;
    case 'stress_level':
      return `${value}/10`;
    case 'body_composition':
      if (typeof value === 'object') {
        return `Fat: ${value.body_fat_pct}%, Muscle: ${value.muscle_mass_kg}kg`;
      }
      return String(value);
    case 'diet_notes':
      return value;
    case 'exercise':
    case 'smoking':
    case 'alcohol':
    case 'diet':
      return typeof value === 'string'
        ? value.replace(/_/g, ' ')
        : String(value);
    default:
      return String(value);
  }
};

export const getBPStatus = (systolic?: number, diastolic?: number) => {
  if (!systolic || !diastolic) return { label: 'N/A', color: '#6B7280' };
  if (systolic < 120 && diastolic < 80)
    return { label: 'Normal', color: '#10B981' };
  if (systolic < 130 && diastolic < 80)
    return { label: 'Elevated', color: '#F59E0B' };
  if (systolic < 140 || diastolic < 90)
    return { label: 'High', color: '#F97316' };
  return { label: 'Very High', color: '#EF4444' };
};

export const getBMIStatus = (bmi?: number) => {
  if (!bmi) return { label: 'N/A', color: '#6B7280' };
  if (bmi < 18.5) return { label: 'Underweight', color: '#3B82F6' };
  if (bmi < 25) return { label: 'Healthy', color: '#10B981' };
  if (bmi < 30) return { label: 'Overweight', color: '#F59E0B' };
  return { label: 'Obese', color: '#EF4444' };
};
