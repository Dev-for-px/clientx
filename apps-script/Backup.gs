/**
 * ClientX — receptor de backup.
 * Cole este código em Extensões → Apps Script da planilha de backup.
 * Depois, em Configurações do projeto → Propriedades do script, crie:
 *   BACKUP_TOKEN = (o mesmo valor do BACKUP_TOKEN da Vercel)
 */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var token = PropertiesService.getScriptProperties().getProperty('BACKUP_TOKEN');
    if (!token || token.length < 32 || body.token !== token) {
      return json_({ ok: false, erro: 'nao autorizado' });
    }
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var resumo = [['Ultimo backup', new Date().toISOString()]];
      Object.keys(body.tabs).forEach(function (nome) {
        if (!/^[A-Za-z]{1,30}$/.test(nome)) return;
        var linhas = body.tabs[nome];
        var aba = ss.getSheetByName(nome) || ss.insertSheet(nome);
        aba.clearContents();
        if (linhas.length) {
          // Grava como texto puro: nada vira fórmula.
          var largura = linhas[0].length;
          var dados = linhas.map(function (l) {
            var r = l.slice(0, largura);
            while (r.length < largura) r.push('');
            return r.map(String);
          });
          var faixa = aba.getRange(1, 1, dados.length, largura);
          faixa.setNumberFormat('@');
          faixa.setValues(dados);
          aba.setFrozenRows(1);
        }
        resumo.push([nome, String(Math.max(linhas.length - 1, 0))]);
      });
      var r = ss.getSheetByName('Backup') || ss.insertSheet('Backup');
      r.clearContents();
      r.getRange(1, 1, resumo.length, 2).setValues(resumo);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, erro: 'falha no script' });
  }
}

function doGet() {
  return ContentService.createTextOutput('');
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
