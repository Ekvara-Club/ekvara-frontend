// PUT /athletes/:id/measurements — cm entiers, null = non renseigné.
export interface AthleteMeasurements {
  tailleCm: number | null;
  longueurBrasCm: number | null;
}

// Mêmes bornes que le backend (UpdateAthleteMeasurementsDto).
export const HEIGHT_CM = { min: 100, max: 250 } as const;
export const ARM_LENGTH_CM = { min: 40, max: 130 } as const;
