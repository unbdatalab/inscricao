const { getSupabase, sendConfirmed, sendMessage, smtpReady } = require('../lib/util');

const STATUS_BY_AUDIENCE = {
  todos: ['pending', 'confirmed'],
  confirmados: ['confirmed'],
  pendentes: ['pending'],
};

async function runLimited(items, limit, worker) {
  let i = 0, sent = 0, failed = 0;
  async function next() {
    while (i < items.length) {
      const idx = i++;
      try { const r = await worker(items[idx]); if (r && r.sent) sent++; else failed++; }
      catch (e) { failed++; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return { sent, failed };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const pw = req.headers['x-admin-password'] || body.pw || (req.query && req.query.pw) || '';
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return res.status(500).json({ error: 'ADMIN_PASSWORD não configurada.' });
  if (String(pw) !== String(expected)) return res.status(401).json({ error: 'nao_autorizado' });

  const mode = body.mode === 'custom' ? 'custom' : 'confirmacao';
  const audience = STATUS_BY_AUDIENCE[body.audience] ? body.audience : (mode === 'confirmacao' ? 'confirmados' : 'todos');
  const subject = String(body.subject || '').trim();
  const message = String(body.message || '').trim();

  if (mode === 'custom') {
    if (subject.length < 2) return res.status(400).json({ error: 'assunto_vazio' });
    if (message.length < 2) return res.status(400).json({ error: 'mensagem_vazia' });
  }

  if (!smtpReady()) {
    return res.status(200).json({ status: 'no_smtp', total: 0, sent: 0, failed: 0,
      message: 'O envio de e-mail ainda não está configurado (SMTP). Configure SMTP_USER, SMTP_PASS e MAIL_FROM na Vercel.' });
  }

  let supabase;
  try { supabase = getSupabase(); }
  catch (e) { return res.status(500).json({ error: e.message }); }

  const { data, error } = await supabase
    .from('ftrails_registrations')
    .select('nome,email,categoria')
    .eq('curso', 'gestao')
    .in('status', STATUS_BY_AUDIENCE[audience]);

  if (error) { console.error('broadcast select', error); return res.status(500).json({ error: 'falha' }); }
  const recips = (data || []).filter(r => r.email);
  if (!recips.length) return res.status(200).json({ status: 'ok', total: 0, sent: 0, failed: 0, message: 'Nenhum destinatário para este público.' });

  const worker = (r) => mode === 'custom'
    ? sendMessage(r.email, subject, r.nome, message)
    : sendConfirmed(r.email, r.nome, r.categoria);

  const { sent, failed } = await runLimited(recips, 4, worker);
  return res.status(200).json({ status: 'ok', total: recips.length, sent, failed });
};
