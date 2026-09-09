const { getSupabase } = require('../lib/util');

// Endpoint público: curso ativo + conteúdo da página + contagem de vagas (sem dados pessoais)
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  let supabase;
  try { supabase = getSupabase(); }
  catch (e) { return res.status(500).json({ error: e.message }); }

  const { data, error } = await supabase.rpc('ftrails_public');
  if (error) return res.status(500).json({ error: 'stats' });
  return res.status(200).json(data);
};
