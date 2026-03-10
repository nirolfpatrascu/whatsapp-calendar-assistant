/**
 * Send a WhatsApp message via Green API.
 */
export async function sendWhatsAppMessage(
  chatId: string,
  message: string
): Promise<{ idMessage: string }> {
  const url = `${process.env.GREEN_API_URL}/waInstance${process.env.GREEN_API_INSTANCE_ID}/sendMessage/${process.env.GREEN_API_TOKEN}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Green API error: ${response.status} ${errorText}`
    );
  }

  return (await response.json()) as { idMessage: string };
}
