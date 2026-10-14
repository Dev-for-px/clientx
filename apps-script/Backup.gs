/**
 * ClientX — receptor de backup (Apps Script).
 *
 * Instalação (do zero):
 * 1. Crie uma planilha vazia (sheets.new) → Extensões → Apps Script.
 * 2. Apague o código de exemplo, cole TODO este arquivo e salve.
 * 3. Configurações do projeto (engrenagem) → Propriedades do script:
 *      BACKUP_TOKEN   = o mesmo valor do BACKUP_TOKEN da Vercel (mín. 32 caracteres)
 *      SPREADSHEET_ID = (opcional) ID da planilha, o trecho entre /d/ e /edit na URL.
 *                       Necessário só se o script NÃO foi criado dentro da planilha.
 * 4. Escolha a função "autorizar" no menu e clique em Executar. Aceite as permissões.
 *    O registro de execução deve mostrar "OK: <nome da planilha>".
 * 5. Implantar → Nova implantação → App da Web. Executar como: Eu.
 *    Quem pode acessar: Qualquer pessoa. Copie a URL que termina em /exec.
 * 6. Abra a URL /exec no navegador: deve aparecer {"ok":true,...,"planilha":true,"token":true}.
 *
 * Ao alterar o código: Implantar → Gerenciar implantações → editar → Versão: Nova versão
 * (assim a URL /exec continua a mesma).
 */

var VERSAO = 2;

function autorizar() {
  var ss = planilha_();
  Logger.log('OK: ' + ss.getName());
  Logger.log('Token configurado: ' + (token_() ? 'sim' : 'NAO (crie BACKUP_TOKEN nas propriedades do script)'));
}

// Diagnóstico: só informa se está configurado, sem revelar nada.
function doGet() {
  var planilha = false;
  try { planilha = !!planilha_(); } catch (err) { planilha = false; }
  return json_({ ok: planilha && !!token_(), versao: VERSAO, planilha: planilha, token: !!token_() });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, erro: 'corpo invalido' });
  }

  var token = token_();
  if (!token) return json_({ ok: false, erro: 'BACKUP_TOKEN nao configurado no script' });
  if (typeof body.token !== 'string' || body.token.trim() !== token) {
    return json_({ ok: false, erro: 'token diferente do configurado no script' });
  }
  if (!body.tabs || typeof body.tabs !== 'object') return json_({ ok: false, erro: 'sem dados' });

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return json_({ ok: false, erro: 'outro backup em andamento' });
  try {
    var ss = planilha_();
    var resumo = [['Aba', 'Linhas'], ['(ultimo backup)', new Date().toISOString()]];
    Object.keys(body.tabs).forEach(function (nome) {
      if (!/^[A-Za-z]{1,30}$/.test(nome) || nome === 'Backup') return;
      var linhas = body.tabs[nome];
      if (!Array.isArray(linhas)) return;
      escreverAba_(ss, nome, linhas);
      resumo.push([nome, String(Math.max(linhas.length - 1, 0))]);
    });
    escreverAba_(ss, 'Backup', resumo);
    SpreadsheetApp.flush();
    return json_({ ok: true, versao: VERSAO });
  } catch (err) {
    return json_({ ok: false, erro: 'falha no script: ' + String((err && err.message) || err).slice(0, 150) });
  } finally {
    lock.releaseLock();
  }
}

// Sobrescreve a aba inteira. Tudo é gravado como texto puro: nada vira fórmula.
function escreverAba_(ss, nome, linhas) {
  var aba = ss.getSheetByName(nome) || ss.insertSheet(nome);
  aba.clear();
  if (!linhas.length) return;
  var largura = 1;
  linhas.forEach(function (l) { if (Array.isArray(l)) largura = Math.max(largura, l.length); });
  var dados = linhas.map(function (l) {
    var r = Array.isArray(l) ? l.slice(0, largura) : [];
    while (r.length < largura) r.push('');
    return r.map(function (v) { return v == null ? '' : String(v); });
  });
  var faixa = aba.getRange(1, 1, dados.length, largura);
  faixa.setNumberFormat('@');
  faixa.setValues(dados);
  aba.setFrozenRows(1);
}

function planilha_() {
  var id = (PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || '').trim();
  var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('script fora da planilha: defina SPREADSHEET_ID');
  return ss;
}

function token_() {
  var t = (PropertiesService.getScriptProperties().getProperty('BACKUP_TOKEN') || '').trim();
  return t.length >= 32 ? t : '';
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
