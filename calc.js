// calc.js — cálculo de saldos estilo CDB (rendimento diário composto em dias úteis).
// Datas sempre como 'AAAA-MM-DD'; internamente usamos Date.UTC (sem fuso, sem horário de verão).

const DIA_MS = 86400000;
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// ---------- Datas ----------

const paraMs = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
};
const deMs = (ms) => new Date(ms).toISOString().slice(0, 10);

export function somarDias(iso, n) {
  return deMs(paraMs(iso) + n * DIA_MS);
}

// Data local do aparelho (não UTC).
export function hojeISO() {
  const h = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${h.getFullYear()}-${p(h.getMonth() + 1)}-${p(h.getDate())}`;
}

const ultimoDiaDoMes = (mes) => { // mes = 'AAAA-MM'
  const [a, m] = mes.split('-').map(Number);
  return deMs(Date.UTC(a, m, 0));
};

// ---------- Feriados ----------

// Domingo de Páscoa pelo algoritmo de Meeus/Butcher.
function pascoa(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return deMs(Date.UTC(ano, mes - 1, dia));
}

const cacheFeriados = new Map();

export function feriadosNacionais(ano) {
  if (cacheFeriados.has(ano)) return cacheFeriados.get(ano);
  const p = pascoa(ano);
  const fixos = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'];
  if (ano >= 2024) fixos.push('11-20'); // Consciência Negra
  const set = new Set(fixos.map((md) => `${ano}-${md}`));
  set.add(somarDias(p, -48)); // Carnaval (segunda)
  set.add(somarDias(p, -47)); // Carnaval (terça)
  set.add(somarDias(p, -2));  // Sexta-feira Santa
  set.add(somarDias(p, 60));  // Corpus Christi
  cacheFeriados.set(ano, set);
  return set;
}

export function ehDiaUtil(iso) {
  const sem = new Date(paraMs(iso)).getUTCDay();
  if (sem === 0 || sem === 6) return false;
  return !feriadosNacionais(Number(iso.slice(0, 4))).has(iso);
}

// ---------- Taxas ----------

// Taxa mensal → taxa por dia útil (21 dias úteis/mês, base 252).
export function taxaDiaria(mensal) {
  return Math.pow(1 + mensal, 1 / 21) - 1;
}

// Taxa mensal vigente na data: a de maior aPartirDe ≤ iso; senão a mais antiga; senão 0.
export function taxaEm(taxas, iso) {
  if (!taxas || taxas.length === 0) return 0;
  const ord = [...taxas].sort((a, b) => a.aPartirDe.localeCompare(b.aPartirDe));
  let vigente = ord[0];
  for (const t of ord) if (t.aPartirDe <= iso) vigente = t;
  return vigente.mensal;
}

// ---------- Cálculo da conta ----------

const plural = (n) => (n === 1 ? '1 dia útil' : `${n} dias úteis`);

export function calcularConta({ lancamentos = [], taxas = [], hoje = hojeISO() }) {
  const validos = lancamentos.filter((l) => l.data <= hoje);
  const res = {
    saldo: 0, depositado: 0, retirado: 0, rendimentoTotal: 0,
    rendimentoHoje: 0, rendimentoMesAtual: 0,
    porMes: [], serie: [], extrato: [], taxaAtual: taxaEm(taxas, hoje),
  };
  if (validos.length === 0) return res;

  // Agrupa lançamentos por dia (valores em reais).
  const porDia = new Map();
  for (const l of validos) {
    const v = l.valorCentavos / 100;
    const delta = l.tipo === 'deposito' ? v : -v;
    porDia.set(l.data, (porDia.get(l.data) || 0) + delta);
    if (l.tipo === 'deposito') res.depositado += v; else res.retirado += v;
    res.extrato.push({
      tipo: l.tipo, data: l.data, valor: v,
      descricao: l.tipo === 'deposito' ? 'Depósito' : 'Retirada',
    });
  }

  const inicio = validos.reduce((min, l) => (l.data < min ? l.data : min), validos[0].data);
  const meses = new Map(); // 'AAAA-MM' → { rendimento, diasUteis }
  let saldo = 0;

  for (let dia = inicio; dia <= hoje; dia = somarDias(dia, 1)) {
    const mes = dia.slice(0, 7);
    if (!meses.has(mes)) meses.set(mes, { rendimento: 0, diasUteis: 0 });
    const acc = meses.get(mes);

    // 1º: rendimento sobre o saldo do início do dia (só em dia útil com saldo).
    if (saldo > 0 && ehDiaUtil(dia)) {
      const r = saldo * taxaDiaria(taxaEm(taxas, dia));
      saldo += r;
      acc.rendimento += r;
      acc.diasUteis++;
      res.rendimentoTotal += r;
      if (dia === hoje) res.rendimentoHoje = r;
    }
    // 2º: depósitos e retiradas do dia.
    saldo += porDia.get(dia) || 0;
    res.serie.push({ data: dia, saldo });
  }

  res.saldo = saldo;
  const mesAtual = hoje.slice(0, 7);
  for (const [mes, { rendimento, diasUteis }] of meses) {
    res.porMes.push({ mes, rendimento, diasUteis });
    if (mes === mesAtual) res.rendimentoMesAtual = rendimento;
    if (rendimento === 0) continue; // sem linha de rendimento zerada no extrato
    const nome = nomeMes(Number(mes.slice(5, 7)));
    const atual = mes === mesAtual;
    res.extrato.push({
      tipo: 'rendimento',
      data: atual ? hoje : ultimoDiaDoMes(mes),
      valor: rendimento,
      descricao: atual
        ? `Rendimento de ${nome} até ${fmtData(hoje).slice(0, 5)} (${plural(diasUteis)})`
        : `Rendimento de ${nome} (${plural(diasUteis)})`,
    });
  }

  // Data decrescente; no empate, rendimento antes dos lançamentos.
  res.extrato.sort((a, b) =>
    b.data.localeCompare(a.data) ||
    (a.tipo === 'rendimento' ? 0 : 1) - (b.tipo === 'rendimento' ? 0 : 1));
  return res;
}

// ---------- Formatação ----------

const semNBSP = (s) => s.replace(/[  ]/g, ' ');
const fmtMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNumero = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtBRL = (valor) => semNBSP(fmtMoeda.format(valor));
export const fmtNum = (valor) => fmtNumero.format(valor);
export const fmtData = (iso) => iso.split('-').reverse().join('/');
export const fmtPct = (frac, casas = 2) => semNBSP(new Intl.NumberFormat('pt-BR', {
  style: 'percent', minimumFractionDigits: casas, maximumFractionDigits: casas,
}).format(frac));
export const nomeMes = (mes) => MESES[mes - 1];

// '40.000,00' | '40000' | '40000,5' | 'R$ 1.234,56' → centavos (int); null se inválido ou ≤ 0.
export function parseValorBR(texto) {
  if (texto == null) return null;
  let s = String(texto).replace(/R\$/i, '').replace(/\s/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); // '40.000' = milhar
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const centavos = Math.round(Number(s) * 100);
  return centavos > 0 ? centavos : null;
}
