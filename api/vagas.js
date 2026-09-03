const { getSupabase } = require('../lib/util');

// Endpoint público: devolve apenas contagem de vagas (sem dados pessoais)
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  let supabase;
  try { supabase = getSupabase(); }
  catch (e) { return res.status(500).json({ error: e.message }); }

  const { data, error } = await supabase.rpc('ftrails_stats', { p_curso: 'gestao' });
  if (error) return res.status(500).json({ error: 'stats' });

  const unbOcup = (data.unb_confirmados || 0) + (data.unb_pendentes || 0);
  const extOcup = (data.externo_confirmados || 0) + (data.externo_pendentes || 0);
  const limUnb = Number(data.limite_unb) || 0;
  const limExt = Number(data.limite_externo) || 0;
  return res.status(200).json({
    encerrado: data.encerrado === true,
    unb: { limite: limUnb, ocupadas: unbOcup, restantes: Math.max(0, limUnb - unbOcup) },
    externo: { limite: limExt, ocupadas: extOcup, restantes: Math.max(0, limExt - extOcup) }
  });
};
