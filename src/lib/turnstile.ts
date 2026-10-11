/**
 * Cloudflare Turnstile Server-Side Verification Helper
 * Protects form submissions against bot scrapers and spam.
 */
export async function verifyTurnstileToken(token?: string, remoteIp?: string): Promise<boolean> {
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  
  // If Turnstile secret is not set, allow gracefully without blocking legitimate users
  if (!secretKey) {
    return true;
  }

  if (!token) {
    return false;
  }

  try {
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    return Boolean(data.success);
  } catch (err) {
    console.warn('Turnstile verification network error, allowing gracefully:', err);
    return true;
  }
}
