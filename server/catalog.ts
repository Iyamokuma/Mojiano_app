import { Prisma } from "@prisma/client";
import { resolveCategoryImage, withFixedProductImages } from "../src/lib/media";
import { prisma } from "./db";

function contains(q: string): Prisma.StringFilter {
  return { contains: q, mode: "insensitive" };
}

export const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  price: true,
  compareAtPrice: true,
  salePrice: true,
  stockQuantity: true,
  featured: true,
  clearance: true,
  newArrival: true,
  brand: true,
  shortDescription: true,
  ratingAvg: true,
  reviewCount: true,
  category: { select: { name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true, alt: true } },
} satisfies Prisma.ProductSelect;

function withFixedCategory<
  T extends {
    slug: string;
    image?: string | null;
    children?: Array<{ slug: string; image?: string | null }>;
    parent?: { slug: string; image?: string | null } | null;
  },
>(category: T): T {
  return {
    ...category,
    image: resolveCategoryImage(category.slug, category.image ?? null),
    ...(category.children
      ? {
          children: category.children.map((child) => ({
            ...child,
            image: resolveCategoryImage(child.slug, child.image ?? null),
          })),
        }
      : {}),
    ...(category.parent
      ? {
          parent: {
            ...category.parent,
            image: resolveCategoryImage(category.parent.slug, category.parent.image ?? null),
          },
        }
      : {}),
  };
}

export async function getVisibleCategories() {
  const categories = await prisma.category.findMany({
    where: { isVisible: true, deletedAt: null, parentId: null },
    orderBy: { sortOrder: "asc" },
    include: {
      children: {
        where: { isVisible: true, deletedAt: null },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  return categories.map((category) => withFixedCategory(category));
}

export async function getCategoryBySlug(slug: string) {
  const category = await prisma.category.findFirst({
    where: { slug, deletedAt: null, isVisible: true },
    include: {
      children: { where: { isVisible: true, deletedAt: null }, orderBy: { sortOrder: "asc" } },
      parent: true,
    },
  });
  return category ? withFixedCategory(category) : category;
}

export async function queryProducts(input: {
  q?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  outOfStock?: boolean;
  clearance?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
}) {
  const {
    q,
    categorySlug,
    minPrice,
    maxPrice,
    inStock,
    outOfStock,
    clearance,
    sort = "newest",
    page = 1,
    pageSize = 24,
  } = input;

  const category = categorySlug
    ? await prisma.category.findFirst({
        where: { slug: categorySlug, deletedAt: null },
        include: { children: { select: { id: true } } },
      })
    : null;

  const categoryIds = category
    ? [category.id, ...category.children.map((child) => child.id)]
    : undefined;

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    deletedAt: null,
    ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
    ...(inStock && !outOfStock ? { stockQuantity: { gt: 0 } } : {}),
    ...(outOfStock && !inStock ? { stockQuantity: { lte: 0 } } : {}),
    ...(clearance ? { clearance: true } : {}),
    ...(minPrice || maxPrice
      ? { price: { gte: minPrice || undefined, lte: maxPrice || undefined } }
      : {}),
    ...(q
      ? {
          OR: [
            { name: contains(q) },
            { sku: contains(q) },
            { brand: contains(q) },
            { shortDescription: contains(q) },
            { description: contains(q) },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price-asc"
      ? { price: "asc" }
      : sort === "price-desc"
        ? { price: "desc" }
        : sort === "oldest"
          ? { createdAt: "asc" }
          : sort === "name"
            ? { name: "asc" }
            : sort === "rating"
              ? { ratingAvg: "desc" }
              : { createdAt: "desc" };

  const facetBase: Prisma.ProductWhereInput = {
    isActive: true,
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { name: contains(q) },
            { sku: contains(q) },
            { brand: contains(q) },
          ],
        }
      : {}),
  };

  const [products, total, inStockCount, outOfStockCount, categoryRows] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: productCardSelect,
    }),
    prisma.product.count({ where }),
    prisma.product.count({ where: { ...facetBase, stockQuantity: { gt: 0 } } }),
    prisma.product.count({ where: { ...facetBase, stockQuantity: { lte: 0 } } }),
    prisma.category.findMany({
      where: { isVisible: true, deletedAt: null, parentId: null },
      orderBy: { sortOrder: "asc" },
      select: {
        name: true,
        slug: true,
        _count: { select: { products: { where: { isActive: true, deletedAt: null } } } },
      },
    }),
  ]);

  return {
    products: products.map((product) => withFixedProductImages(product)),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    facets: {
      inStock: inStockCount,
      outOfStock: outOfStockCount,
      categories: categoryRows.map((row) => ({
        name: row.name,
        slug: row.slug,
        count: row._count.products,
      })),
    },
  };
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true } },
      reviews: {
        where: { approved: true },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      },
    },
  });
  return product ? withFixedProductImages(product) : product;
}

export async function getRelatedProducts(productId: string, categoryId: string) {
  const products = await prisma.product.findMany({
    where: { id: { not: productId }, categoryId, isActive: true, deletedAt: null },
    take: 4,
    select: productCardSelect,
  });
  return products.map((product) => withFixedProductImages(product));
}

export async function getHomeCollections() {
  const select = productCardSelect;
  const [featured, clearance, newArrivals, bestSellers] = await Promise.all([
    prisma.product.findMany({ where: { featured: true, isActive: true, deletedAt: null }, take: 8, select }),
    prisma.product.findMany({ where: { clearance: true, isActive: true, deletedAt: null }, take: 8, select }),
    prisma.product.findMany({
      where: { newArrival: true, isActive: true, deletedAt: null },
      take: 8,
      orderBy: { createdAt: "desc" },
      select,
    }),
    prisma.product.findMany({ where: { bestSeller: true, isActive: true, deletedAt: null }, take: 8, select }),
  ]);
  return {
    featured: featured.map((product) => withFixedProductImages(product)),
    clearance: clearance.map((product) => withFixedProductImages(product)),
    newArrivals: newArrivals.map((product) => withFixedProductImages(product)),
    bestSellers: bestSellers.map((product) => withFixedProductImages(product)),
  };
}
