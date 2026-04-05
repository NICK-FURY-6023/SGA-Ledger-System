export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Indian register format: 1,17,522=00
export function formatRegisterAmount(amount: number): { rupees: string; paise: string } {
  if (amount === 0) return { rupees: '', paise: '' };
  const abs = Math.abs(amount);
  const rupees = Math.floor(abs);
  const paise = Math.round((abs - rupees) * 100);
  const rupeesStr = new Intl.NumberFormat('en-IN').format(rupees);
  const paiseStr = paise.toString().padStart(2, '0');
  return {
    rupees: (amount < 0 ? '-' : '') + rupeesStr,
    paise: paiseStr,
  };
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDateForInput(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
}

export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}
