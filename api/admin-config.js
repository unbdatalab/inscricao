const { getSupabase } = require('../lib/util');

// Liga/desliga o encerramento das inscrições (protegido pela senha do painel).
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const pw = req.headers['x-admin-password'] || body.pw || (req.query && req.query.pw) || '';
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return res.status(500).json({ error: 'ADMIN_PASSWORD não configurada.' });
  if (String(pw) !== String(expected)) return res.status(401).json({ error: 'nao_autorizado' });

  const encerrado = body.encerrado === true || body.encerrado === 'true' || body.encerrado === 'sim';

  let supabase;
  try { supabase = getSupabase(); }
  catch (e) { return res.status(500).json({ error: e.message }); }

  const { data, error } = await supabase.rpc('ftrails_set_encerrado', { p_curso: 'gestao', p_encerrado: encerrado });
  if (error) { console.error('set_encerrado error', error); return res.status(500).json({ error: 'falha' }); }

  return res.status(200).json({ status: 'ok', encerrado: data.encerrado === true });
};
