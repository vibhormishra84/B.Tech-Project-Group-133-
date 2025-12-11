export function calculateBMI(weight, height) {
  if (!weight || !height || height === 0) return null
  // height in cm, weight in kg
  const heightInMeters = height / 100
  const bmi = weight / (heightInMeters * heightInMeters)
  return Math.round(bmi * 10) / 10 // Round to 1 decimal
}

export function getBMICategory(bmi) {
  if (!bmi) return null
  if (bmi < 18.5) return { label: 'Underweight', color: '#4f8cff' }
  if (bmi < 25) return { label: 'Normal', color: '#4caf50' }
  if (bmi < 30) return { label: 'Overweight', color: '#ff9800' }
  return { label: 'Obese', color: '#f44336' }
}

