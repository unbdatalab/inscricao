const { getSupabase } = require('../lib/util');

// Visão geral de todos os cursos (config + conteúdo + ocupação). Protegido pela senha do painel.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const pw = (req.headers['x-admin-password']) || (req.query && req.query.pw) || '';
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return res.status(500).json({ error: 'ADMIN_PASSWORD não configurada.' });
  if (String(pw) !== String(expected)) return res.status(401).json({ error: 'nao_autorizado' });

  let supabase;
  try { supabase = getSupabase(); }
  catch (e) { return res.status(500).json({ error: e.message }); }

  const { data, error } = await supabase.rpc('ftrails_admin_overview');
  if (error) { console.error('overview error', error); return res.status(500).json({ error: 'falha' }); }
  return res.status(200).json({ cursos: data || [] });
};
