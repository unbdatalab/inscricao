const { getSupabase } = require('../lib/util');

// Salva o conteúdo editável (datas e painel de pré-inscrição) de um curso. Protegido pela senha.
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

  // Sanitiza a lista de datas: mantém só campos conhecidos.
  let datas = null;
  if (Array.isArray(body.datas)) {
    datas = body.datas.slice(0, 12).map(x => ({
      s: String((x && x.s) || '').slice(0, 60),
      d: String((x && x.d) || '').slice(0, 20),
      h: String((x && x.h) || '').slice(0, 60),
      oficina: !!(x && x.oficina)
    })).filter(x => x.d || x.s);
  }

  const str = (v, max) => (v == null ? null : String(v).slice(0, max || 400));

  let supabase;
  try { supabase = getSupabase(); }
  catch (e) { return res.status(500).json({ error: e.message }); }

  const { data, error } = await supabase.rpc('ftrails_set_conteudo', {
    p_curso: curso,
    p_nome_curto: str(body.nome_curto, 80),
    p_titulo: str(body.titulo, 200),
    p_subtitulo: str(body.subtitulo, 500),
    p_eixo: str(body.eixo, 400),
    p_periodo: str(body.periodo, 80),
    p_periodo_sub: str(body.periodo_sub, 80),
    p_datas_lead: str(body.datas_lead, 600),
    p_datas: datas,
    p_pergunta: str(body.pergunta, 300),
    p_objetivo: str(body.objetivo, 900),
    p_publico_unb: str(body.publico_unb, 900),
    p_publico_externo: str(body.publico_externo, 900)
  });
  if (error) { console.error('set_conteudo error', error); return res.status(500).json({ error: 'falha' }); }
  if (data && data.status === 'not_found') return res.status(404).json({ error: 'curso_nao_encontrado' });

  return res.status(200).json({ status: 'ok', curso });
};
