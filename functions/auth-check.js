export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }
  try {
    const { password } = JSON.parse(event.body || '{}');
    const CLASS_PASSWORD = process.env.CLASS_PASSWORD;
    if (!CLASS_PASSWORD) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfigured' }) };
    }
    if (password !== CLASS_PASSWORD) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Sai mật khẩu lớp!' }) };
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bad Request' }) };
  }
}
