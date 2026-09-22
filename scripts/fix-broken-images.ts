import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const REPLACEMENTS: [string, string][] = [
  ["photo-1512389142860-9c449e58a934", "photo-1470337458703-46ad1756a187"],
  ["photo-1504148458000-0471d1165b6d", "photo-1530124566582-a618bc2615dc"],
  ["photo-1509557965875-b88c97052fa0", "photo-1572981779307-38b8cabb2407"],
  ["photo-1574997149283-02432692c642", "photo-1556909114-f6e7ad7d3136"],
  ["photo-1520903920243-00d482a2dc5b", "photo-1434389677669-e08b4cac3105"],
  ["photo-1616628188541-925660ab1447", "photo-1493663284031-b7e3aefcae8e"],
  ["photo-1507473883500-2dd6282412c8", "photo-1543198126-a8ad8e47fb22"],
  ["photo-1469796466631-9d8171f56c36", "photo-1416879595882-3373a0480b5b"],
  ["photo-1603190287605-4f70b88c1c6f", "photo-1414235077428-338989a2e8c0"],
  ["photo-1515562149607-ee1c82c05e69", "photo-1617038260897-41a1f14a8ca0"],
];

const prisma = new PrismaClient();

function rewrite(url: string) {
  let next = url;
  for (const [from, to] of REPLACEMENTS) {
    if (next.includes(from)) next = next.replaceAll(from, to);
  }
  return next;
}

async function main() {
  let categoriesUpdated = 0;
  let imagesUpdated = 0;

  const categories = await prisma.category.findMany({ select: { id: true, image: true } });
  for (const category of categories) {
    if (!category.image) continue;
    const next = rewrite(category.image);
    if (next === category.image) continue;
    await prisma.category.update({ where: { id: category.id }, data: { image: next } });
    categoriesUpdated += 1;
  }

  const images = await prisma.productImage.findMany({ select: { id: true, url: true } });
  for (const image of images) {
    const next = rewrite(image.url);
    if (next === image.url) continue;
    await prisma.productImage.update({ where: { id: image.id }, data: { url: next } });
    imagesUpdated += 1;
  }

  const categoryOverrides: { slug: string; image: string }[] = [
    {
      slug: "christmas-halloween",
      image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=80",
    },
    {
      slug: "diy-auto",
      image: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=1200&q=80",
    },
  ];
  for (const override of categoryOverrides) {
    const result = await prisma.category.updateMany({
      where: { slug: override.slug, NOT: { image: override.image } },
      data: { image: override.image },
    });
    categoriesUpdated += result.count;
  }

  console.log(`Updated ${categoriesUpdated} category images and ${imagesUpdated} product images.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Image repair failed.");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
