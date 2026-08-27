const { getSupabase } = require('../lib/util');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function page(titulo, corpo, cor) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo} — FTrails</title>
<style>
  body{margin:0;font-family:Segoe UI,system-ui,Arial,sans-serif;background:#eef2fa;color:#1f2a44;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:20px}
  .card{background:#fff;max-width:520px;width:100%;border-radius:16px;box-shadow:0 12px 40px rgba(18,53,107,.12);overflow:hidden;border:1px solid #e3e9f4}
  .top{background:${cor};color:#fff;padding:26px 30px}
  .top .k{font-size:12px;letter-spacing:.6px;opacity:.85}
  .top h1{margin:8px 0 0;font-size:22px}
  .body{padding:26px 30px 32px}
  .body p{line-height:1.6}
  .btn{display:inline-block;margin-top:14px;background:#12356b;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600}
  .foot{font-size:12px;color:#8a94a6;text-align:center;padding:0 30px 24px}
</style></head><body>
  <div class="card">
    <div class="top"><div class="k">TRILHA FTRAILS · DATALAB · FT · UnB</div><h1>${titulo}</h1></div>
    <div class="body">${corpo}<div><a class="btn" href="/">Voltar à página do curso</a></div></div>
    <div class="foot">Laboratório de Dados (DataLab) · Faculdade de Tecnologia · Universidade de Brasília</div>
  </div>
</body></html>`;
}

module.exports = async (req, res) => {
  const token = (req.query && req.query.token) || '';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!UUID_RE.test(token)) {
    return res.status(400).send(page('Link inválido',
      '<p>O link de confirmação está incompleto ou inválido. Verifique se copiou o endereço completo do e-mail.</p>', '#b23b3b'));
  }

  let supabase;
  try { supabase = getSupabase(); }
  catch (e) { return res.status(500).send(page('Indisponível', `<p>${e.message}</p>`, '#b23b3b')); }

  const { data, error } = await supabase.rpc('ftrails_confirm', { p_token: token });
  if (error) {
    console.error('confirm rpc error', error);
    return res.status(500).send(page('Erro', '<p>Não foi possível confirmar agora. Tente novamente em instantes.</p>', '#b23b3b'));
  }

  if (data.status === 'ok') {
    return res.status(200).send(page('Inscrição confirmada!',
      `<p>Pronto, <strong>${escapeHtml(data.nome)}</strong>! Sua vaga no <strong>Curso 1 · IA na Gestão Universitária</strong> está <strong>confirmada</strong>.</p>
       <p>Você receberá as orientações de acesso (sala virtual e ambiente Aprender3) pela coordenação antes da primeira sessão, em <strong>01/09/2026, 13h</strong>.</p>`, '#1f8a5b'));
  }
  if (data.status === 'already') {
    return res.status(200).send(page('Inscrição já confirmada',
      `<p>Sua inscrição, <strong>${escapeHtml(data.nome || '')}</strong>, já estava confirmada. Não é preciso fazer nada. Até 01/09!</p>`, '#1f8a5b'));
  }
  if (data.status === 'cancelled') {
    return res.status(200).send(page('Inscrição cancelada',
      '<p>Esta inscrição foi cancelada. Se deseja participar, faça uma nova inscrição na página do curso.</p>', '#b23b3b'));
  }
  return res.status(404).send(page('Link não encontrado',
    '<p>Não encontramos uma inscrição para este link. Ele pode ter expirado. Faça uma nova inscrição, se necessário.</p>', '#b23b3b'));
};

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
