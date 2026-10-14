import "server-only";

function req(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}

export const env = {
  get sessionSecret() {
    const s = req("SESSION_SECRET");
    if (s.length < 43) throw new Error("SESSION_SECRET muito curto");
    return new TextEncoder().encode(s);
  },
  get encryptionKey() {
    const k = Buffer.from(req("ENCRYPTION_KEY"), "base64");
    if (k.length !== 32) throw new Error("ENCRYPTION_KEY deve ter 32 bytes (base64)");
    return k;
  },
  get adminEmail() {
    return req("ADMIN_EMAIL").trim().toLowerCase();
  },
  get adminPasswordHash() {
    // Guardado em base64 porque o hash bcrypt tem "$", que arquivos .env interpretam como variável.
    const v = req("ADMIN_PASSWORD_HASH");
    return v.startsWith("$2") ? v : Buffer.from(v, "base64").toString("utf8");
  },
  get adminTotpSecret() {
    return req("ADMIN_TOTP_SECRET");
  },
  get sheetId() {
    return req("SHEET_ID");
  },
  get googleEmail() {
    return req("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  },
  get googleKey() {
    return req("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n");
  },
};
