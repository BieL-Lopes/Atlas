export async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  const baseUrl = import.meta.env.VITE_ZAPI_URL;
  if (!baseUrl) {
    console.error('VITE_ZAPI_URL não está configurada.');
    return false;
  }

  // Sanitiza o telefone: apenas números
  const digits = phone.replace(/\D/g, '');
  // Garante o DDI 55
  const normalizedPhone = digits.startsWith('55') ? digits : `55${digits}`;

  try {
    const response = await fetch(`${baseUrl}/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: normalizedPhone,
        message: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro na Z-API (${response.status}):`, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro de rede ao chamar a Z-API:', error);
    return false;
  }
}
