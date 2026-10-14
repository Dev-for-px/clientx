// Gera as chaves secretas, o hash da senha do admin e o 2FA.
// Uso: npm run setup
import { randomBytes } from "crypto";
import { writeFileSync, existsSync } from "fs";
import readline from "readline";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import QRCode from "qrcode";

function ask(q, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (hidden) {
      rl._writeToOutput = (s) => rl.output.write(s.includes(q) ? s : "*");
    }
    rl.question(q, (a) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(a.trim());
    });
  });
}

if (existsSync(".env.local")) {
  console.log("Já existe um .env.local. Apague ou renomeie antes de rodar de novo.");
  process.exit(1);
}

const email = (await ask("E-mail do administrador: ")).toLowerCase();
const senha = await ask("Senha do administrador (mín. 14 caracteres): ", true);
if (senha.length < 14) {
  console.log("Senha curta demais. Use pelo menos 14 caracteres.");
  process.exit(1);
}
const confirm = await ask("Repita a senha: ", true);
if (senha !== confirm) {
  console.log("As senhas não conferem.");
  process.exit(1);
}

const totp = authenticator.generateSecret(32);
const otpauth = authenticator.keyuri(email, "ClientX", totp);
await QRCode.toFile("2fa-qrcode.png", otpauth, { width: 360, margin: 2 });

const adminPath = "acesso-" + randomBytes(9).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "x");

const env = `# ClientX — NUNCA envie este arquivo para o GitHub.
SESSION_SECRET=${randomBytes(48).toString("base64url")}
ENCRYPTION_KEY=${randomBytes(32).toString("base64")}
ADMIN_EMAIL=${email}
ADMIN_PASSWORD_HASH=${Buffer.from(bcrypt.hashSync(senha, 12)).toString("base64")}
ADMIN_TOTP_SECRET=${totp}
ADMIN_PATH=${adminPath}

# Google (preencha com os dados da conta de serviço e da planilha)
SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
`;
writeFileSync(".env.local", env, { mode: 0o600 });

console.log(`
Pronto!
  - Arquivo .env.local criado com as chaves.
  - Abra 2fa-qrcode.png e escaneie com o Google Authenticator / Authy.
    Depois APAGUE a imagem.
  - Endereço secreto do painel: /${adminPath}

GUARDE A ENCRYPTION_KEY EM LOCAL SEGURO (ex.: gerenciador de senhas).
Sem ela, os dados criptografados da planilha não podem ser lidos.
`);
