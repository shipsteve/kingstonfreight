import { config } from "../config";
import type { PackageInput } from "./types";

const roundUpToHalfKg = (kg: number) => Math.ceil(kg * 2 - 1e-9) / 2;

export function billableWeightKg(packages: PackageInput[], divisor: number = config.volumetricDivisor): number {
  return packages.reduce((total, p) => {
    const volumetric = (p.lengthCm * p.widthCm * p.heightCm) / divisor;
    return total + roundUpToHalfKg(Math.max(p.weightKg, volumetric)) * p.qty;
  }, 0);
}
