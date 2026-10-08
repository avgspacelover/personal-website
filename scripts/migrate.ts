import { getMigratedDb } from "../src/db";
getMigratedDb().then(() => { console.log("migrated"); process.exit(0); });
