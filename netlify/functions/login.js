const crypto = require('crypto');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, message: 'Método não permitido' }) };
  }

  const { senha } = JSON.parse(event.body);
  const senhaCorreta = process.env.SENHA_ACESSO;

  if (!senhaCorreta) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: 'Servidor mal configurado' }) };
  }

  if (senha === senhaCorreta) {
    const hoje = new Date().toISOString().split('T')[0];
    const token = crypto.createHash('sha256').update(senhaCorreta + hoje).digest('hex');
    return { statusCode: 200, body: JSON.stringify({ ok: true, token }) };
  } else {
    return { statusCode: 401, body: JSON.stringify({ ok: false, message: 'Senha incorreta' }) };
  }
};
