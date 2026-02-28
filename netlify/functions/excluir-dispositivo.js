const crypto = require('crypto');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'DELETE') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, message: 'Método não permitido' }) };
  }

  const token = event.headers['x-auth-token'];
  const adminToken = event.headers['x-admin-token'];
  const senhaAcesso = process.env.SENHA_ACESSO;
  const senhaAdmin = process.env.SENHA_ADMIN;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!senhaAcesso || !senhaAdmin || !supabaseUrl || !supabaseKey) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: 'Servidor mal configurado' }) };
  }

  // Valida token de sessão
  const hoje = new Date().toISOString().split('T')[0];
  const tokenEsperado = crypto.createHash('sha256').update(senhaAcesso + hoje).digest('hex');
  if (token !== tokenEsperado) {
    return { statusCode: 401, body: JSON.stringify({ ok: false, message: 'Sessão inválida' }) };
  }

  // Valida adminToken
  function gerarAdminToken(offsetMinutes = 0) {
    const hora = new Date();
    hora.setTime(hora.getTime() - offsetMinutes * 60 * 1000);
    hora.setMinutes(Math.floor(hora.getMinutes() / 30) * 30, 0, 0);
    const horaStr = hora.toISOString().slice(0, 16);
    return crypto.createHash('sha256').update(senhaAdmin + horaStr).digest('hex');
  }

  const adminTokenValido = adminToken === gerarAdminToken(0) || adminToken === gerarAdminToken(30);
  if (!adminTokenValido) {
    return { statusCode: 403, body: JSON.stringify({ ok: false, message: 'Token admin expirado. Faça login novamente.' }) };
  }

  try {
    const { id } = JSON.parse(event.body);

    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'ID não informado' }) };
    }

    const res = await fetch(`${supabaseUrl}/rest/v1/dispositivos?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error('Erro Supabase: ' + err);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: e.message }) };
  }
};
