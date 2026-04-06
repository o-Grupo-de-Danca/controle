// ============================================================
// oGrupo de Dança — Google Apps Script Backend
//
// COMO INSTALAR:
// 1. Abra sua planilha Google
// 2. Menu: Extensões > Apps Script
// 3. Apague o código padrão e cole este arquivo inteiro
// 4. Clique em "Salvar" (ícone de disquete)
// 5. No menu superior, clique em "Executar" > selecione "inicializar" > Executar
//    (Autorize o script quando solicitado)
// 6. Menu: Implantar > Nova implantação
//    - Tipo: Aplicativo da Web
//    - Executar como: Eu
//    - Quem tem acesso: Qualquer pessoa
//    - Clique em Implantar
// 7. Copie a URL gerada e cole em js/config.js
// ============================================================

const SENHA = 'ogrupo2024'; // ← ALTERE PARA UMA SENHA SUA

// ─── Entry points ──────────────────────────────────────────

function doGet(e) {
  try {
    const p = e.parameter || {};

    if (p.senha !== SENHA) {
      return json({ error: 'Não autorizado' });
    }

    // Parse row/objetos JSON passados como string
    ['row', 'ids'].forEach(k => {
      if (p[k] && typeof p[k] === 'string') {
        try { p[k] = JSON.parse(p[k]); } catch (_) {}
      }
    });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return rotear(ss, p);
  } catch (err) {
    return json({ error: err.message });
  }
}

function rotear(ss, p) {
  switch (p.action) {
    case 'inicializar':
      inicializar(ss);
      return json({ ok: true, data: { mensagem: 'Planilha inicializada com sucesso!' } });

    // Alunos
    case 'getAlunos':
      return json({ ok: true, data: getAll(ss, 'alunos') });
    case 'saveAluno':
      return json({ ok: true, data: saveRow(ss, 'alunos', p.row) });
    case 'updateAluno':
      return json({ ok: true, data: updateRow(ss, 'alunos', p.id, p.row) });
    case 'desativarAluno':
      return json({ ok: true, data: updateField(ss, 'alunos', p.id, 'ativo', 'false') });

    // Turmas
    case 'getTurmas':
      return json({ ok: true, data: getAll(ss, 'turmas') });
    case 'saveTurma':
      return json({ ok: true, data: saveRow(ss, 'turmas', p.row) });
    case 'updateTurma':
      return json({ ok: true, data: updateRow(ss, 'turmas', p.id, p.row) });

    // Matrículas
    case 'getMatriculas':
      return json({ ok: true, data: getAll(ss, 'matriculas') });
    case 'saveMatricula':
      return json({ ok: true, data: saveRow(ss, 'matriculas', p.row) });
    case 'removeMatricula':
      return json({ ok: true, data: updateField(ss, 'matriculas', p.id, 'fim', p.fim || new Date().toISOString().split('T')[0]) });

    // Faturas
    case 'getFaturas':
      return json({ ok: true, data: getAll(ss, 'faturas') });
    case 'updateFatura':
      return json({ ok: true, data: updateRow(ss, 'faturas', p.id, p.row) });
    case 'gerarFaturas':
      return json({ ok: true, data: gerarFaturas(ss, p.mes) });

    // Pagamentos
    case 'getPagamentos':
      return json({ ok: true, data: getAll(ss, 'pagamentos') });
    case 'savePagamento':
      return json({ ok: true, data: saveRow(ss, 'pagamentos', p.row) });

    default:
      return json({ error: `Ação desconhecida: ${p.action}` });
  }
}

// ─── Inicialização das abas ────────────────────────────────

function inicializar(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();

  const schemas = {
    alunos:     ['id','nome','telefone','email','cpf','nascimento','obs','ativo','resp_nome','resp_telefone','resp_cpf','criado_em'],
    turmas:     ['id','nome','modalidade','dia','horario','mensalidade','ativo','criado_em'],
    matriculas: ['id','aluno_id','turma_id','inicio','fim','mensalidade_custom','criado_em'],
    faturas:    ['id','aluno_id','mes','valor','vencimento','status','obs','criado_em'],
    pagamentos: ['id','fatura_id','data','valor','descricao','metodo','criado_em']
  };

  Object.entries(schemas).forEach(([name, cols]) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);

    if (sheet.getLastRow() === 0) {
      const r = sheet.getRange(1, 1, 1, cols.length);
      r.setValues([cols]);
      r.setFontWeight('bold');
      r.setBackground('#ede9fe'); // violeta claro
    }
  });
}

// ─── Helpers de leitura/escrita ────────────────────────────

function getSheet(ss, name) {
  const s = ss.getSheetByName(name);
  if (!s) throw new Error(`Aba "${name}" não encontrada. Execute inicializar() primeiro.`);
  return s;
}

function sheetToObjects(sheet) {
  const lr = sheet.getLastRow();
  if (lr <= 1) return [];
  const lc = sheet.getLastColumn();
  const data = sheet.getRange(1, 1, lr, lc).getValues();
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      const v = row[i];
      obj[h] = (v === '' || v === null || v === undefined) ? null : v;
    });
    return obj;
  });
}

function getAll(ss, sheetName) {
  return sheetToObjects(getSheet(ss, sheetName));
}

function saveRow(ss, sheetName, rowData) {
  const sheet = getSheet(ss, sheetName);
  const lc = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lc).getValues()[0];
  const id = Utilities.getUuid();
  const agora = new Date().toISOString();
  const merged = Object.assign({}, rowData, { id, criado_em: agora });
  const values = headers.map(h => (merged[h] !== undefined && merged[h] !== null) ? merged[h] : '');
  sheet.appendRow(values);
  return { id };
}

function findRowIndex(sheet, id) {
  const lr = sheet.getLastRow();
  if (lr < 2) return -1;
  const idCol = sheet.getRange(2, 1, lr - 1, 1).getValues();
  for (let i = 0; i < idCol.length; i++) {
    if (String(idCol[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function updateRow(ss, sheetName, id, rowData) {
  const sheet = getSheet(ss, sheetName);
  const lc = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lc).getValues()[0];
  const rowIndex = findRowIndex(sheet, id);
  if (rowIndex === -1) throw new Error(`Registro não encontrado: ${id}`);

  const currentValues = sheet.getRange(rowIndex, 1, 1, lc).getValues()[0];
  const current = {};
  headers.forEach((h, i) => { current[h] = currentValues[i]; });

  const updated = Object.assign({}, current, rowData);
  const values = [headers.map(h => (updated[h] !== undefined && updated[h] !== null) ? updated[h] : '')];
  sheet.getRange(rowIndex, 1, 1, lc).setValues(values);
  return { ok: true };
}

function updateField(ss, sheetName, id, field, value) {
  const sheet = getSheet(ss, sheetName);
  const lc = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lc).getValues()[0];
  const colIndex = headers.indexOf(field);
  if (colIndex === -1) throw new Error(`Campo "${field}" não encontrado na aba "${sheetName}"`);
  const rowIndex = findRowIndex(sheet, id);
  if (rowIndex === -1) throw new Error(`Registro não encontrado: ${id}`);
  sheet.getRange(rowIndex, colIndex + 1).setValue(value);
  return { ok: true };
}

// ─── Geração de faturas ────────────────────────────────────

function gerarFaturas(ss, mes) {
  // mes = "2025-04"
  if (!mes) throw new Error('Parâmetro "mes" obrigatório (ex: 2025-04)');

  const alunos      = sheetToObjects(getSheet(ss, 'alunos')).filter(a => String(a.ativo) === 'true');
  const turmas      = sheetToObjects(getSheet(ss, 'turmas'));
  const matriculas  = sheetToObjects(getSheet(ss, 'matriculas')).filter(m => !m.fim);
  const faturas     = sheetToObjects(getSheet(ss, 'faturas'));

  const turmasMap = {};
  turmas.forEach(t => { turmasMap[t.id] = t; });

  const matriculasPorAluno = {};
  matriculas.forEach(m => {
    if (!matriculasPorAluno[m.aluno_id]) matriculasPorAluno[m.aluno_id] = [];
    matriculasPorAluno[m.aluno_id].push(m);
  });

  const [ano, mesNum] = mes.split('-');
  const vencimento = `${ano}-${mesNum}-10`;
  let criadas = 0;

  alunos.forEach(aluno => {
    const mats = matriculasPorAluno[aluno.id] || [];
    if (mats.length === 0) return;

    const jaExiste = faturas.some(f => String(f.aluno_id) === String(aluno.id) && f.mes === mes);
    if (jaExiste) return;

    let valor = 0;
    mats.forEach(m => {
      const turma = turmasMap[m.turma_id];
      const taxa = parseFloat(m.mensalidade_custom || (turma ? turma.mensalidade : 0)) || 0;
      valor += taxa;
    });
    if (valor <= 0) return;

    saveRow(ss, 'faturas', {
      aluno_id: aluno.id,
      mes,
      valor,
      vencimento,
      status: 'pendente',
      obs: ''
    });
    criadas++;
  });

  return { criadas, mes };
}

// ─── Resposta JSON ─────────────────────────────────────────

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
