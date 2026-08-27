const { getSupabase, sendConfirmed } = require('../lib/util');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Confirmar / cancelar uma inscrição pelo painel admin (protegido por senha).
// Ao CONFIRMAR, dispara o e-mail de confirmação para a pessoa.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const pw = req.headers['x-admin-password'] || body.pw || (req.query && req.query.pw) || '';
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return res.status(500).json({ error: 'ADMIN_PASSWORD não configurada.' });
  if (String(pw) !== String(expected)) return res.status(401).json({ error: 'nao_autorizado' });

  const id = String(body.id || (req.query && req.query.id) || '').trim();
  const action = String(body.action || (req.query && req.query.action) || '').trim();
  if (!UUID_RE.test(id)) return res.status(400).json({ error: 'id_invalido' });
  const novoStatus = action === 'confirmar' ? 'confirmed' : action === 'cancelar' ? 'cancelled' : null;
  if (!novoStatus) return res.status(400).json({ error: 'acao_invalida' });

  let supabase;
  try { supabase = getSupabase(); }
  catch (e) { return res.status(500).json({ error: e.message }); }

  const { data, error } = await supabase.rpc('ftrails_admin_set_status', { p_id: id, p_status: novoStatus });
  if (error) { console.error('admin_set_status error', error); return res.status(500).json({ error: 'falha' }); }
  if (data.status === 'not_found') return res.status(404).json({ error: 'nao_encontrada' });
  if (data.status !== 'ok') return res.status(400).json({ error: data.status });

  let email_sent = false;
  if (novoStatus === 'confirmed') {
    try {
      const r = await sendConfirmed(data.email, data.nome, data.categoria);
      email_sent = r.sent;
    } catch (e) { console.error('mail error', e && e.message); }
  }

  return res.status(200).json({ status: 'ok', new_status: data.new_status, email_sent });
};
