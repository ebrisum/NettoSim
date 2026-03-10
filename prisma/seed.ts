import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "default" },
    create: {
      name: "Default Tenant",
      slug: "default",
    },
    update: {},
  });
  console.log("Tenant:", tenant.id, tenant.slug);

  // TenantUser must be linked to a real Supabase user; we don't create auth users in seed.
  // Add your first dashboard user via Supabase Dashboard or run:
  // npx prisma db execute --stdin <<< "INSERT INTO \"TenantUser\" (id, \"tenantId\", email, \"supabaseUserId\", role) VALUES ('seed1', '${tenant.id}', 'your@email.com', 'YOUR_SUPABASE_UID', 'admin');"
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
