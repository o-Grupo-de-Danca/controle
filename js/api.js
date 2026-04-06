// ============================================================
// API — wrapper para chamadas ao Google Apps Script
// ============================================================

const API = {
  async call(action, params = {}) {
    if (!CONFIG.API_URL) {
      throw new Error('API não configurada. Edite js/config.js e cole a URL do Apps Script.');
    }

    const url = new URL(CONFIG.API_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('senha', CONFIG.SENHA);

    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
    });

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);

    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.data;
  },

  // ── Alunos ───────────────────────────────────────────────
  getAlunos:      ()         => API.call('getAlunos'),
  saveAluno:      (row)      => API.call('saveAluno',      { row }),
  updateAluno:    (id, row)  => API.call('updateAluno',    { id, row }),
  desativarAluno: (id)       => API.call('desativarAluno', { id }),

  // ── Turmas ───────────────────────────────────────────────
  getTurmas:   ()        => API.call('getTurmas'),
  saveTurma:   (row)     => API.call('saveTurma',   { row }),
  updateTurma: (id, row) => API.call('updateTurma', { id, row }),

  // ── Matrículas ───────────────────────────────────────────
  getMatriculas:   ()        => API.call('getMatriculas'),
  saveMatricula:   (row)     => API.call('saveMatricula',   { row }),
  removeMatricula: (id, fim) => API.call('removeMatricula', { id, fim }),

  // ── Faturas ──────────────────────────────────────────────
  getFaturas:   ()        => API.call('getFaturas'),
  updateFatura: (id, row) => API.call('updateFatura', { id, row }),
  gerarFaturas: (mes)     => API.call('gerarFaturas', { mes }),

  // ── Pagamentos ───────────────────────────────────────────
  getPagamentos: ()    => API.call('getPagamentos'),
  savePagamento: (row) => API.call('savePagamento', { row }),
};

// ── Utilitários ──────────────────────────────────────────────

const Utils = {
  hoje() {
    return new Date().toISOString().split('T')[0];
  },

  mesAtual() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  },

  formatarMes(mes) {
    if (!mes) return '';
    const [ano, m] = mes.split('-');
    const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${nomes[parseInt(m) - 1]}/${ano}`;
  },

  formatarData(data) {
    if (!data) return '';
    if (data instanceof Date) data = data.toISOString().split('T')[0];
    const [ano, mes, dia] = String(data).split('T')[0].split('-');
    return `${dia}/${mes}/${ano}`;
  },

  formatarValor(v) {
    const n = parseFloat(v) || 0;
    return 'R$ ' + n.toFixed(2).replace('.', ',');
  },

  fone(numero) {
    if (!numero) return '';
    return String(numero).replace(/\D/g, '');
  },

  whatsapp(numero, msg) {
    const n = Utils.fone(numero);
    const texto = encodeURIComponent(msg);
    return `https://wa.me/55${n}?text=${texto}`;
  },

  statusLabel(status) {
    const map = {
      pendente: { text: 'Pendente', cls: 'bg-yellow-100 text-yellow-800' },
      pago:     { text: 'Pago',     cls: 'bg-green-100 text-green-800' },
      vencida:  { text: 'Vencida',  cls: 'bg-red-100 text-red-800' },
      isento:   { text: 'Isento',   cls: 'bg-gray-100 text-gray-600' },
      parcial:  { text: 'Parcial',  cls: 'bg-blue-100 text-blue-800' },
    };
    return map[status] || { text: status, cls: 'bg-gray-100 text-gray-600' };
  },

  mostrarErro(msg) {
    const el = document.getElementById('toast');
    if (!el) return alert('Erro: ' + msg);
    el.textContent = '⚠️ ' + msg;
    el.className = 'fixed top-4 left-4 right-4 max-w-lg mx-auto bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg z-50 text-sm';
    setTimeout(() => el.className = 'hidden', 4000);
  },

  mostrarSucesso(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = '✅ ' + msg;
    el.className = 'fixed top-4 left-4 right-4 max-w-lg mx-auto bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg z-50 text-sm';
    setTimeout(() => el.className = 'hidden', 3000);
  },
};
