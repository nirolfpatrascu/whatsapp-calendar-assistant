/**
 * Exchange a Google refresh token for a fresh access token.
 * Ported from n8n Workflow 6 "Get Google access token" node.
 */
export async function exchangeRefreshToken(
  refreshToken: string
): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google token refresh failed: ${response.status} ${error}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}
