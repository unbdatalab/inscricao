const { getSupabase } = require('../lib/util');

// Define qual curso fica ABERTO ao público (ativo) e o reabre. Protegido pela senha do painel.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const pw = req.headers['x-admin-password'] || body.pw || (req.query && req.query.pw) || '';
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return res.status(500).json({ error: 'ADMIN_PASSWORD não configurada.' });
  if (String(pw) !== String(expected)) return res.status(401).json({ error: 'nao_autorizado' });

  const curso = String(body.curso || '').trim();
  if (!curso) return res.status(400).json({ error: 'curso_invalido' });

  let supabase;
  try { supabase = getSupabase(); }
  catch (e) { return res.status(500).json({ error: e.message }); }

  const { data, error } = await supabase.rpc('ftrails_set_ativo', { p_curso: curso });
  if (error) { console.error('set_ativo error', error); return res.status(500).json({ error: 'falha' }); }
  if (data && data.status === 'not_found') return res.status(404).json({ error: 'curso_nao_encontrado' });

  return res.status(200).json({ status: 'ok', curso });
};
