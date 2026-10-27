/**
 * Create a DigiFarm staff account (OPS or ADMIN). Staff are never created through
 * the website, so nobody can promote themselves (ROADMAP §2.4).
 *
 *   pnpm admin:create --email ops@example.com --name "Ama Owusu" --role OPS
 *
 * A one-time password is printed once; the person should change it via
 * "Forgot password" after first sign-in.
 */
import "dotenv/config";

import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    role: { type: "string", default: "OPS" },
  },
});

async function main() {
  const email = values.email?.trim().toLowerCase();
  const name = values.name?.trim();
  const role = values.role?.toUpperCase();
  if (!email || !name || (role !== "OPS" && role !== "ADMIN")) {
    console.error('Usage: pnpm admin:create --email <email> --name "<full name>" --role OPS|ADMIN');
    process.exit(1);
  }

  // Imported after env is loaded; these modules validate configuration on import.
  const { auth } = await import("../src/lib/auth");
  const { db } = await import("../src/lib/db");
  const { audit } = await import("../src/lib/audit");

  if (await db.user.findUnique({ where: { email } })) {
    console.error(`A user with ${email} already exists. Change roles in the admin area instead.`);
    process.exit(1);
  }

  const password = `${randomBytes(9).toString("base64url")}-Df1`;
  const { user } = await auth.api.signUpEmail({ body: { email, name, password } });
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { platformRole: role, emailVerified: true } });
    await audit(tx, null, {
      action: "staff.created",
      entityType: "User",
      entityId: user.id,
      after: { email, role, via: "cli" },
    });
  });

  console.log(`\nCreated ${role} account for ${name} <${email}>.`);
  console.log(`One-time password: ${password}`);
  console.log("Share it privately and ask them to change it after signing in.\n");
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
