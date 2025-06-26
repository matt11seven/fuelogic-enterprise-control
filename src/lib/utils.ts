import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

// Validação de placa brasileira (formatos antigo e novo)
export function isValidBrazilianLicensePlate(plate: string): boolean {
  // Formato antigo: AAA-1234
  const oldFormat = /^[A-Z]{3}-\d{4}$/;
  // Formato novo: AAA1A23
  const newFormat = /^[A-Z]{3}\d[A-Z]\d{2}$/;
  
  return oldFormat.test(plate) || newFormat.test(plate);
}
