const { getSupabase } = require('../lib/util');

// Palavras muito comuns do português (e genéricas do tema) que não agregam ao mapa.
const STOP = new Set(('a o e é de do da das dos em no na nas nos um uma uns umas para por com sem sobre ' +
  'que quem qual quais como quando onde porque pois porém mas e ou nem se já não sim muito mais menos ' +
  'meu minha meus minhas seu sua seus suas nosso nossa dele dela deles delas este esta isto esse essa isso ' +
  'aquele aquela aquilo ao aos à às pelo pela pelos pelas ser estar ter haver fazer tem têm há são foi ' +
  'era são está estão sendo entre até então também só apenas cada todo toda todos todas nada tudo algo ' +
  'alguns algumas nenhum nenhuma outro outra outros outras mesmo mesma vez vezes ainda aqui ali lá ' +
  'eu tu ele ela nós vós eles elas me te lhe nos vos se meu teu ' +
  'na gestão universitária universidade instituição instituições ' +
  'maior dor desafio desafios dificuldade dificuldades problema problemas ' +
  'muita muitas muitos pouco pouca poucos poucas ' +
  'ter fazer poder dever ir vir dar').split(/\s+/).filter(Boolean));

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const pw = req.headers['x-admin-password'] || (req.query && req.query.pw) || '';
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return res.status(500).json({ error: 'ADMIN_PASSWORD não configurada.' });
  if (String(pw) !== String(expected)) return res.status(401).json({ error: 'nao_autorizado' });

  let supabase;
  try { supabase = getSupabase(); }
  catch (e) { return res.status(500).json({ error: e.message }); }

  const { data, error } = await supabase
    .from('ftrails_registrations')
    .select('desafio')
    .eq('curso', 'gestao')
    .neq('status', 'cancelled')
    .not('desafio', 'is', null);

  if (error) { console.error('wordcloud error', error); return res.status(500).json({ error: 'falha' }); }

  const counts = new Map();
  let respostas = 0;
  for (const row of (data || [])) {
    const txt = String(row.desafio || '').trim();
    if (!txt) continue;
    respostas++;
    const tokens = txt.toLowerCase().normalize('NFC').split(/[^0-9a-zA-Záàâãéêíóôõúüçñ]+/);
    for (let w of tokens) {
      w = w.trim();
      if (w.length < 3) continue;
      if (/^\d+$/.test(w)) continue;
      if (STOP.has(w)) continue;
      counts.set(w, (counts.get(w) || 0) + 1);
    }
  }

  const words = [...counts.entries()]
    .map(([word, n]) => ({ word, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 60);

  return res.status(200).json({ respostas, words });
};
