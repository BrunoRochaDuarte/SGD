const crypto = require('crypto');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, message: 'Método não permitido' }) };
  }

  // Valida token de sessão
  const token = event.headers['x-auth-token'];
  const senhaAcesso = process.env.SENHA_ACESSO;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!senhaAcesso || !supabaseUrl || !supabaseKey) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: 'Servidor mal configurado' }) };
  }

  const hoje = new Date().toISOString().split('T')[0];
  const tokenEsperado = crypto.createHash('sha256').update(senhaAcesso + hoje).digest('hex');

  if (token !== tokenEsperado) {
    return { statusCode: 401, body: JSON.stringify({ ok: false, message: 'Não autorizado' }) };
  }

  // Busca no Supabase
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/dispositivos?select=*&order=created_at.desc`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) throw new Error('Erro Supabase: ' + res.status);
    const dispositivos = await res.json();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, dispositivos })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: e.message }) };
  }
};
