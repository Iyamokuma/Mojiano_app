import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  MOJIANO_ADDRESS,
  MOJIANO_PHONE_DISPLAY,
  MOJIANO_WHATSAPP_DIGITS,
} from "../src/lib/site-contact";

const prisma = new PrismaClient();

const categories = [
  { name: "Audio & TV", slug: "audio-tv", image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=1200&q=80", description: "Televisions, soundbars, headphones and living-room audio." },
  { name: "Household Textiles", slug: "household-textiles", image: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1200&q=80", description: "Bedding, towels and home linens at clearance prices." },
  { name: "Christmas / Halloween", slug: "christmas-halloween", image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=80", description: "Seasonal décor, lighting and festive homeware." },
  { name: "DIY & Auto", slug: "diy-auto", image: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=1200&q=80", description: "Tools, storage and automotive essentials." },
  { name: "Electrical", slug: "electrical", image: "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=1200&q=80", description: "Small appliances and electrical home products." },
  { name: "Sports & Leisure", slug: "sports-leisure", image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80", description: "Fitness, outdoor and leisure equipment." },
  { name: "White Goods", slug: "white-goods", image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80", description: "Refrigeration, laundry and large kitchen appliances." },
  { name: "Fashion & Beauty", slug: "fashion-beauty", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80", description: "Apparel, accessories and beauty lines." },
  { name: "Furniture & Sofas", slug: "furniture-sofas", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80", description: "Sofas, chairs and home furniture from clearance stock." },
  { name: "Mixed Households", slug: "mixed-households", image: "https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=1200&q=80", description: "Assorted household lots and everyday home products." },
  { name: "Miscellaneous", slug: "miscellaneous", image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1200&q=80", description: "Useful extras, mixed pallets and one-off finds." },
  { name: "Jewellery & Watches", slug: "jewellery-watches", image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1200&q=80", description: "Watches, jewellery and gift-ready accessories." },
  { name: "Summer Stock", slug: "summer-stock", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80", description: "Garden, outdoor living and warm-weather lines." },
  { name: "Kitchenware", slug: "kitchenware", image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80", description: "Cookware, tableware and kitchen essentials." },
  { name: "Toys & Nursery", slug: "toys-nursery", image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=1200&q=80", description: "Toys, nursery goods and family products." },
];

type SeedProduct = {
  category: string;
  name: string;
  sku: string;
  price: number;
  compareAt?: number;
  sale?: number;
  stock: number;
  brand?: string;
  short: string;
  description: string;
  image: string;
  featured?: boolean;
  clearance?: boolean;
  bestSeller?: boolean;
  newArrival?: boolean;
  variants?: { name: string; sku: string; stock: number; options: string }[];
};

const products: SeedProduct[] = [
  { category: "audio-tv", name: "55\" 4K Smart Television", sku: "ATV-5501", price: 24999, compareAt: 39999, sale: 22999, stock: 12, brand: "ClearView", short: "Wholesale-clearance 4K smart TV with HDR.", description: "A full HD 4K smart television from mixed wholesale stock. HDMI, USB and Wi-Fi ready. Sold as seen with manufacturer warranty where remaining.", image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=1400&q=80", featured: true, clearance: true, bestSeller: true },
  { category: "audio-tv", name: "Wireless Over-Ear Headphones", sku: "ATV-2208", price: 3499, compareAt: 5999, stock: 40, brand: "Aural", short: "Comfortable wireless headphones with long battery life.", description: "Padded over-ear wireless headphones. Bluetooth pairing, fold-flat design and a travel pouch included on most units.", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1400&q=80", newArrival: true },
  { category: "household-textiles", name: "Egyptian Cotton Towel Bale", sku: "HTX-1044", price: 1899, compareAt: 3200, sale: 1699, stock: 28, brand: "Linen House", short: "Four-piece towel bale in mixed colours.", description: "A four-piece cotton towel set from mixed household textile clearance. Soft pile, absorbent and suitable for home or hospitality use.", image: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1400&q=80", featured: true, clearance: true },
  { category: "household-textiles", name: "King Size Duvet Set", sku: "HTX-2210", price: 2499, compareAt: 4500, stock: 18, short: "King duvet cover with two pillowcases.", description: "A king-size duvet cover set in mixed designs. Easy-care fabric. Colours may vary by remaining wholesale lot.", image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1400&q=80", bestSeller: true },
  { category: "christmas-halloween", name: "Warm White Fairy Light Set", sku: "SEA-3301", price: 899, compareAt: 1499, sale: 749, stock: 60, short: "Indoor/outdoor festive lighting.", description: "A long-run warm white fairy light set, ideal for Christmas displays or year-round ambient lighting.", image: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1400&q=80", clearance: true, featured: true },
  { category: "christmas-halloween", name: "Halloween Porch Lantern Duo", sku: "SEA-1188", price: 1299, stock: 22, short: "Seasonal lantern pair for doorways.", description: "A pair of decorative Halloween lanterns from seasonal clearance. Battery tealight compatible.", image: "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=1400&q=80", newArrival: true },
  { category: "diy-auto", name: "126-Piece Tool Kit", sku: "DIY-6412", price: 3299, compareAt: 5499, stock: 15, brand: "Forge", short: "Socket set and household tools in a carry case.", description: "A complete starter tool kit covering sockets, drivers and pliers. Suitable for home, garage and mixed trade use.", image: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=1400&q=80", featured: true, bestSeller: true },
  { category: "diy-auto", name: "Car Boot Organiser", sku: "DIY-0904", price: 1499, stock: 34, short: "Folding boot tidy with non-slip base.", description: "Keep tools, shopping and sports kit organised. Folds flat when not in use.", image: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1400&q=80" },
  { category: "electrical", name: "Stainless Steel Kettle", sku: "ELC-2103", price: 2199, compareAt: 3499, sale: 1999, stock: 26, brand: "Harbor", short: "1.7L rapid-boil kettle.", description: "A 1.7 litre stainless steel kettle from mixed electrical clearance. Boil-dry protection and 360° base.", image: "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=1400&q=80", clearance: true, featured: true, variants: [
    { name: "Silver", sku: "ELC-2103-S", stock: 16, options: "{\"colour\":\"Silver\"}" },
    { name: "Black", sku: "ELC-2103-B", stock: 10, options: "{\"colour\":\"Black\"}" },
  ] },
  { category: "electrical", name: "Stand Mixer 1000W", sku: "ELC-8841", price: 7999, compareAt: 12999, stock: 8, short: "Planetary stand mixer with bowl and attachments.", description: "A 1000W stand mixer suitable for home baking. Includes mixing bowl and standard beaters. Appearance may vary by lot.", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1400&q=80", newArrival: true },
  { category: "sports-leisure", name: "Adjustable Dumbbell Pair", sku: "SPL-4410", price: 5499, compareAt: 8900, stock: 11, short: "Space-saving adjustable dumbbells.", description: "A pair of adjustable dumbbells covering a useful home-gym weight range. Ideal for mixed leisure clearance.", image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=80", featured: true, bestSeller: true },
  { category: "sports-leisure", name: "Yoga Mat 8mm", sku: "SPL-1022", price: 1299, stock: 48, short: "Non-slip exercise mat.", description: "An 8mm yoga and exercise mat with carry strap. Mixed colours from sports clearance.", image: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&w=1400&q=80", variants: [
    { name: "Blush", sku: "SPL-1022-P", stock: 24, options: "{\"colour\":\"Blush\"}" },
    { name: "Charcoal", sku: "SPL-1022-C", stock: 24, options: "{\"colour\":\"Charcoal\"}" },
  ] },
  { category: "white-goods", name: "Undercounter Fridge 95L", sku: "WHG-0951", price: 15999, compareAt: 22999, sale: 14999, stock: 5, brand: "Norda", short: "Compact fridge for kitchens and studios.", description: "A 95 litre undercounter fridge from mixed white-goods clearance. Check measurements before purchase. Collection may be available.", image: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=1400&q=80", clearance: true, featured: true },
  { category: "white-goods", name: "7kg Washing Machine", sku: "WHG-7002", price: 21999, compareAt: 32999, stock: 4, short: "Freestanding 7kg washer.", description: "A 7kg freestanding washing machine. Sold as wholesale clearance stock with remaining manufacturer cover where applicable.", image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=1400&q=80" },
  { category: "fashion-beauty", name: "Unisex Cashmere-Feel Scarf", sku: "FSH-3308", price: 1299, compareAt: 2500, stock: 36, short: "Soft winter scarf in mixed tones.", description: "A soft, cashmere-feel scarf from fashion clearance. Lightweight enough for spring, warm enough for winter.", image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=1400&q=80", newArrival: true, variants: [
    { name: "Peach", sku: "FSH-3308-P", stock: 12, options: "{\"colour\":\"Peach\"}" },
    { name: "Blush", sku: "FSH-3308-B", stock: 12, options: "{\"colour\":\"Blush\"}" },
    { name: "Charcoal", sku: "FSH-3308-C", stock: 12, options: "{\"colour\":\"Charcoal\"}" },
  ] },
  { category: "fashion-beauty", name: "Daily Skincare Trio", sku: "FSH-1190", price: 1899, compareAt: 3200, sale: 1599, stock: 20, brand: "Sera", short: "Cleanser, serum and moisturiser set.", description: "A three-step everyday skincare set from mixed beauty clearance. Unopened retail packaging.", image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1400&q=80", clearance: true, bestSeller: true },
  { category: "furniture-sofas", name: "Three-Seater Fabric Sofa", sku: "FUR-3011", price: 39999, compareAt: 69999, sale: 37999, stock: 3, short: "Family sofa from furniture clearance.", description: "A three-seater fabric sofa. Colourways vary by remaining lot. Delivery is arranged after order confirmation.", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1400&q=80", featured: true, clearance: true },
  { category: "furniture-sofas", name: "Oak-Look Side Table", sku: "FUR-1182", price: 4999, compareAt: 7900, stock: 14, short: "Compact living-room side table.", description: "A warm oak-look side table with lower shelf. Easy-assembly furniture from mixed clearance.", image: "https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1400&q=80", newArrival: true },
  { category: "mixed-households", name: "Mixed Home Essentials Crate", sku: "MIX-5001", price: 2499, stock: 19, short: "Assorted household products in one crate.", description: "A mixed crate of household essentials from wholesale pallets. Contents vary and represent genuine clearance value.", image: "https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=1400&q=80", featured: true, bestSeller: true },
  { category: "mixed-households", name: "Storage Basket Trio", sku: "MIX-2044", price: 1699, compareAt: 2800, stock: 25, short: "Woven storage baskets, set of three.", description: "Three nested storage baskets for bathrooms, nurseries and living rooms.", image: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1400&q=80" },
  { category: "miscellaneous", name: "Mystery Value Parcel", sku: "MSC-0101", price: 120, compareAt: 999, stock: 50, short: "Surprise parcel of mixed clearance goods.", description: "A value parcel drawn from mixed miscellaneous stock. Contents change with incoming pallets. Always more than the ticket price.", image: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1400&q=80", clearance: true, featured: true, newArrival: true },
  { category: "miscellaneous", name: "LED Desk Lamp", sku: "MSC-2219", price: 1799, stock: 21, short: "Adjustable LED task lamp.", description: "An adjustable LED desk lamp with warm and cool settings. Ideal for home offices.", image: "https://images.unsplash.com/photo-1543198126-a8ad8e47fb22?auto=format&fit=crop&w=1400&q=80" },
  { category: "jewellery-watches", name: "Classic Analogue Watch", sku: "JWL-4402", price: 4599, compareAt: 8900, stock: 9, brand: "Marlow", short: "Minimal analogue watch with leather strap.", description: "A classic analogue watch from jewellery and watches clearance. Gift-ready presentation on most units.", image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1400&q=80", featured: true, bestSeller: true },
  { category: "jewellery-watches", name: "Gold-Tone Hoop Earrings", sku: "JWL-1180", price: 1299, stock: 30, short: "Lightweight gold-tone hoops.", description: "Simple gold-tone hoop earrings. Hypoallergenic posts where marked on packaging.", image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1400&q=80", newArrival: true },
  { category: "summer-stock", name: "Garden Parasol 2.7m", sku: "SUM-2701", price: 3499, compareAt: 5999, sale: 2999, stock: 7, short: "Crank-and-tilt garden parasol.", description: "A 2.7m garden parasol from summer clearance. Base sold separately. Ideal for patios and trade lots.", image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1400&q=80", clearance: true },
  { category: "summer-stock", name: "Insulated Picnic Set", sku: "SUM-1040", price: 2299, stock: 16, short: "Four-person picnic hamper set.", description: "A compact picnic set with plates, cutlery and an insulated bottle pocket.", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80", featured: true, newArrival: true },
  { category: "kitchenware", name: "Non-Stick Pan Set", sku: "KIT-3310", price: 3999, compareAt: 6900, sale: 3499, stock: 17, brand: "Culinary", short: "Three-piece non-stick frying pan set.", description: "A three-piece non-stick pan set from kitchenware clearance. Soft-touch handles and induction-compatible bases on this lot.", image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1400&q=80", featured: true, clearance: true, bestSeller: true },
  { category: "kitchenware", name: "Stoneware Dinner Set for 4", sku: "KIT-2088", price: 2999, stock: 13, short: "16-piece dinner set in warm stone.", description: "A 16-piece stoneware dinner set. Reactive glaze in a calm peach-stone finish. Dishwasher safe.", image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=80", newArrival: true },
  { category: "toys-nursery", name: "Wooden Activity Walker", sku: "TOY-1194", price: 2499, compareAt: 4200, stock: 10, short: "Early-years wooden walker.", description: "A wooden activity walker from toys and nursery clearance. Smooth edges and mixed educational panels.", image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=1400&q=80", featured: true },
  { category: "toys-nursery", name: "Organic Cotton Baby Blanket", sku: "TOY-0771", price: 1499, stock: 24, short: "Soft knitted nursery blanket.", description: "A breathable cotton baby blanket in a calm blush tone. Machine washable.", image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1400&q=80", newArrival: true },
];

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@mojiano.local").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeThisPassword123!";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", passwordHash },
    create: {
      email: adminEmail,
      name: "Mojiano Admin",
      passwordHash,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "customer@mojiano.local" },
    update: {},
    create: {
      email: "customer@mojiano.local",
      name: "Alex Morgan",
      passwordHash: await bcrypt.hash("Customer123!", 12),
      role: "CUSTOMER",
      phone: "07700 900321",
    },
  });

  const categoryMap = new Map<string, string>();
  for (const [index, category] of categories.entries()) {
    const saved = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        image: category.image,
        sortOrder: index,
        isVisible: true,
        deletedAt: null,
      },
      create: {
        ...category,
        sortOrder: index,
      },
    });
    categoryMap.set(category.slug, saved.id);
  }

  for (const product of products) {
    const categoryId = categoryMap.get(product.category);
    if (!categoryId) continue;
    const slug = product.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const saved = await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        name: product.name,
        slug,
        price: product.price,
        compareAtPrice: product.compareAt,
        salePrice: product.sale ?? null,
        stockQuantity: product.stock,
        brand: product.brand,
        shortDescription: product.short,
        description: product.description,
        featured: product.featured ?? false,
        clearance: product.clearance ?? false,
        bestSeller: product.bestSeller ?? false,
        newArrival: product.newArrival ?? false,
        isActive: true,
        categoryId,
      },
      create: {
        name: product.name,
        slug,
        sku: product.sku,
        price: product.price,
        compareAtPrice: product.compareAt,
        salePrice: product.sale ?? null,
        stockQuantity: product.stock,
        brand: product.brand,
        shortDescription: product.short,
        description: product.description,
        featured: product.featured ?? false,
        clearance: product.clearance ?? false,
        bestSeller: product.bestSeller ?? false,
        newArrival: product.newArrival ?? false,
        categoryId,
      },
    });

    const primaryImage = await prisma.productImage.findFirst({
      where: { productId: saved.id },
      orderBy: { sortOrder: "asc" },
    });
    if (!primaryImage) {
      await prisma.productImage.create({
        data: { productId: saved.id, url: product.image, alt: product.name, sortOrder: 0 },
      });
    } else if (
      /photo-(1515562149607-ee1c82c05e69|1469796466631-9d8171f56c36|1504148458000-0471d1165b6d|1507473883500-2dd6282412c8|1509557965875-b88c97052fa0|1512389142860-9c449e58a934|1520903920243-00d482a2dc5b|1574997149283-02432692c642|1603190287605-4f70b88c1c6f|1616628188541-925660ab1447)/.test(
        primaryImage.url,
      )
    ) {
      await prisma.productImage.update({
        where: { id: primaryImage.id },
        data: { url: product.image, alt: product.name },
      });
    }

    if (product.variants) {
      for (const variant of product.variants) {
        await prisma.productVariant.upsert({
          where: { sku: variant.sku },
          update: { name: variant.name, stock: variant.stock, options: variant.options },
          create: {
            productId: saved.id,
            name: variant.name,
            sku: variant.sku,
            stock: variant.stock,
            options: variant.options,
          },
        });
      }
    }
  }

  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {
      standardDeliveryFee: 100,
      expressDeliveryFee: 100,
      phone: MOJIANO_PHONE_DISPLAY,
      whatsappNumber: MOJIANO_WHATSAPP_DIGITS,
      address: MOJIANO_ADDRESS,
      deliveryInfo:
        "Standard and express delivery across the UK. Collection is available from our London warehouse at the address shown on Contact.",
    },
    create: {
      id: "default",
      businessName: "Mojiano Wholesale Clearance",
      tagline: "Quality products at wholesale and clearance prices.",
      email: "hello@mojiano.local",
      phone: MOJIANO_PHONE_DISPLAY,
      whatsappNumber: MOJIANO_WHATSAPP_DIGITS,
      address: MOJIANO_ADDRESS,
      announcement: "Big clearance sale — selected lines at wholesale prices this week.",
      aboutText:
        "Mojiano Wholesale Clearance brings quality overstock, seasonal lines and household goods to customers at genuine wholesale and clearance prices. Shop by category, order online, and talk to us on WhatsApp whenever you need help.",
      bankDetails: "Account name: Mojiano Wholesale Clearance\nSort code: 00-00-00\nAccount number: 12345678",
      deliveryInfo:
        "Standard and express delivery across the UK. Collection is available from our London warehouse at the address shown on Contact.",
      standardDeliveryFee: 100,
      expressDeliveryFee: 100,
    },
  });

  const content = [
    { key: "hero", title: "Wholesale clearance from our warehouse", body: "Overstock, end-of-line and mixed household lots held at our trade unit — white goods, textiles, electrical, kitchenware and more. Order online or message us for bulk and pallet enquiries.", image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1800&q=80", ctaLabel: "Browse clearance", ctaHref: "/shop", sortOrder: 1 },
    { key: "value_trust", title: "Warehouse stock", body: "Goods picked from real clearance and wholesale lines on site — not drop-shipped lifestyle catalogues.", ctaLabel: "", ctaHref: "", sortOrder: 2 },
    { key: "value_price", title: "Trade-style pricing", body: "Compare-at pricing shown where retail tickets remain — built for resellers, traders and sharp household buyers.", ctaLabel: "", ctaHref: "", sortOrder: 3 },
    { key: "value_support", title: "Talk to the floor", body: "WhatsApp the team for stock checks, collection from the unit, delivery quotes and wholesale quantities.", ctaLabel: "", ctaHref: "", sortOrder: 4 },
    { key: "promo_banner", title: "Special offers", body: "Use code WELCOME10 for 10% off your first online order over £40.", image: "", ctaLabel: "View clearance", ctaHref: "/shop?clearance=1", sortOrder: 5 },
    { key: "whatsapp_cta", title: "Need a second pair of eyes on an order?", body: "Message Mojiano on WhatsApp for product questions, availability, delivery and wholesale enquiries.", ctaLabel: "Chat on WhatsApp", ctaHref: "", sortOrder: 6 },
  ];

  for (const block of content) {
    await prisma.siteContent.upsert({
      where: { key: block.key },
      update: block,
      create: block,
    });
  }

  await prisma.promotion.upsert({
    where: { code: "WELCOME10" },
    update: { isActive: true, value: 10, minOrder: 4000 },
    create: {
      name: "First order welcome",
      code: "WELCOME10",
      type: "PERCENTAGE",
      value: 10,
      minOrder: 4000,
      headline: "10% off your first order",
      body: "Apply WELCOME10 at checkout on orders over £40.",
    },
  });

  console.log("Seed complete.");
  console.log(`Admin login: ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
