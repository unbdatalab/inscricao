const { getSupabase } = require('../lib/util');

// Ajusta os limites de vagas (protegido pela senha do painel).
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const pw = req.headers['x-admin-password'] || body.pw || (req.query && req.query.pw) || '';
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return res.status(500).json({ error: 'ADMIN_PASSWORD não configurada.' });
  if (String(pw) !== String(expected)) return res.status(401).json({ error: 'nao_autorizado' });

  const clamp = (v) => Math.max(0, Math.min(2000, Math.round(Number(v))));
  if (body.limite_unb == null || body.limite_externo == null || isNaN(Number(body.limite_unb)) || isNaN(Number(body.limite_externo))) {
    return res.status(400).json({ error: 'limites_invalidos' });
  }
  const limUnb = clamp(body.limite_unb);
  const limExt = clamp(body.limite_externo);

  let supabase;
  try { supabase = getSupabase(); }
  catch (e) { return res.status(500).json({ error: e.message }); }

  const { data, error } = await supabase.rpc('ftrails_set_limites', { p_curso: 'gestao', p_limite_unb: limUnb, p_limite_externo: limExt });
  if (error) { console.error('set_limites error', error); return res.status(500).json({ error: 'falha' }); }

  return res.status(200).json({ status: 'ok', limite_unb: data.limite_unb, limite_externo: data.limite_externo });
};
