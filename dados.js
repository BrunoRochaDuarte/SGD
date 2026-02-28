const crypto = require('crypto');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, message: 'Método não permitido' }) };
  }

  const token = event.headers['x-auth-token'];
  const senhaCorreta = process.env.SENHA_ACESSO;
  const fileId = process.env.GOOGLE_FILE_ID;
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!senhaCorreta || !fileId || !apiKey) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: 'Servidor mal configurado' }) };
  }

  const hoje = new Date().toISOString().split('T')[0];
  const tokenEsperado = crypto.createHash('sha256').update(senhaCorreta + hoje).digest('hex');

  if (token !== tokenEsperado) {
    return { statusCode: 401, body: JSON.stringify({ ok: false, message: 'Não autorizado' }) };
  }

  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Erro ao buscar dados: ' + res.status);
    const data = await res.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: e.message }) };
  }
};
