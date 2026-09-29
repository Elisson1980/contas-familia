// Contas da Família — app (PWA). Tema noturno, dados no Firebase (ou modo demonstração).
import {
  calcularConta, taxaEm, taxaDiaria, hojeISO, fmtBRL, fmtNum, fmtData, fmtPct, nomeMes, parseValorBR,
} from './calc.js';
import { firebaseConfig, LOGINS } from './firebase-config.js';

// ---------------------------------------------------------------- pessoas
const PESSOAS = {
  elisson: { nome: 'Elisson', completo: 'Elisson Henrique Nunes Félix', ini: 'EF', num: '01' },
  ramon:   { nome: 'Ramon',   completo: 'Ramon Eustáquio Nunes Félix',  ini: 'RF', num: '02' },
  mariele: { nome: 'Mariele', completo: 'Mariele Cristina Nunes Félix', ini: 'MF', num: '03' },
  pais:    { nome: 'Elio & Maria de Fátima', ola: 'Elio e Maria', completo: 'Elio Félix e Maria de Fátima', ini: 'EM' },
};
const CONTAS = ['elisson', 'ramon', 'mariele'];
const TODOS = ['elisson', 'ramon', 'mariele', 'pais'];
const FIREBASE_VERSAO = '10.12.2';
const DEMO = !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith('COLE') || new URLSearchParams(location.search).has('demo');
const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const NOME_BIO = IOS ? 'Face ID' : 'biometria';

// ---------------------------------------------------------------- utilidades
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LS = {
  get(k, d) { try { const v = localStorage.getItem('cf.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('cf.' + k, JSON.stringify(v)); } catch { /* sem armazenamento */ } },
  del(k) { try { localStorage.removeItem('cf.' + k); } catch { /* idem */ } },
};
const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
const ic = {
  casa: svg('<path d="M3.5 10.5 12 4l8.5 6.5V19a1 1 0 0 1-1 1h-5v-5.5h-5V20h-5a1 1 0 0 1-1-1z"/>'),
  familia: svg('<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M15.5 5.2a3 3 0 0 1 0 5.6"/><path d="M17.5 14.3c2 .7 3.5 2.5 3.5 5.2"/>'),
  pessoa: svg('<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20c.9-3.8 3.9-5.8 7.5-5.8s6.6 2 7.5 5.8"/>'),
  cadeado: svg('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><path d="M12 14.5v2.5"/>'),
  voltar: svg('<path d="M15 5l-7 7 7 7"/>'),
  entrada: svg('<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>'),
  saida: svg('<path d="M12 15V4"/><path d="M7 9l5-5 5 5"/><path d="M5 20h14"/>'),
  rende: svg('<path d="M4 17l5-5 4 3 7-8"/><path d="M15 7h5v5"/>'),
  camera: svg('<path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/>'),
  rosto: svg('<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M9 9.5v1M15 9.5v1M12 9.5v3.5h-1"/><path d="M9.5 16c1.4 1 3.6 1 5 0"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
};

// ---------------------------------------------------------------- estado
const S = {
  backend: null, eu: null, dados: null, calc: null,
  bloqueado: true, entrando: false, pronto: false,
  sheet: null, ocupado: false, erro: '',
  temBio: false, logo: false, saiuEm: 0, pendente: false,
};

// ---------------------------------------------------------------- backend: demonstração (só neste aparelho)
function criarDemo() {
  const semente = () => ({
    contas: {
      elisson: { investimento: 'CDB Itaú Personnalité', agencia: '0000', conta: '00000-0', taxas: [{ mensal: 0.01, aPartirDe: '2026-08-21' }] },
      ramon: {}, mariele: {},
    },
    lanc: {
      elisson: [{ id: 'demo1', tipo: 'deposito', valorCentavos: 4000000, data: '2026-08-21', criadoPor: 'demo', criadoEm: Date.parse('2026-08-21T12:00:00') }],
      ramon: [], mariele: [],
    },
    perfis: {},
  });
  let dados = LS.get('demo.dados', null) || semente();
  let usuario = LS.get('demo.usuario', null);
  let onU = () => {}; let onD = () => {};
  const emitir = () => onD(JSON.parse(JSON.stringify(dados)));
  const salvar = () => { LS.set('demo.dados', dados); emitir(); };
  return {
    demo: true,
    iniciar(u, d) { onU = u; onD = d; setTimeout(() => { onU(usuario); if (usuario) emitir(); }, 0); },
    async entrar(k) { usuario = k; LS.set('demo.usuario', k); onU(k); emitir(); },
    async sair() { usuario = null; LS.del('demo.usuario'); onU(null); },
    async trocarPin() {},
    async lancar(k, l) { dados.lanc[k].push({ id: 'l' + Date.now(), ...l, criadoPor: 'demo', criadoEm: Date.now() }); salvar(); },
    async excluir(k, id) { dados.lanc[k] = dados.lanc[k].filter((x) => x.id !== id); salvar(); },
    async salvarConta(k, campos) { dados.contas[k] = { ...dados.contas[k], ...campos }; salvar(); },
    async salvarPerfil(k, campos) { dados.perfis[k] = { ...dados.perfis[k], ...campos }; salvar(); },
    reiniciar() { dados = semente(); salvar(); },
  };
}

// ---------------------------------------------------------------- backend: Firebase
async function criarFirebase() {
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSAO}/`;
  const [{ initializeApp }, A, F] = await Promise.all([
    import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js'),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  let db;
  try { db = F.initializeFirestore(app, { localCache: F.persistentLocalCache() }); } catch { db = F.getFirestore(app); }
  const chaveDe = (email) => TODOS.find((k) => (LOGINS[k] || '').toLowerCase() === (email || '').toLowerCase()) || null;
  let subs = [];
  const falha = (e) => { console.error(e); aviso('Sem permissão para ler os dados. Confira se as regras foram publicadas.'); };

  return {
    demo: false,
    iniciar(onU, onD) {
      A.onAuthStateChanged(auth, (user) => {
        subs.forEach((u) => u()); subs = [];
        const k = user ? chaveDe(user.email) : null;
        if (user && !k) { aviso('Este login não faz parte da família.'); A.signOut(auth); return; }
        onU(k);
        if (!k) return;
        const dados = { contas: {}, lanc: { elisson: [], ramon: [], mariele: [] }, perfis: {} };
        const vistos = new Set();
        const emitir = (parte) => { vistos.add(parte); if (vistos.size >= 7) onD(dados); };
        for (const c of CONTAS) {
          subs.push(F.onSnapshot(F.doc(db, 'contas', c), (s) => { dados.contas[c] = s.data() || {}; emitir('c' + c); }, falha));
          subs.push(F.onSnapshot(F.collection(db, 'contas', c, 'lancamentos'), (q) => {
            dados.lanc[c] = q.docs.map((d) => {
              const x = d.data({ serverTimestamps: 'estimate' });
              return { id: d.id, ...x, criadoEm: x.criadoEm?.toMillis ? x.criadoEm.toMillis() : Date.now() };
            });
            emitir('l' + c);
          }, falha));
        }
        subs.push(F.onSnapshot(F.collection(db, 'perfis'), (q) => {
          dados.perfis = {}; q.forEach((d) => { dados.perfis[d.id] = d.data(); }); emitir('p');
        }, falha));
      });
    },
    entrar: (k, pin) => A.signInWithEmailAndPassword(auth, LOGINS[k], pin),
    sair: () => A.signOut(auth),
    async trocarPin(atual, novo) {
      const u = auth.currentUser;
      await A.reauthenticateWithCredential(u, A.EmailAuthProvider.credential(u.email, atual));
      await A.updatePassword(u, novo);
    },
    lancar: (k, l) => F.addDoc(F.collection(db, 'contas', k, 'lancamentos'),
      { ...l, criadoPor: auth.currentUser.email, criadoEm: F.serverTimestamp() }),
    excluir: (k, id) => F.deleteDoc(F.doc(db, 'contas', k, 'lancamentos', id)),
    salvarConta: (k, campos) => F.setDoc(F.doc(db, 'contas', k), campos, { merge: true }),
    salvarPerfil: (k, campos) => F.setDoc(F.doc(db, 'perfis', k), campos, { merge: true }),
  };
}

// ---------------------------------------------------------------- cálculos
function recalcular() {
  const hoje = hojeISO();
  const calc = {};
  for (const k of CONTAS) {
    calc[k] = calcularConta({ lancamentos: S.dados.lanc[k] || [], taxas: S.dados.contas[k]?.taxas || [], hoje });
  }
  const total = CONTAS.reduce((s, k) => s + calc[k].saldo, 0);
  const mesAtual = CONTAS.reduce((s, k) => s + calc[k].rendimentoMesAtual, 0);
  const rendTotal = CONTAS.reduce((s, k) => s + calc[k].rendimentoTotal, 0);
  // Série e meses da família
  const inicio = CONTAS.map((k) => calc[k].serie[0]?.data).filter(Boolean).sort()[0];
  const serie = [];
  if (inicio) {
    const mapas = CONTAS.map((k) => new Map(calc[k].serie.map((p) => [p.data, p.saldo])));
    for (const p of calc[CONTAS.find((k) => calc[k].serie[0]?.data === inicio)].serie) {
      serie.push({ data: p.data, saldo: mapas.reduce((s, m) => s + (m.get(p.data) || 0), 0) });
    }
  }
  const meses = new Map();
  for (const k of CONTAS) for (const m of calc[k].porMes) meses.set(m.mes, (meses.get(m.mes) || 0) + m.rendimento);
  const porMes = [...meses].sort((a, b) => a[0].localeCompare(b[0])).map(([mes, rendimento]) => ({ mes, rendimento }));
  S.calc = { ...calc, hoje, total, mesAtual, rendTotal, serie, porMes };
  // guarda fotos para a tela de login (antes de entrar não dá para ler o banco)
  const fotos = LS.get('avatares', {});
  for (const k of TODOS) if (S.dados.perfis[k]?.avatar) fotos[k] = S.dados.perfis[k].avatar;
  LS.set('avatares', fotos);
}

// ---------------------------------------------------------------- biometria (passkey do próprio aparelho)
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const deB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const passkeys = () => LS.get('passkeys', {});

// Não confiamos só no teste do navegador (no iPhone instalado na tela inicial ele às vezes responde "não");
// se o navegador tem WebAuthn, deixamos tentar e mostramos o erro real se falhar.
async function verificarBio() {
  S.temBio = !!(window.PublicKeyCredential && navigator.credentials && window.isSecureContext);
}
function erroBio(e) {
  const n = e?.name || '';
  if (n === 'NotAllowedError') return `Cancelado ou não permitido. Tente de novo e confirme com o ${NOME_BIO}.`;
  if (n === 'InvalidStateError') return 'Já existe um desbloqueio deste app neste celular. Toque em Ativar de novo.';
  if (n === 'SecurityError') return 'O endereço do app não permite o desbloqueio. Abra pelo link do GitHub (https).';
  if (IOS) return `Não foi possível ativar (${n || 'erro'}). No iPhone, confira em Ajustes: Face ID e Código ligado, e em [seu nome] > iCloud > Senhas (Chaveiro) ligado.`;
  return `Não foi possível ativar (${n || 'erro'}). Confira se o celular tem bloqueio de tela (digital, PIN ou padrão).`;
}
async function ativarBio(k) {
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    rp: { name: 'Contas da Família' },
    user: { id: new TextEncoder().encode('cf-' + k), name: PESSOAS[k].nome + ' · Contas da Família', displayName: PESSOAS[k].nome },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
    timeout: 60000, attestation: 'none',
  } });
  const pk = passkeys(); pk[k] = b64u(cred.rawId); LS.set('passkeys', pk);
}
async function desbloquear() {
  const id = passkeys()[S.eu];
  if (!id) { S.bloqueado = false; irPara('#/inicio'); return; }
  try {
    await navigator.credentials.get({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: 'public-key', id: deB64u(id) }],
      userVerification: 'required', timeout: 60000,
    } });
    S.bloqueado = false; irPara('#/inicio');
  } catch {
    aviso(`Não foi possível confirmar. Tente de novo ou toque no seu nome e use o PIN.`);
  }
}

// ---------------------------------------------------------------- peças visuais
function avatar(k, t) {
  const foto = S.dados?.perfis?.[k]?.avatar || LS.get('avatares', {})[k];
  const bola = (txt, tam, extra = '') => `<span class="av" style="width:${tam}px;height:${tam}px;font-size:${Math.round(tam * 0.36)}px" ${extra}>${txt}</span>`;
  if (foto) return bola(`<img src="${esc(foto)}" alt="">`, t, 'aria-hidden="true"');
  if (k === 'pais') {
    const m = Math.round(t * 0.78);
    return `<span class="av-duplo" aria-hidden="true">${bola('EF', m)}${bola('MF', m)}</span>`;
  }
  return bola(PESSOAS[k].ini, t, 'aria-hidden="true"');
}
const logo = (grande = true) => S.logo
  ? `<span class="banco tem-logo" style="width:${grande ? 86 : 'auto'}px"><img src="logo-banco.png" alt="Itaú Personnalité"></span>`
  : `<span class="banco" style="${grande ? 'width:86px' : ''}">logo Itaú<br>Personnalité</span>`;
const agConta = (c) => `Ag. ${esc(c?.agencia || '0000')} · C/C ${esc(c?.conta || '00000-0')}`;
const taxaTxt = (k) => { const t = S.calc[k].taxaAtual; return (S.dados.contas[k]?.taxas || []).length ? `${fmtPct(t)} a.m.` : ''; };
const reais = (v) => `<span class="num">${fmtBRL(v)}</span>`;

function abas(ativa) {
  const a = (id, href, rot, icone) => `<a href="${href}" ${ativa === id ? 'aria-current="page"' : ''}>${icone}${rot}</a>`;
  return `<nav class="abas" aria-label="Navegação principal">${a('inicio', '#/inicio', 'Início', ic.casa)}${a('familia', '#/familia', 'Família', ic.familia)}${a('perfil', '#/perfil', 'Perfil', ic.pessoa)}</nav>`;
}
function cabecalho() {
  const p = PESSOAS[S.eu];
  return `<header class="topo">
    <a class="ola" href="#/perfil" aria-label="Abrir perfil">${avatar(S.eu, 36)}<span>Olá, ${esc(p.ola || p.nome)}</span></a>
    <button class="icone" data-acao="bloquear" aria-label="Bloquear">${ic.cadeado}</button>
  </header>`;
}
function blocoTotal() {
  const c = S.calc;
  return `<section class="total" aria-label="Total da família">
    <div class="rot">Patrimônio da família</div>
    <div class="valor num"><small>R$</small><span>${fmtNum(c.total)}</span></div>
    <div class="var">${c.total > 0 ? `+ ${fmtBRL(c.mesAtual)} em ${nomeMes(Number(c.hoje.slice(5, 7)))}` : '<span class="t3">Nenhum valor aplicado ainda</span>'}</div>
  </section>`;
}

// gráfico de linha (saldo)
function grafLinha(serie) {
  if (serie.length < 2) return '<div class="vazio-bloco">O gráfico aparece depois do primeiro depósito.</div>';
  const passo = Math.max(1, Math.ceil(serie.length / 120));
  const pts = serie.filter((_, i) => i % passo === 0 || i === serie.length - 1);
  const W = 340, H = 170, x0 = 6, x1 = 334, y0 = 26, y1 = 132;
  const vs = pts.map((p) => p.saldo); let min = Math.min(...vs), max = Math.max(...vs);
  if (max - min < 1) { max += 1; min -= 1; }
  const X = (i) => x0 + (x1 - x0) * (i / (pts.length - 1));
  const Y = (v) => y1 - (y1 - y0) * ((v - min) / (max - min));
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p.saldo).toFixed(1)}`).join(' ');
  const ult = pts[pts.length - 1];
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolução do saldo de ${fmtData(pts[0].data)} a ${fmtData(ult.data)}: de ${fmtBRL(pts[0].saldo)} para ${fmtBRL(ult.saldo)}">
    <line x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}" stroke="#232A33"/>
    <line x1="${x0}" y1="${(y0 + y1) / 2}" x2="${x1}" y2="${(y0 + y1) / 2}" stroke="#232A33" stroke-dasharray="2 4"/>
    <path d="${d} L${x1} ${y1} L${x0} ${y1} Z" fill="#C9A96A" fill-opacity="0.10"/>
    <path d="${d}" stroke="#C9A96A" stroke-width="2" fill="none" stroke-linejoin="round"/>
    <circle cx="${X(pts.length - 1)}" cy="${Y(ult.saldo)}" r="4" fill="#C9A96A"/>
    <text x="${x0}" y="14" fill="#9A9384" font-size="11" font-family="IBM Plex Sans, sans-serif">${fmtBRL(pts[0].saldo)}</text>
    <text x="${x1}" y="14" fill="#E3D3AE" font-size="12" font-weight="600" text-anchor="end" font-family="Space Grotesk, sans-serif">${fmtBRL(ult.saldo)}</text>
    <text x="${x0}" y="156" fill="#9A9384" font-size="11" font-family="IBM Plex Sans, sans-serif">${fmtData(pts[0].data).slice(0, 5)}</text>
    <text x="${x1}" y="156" fill="#9A9384" font-size="11" text-anchor="end" font-family="IBM Plex Sans, sans-serif">${fmtData(ult.data).slice(0, 5)}</text>
  </svg>`;
}
// gráfico de barras (rendimento por mês)
function grafBarras(porMes, hoje) {
  const ms = porMes.slice(-6);
  if (!ms.length || ms.every((m) => m.rendimento === 0)) return '<div class="vazio-bloco">Ainda sem rendimento para mostrar.</div>';
  const W = 340, H = 170, base = 132, topo = 30, n = ms.length;
  const max = Math.max(...ms.map((m) => m.rendimento), 0.01);
  const larg = Math.min(56, (W - 12) / n - 14);
  const mesAtual = hoje.slice(0, 7);
  const barras = ms.map((m, i) => {
    const cx = 6 + ((W - 12) / n) * (i + 0.5);
    const h = Math.max(2, (base - topo) * (m.rendimento / max));
    const atual = m.mes === mesAtual;
    return `<rect x="${(cx - larg / 2).toFixed(1)}" y="${(base - h).toFixed(1)}" width="${larg.toFixed(1)}" height="${h.toFixed(1)}" rx="6" fill="#C9A96A" ${atual ? 'fill-opacity="0.55"' : ''}/>
      <text x="${cx.toFixed(1)}" y="${(base - h - 8).toFixed(1)}" fill="#EDE6D6" font-size="11" font-weight="600" text-anchor="middle" font-family="Space Grotesk, sans-serif">${fmtNum(m.rendimento)}</text>
      <text x="${cx.toFixed(1)}" y="152" fill="#9A9384" font-size="11" text-anchor="middle" font-family="IBM Plex Sans, sans-serif">${MES_CURTO[Number(m.mes.slice(5, 7)) - 1]}${atual ? '*' : ''}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Rendimento por mês: ${ms.map((m) => `${nomeMes(Number(m.mes.slice(5, 7)))} ${fmtBRL(m.rendimento)}`).join(', ')}">
    <line x1="6" y1="${base}" x2="${W - 6}" y2="${base}" stroke="#333A44"/>${barras}</svg>
    <div class="t3" style="font-size:11px">* mês atual, até ${fmtData(hoje).slice(0, 5)}</div>`;
}

// ---------------------------------------------------------------- telas
function vLogin() {
  const ultimo = S.eu || LS.get('ultimo', null);
  const pk = S.eu && passkeys()[S.eu];
  const tiles = TODOS.map((k) => `
    <button class="tile ${k === ultimo ? 'ultimo' : ''}" data-acao="escolher" data-k="${k}" aria-label="Entrar como ${esc(PESSOAS[k].completo)}">
      <span class="t-id">${avatar(k, 83)}<b>${esc(PESSOAS[k].nome)}</b><small>${k === 'pais' ? 'Acompanham a família' : 'Conta Itaú Personnalité'}</small></span>
      ${logo(false)}
    </button>`).join('');
  const rodape = S.eu && pk
    ? `<button class="btn prim bloco" data-acao="biometria">${ic.rosto.replace('<svg', '<svg width="22" height="22"')}Entrar com ${NOME_BIO}</button><small>ou use o código do celular</small><button class="linkbtn" data-acao="usar-pin">Entrar com o PIN de 8 dígitos</button>`
    : S.eu ? `<small>Toque no seu nome e digite o PIN para entrar.</small>`
    : `<small>No primeiro acesso, toque no seu nome e digite o seu PIN de 8 dígitos.</small>`;
  return `<main class="login">
    <div style="display:flex;flex-direction:column;gap:8px"><h1>Quem está acessando?</h1><p>Toque no seu nome para entrar.</p></div>
    <div class="tiles">${tiles}</div>
    <div class="rodape">${rodape}${S.backend?.demo ? '<small class="demo">Modo demonstração — dados de exemplo só neste aparelho.</small>' : ''}</div>
  </main>`;
}

function vInicio() {
  const visao = S.dados.perfis[S.eu]?.visaoInicio || LS.get('visao.' + S.eu, 'lista');
  if (visao === 'barras') return `<div class="tela">${cabecalho()}${blocoTotal()}${vBarras()}</div>${abas('inicio')}`;
  if (visao === 'orbita') return `<div class="tela">${cabecalho()}${vOrbita()}</div>${abas('inicio')}`;
  return `<div class="tela fixa">${cabecalho()}${blocoTotal()}<div class="lista">${CONTAS.map(cardLista).join('')}</div></div>${abas('inicio')}`;
}
function cardLista(k) {
  const c = S.calc[k]; const conta = S.dados.contas[k] || {}; const eu = k === S.eu; const tx = taxaTxt(k);
  const extra = c.rendimentoHoje > 0.004 ? `<small>+ ${fmtBRL(c.rendimentoHoje)} hoje</small>` : (c.saldo > 0 ? '' : '<small class="t3">Nenhum depósito ainda</small>');
  return `<a class="card ${eu ? 'meu' : ''}" href="#/conta/${k}" aria-label="${esc(PESSOAS[k].nome)}: saldo ${fmtBRL(c.saldo)}">
    <div class="card-topo">${avatar(k, 48)}<div class="card-id"><b>${PESSOAS[k].nome}${eu ? '<span class="selo">Você</span>' : ''}</b><small>${agConta(conta)}</small></div>${logo()}</div>
    <div class="card-base">
      <div style="min-width:0"><div class="inv">${conta.investimento ? esc(conta.investimento) : '<span class="t3">Investimento não definido</span>'}</div>
      <div class="saldo num ${c.saldo > 0 ? '' : 'zero'}">${fmtBRL(c.saldo)}</div></div>
      <div class="tx">${tx || '<span class="t3">taxa —</span>'}${extra}</div>
    </div>
  </a>`;
}
function vBarras() {
  const tot = S.calc.total;
  const pilar = (k) => {
    const c = S.calc[k]; const conta = S.dados.contas[k] || {}; const eu = k === S.eu;
    const pct = tot > 0 ? (c.saldo / tot) * 100 : 0; const pctR = Math.round(pct);
    return `<a class="pilar" href="#/conta/${k}" aria-label="${esc(PESSOAS[k].nome)}: saldo ${fmtBRL(c.saldo)}, ${pctR}% do total">
      <div class="p-cab">
        <div class="p-linha">${avatar(k, 30)}<span class="p-num">${PESSOAS[k].num}</span></div>
        <div class="p-nome">${PESSOAS[k].nome}</div>
        <div class="p-papel ${eu ? 'eu' : ''}">${eu ? 'Você' : 'Só leitura'}</div>
        ${logo(false)}
        <div class="p-ag">Ag. ${esc(conta.agencia || '0000')}<br>C/C ${esc(conta.conta || '00000-0')}</div>
      </div>
      <div class="p-meio"><span class="rot" style="font-size:10px">Saldo R$</span><span class="p-saldo num ${c.saldo > 0 ? '' : 't2'}" style="font-size:${fmtNum(c.saldo).length <= 9 ? 16 : fmtNum(c.saldo).length <= 10 ? 14 : 12}px">${fmtNum(c.saldo)}</span></div>
      <div class="p-tx"><b>${taxaTxt(k) || '<span class="t3" style="font-family:var(--txt);font-weight:500">taxa —</span>'}</b><span>${conta.investimento ? esc(conta.investimento) : 'Não definido'}</span></div>
      <div class="p-barra"><div class="p-fill" style="height:${pct.toFixed(1)}%"></div>
        <div class="p-pct ${pct >= 22 ? 'escuro' : 'claro'}">${c.saldo > 0 ? '' : '<small>Sem depósitos</small>'}<b class="num">${pctR}%</b><small>do total</small></div></div>
    </a>`;
  };
  return `<section class="painel pilares" aria-label="Saldo por pessoa">
    <div class="painel-topo rot"><span>Saldo por pessoa</span><span>${fmtData(S.calc.hoje)}</span></div>
    <div class="grade3">${CONTAS.map(pilar).join('')}</div>
  </section>`;
}
function vOrbita() {
  const c = S.calc; const tot = c.total;
  const tons = ['#C9A96A', '#E3D3AE', '#A88B55'];
  const R = 88, L = 2 * Math.PI * R; let ang = -90;
  const segs = CONTAS.map((k, i) => {
    const frac = tot > 0 ? c[k].saldo / tot : 0; if (frac <= 0) return '';
    const len = Math.max(0, frac * L - (frac < 1 ? 3 : 0));
    const s = `<circle cx="100" cy="100" r="${R}" fill="none" stroke="${tons[i]}" stroke-width="10" stroke-dasharray="${len.toFixed(1)} ${L.toFixed(1)}" transform="rotate(${ang.toFixed(1)} 100 100)" stroke-linecap="butt"/>`;
    ang += frac * 360; return s;
  }).join('');
  const sat = (k, cls = '') => {
    const x = c[k]; const conta = S.dados.contas[k] || {}; const eu = k === S.eu;
    return `<a class="sat ${eu ? 'meu' : ''} ${cls}" href="#/conta/${k}" aria-label="${esc(PESSOAS[k].nome)}: ${fmtBRL(x.saldo)}">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">${avatar(k, 40)}${eu ? '<span class="selo">Você</span>' : ''}</div>
      <b style="font-family:var(--num);font-weight:600;font-size:16px">${PESSOAS[k].nome}</b>
      <span class="s-saldo num ${x.saldo > 0 ? '' : 't2'}">${fmtBRL(x.saldo)}</span>
      <span style="font-family:var(--num);font-weight:600;font-size:13px" class="${taxaTxt(k) ? 'ouro2' : 't3'}">${taxaTxt(k) || 'taxa —'}</span>
      <span class="s-inv">${conta.investimento ? esc(conta.investimento) : 'Nenhum depósito ainda'}</span>
      ${logo(false)}
    </a>`;
  };
  return `<section class="orbita" aria-label="Contas da família em órbita">
    ${sat('elisson')}${sat('ramon')}
    <div class="centro">
      <svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="${R}" fill="#131820" stroke="#232A33" stroke-width="10"/>${segs}</svg>
      <div style="position:relative;display:flex;flex-direction:column;gap:4px;align-items:center">
        <span class="rot">Família</span>
        <span class="num" style="font-size:22px;font-weight:700">${fmtBRL(tot)}</span>
        <span style="font-size:12px;font-weight:500" class="ouro">${tot > 0 ? `+ ${fmtBRL(c.mesAtual)} em ${MES_CURTO[Number(c.hoje.slice(5, 7)) - 1]}` : ''}</span>
      </div>
    </div>
    ${sat('mariele', 'baixo')}
  </section>`;
}

function vConta(k) {
  const c = S.calc[k]; const conta = S.dados.contas[k] || {}; const eu = k === S.eu;
  const taxas = conta.taxas || [];
  const linhaInv = [conta.investimento ? esc(conta.investimento) : 'Investimento não definido',
    taxas.length ? `${fmtPct(c.taxaAtual)} a.m.` : null,
    taxas.length ? `${fmtPct(taxaDiaria(c.taxaAtual), 4)} ao dia útil` : null].filter(Boolean).join(' · ');
  // extrato: lançamentos (com id) + uma linha de rendimento por mês
  const itens = [
    ...(S.dados.lanc[k] || []).map((l) => ({ ...l, valor: l.valorCentavos / 100 })),
    ...c.extrato.filter((e) => e.tipo === 'rendimento'),
  ].sort((a, b) => b.data.localeCompare(a.data) || (a.tipo === 'rendimento' ? -1 : b.tipo === 'rendimento' ? 1 : (b.criadoEm || 0) - (a.criadoEm || 0)));
  let mesAnt = ''; let lista = '';
  for (const it of itens) {
    const mes = it.data.slice(0, 7);
    if (mes !== mesAnt) { lista += `<div class="rot mes">${cap(nomeMes(Number(mes.slice(5, 7))))} ${mes.slice(0, 4)}</div>`; mesAnt = mes; }
    const rend = it.tipo === 'rendimento'; const dep = it.tipo === 'deposito';
    const pode = eu && !rend && it.id && Date.now() - (it.criadoEm || 0) < 60 * 60000;
    lista += `<div class="item">
      <span class="ic ${dep || rend ? 'ouro' : 't2'}">${rend ? ic.rende : dep ? ic.entrada : ic.saida}</span>
      <span class="d"><b>${rend ? esc(it.descricao) : dep ? 'Depósito' : 'Retirada'}</b><small>${fmtData(it.data)}${pode ? ` · <button class="linkbtn" data-acao="pedir-excluir" data-k="${k}" data-id="${esc(it.id)}">Excluir (erro de digitação)</button>` : ''}</small></span>
      <span class="v ${rend || dep ? 'mais' : 'menos'}">${rend || dep ? '+' : '−'} ${fmtBRL(it.valor)}</span>
    </div>`;
  }
  return `<div class="tela">
    <div class="volta"><a class="icone" href="#/inicio" aria-label="Voltar">${ic.voltar}</a>${avatar(k, 44)}
      <div class="nome"><b>${PESSOAS[k].nome} ${eu ? '<span class="selo">Você</span>' : ''}</b><small>${agConta(conta)}</small></div>${logo()}</div>
    <section style="display:flex;flex-direction:column;gap:8px">
      <span class="rot">Saldo em ${fmtData(S.calc.hoje)}</span>
      <span class="grande num">${fmtBRL(c.saldo)}</span>
      <span class="t2" style="font-size:13px">${linhaInv}</span>
      ${c.saldo > 0 ? `<div class="chips"><span class="chip ouro">+ ${fmtBRL(c.rendimentoHoje)} hoje</span><span class="chip">+ ${fmtBRL(c.rendimentoTotal)} acumulado</span></div>` : ''}
    </section>
    <section class="grafico" aria-label="Gráfico do saldo"><span class="rot">Evolução do saldo</span>${grafLinha(c.serie)}</section>
    ${eu ? `<div class="botoes"><button class="btn prim" data-acao="lanc" data-mov="deposito" data-k="${k}">Depósito R$</button><button class="btn" data-acao="lanc" data-mov="retirada" data-k="${k}" ${c.saldo > 0 ? '' : 'disabled'}>Retirada R$</button></div>`
      : '<div class="chip" style="align-self:flex-start">Somente leitura — só o titular movimenta esta conta</div>'}
    <section class="extrato" aria-label="Extrato"><h2 class="num" style="margin:8px 0 0;font-size:20px;font-weight:600">Extrato</h2>
      ${lista || '<div class="vazio-bloco">Nenhum depósito ainda.</div>'}
      ${lista ? '<small class="t3" style="font-size:12px;margin-top:8px">O rendimento é creditado todo dia útil; o extrato agrupa por mês.</small>' : ''}
    </section>
  </div>${abas('inicio')}`;
}

function vFamilia() {
  const c = S.calc;
  const invs = CONTAS.map((k) => {
    const conta = S.dados.contas[k] || {}; const pct = c.total > 0 ? (c[k].saldo / c.total) * 100 : 0;
    return `<a class="inv-linha" href="#/conta/${k}">${avatar(k, 40)}
      <span class="d"><b>${PESSOAS[k].nome}</b><small>${conta.investimento ? esc(conta.investimento) : 'Investimento não definido'}</small>
        <span class="part" aria-label="${Math.round(pct)}% do total"><i style="width:${pct.toFixed(1)}%"></i></span></span>
      <span class="v"><b class="num">${fmtBRL(c[k].saldo)}</b><small>${taxaTxt(k) || '<span class="t3">taxa —</span>'} · ${Math.round(pct)}%</small></span></a>`;
  }).join('');
  const movs = CONTAS.flatMap((k) => (S.dados.lanc[k] || []).map((l) => ({ ...l, k })))
    .sort((a, b) => b.data.localeCompare(a.data) || (b.criadoEm || 0) - (a.criadoEm || 0)).slice(0, 10)
    .map((l) => `<div class="item">${avatar(l.k, 36)}<span class="d"><b>${PESSOAS[l.k].nome} · ${l.tipo === 'deposito' ? 'Depósito' : 'Retirada'}</b><small>${fmtData(l.data)}</small></span>
      <span class="v ${l.tipo === 'deposito' ? 'mais' : 'menos'}">${l.tipo === 'deposito' ? '+' : '−'} ${fmtBRL(l.valorCentavos / 100)}</span></div>`).join('');
  return `<div class="tela">
    <header class="topo"><h1 class="num" style="margin:0;font-size:28px;font-weight:700">Família</h1><button class="icone" data-acao="bloquear" aria-label="Bloquear">${ic.cadeado}</button></header>
    <section class="total"><div class="rot">Patrimônio da família</div><div class="valor num"><small>R$</small><span>${fmtNum(c.total)}</span></div>
      <div class="var">${c.total > 0 ? `+ ${fmtBRL(c.mesAtual)} em ${nomeMes(Number(c.hoje.slice(5, 7)))} · + ${fmtBRL(c.rendTotal)} desde o início` : '<span class="t3">Nenhum valor aplicado ainda</span>'}</div></section>
    <section class="grafico"><span class="rot">Evolução do patrimônio</span>${grafLinha(c.serie)}</section>
    <section class="grafico"><span class="rot">Rendimento por mês</span>${grafBarras(c.porMes, c.hoje)}</section>
    <section class="secao"><h2>Investimentos aplicados</h2><div>${invs}</div></section>
    <section class="secao"><h2>Últimas movimentações</h2><div>${movs || '<div class="t3" style="font-size:14px">Nenhuma movimentação ainda.</div>'}</div></section>
  </div>${abas('familia')}`;
}

function vPerfil() {
  const k = S.eu; const p = PESSOAS[k]; const titular = CONTAS.includes(k);
  const visao = S.dados.perfis[k]?.visaoInicio || LS.get('visao.' + k, 'lista');
  const prev = {
    lista: '<rect x="8" y="8" width="48" height="20" rx="4"/><rect x="8" y="32" width="48" height="20" rx="4"/><rect x="8" y="56" width="48" height="20" rx="4"/>',
    barras: '<rect x="8" y="10" width="14" height="66" rx="3"/><rect x="25" y="10" width="14" height="66" rx="3"/><rect x="42" y="10" width="14" height="66" rx="3"/><rect x="8" y="40" width="14" height="36" rx="3" fill="currentColor" stroke="none"/>',
    orbita: '<circle cx="32" cy="42" r="26" stroke-dasharray="3 3"/><circle cx="32" cy="42" r="10"/><rect x="4" y="8" width="18" height="16" rx="4"/><rect x="42" y="8" width="18" height="16" rx="4"/><rect x="23" y="64" width="18" height="16" rx="4"/>',
  };
  const opc = (id, rot) => `<button class="visao" data-acao="visao" data-v="${id}" aria-pressed="${visao === id}">
    <svg viewBox="0 0 64 84" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${prev[id]}</svg>${rot}${visao === id ? '' : ''}</button>`;
  const conta = S.dados.contas[k] || {}; const taxas = conta.taxas || [];
  const txAtual = taxas.length ? taxaEm(taxas, S.calc.hoje) : null;
  const pk = !!passkeys()[k]; const bloq = LS.get('bloquearAoSair', true);
  const hist = [...taxas].sort((a, b) => b.aPartirDe.localeCompare(a.aPartirDe)).map((t) => `${fmtPct(t.mensal)} a.m. desde ${fmtData(t.aPartirDe)}`).join(' · ');
  return `<div class="tela">
    <header class="topo"><h1 class="num" style="margin:0;font-size:28px;font-weight:700">Perfil</h1></header>
    <section class="perfil-cab">${avatar(k, 88)}
      <div style="display:flex;flex-direction:column;gap:8px;min-width:0">
        <b class="num" style="font-size:18px;font-weight:600">${esc(p.completo)}</b>
        <span class="t3" style="font-size:13px">${titular ? 'Titular' : 'Acompanham a família · só leitura'}</span>
        <label class="btn" style="height:44px;align-self:flex-start" for="foto">${ic.camera.replace('<svg', '<svg width="18" height="18"')}Trocar foto</label>
        <input id="foto" type="file" accept="image/*" hidden>
      </div>
    </section>
    <section class="secao"><h2>Visualização do Início</h2>
      <div class="visoes">${opc('lista', 'Lista')}${opc('barras', 'Barras')}${opc('orbita', 'Órbita')}</div>
      <span class="t3" style="font-size:12px">Cada pessoa escolhe a sua. Fica salvo no seu login.</span></section>
    ${titular ? `<section class="secao"><h2>Meu investimento <span class="selo">Só você edita</span></h2>
      <div class="campo"><label for="inv-nome">Nome do investimento</label><input id="inv-nome" maxlength="60" value="${esc(conta.investimento || '')}" placeholder="Ex.: CDB Itaú Personnalité"></div>
      <div class="campo"><label for="inv-taxa">Taxa mensal (% a.m.)</label><input id="inv-taxa" inputmode="decimal" value="${txAtual != null ? fmtNum(txAtual * 100) : ''}" placeholder="1,00">
        <span class="ajuda">${txAtual != null ? `≈ ${fmtPct(taxaDiaria(txAtual), 4)} por dia útil · ` : ''}uma nova taxa vale a partir de hoje</span></div>
      <div class="dupla"><div class="campo"><label for="inv-ag">Agência</label><input id="inv-ag" inputmode="numeric" maxlength="6" value="${esc(conta.agencia || '')}" placeholder="0000"></div>
        <div class="campo"><label for="inv-cc">Conta</label><input id="inv-cc" maxlength="12" value="${esc(conta.conta || '')}" placeholder="00000-0"></div></div>
      ${hist ? `<span class="t3" style="font-size:12px">Histórico: ${hist}</span>` : ''}
      <button class="btn prim bloco" data-acao="salvar-inv">Salvar</button></section>` : ''}
    <section class="secao"><h2>Segurança</h2>
      <div class="linha-sw"><span>Desbloqueio com ${NOME_BIO} / código<small>${pk ? 'Ligado: o app abre com o rosto ou o código do celular' : S.temBio ? 'Desligado: o app pede o PIN de 8 dígitos ao abrir' : 'Este navegador não oferece: o app pede o PIN ao abrir'}</small></span>
        <button class="sw" role="switch" aria-checked="${pk}" aria-label="Desbloqueio com ${NOME_BIO}" data-acao="sw-bio" ${S.temBio || pk ? '' : 'disabled'}></button></div>
      <div class="linha-sw"><span>Bloquear ao sair do app<small>Depois de 10 minutos fora</small></span>
        <button class="sw" role="switch" aria-checked="${bloq}" aria-label="Bloquear ao sair do app" data-acao="sw-bloq"></button></div>
      <button class="btn bloco" data-acao="trocar-pin">Trocar meu PIN</button>
      <button class="btn bloco" data-acao="sair">Sair / trocar de usuário</button></section>
    ${S.backend.demo ? '<section class="secao"><h2>Modo demonstração</h2><span class="t3" style="font-size:13px">Os dados ficam só neste aparelho. Cole a configuração do Firebase em firebase-config.js para usar de verdade.</span><button class="btn bloco" data-acao="demo-reiniciar">Recomeçar dados de exemplo</button></section>' : ''}
  </div>${abas('perfil')}`;
}

// ---------------------------------------------------------------- folhas (bottom sheets)
function tecladoPin(pin = '', erro = '') {
  const pontos = Array.from({ length: 8 }, (_, i) => `<i class="${i < pin.length ? 'on' : ''}"></i>`).join('');
  const tecla = (d) => `<button class="tecla" data-acao="pin" data-d="${d}" ${S.ocupado ? 'disabled' : ''}>${d}</button>`;
  return `<div class="pin-pontos" role="status" aria-label="${pin.length} de 8 dígitos">${pontos}</div>${erro}
    <div class="teclado">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(tecla).join('')}<span></span>${tecla(0)}
      <button class="tecla" data-acao="pin-apagar" aria-label="Apagar" ${S.ocupado ? 'disabled' : ''}>${svg('<path d="M9 6h11v12H9l-6-6z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/>', 'width="26" height="26"')}</button></div>`;
}
const pinFraco = (p) => /^(\d)\1{7}$/.test(p) || '0123456789012'.includes(p) || '9876543210987'.includes(p);

function vSheet() {
  const sh = S.sheet; if (!sh) return '';
  const erro = S.erro ? `<div class="erro" role="alert">${esc(S.erro)}</div>` : '';
  const ocup = S.ocupado ? 'disabled' : '';
  let corpo = '';
  if (sh.tipo === 'pin') {
    const p = PESSOAS[sh.k];
    const ajuda = sh.k === 'elisson' ? 'Esqueceu o PIN? Recrie o seu usuário no Console do Firebase.' : 'Esqueceu o PIN? Peça ao Elisson para criar um novo.';
    corpo = `<h2 id="st">Olá, ${esc(p.ola || p.nome)}</h2><p>Digite o seu PIN de 8 dígitos.</p>
      ${tecladoPin(sh.pin, erro)}
      <span class="t3" style="font-size:12px;text-align:center">${S.ocupado ? 'Entrando…' : ajuda}</span>
      <button class="btn bloco" data-acao="fechar">Cancelar</button>`;
  } else if (sh.tipo === 'trocar-pin') {
    const tit = { atual: 'Digite o PIN atual', novo: 'Escolha o novo PIN', confirmar: 'Repita o novo PIN' }[sh.etapa];
    corpo = `<h2 id="st">Trocar PIN</h2><p>${tit} (8 dígitos).</p>
      ${tecladoPin(sh.pin, erro)}
      <span class="t3" style="font-size:12px;text-align:center">${S.ocupado ? 'Salvando…' : 'Evite datas de nascimento e sequências como 12345678.'}</span>
      <button class="btn bloco" data-acao="fechar">Cancelar</button>`;
  } else if (sh.tipo === 'lanc') {
    const dep = sh.mov === 'deposito'; const c = S.calc[sh.k]; const hoje = S.calc.hoje;
    corpo = `<h2 id="st">${dep ? 'Depósito' : 'Retirada'}</h2>
      <p>${dep ? 'Na sua conta' : `Disponível: <b class="num">${fmtBRL(c.saldo)}</b>`}${S.dados.contas[sh.k]?.investimento ? ' · ' + esc(S.dados.contas[sh.k].investimento) : ''}</p>
      <div class="campo"><label for="l-valor">Valor (R$)</label><input id="l-valor" inputmode="decimal" placeholder="0,00" autocomplete="off" enterkeyhint="done"></div>
      <div class="campo"><label for="l-data">Data</label><input id="l-data" type="date" max="${hoje}" value="${hoje}"></div>
      <span class="t3" style="font-size:12px">${dep ? 'Começa a render no dia útil seguinte à data.' : 'Sai do seu saldo total nesta data.'}</span>${erro}
      ${!dep || (S.dados.contas[sh.k]?.taxas || []).length ? '' : '<span class="erro">Defina a taxa do seu investimento no Perfil para o valor render.</span>'}
      <button class="btn prim bloco" data-acao="confirmar-lanc" ${ocup}>${S.ocupado ? 'Salvando…' : dep ? 'Confirmar depósito' : 'Confirmar retirada'}</button>
      <button class="btn bloco" data-acao="fechar">Cancelar</button>`;
  } else if (sh.tipo === 'excluir') {
    corpo = `<h2 id="st">Excluir lançamento?</h2><p>Use só para corrigir erro de digitação. Depois de 1 hora não é mais possível excluir.</p>${erro}
      <button class="btn prim bloco" data-acao="confirmar-excluir" ${ocup}>Excluir</button><button class="btn bloco" data-acao="fechar">Cancelar</button>`;
  } else if (sh.tipo === 'ativar-bio') {
    corpo = `<h2 id="st">Ativar ${NOME_BIO}?</h2><p>Nas próximas vezes, o app abre com o seu rosto ou o código de desbloqueio do celular. Sem isso, o app pede o PIN de 8 dígitos toda vez que abrir.</p>${erro}
      <button class="btn prim bloco" data-acao="ativar-bio" ${ocup}>Ativar</button><button class="btn bloco" data-acao="bio-agora-nao">Agora não</button>`;
  } else if (sh.tipo === 'aviso-bloq') {
    corpo = `<h2 id="st">Bloqueio</h2><p>Ative o desbloqueio com ${NOME_BIO} no Perfil para poder bloquear o app.</p>
      <button class="btn prim bloco" data-acao="ir-perfil">Ir para o Perfil</button><button class="btn bloco" data-acao="fechar">Fechar</button>`;
  }
  return `<div class="fundo" data-acao="fundo"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="st"><div class="alca"></div>${corpo}</div></div>`;
}

// ---------------------------------------------------------------- render
function rota() {
  const [tela, param] = location.hash.replace(/^#\/?/, '').split('/');
  return { tela: tela || 'inicio', param };
}
function irPara(h) { if (location.hash === h) render(); else location.hash = h; }
function render() {
  const app = $('#app');
  if (!S.pronto) return;
  const chave = (!S.eu || S.bloqueado) ? 'login' : location.hash;
  const rolagem = chave === S.ultimaTela ? ($('#app .tela, #app .login')?.scrollTop || 0) : 0;
  S.ultimaTela = chave;
  if (!S.eu || S.bloqueado) app.innerHTML = vLogin();
  else if (!S.dados || !S.calc) app.innerHTML = '<div class="carregando">Carregando…</div>';
  else {
    const r = rota();
    app.innerHTML = r.tela === 'conta' && CONTAS.includes(r.param) ? vConta(r.param)
      : r.tela === 'familia' ? vFamilia() : r.tela === 'perfil' ? vPerfil() : vInicio();
  }
  if (rolagem) { const t = $('#app .tela, #app .login'); if (t) t.scrollTop = rolagem; }
}
function abrirSheet(sh) {
  S.sheet = sh; S.erro = ''; S.ocupado = false; renderSheet();
  setTimeout(() => $('#camada input:not([type=date])')?.focus(), 60);
}
function renderSheet() { $('#camada').innerHTML = vSheet(); }
function fecharSheet() { S.sheet = null; S.erro = ''; S.ocupado = false; renderSheet(); }
function erroSheet(msg) {
  S.erro = msg; S.ocupado = false;
  const vals = [...document.querySelectorAll('#camada input')].map((i) => [i.id, i.value]);
  renderSheet(); vals.forEach(([id, v]) => { const el = document.getElementById(id); if (el) el.value = v; });
}
let tAviso;
function aviso(msg) {
  let el = $('#aviso'); if (!el) { el = document.createElement('div'); el.id = 'aviso'; document.body.appendChild(el); }
  el.innerHTML = `<div class="toast" role="status">${esc(msg)}</div>`;
  clearTimeout(tAviso); tAviso = setTimeout(() => { el.innerHTML = ''; }, 3200);
}

// ---------------------------------------------------------------- ações
async function reduzirImagem(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((ok, err) => { img.onload = ok; img.onerror = err; img.src = url; });
    const t = 256; const cv = document.createElement('canvas'); cv.width = cv.height = t;
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    cv.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, t, t);
    return cv.toDataURL('image/jpeg', 0.82);
  } finally { URL.revokeObjectURL(url); }
}
const traduzErro = (e) => {
  const c = e?.code || '';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('invalid-login')) return 'PIN incorreto.';
  if (c.includes('requires-recent-login')) return 'Entre de novo e tente trocar o PIN.';
  if (c.includes('user-not-found')) return 'Usuário não encontrado no Firebase.';
  if (c.includes('too-many-requests')) return 'Muitas tentativas. Aguarde alguns minutos.';
  if (c.includes('network')) return 'Sem conexão com a internet.';
  if (c.includes('permission')) return 'Sem permissão. Confira os logins no firestore.rules.';
  return 'Não foi possível concluir. Tente de novo.';
};

const acoes = {
  async escolher(el) {
    const k = el.dataset.k;
    if (S.eu === k && passkeys()[k]) return desbloquear();
    abrirSheet({ tipo: 'pin', k, pin: '' });
  },
  biometria: () => desbloquear(),
  'usar-pin'() { abrirSheet({ tipo: 'pin', k: S.eu, pin: '' }); },
  'bio-agora-nao'() { LS.set('bioRecusada.' + S.eu, true); fecharSheet(); },
  pin(el) {
    const sh = S.sheet; if (!sh || S.ocupado || sh.pin.length >= 8) return;
    sh.pin += el.dataset.d; S.erro = ''; renderSheet();
    if (sh.pin.length === 8) setTimeout(() => (sh.tipo === 'pin' ? acoes.entrar() : acoes['pin-etapa']()), 120);
  },
  'pin-apagar'() { const sh = S.sheet; if (!sh || S.ocupado) return; sh.pin = sh.pin.slice(0, -1); renderSheet(); },
  async entrar() {
    const sh = S.sheet; const k = sh.k; const pin = sh.pin;
    S.ocupado = true; renderSheet();
    try {
      S.entrando = true; await S.backend.entrar(k, pin); LS.set('ultimo', k); fecharSheet();
      if (S.eu === k) { S.entrando = false; S.bloqueado = false; irPara(location.hash && location.hash !== '#' ? location.hash : '#/inicio'); }
      if (S.temBio && !passkeys()[k] && !LS.get('bioRecusada.' + k, false)) abrirSheet({ tipo: 'ativar-bio' });
    } catch (e) { S.entrando = false; sh.pin = ''; erroSheet(traduzErro(e)); }
  },
  'trocar-pin'() { abrirSheet({ tipo: 'trocar-pin', etapa: 'atual', pin: '' }); },
  async 'pin-etapa'() {
    const sh = S.sheet; const pin = sh.pin; sh.pin = '';
    if (sh.etapa === 'atual') { sh.atual = pin; sh.etapa = 'novo'; return renderSheet(); }
    if (sh.etapa === 'novo') {
      if (pinFraco(pin)) return erroSheet('PIN fácil demais. Escolha outro.');
      if (pin === sh.atual) return erroSheet('O novo PIN é igual ao atual.');
      sh.novo = pin; sh.etapa = 'confirmar'; return renderSheet();
    }
    if (pin !== sh.novo) { sh.etapa = 'novo'; return erroSheet('Os PINs não conferem. Escolha de novo.'); }
    S.ocupado = true; renderSheet();
    try { await S.backend.trocarPin(sh.atual, sh.novo); fecharSheet(); aviso('PIN trocado.'); }
    catch (e) { sh.etapa = 'atual'; erroSheet(traduzErro(e)); }
  },
  async 'ativar-bio'() {
    S.ocupado = true; renderSheet();
    try { await ativarBio(S.eu); LS.del('bioRecusada.' + S.eu); fecharSheet(); aviso(`Desbloqueio com ${NOME_BIO} ativado.`); render(); }
    catch (e) { console.error(e); erroSheet(erroBio(e)); }
  },
  async 'sw-bio'() {
    const pk = passkeys();
    if (pk[S.eu]) { delete pk[S.eu]; LS.set('passkeys', pk); aviso('Desbloqueio desativado.'); render(); }
    else abrirSheet({ tipo: 'ativar-bio' });
  },
  'sw-bloq'() { LS.set('bloquearAoSair', !LS.get('bloquearAoSair', true)); render(); },
  bloquear() {
    S.bloqueado = true; fecharSheet(); render();
  },
  'ir-perfil'() { fecharSheet(); irPara('#/perfil'); },
  async sair() { await S.backend.sair(); location.hash = ''; },
  lanc(el) { abrirSheet({ tipo: 'lanc', mov: el.dataset.mov, k: el.dataset.k }); },
  async 'confirmar-lanc'() {
    const { k, mov } = S.sheet;
    if (k !== S.eu) return erroSheet('Só o titular movimenta esta conta.');
    const centavos = parseValorBR($('#l-valor')?.value);
    const data = $('#l-data')?.value || '';
    const hoje = hojeISO();
    if (!centavos) return erroSheet('Digite um valor válido, por exemplo 1.500,00.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || data > hoje || data < '2000-01-01') return erroSheet('Escolha uma data até hoje.');
    if (mov === 'retirada') {
      const sim = calcularConta({ lancamentos: [...S.dados.lanc[k], { tipo: 'retirada', valorCentavos: centavos, data }], taxas: S.dados.contas[k]?.taxas || [], hoje });
      if (sim.serie.some((p) => p.saldo < -0.005)) return erroSheet('Saldo insuficiente para essa retirada nessa data.');
    }
    S.ocupado = true; renderSheet();
    try {
      await S.backend.lancar(k, { tipo: mov, valorCentavos: centavos, data });
      fecharSheet(); aviso(`${mov === 'deposito' ? 'Depósito' : 'Retirada'} de ${fmtBRL(centavos / 100)} registrado.`);
    } catch (e) { erroSheet(traduzErro(e)); }
  },
  'pedir-excluir'(el) { abrirSheet({ tipo: 'excluir', k: el.dataset.k, id: el.dataset.id }); },
  async 'confirmar-excluir'() {
    S.ocupado = true; renderSheet();
    try { await S.backend.excluir(S.sheet.k, S.sheet.id); fecharSheet(); aviso('Lançamento excluído.'); }
    catch (e) { erroSheet(traduzErro(e)); }
  },
  async visao(el) {
    const v = el.dataset.v; LS.set('visao.' + S.eu, v);
    S.dados.perfis[S.eu] = { ...S.dados.perfis[S.eu], visaoInicio: v }; render();
    try { await S.backend.salvarPerfil(S.eu, { visaoInicio: v }); } catch (e) { aviso(traduzErro(e)); }
  },
  async 'salvar-inv'() {
    const k = S.eu; const conta = S.dados.contas[k] || {};
    const nome = ($('#inv-nome')?.value || '').trim().slice(0, 60);
    const txt = ($('#inv-taxa')?.value || '').trim().replace('%', '');
    const agencia = ($('#inv-ag')?.value || '').trim().slice(0, 6);
    const numConta = ($('#inv-cc')?.value || '').trim().slice(0, 12);
    const campos = { investimento: nome, agencia, conta: numConta };
    if (txt) {
      const taxa = Math.round((Number(txt.replace(/\./g, '').replace(',', '.')) / 100) * 1e6) / 1e6;
      if (!Number.isFinite(taxa) || taxa < 0 || taxa > 0.2) return aviso('Taxa inválida. Use por exemplo 1,00 para 1% ao mês.');
      let taxas = [...(conta.taxas || [])]; const hoje = hojeISO();
      if (!taxas.length) {
        const primeira = (S.dados.lanc[k] || []).map((l) => l.data).sort()[0];
        taxas = [{ mensal: taxa, aPartirDe: primeira && primeira < hoje ? primeira : hoje }];
      } else if (Math.abs(taxaEm(taxas, hoje) - taxa) > 1e-9) {
        taxas = taxas.filter((t) => t.aPartirDe !== hoje); taxas.push({ mensal: taxa, aPartirDe: hoje });
      }
      campos.taxas = taxas;
    }
    try { await S.backend.salvarConta(k, campos); aviso('Salvo.'); } catch (e) { aviso(traduzErro(e)); }
  },
  'demo-reiniciar'() { S.backend.reiniciar(); aviso('Dados de exemplo restaurados.'); },
  fechar: () => fecharSheet(),
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-acao]'); if (!el) return;
  const a = el.dataset.acao;
  if (a === 'fundo') { if (e.target === el && !S.ocupado) fecharSheet(); return; }
  if (el.disabled) return;
  e.preventDefault();
  acoes[a]?.(el);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.closest('#camada input')) { e.preventDefault(); $('#camada .btn.prim')?.click(); }
  if (e.key === 'Escape' && S.sheet && !S.ocupado) fecharSheet();
  if (S.sheet && 'pin' in S.sheet && !e.target.closest('input')) {
    if (/^\d$/.test(e.key)) acoes.pin({ dataset: { d: e.key } });
    else if (e.key === 'Backspace') acoes['pin-apagar']();
  }
});
document.addEventListener('change', async (e) => {
  if (e.target.id !== 'foto' || !e.target.files?.[0]) return;
  try {
    const foto = await reduzirImagem(e.target.files[0]);
    S.dados.perfis[S.eu] = { ...S.dados.perfis[S.eu], avatar: foto }; render();
    await S.backend.salvarPerfil(S.eu, { avatar: foto }); aviso('Foto atualizada.');
  } catch (err) { aviso(traduzErro(err)); }
});
document.addEventListener('focusout', () => { if (S.pendente) setTimeout(() => { if (!document.activeElement?.closest?.('#app input')) { S.pendente = false; render(); } }, 50); });
window.addEventListener('hashchange', () => render());

// privacidade: borra ao sair e bloqueia depois de 10 minutos fora
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { document.body.classList.add('oculto-privacidade'); S.saiuEm = Date.now(); return; }
  document.body.classList.remove('oculto-privacidade');
  if (S.eu && LS.get('bloquearAoSair', true) && Date.now() - S.saiuEm > 10 * 60000) { S.bloqueado = true; fecharSheet(); render(); }
  if (S.dados) { recalcular(); render(); } // a data pode ter mudado
});

// ---------------------------------------------------------------- início
async function iniciar() {
  const img = new Image(); img.onload = () => { S.logo = true; render(); }; img.src = 'logo-banco.png';
  await verificarBio();
  try { S.backend = DEMO ? criarDemo() : await criarFirebase(); }
  catch (e) { console.error(e); $('#app').innerHTML = '<div class="carregando">Sem conexão. Abra de novo com internet.</div>'; return; }
  S.pronto = true;
  S.backend.iniciar((k) => {
    if (k !== S.eu) {
      S.eu = k; S.dados = null; S.calc = null;
      if (k && S.entrando) { S.bloqueado = false; S.entrando = false; if (!location.hash || location.hash === '#') location.hash = '#/inicio'; }
      else S.bloqueado = true; // app aberto de novo: pede Face ID/código ou o PIN
      if (k && !S.bloqueado && (!location.hash || location.hash === '#')) location.hash = '#/inicio';
    }
    render();
  }, (dados) => {
    S.dados = dados; recalcular();
    if (document.activeElement?.closest?.('#app input')) { S.pendente = true; return; }
    render();
  });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
iniciar();
