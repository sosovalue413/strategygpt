import { keccak256, stringToHex } from "viem";

export function canonicalize(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function strategyHash(value: unknown) {
  return keccak256(stringToHex(canonicalize(value)));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, sortValue(nested)])
    );
  }

  return value;
}
