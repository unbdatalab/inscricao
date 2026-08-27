const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

/* ---------- Supabase ---------- */
let _client = null;
function getSupabase() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Configuração ausente: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente.');
  _client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _client;
}

/* ---------- Validação ---------- */
const FREE_PROVIDERS = new Set([
  'gmail.com','googlemail.com','hotmail.com','hotmail.com.br','outlook.com','outlook.com.br',
  'live.com','msn.com','yahoo.com','yahoo.com.br','ymail.com','icloud.com','me.com','mac.com',
  'aol.com','proton.me','protonmail.com','pm.me','gmx.com','zoho.com','mail.com',
  'uol.com.br','bol.com.br','terra.com.br','ig.com.br','globo.com','globomail.com',
  'oi.com.br','r7.com','zipmail.com.br','superig.com.br','pop.com.br','ibest.com.br'
]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkInstitutionalEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(e)) return { ok: false, reason: 'formato' };
  const domain = e.split('@')[1];
  if (!domain) return { ok: false, reason: 'formato' };
  if (FREE_PROVIDERS.has(domain)) return { ok: false, reason: 'gratuito' };
  if (!domain.endsWith('.br')) return { ok: false, reason: 'nao_br' };
  const categoria = (domain === 'unb.br' || domain.endsWith('.unb.br')) ? 'unb' : 'externo';
  return { ok: true, categoria, domain };
}

function isValidCPF(cpf) {
  const s = String(cpf || '').replace(/\D/g, '');
  if (s.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(s)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(s[i], 10) * (10 - i);
  let d1 = 11 - (soma % 11); if (d1 >= 10) d1 = 0;
  if (d1 !== parseInt(s[9], 10)) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(s[i], 10) * (11 - i);
  let d2 = 11 - (soma % 11); if (d2 >= 10) d2 = 0;
  if (d2 !== parseInt(s[10], 10)) return false;
  return true;
}

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const VINCULOS = ['tae','docente-gestor','externo','egresso','outro'];

/* ---------- E-mail ---------- */
function getTransport() {
  const user = process.env.SMTP_USER, pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}
function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function confirmHtml(nome, link, categoria) {
  const vaga = categoria === 'unb' ? 'vaga interna (UnB)' : 'vaga externa';
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f2f5fb;font-family:Segoe UI,Arial,sans-serif;color:#1f2a44">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#12356b;color:#fff;padding:22px 26px;border-radius:14px 14px 0 0">
      <div style="font-size:13px;letter-spacing:.5px;opacity:.85">TRILHA FTRAILS · DATALAB · FACULDADE DE TECNOLOGIA · UnB</div>
      <div style="font-size:20px;font-weight:700;margin-top:6px">Confirme sua inscrição</div>
    </div>
    <div style="background:#fff;padding:26px;border-radius:0 0 14px 14px;border:1px solid #e3e9f4;border-top:none">
      <p>Olá, <strong>${escapeHtml(nome)}</strong>.</p>
      <p>Recebemos sua inscrição no curso <strong>Introdução à Inteligência Artificial Aplicada à Gestão Universitária</strong> (Curso 1 · Gestão), na sua ${vaga}.</p>
      <p>Para <strong>garantir sua vaga</strong>, confirme o e-mail clicando no botão abaixo:</p>
      <p style="text-align:center;margin:28px 0">
        <a href="${link}" style="background:#1f8a5b;color:#fff;text-decoration:none;padding:14px 30px;border-radius:10px;font-weight:700;display:inline-block">Confirmar minha inscrição</a>
      </p>
      <p style="font-size:13px;color:#5b6a80">Se o botão não funcionar, copie e cole este endereço no navegador:<br>
      <span style="color:#12356b;word-break:break-all">${link}</span></p>
      <p style="font-size:13px;color:#8a94a6;margin-top:24px">A vaga fica reservada por até 48 horas até a confirmação. Se você não solicitou esta inscrição, ignore este e-mail.</p>
    </div>
    <p style="text-align:center;font-size:12px;color:#8a94a6;margin-top:16px">Laboratório de Dados (DataLab) · Faculdade de Tecnologia · Universidade de Brasília</p>
  </div></body></html>`;
}
async function sendConfirmation(to, nome, link, categoria) {
  const t = getTransport();
  if (!t) return { sent: false, reason: 'smtp_nao_configurado' };
  const from = process.env.MAIL_FROM || `FTrails DataLab <${process.env.SMTP_USER}>`;
  await t.sendMail({ from, to, subject: 'Confirme sua inscrição — FTrails · IA na Gestão Universitária', html: confirmHtml(nome, link, categoria) });
  return { sent: true };
}

module.exports = { getSupabase, checkInstitutionalEmail, isValidCPF, UFS, VINCULOS, sendConfirmation };
