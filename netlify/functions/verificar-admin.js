const crypto = require('crypto');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, message: 'Método não permitido' }) };
  }

  // Valida o token de sessão normal primeiro
  const token = event.headers['x-auth-token'];
  const senhaAcesso = process.env.SENHA_ACESSO;
  const senhaAdmin = process.env.SENHA_ADMIN;

  if (!senhaAcesso || !senhaAdmin) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: 'Servidor mal configurado' }) };
  }

  const hoje = new Date().toISOString().split('T')[0];
  const tokenEsperado = crypto.createHash('sha256').update(senhaAcesso + hoje).digest('hex');

  if (token !== tokenEsperado) {
    return { statusCode: 401, body: JSON.stringify({ ok: false, message: 'Sessão inválida' }) };
  }

  // Valida senha admin
  const { senha } = JSON.parse(event.body);
  if (senha !== senhaAdmin) {
    return { statusCode: 401, body: JSON.stringify({ ok: false, message: 'Senha admin incorreta' }) };
  }

  // Gera adminToken (válido por 30 minutos — baseado em hora atual arredondada)
  const hora = new Date();
  hora.setMinutes(Math.floor(hora.getMinutes() / 30) * 30, 0, 0);
  const horaStr = hora.toISOString().slice(0, 16);
  const adminToken = crypto.createHash('sha256').update(senhaAdmin + horaStr).digest('hex');

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, adminToken })
  };
};
