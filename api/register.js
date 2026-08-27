const { getSupabase, checkInstitutionalEmail, isValidCPF, UFS, VINCULOS, sendConfirmation } = require('../lib/util');

const CURSO = 'gestao';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ status: 'error', message: 'Método não permitido.' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const nome = String(body.nome || '').trim();
  const cpf = String(body.cpf || '').trim();
  const email = String(body.email || '').trim();
  const telefone = String(body.telefone || '').trim();
  const instituicao = String(body.instituicao || '').trim();
  const vinculo = String(body.vinculo || '').trim();
  const cargo = String(body.cargo || '').trim();
  const uf = String(body.uf || '').trim().toUpperCase();
  const municipio = String(body.municipio || '').trim();

  // Validações
  if (nome.length < 3) return res.status(400).json({ status: 'error', field: 'nome', message: 'Informe seu nome completo.' });
  if (!isValidCPF(cpf)) return res.status(400).json({ status: 'error', field: 'cpf', message: 'CPF inválido.' });
  const chk = checkInstitutionalEmail(email);
  if (!chk.ok) {
    const msg = chk.reason === 'gratuito'
      ? 'Use o e-mail institucional da sua universidade/instituição (provedores gratuitos como Gmail e Outlook não são aceitos).'
      : chk.reason === 'nao_br'
        ? 'A inscrição exige um e-mail institucional de instituição brasileira (domínio .br).'
        : 'E-mail inválido.';
    return res.status(400).json({ status: 'error', field: 'email', message: msg });
  }
  if (instituicao.length < 2) return res.status(400).json({ status: 'error', field: 'instituicao', message: 'Informe sua instituição.' });
  if (!VINCULOS.includes(vinculo)) return res.status(400).json({ status: 'error', field: 'vinculo', message: 'Selecione seu vínculo.' });
  if (!UFS.includes(uf)) return res.status(400).json({ status: 'error', field: 'uf', message: 'Selecione a UF.' });

  // Geolocalização a partir dos headers da Vercel
  const ip_country = req.headers['x-vercel-ip-country'] || null;
  const ip_region = req.headers['x-vercel-ip-country-region'] || null;
  let ip_city = req.headers['x-vercel-ip-city'] || null;
  if (ip_city) { try { ip_city = decodeURIComponent(ip_city); } catch { /* mantém */ } }

  let supabase;
  try { supabase = getSupabase(); }
  catch (e) { return res.status(500).json({ status: 'error', message: e.message }); }

  const { data, error } = await supabase.rpc('ftrails_register', {
    p_curso: CURSO, p_nome: nome, p_cpf: cpf, p_email: email, p_telefone: telefone,
    p_instituicao: instituicao, p_vinculo: vinculo, p_cargo: cargo, p_uf: uf, p_municipio: municipio,
    p_ip_region: ip_region, p_ip_country: ip_country, p_ip_city: ip_city
  });

  if (error) {
    console.error('register rpc error', error);
    return res.status(500).json({ status: 'error', message: 'Erro ao processar a inscrição. Tente novamente em instantes.' });
  }

  if (data.status === 'duplicate') {
    return res.status(409).json({ status: 'duplicate', message: 'Este e-mail já possui uma inscrição neste curso.' });
  }
  if (data.status === 'full') {
    const cat = data.categoria === 'unb' ? 'internas (UnB)' : 'externas';
    return res.status(409).json({ status: 'full', categoria: data.categoria, message: `As vagas ${cat} para este curso estão esgotadas.` });
  }

  // status ok — envia e-mail de confirmação
  const base = (process.env.BASE_URL || `https://${req.headers.host}`).replace(/\/$/, '');
  const link = `${base}/api/confirm?token=${data.token}`;
  let email_sent = false;
  try {
    const r = await sendConfirmation(email, nome, link, data.categoria);
    email_sent = r.sent;
  } catch (e) {
    console.error('mail error', e && e.message);
  }

  return res.status(200).json({
    status: 'ok',
    categoria: data.categoria,
    email_sent,
    message: email_sent
      ? 'Inscrição recebida! Enviamos um e-mail de confirmação — clique no link para garantir sua vaga.'
      : 'Inscrição recebida! No momento não foi possível enviar o e-mail de confirmação; a coordenação entrará em contato.'
  });
};
