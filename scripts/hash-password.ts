import { hashPassword } from "../src/lib/password";
const pw = process.argv[2];
if (!pw || pw.length < 12) { console.error('Usage: npm run admin:hash -- "<password, 12+ chars>"'); process.exit(1); }
console.log(`ADMIN_PASSWORD_HASH=${hashPassword(pw)}`);
