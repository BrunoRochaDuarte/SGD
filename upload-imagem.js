const crypto = require('crypto');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
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
    // Parse multipart — extrai o arquivo do body base64
    const body = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body);

    const contentType = event.headers['content-type'] || '';
    const boundary = contentType.split('boundary=')[1];

    if (!boundary) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'Formato inválido' }) };
    }

    // Extrai o arquivo do multipart manualmente
    const boundaryBuf = Buffer.from('--' + boundary);
    const parts = [];
    let start = 0;

    while (start < body.length) {
      const boundaryIdx = body.indexOf(boundaryBuf, start);
      if (boundaryIdx === -1) break;
      const headerStart = boundaryIdx + boundaryBuf.length + 2;
      const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), headerStart);
      if (headerEnd === -1) break;
      const headers = body.slice(headerStart, headerEnd).toString();
      const dataStart = headerEnd + 4;
      const nextBoundary = body.indexOf(boundaryBuf, dataStart);
      const dataEnd = nextBoundary !== -1 ? nextBoundary - 2 : body.length;
      parts.push({ headers, data: body.slice(dataStart, dataEnd) });
      start = nextBoundary !== -1 ? nextBoundary : body.length;
    }

    const filePart = parts.find(p => p.headers.includes('filename'));
    if (!filePart) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, message: 'Nenhum arquivo encontrado' }) };
    }

    // Detecta tipo do arquivo
    const mimeMatch = filePart.headers.match(/Content-Type:\s*([^\r\n]+)/i);
    const mimeType = mimeMatch ? mimeMatch[1].trim() : 'image/jpeg';
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';

    // Nome único para o arquivo
    const fileName = `dispositivos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    // Upload para Supabase Storage
    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/fotos/${fileName}`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': mimeType,
        'x-upsert': 'true'
      },
      body: filePart.data
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error('Erro no upload: ' + err);
    }

    // Monta URL pública
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/fotos/${fileName}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, url: publicUrl })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: e.message }) };
  }
};
