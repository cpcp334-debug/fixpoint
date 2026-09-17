/**
 * Smoke-test bulk status semantics for services/locations/articles/diy.
 * Restores original rows afterward. Does not touch coverage matrix.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cycleService() {
  const row = await prisma.service.findFirst({ include: { category: true } });
  if (!row) return { entity: "services", ok: false, reason: "none" };
  const original = { status: row.status, indexable: row.indexable };
  await prisma.service.update({ where: { id: row.id }, data: { status: "draft", indexable: false } });
  const hidden = await prisma.service.findUniqueOrThrow({ where: { id: row.id } });
  await prisma.service.update({ where: { id: row.id }, data: { status: "active", indexable: true } });
  const published = await prisma.service.findUniqueOrThrow({ where: { id: row.id } });
  await prisma.service.update({ where: { id: row.id }, data: { status: "archived", indexable: false } });
  const archived = await prisma.service.findUniqueOrThrow({ where: { id: row.id } });
  await prisma.service.update({ where: { id: row.id }, data: original });
  return {
    entity: "services",
    ok: hidden.status === "draft" && !hidden.indexable && published.status === "active" && published.indexable && archived.status === "archived",
    slug: row.slug,
  };
}

async function cycleLocation() {
  const row = await prisma.location.findFirst();
  if (!row) return { entity: "locations", ok: false, reason: "none" };
  const original = { status: row.status, indexable: row.indexable, serves: row.serves };
  await prisma.location.update({ where: { id: row.id }, data: { indexable: false } });
  const hidden = await prisma.location.findUniqueOrThrow({ where: { id: row.id } });
  await prisma.location.update({ where: { id: row.id }, data: { status: "active", indexable: true, serves: true } });
  const published = await prisma.location.findUniqueOrThrow({ where: { id: row.id } });
  await prisma.location.update({ where: { id: row.id }, data: { status: "archived", indexable: false } });
  const archived = await prisma.location.findUniqueOrThrow({ where: { id: row.id } });
  await prisma.location.update({ where: { id: row.id }, data: original });
  return {
    entity: "locations",
    ok: !hidden.indexable && published.status === "active" && published.indexable && published.serves && archived.status === "archived",
    slug: row.slug,
  };
}

async function cycleArticle() {
  const row = await prisma.article.findFirst();
  if (!row) return { entity: "articles", ok: false, reason: "none" };
  const original = { status: row.status, indexable: row.indexable, publishedAt: row.publishedAt };
  await prisma.article.update({ where: { id: row.id }, data: { status: "draft", indexable: false } });
  const hidden = await prisma.article.findUniqueOrThrow({ where: { id: row.id } });
  await prisma.article.update({ where: { id: row.id }, data: { status: "published", indexable: true, publishedAt: row.publishedAt || new Date() } });
  const published = await prisma.article.findUniqueOrThrow({ where: { id: row.id } });
  await prisma.article.update({ where: { id: row.id }, data: { status: "archived", indexable: false } });
  const archived = await prisma.article.findUniqueOrThrow({ where: { id: row.id } });
  await prisma.article.update({ where: { id: row.id }, data: original });
  return {
    entity: "articles",
    ok: hidden.status === "draft" && published.status === "published" && published.indexable && archived.status === "archived",
    slug: row.slug,
  };
}

async function cycleDiy() {
  const row = await prisma.diyGuide.findFirst();
  if (!row) return { entity: "diy", ok: false, reason: "none" };
  const original = { status: row.status, indexable: row.indexable, publishedAt: row.publishedAt, profileStatus: row.profileStatus };
  await prisma.diyGuide.update({ where: { id: row.id }, data: { status: "draft", indexable: false } });
  const hidden = await prisma.diyGuide.findUniqueOrThrow({ where: { id: row.id } });
  await prisma.diyGuide.update({
    where: { id: row.id },
    data: { status: "published", indexable: true, publishedAt: row.publishedAt || new Date(), profileStatus: "published" },
  });
  const published = await prisma.diyGuide.findUniqueOrThrow({ where: { id: row.id } });
  await prisma.diyGuide.update({ where: { id: row.id }, data: { status: "archived", indexable: false, profileStatus: "archived" } });
  const archived = await prisma.diyGuide.findUniqueOrThrow({ where: { id: row.id } });
  await prisma.diyGuide.update({ where: { id: row.id }, data: original });
  return {
    entity: "diy",
    ok: hidden.status === "draft" && published.status === "published" && published.indexable && archived.status === "archived",
    slug: row.slug,
  };
}

async function main() {
  const results = await Promise.all([cycleService(), cycleLocation(), cycleArticle(), cycleDiy()]);
  console.log(JSON.stringify({ ok: results.every((r) => r.ok), results }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
