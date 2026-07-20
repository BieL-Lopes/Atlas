export function formatDate(dateString: string, isBirthDate: boolean = false): string {
  if (!dateString) return '';
  // Se a data já vier no formato BR (seed data)
  if (dateString.includes('/')) return dateString;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Data Inválida';

    if (isBirthDate) {
      // Para data de nascimento que vem como YYYY-MM-DD (do timezone UTC)
      // O jeito mais seguro para YYYY-MM-DD é quebrar no hifen
      if (dateString.includes('-') && dateString.length === 10) {
        const [y, m, d] = dateString.split('-');
        return `${d}/${m}/${y}`;
      }
      return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    }

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

export function formatLongDate(dateString: string): string {
  try {
    const date = new Date(dateString + 'T12:00:00');
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
  } catch {
    return dateString;
  }
}
