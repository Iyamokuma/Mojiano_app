import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ImagePlus, Star } from "lucide-react";
import { api, peekApi, uploadImage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldError } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; slug: string; isVisible?: boolean };
type DraftImage = { id?: string; url: string; alt: string };
type VariantRow = { name: string; sku: string; stock: string };
type Product = {
  id: string;
  name: string;
  sku: string;
  description: string;
  shortDescription: string;
  price: number;
  compareAtPrice: number | null;
  salePrice: number | null;
  stockQuantity: number;
  categoryId: string;
  brand: string | null;
  featured: boolean;
  clearance: boolean;
  newArrival: boolean;
  bestSeller: boolean;
  isActive: boolean;
  weightGrams: number | null;
  images: { id: string; url: string; alt: string; sortOrder: number }[];
  variants: { name: string; sku: string; stock: number }[];
};

const STEPS = [
  { id: "info", label: "Product information" },
  { id: "media", label: "Upload media" },
  { id: "pricing", label: "Pricing & inventory" },
  { id: "variation", label: "Product variation" },
  { id: "shipping", label: "Shipping" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function pounds(pence: number | null | undefined) {
  if (pence == null) return "";
  return (pence / 100).toFixed(2);
}

function pence(value: string) {
  const raw = value.trim();
  if (!raw) return null;
  return Math.round(Number(raw) * 100);
}

const emptyForm = {
  name: "",
  sku: "",
  categoryId: "",
  brand: "",
  shortDescription: "",
  description: "",
  price: "",
  compareAtPrice: "",
  salePrice: "",
  stockQuantity: "0",
  featured: false,
  clearance: false,
  newArrival: false,
  bestSeller: false,
  isActive: true,
  weightGrams: "",
};

export function AdminProductForm() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const id = pathname.match(/^\/admin\/catalogue\/([^/]+)$/)?.[1];
  const editing = Boolean(id && id !== "new");
  const [step, setStep] = useState<StepId>("info");
  const [categories, setCategories] = useState<Category[]>(() => peekApi<Category[]>("/api/admin/categories") ?? []);
  const [product, setProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState<DraftImage[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [primaryIndex, setPrimaryIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [catsReady, setCatsReady] = useState(() => peekApi("/api/admin/categories") !== undefined);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    void api<Category[]>("/api/admin/categories")
      .then((next) => {
        setCategories(next);
        setCatsReady(true);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    setStep("info");
    if (!editing || !id) {
      setProduct(null);
      setForm(emptyForm);
      setImages([]);
      setVariants([]);
      setPrimaryIndex(0);
      return;
    }
    setProduct(null);
    setError(null);
    void api<Product>(`/api/admin/products/${id}`)
      .then((next) => {
        setProduct(next);
        setForm({
          name: next.name,
          sku: next.sku,
          categoryId: next.categoryId,
          brand: next.brand ?? "",
          shortDescription: next.shortDescription,
          description: next.description,
          price: pounds(next.price),
          compareAtPrice: pounds(next.compareAtPrice),
          salePrice: pounds(next.salePrice),
          stockQuantity: String(next.stockQuantity),
          featured: next.featured,
          clearance: next.clearance,
          newArrival: next.newArrival,
          bestSeller: next.bestSeller,
          isActive: next.isActive,
          weightGrams: next.weightGrams != null ? String(next.weightGrams) : "",
        });
        const ordered = [...next.images].sort((a, b) => a.sortOrder - b.sortOrder);
        setImages(ordered);
        setPrimaryIndex(0);
        setVariants(next.variants.map((variant) => ({ name: variant.name, sku: variant.sku, stock: String(variant.stock) })));
      })
      .catch((err: Error) => setError(err.message));
  }, [editing, id]);

  const completion = useMemo(() => {
    const checks = [
      form.name.trim().length >= 2,
      form.sku.trim().length >= 2,
      Boolean(form.categoryId),
      Boolean(form.price),
      images.length > 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form.name, form.sku, form.categoryId, form.price, images.length]);

  const stepIndex = STEPS.findIndex((item) => item.id === step);
  const lastStep = stepIndex === STEPS.length - 1;

  function update<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function addFiles(files: FileList | File[] | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: DraftImage[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const next = await uploadImage(file);
        if (editing && id) {
          const saved = await api<DraftImage>(`/api/admin/products/${id}/images`, {
            method: "POST",
            body: JSON.stringify(next),
          });
          uploaded.push(saved);
        } else {
          uploaded.push(next);
        }
      }
      setImages((current) => {
        if (current.length === 0) setPrimaryIndex(0);
        return [...current, ...uploaded];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload images.");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    void addFiles(event.dataTransfer.files);
  }

  async function makeMain(index: number) {
    const image = images[index];
    if (!image) return;
    setPrimaryIndex(index);
    if (editing && id && image.id) {
      const next = await api<Product>(`/api/admin/products/${id}/images/${image.id}`, {
        method: "PATCH",
        body: JSON.stringify({ primary: true }),
      });
      setImages([...(next.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder));
      setPrimaryIndex(0);
    }
  }

  async function removeImage(index: number) {
    const image = images[index];
    if (!image) return;
    if (editing && id && image.id) {
      const next = await api<Product>(`/api/admin/products/${id}/images/${image.id}`, { method: "DELETE" });
      const ordered = [...(next.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
      setImages(ordered);
      setPrimaryIndex(0);
      return;
    }
    setImages((current) => current.filter((_, i) => i !== index));
    setPrimaryIndex((current) => {
      if (index === current) return 0;
      if (index < current) return Math.max(0, current - 1);
      return current;
    });
  }

  async function save(asDraft: boolean) {
    const price = pence(form.price);
    if (price == null || Number.isNaN(price)) {
      setError("Enter a price.");
      setStep("pricing");
      return;
    }
    if (!form.categoryId) {
      setError("Choose a category.");
      setStep("info");
      return;
    }
    setPending(true);
    setError(null);
    const payload = {
      name: form.name,
      sku: form.sku,
      categoryId: form.categoryId,
      brand: form.brand || null,
      price,
      compareAtPrice: pence(form.compareAtPrice),
      salePrice: pence(form.salePrice),
      stockQuantity: Number(form.stockQuantity || 0),
      shortDescription: form.shortDescription,
      description: form.description,
      featured: form.featured,
      clearance: form.clearance,
      newArrival: form.newArrival,
      bestSeller: form.bestSeller,
      isActive: asDraft ? false : form.isActive,
      weightGrams: form.weightGrams.trim() ? Number(form.weightGrams) : null,
      variants: variants.filter((variant) => variant.name.trim()),
    };
    try {
      if (editing && id) {
        await api(`/api/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await api("/api/admin/products", {
          method: "POST",
          body: JSON.stringify({ ...payload, images, primaryIndex }),
        });
      }
      navigate("/admin/catalogue");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the product.");
    } finally {
      setPending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lastStep) {
      void save(false);
      return;
    }
    setStep(STEPS[stepIndex + 1].id);
  }

  if ((!catsReady || (editing && !product)) && !error) {
    return <p className="text-sm text-muted">Loading product…</p>;
  }

  return (
    <form key={id ?? "new"} onSubmit={onSubmit} className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Catalogue</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{editing ? "Edit product" : "Add product"}</h1>
          <p className="mt-1 text-sm text-muted">Work through the tabs, then save. The main photo is the one the shop shows first.</p>
        </div>
        <Link to="/admin/catalogue" className="text-sm text-muted hover:text-ink">
          Back to catalogue
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[16.5rem_minmax(0,1fr)]">
        <aside className="h-fit rounded-[1.75rem] bg-white p-3 lg:sticky lg:top-8">
          <p className="px-3 pb-2 pt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Actions</p>
          <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {STEPS.map((item) => {
              const active = item.id === step;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStep(item.id)}
                  className={cn(
                    "shrink-0 rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition",
                    active ? "bg-ink text-white" : "text-muted hover:bg-canvas-warm hover:text-ink",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="rounded-[1.75rem] bg-white p-5 sm:p-6">
          {step === "info" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <h2 className="text-[15px] font-semibold sm:col-span-2">Product information</h2>
              <div className="sm:col-span-2">
                <Label>Name</Label>
                <Input name="name" required value={form.name} onChange={(event) => update("name", event.target.value)} />
              </div>
              <div>
                <Label>SKU</Label>
                <Input name="sku" required value={form.sku} onChange={(event) => update("sku", event.target.value)} />
              </div>
              <div>
                <Label>Category</Label>
                <Select name="categoryId" required value={form.categoryId} onChange={(event) => update("categoryId", event.target.value)}>
                  <option value="">Choose where it belongs</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                      {category.isVisible === false ? " (hidden)" : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Brand</Label>
                <Input name="brand" value={form.brand} onChange={(event) => update("brand", event.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Short description</Label>
                <Input name="shortDescription" value={form.shortDescription} onChange={(event) => update("shortDescription", event.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Full description</Label>
                <Textarea name="description" value={form.description} onChange={(event) => update("description", event.target.value)} />
              </div>
              <div className="flex flex-wrap gap-4 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isActive} onChange={(event) => update("isActive", event.target.checked)} /> On the shop
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.newArrival} onChange={(event) => update("newArrival", event.target.checked)} /> New arrivals
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.featured} onChange={(event) => update("featured", event.target.checked)} /> Featured
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.clearance} onChange={(event) => update("clearance", event.target.checked)} /> Clearance
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.bestSeller} onChange={(event) => update("bestSeller", event.target.checked)} /> Best seller
                </label>
              </div>
            </div>
          ) : null}

          {step === "media" ? (
            <div>
              <h2 className="text-[15px] font-semibold">Upload media</h2>
              <p className="mt-1 text-sm text-muted">Drop photos here or browse. Click one to make it the main image on the shop.</p>
              <label
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "mt-5 flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 text-sm text-muted",
                  dragging ? "border-ink bg-canvas-warm text-ink" : "border-ink/20 bg-canvas hover:border-ink/40 hover:text-ink",
                )}
              >
                <ImagePlus size={22} />
                {uploading ? "Uploading…" : "Drop photos here or browse files"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    void addFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
              {images.length ? (
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {images.map((image, index) => {
                    const main = index === primaryIndex;
                    return (
                      <div key={image.id ?? image.url} className="relative">
                        <button
                          type="button"
                          onClick={() => void makeMain(index)}
                          className={cn(
                            "block w-full overflow-hidden rounded-2xl bg-canvas-warm ring-2 ring-offset-2",
                            main ? "ring-ink" : "ring-transparent hover:ring-line",
                          )}
                        >
                          <img src={image.url} alt="" className="aspect-square w-full object-cover" />
                        </button>
                        {main ? (
                          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-ink px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white">
                            <Star size={10} /> Main
                          </span>
                        ) : (
                          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-muted">
                            Set as main
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => void removeImage(index)}
                          className="absolute right-2 top-2 rounded-full bg-ink/80 px-2 py-1 text-[10px] text-white"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {step === "pricing" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <h2 className="text-[15px] font-semibold sm:col-span-2">Pricing & inventory</h2>
              <div>
                <Label>Price (£)</Label>
                <Input name="price" type="number" min="0" step="0.01" required value={form.price} onChange={(event) => update("price", event.target.value)} />
              </div>
              <div>
                <Label>Compare-at (£)</Label>
                <Input name="compareAtPrice" type="number" min="0" step="0.01" value={form.compareAtPrice} onChange={(event) => update("compareAtPrice", event.target.value)} />
              </div>
              <div>
                <Label>Sale price (£)</Label>
                <Input name="salePrice" type="number" min="0" step="0.01" value={form.salePrice} onChange={(event) => update("salePrice", event.target.value)} />
              </div>
              <div>
                <Label>Stock</Label>
                <Input name="stockQuantity" type="number" min="0" step="1" required value={form.stockQuantity} onChange={(event) => update("stockQuantity", event.target.value)} />
              </div>
            </div>
          ) : null}

          {step === "variation" ? (
            <div>
              <h2 className="text-[15px] font-semibold">Product variation</h2>
              <p className="mt-1 text-sm text-muted">Optional sizes, colours or packs. Leave empty if this product has one version.</p>
              <div className="mt-5 space-y-3">
                {variants.map((variant, index) => (
                  <div key={index} className="grid gap-3 sm:grid-cols-[1fr_1fr_6rem_auto]">
                    <Input
                      placeholder="Name, e.g. Blush"
                      value={variant.name}
                      onChange={(event) =>
                        setVariants((current) => current.map((row, i) => (i === index ? { ...row, name: event.target.value } : row)))
                      }
                    />
                    <Input
                      placeholder="SKU"
                      value={variant.sku}
                      onChange={(event) =>
                        setVariants((current) => current.map((row, i) => (i === index ? { ...row, sku: event.target.value } : row)))
                      }
                    />
                    <Input
                      type="number"
                      min="0"
                      placeholder="Stock"
                      value={variant.stock}
                      onChange={(event) =>
                        setVariants((current) => current.map((row, i) => (i === index ? { ...row, stock: event.target.value } : row)))
                      }
                    />
                    <button
                      type="button"
                      className="text-sm text-muted hover:text-ink"
                      onClick={() => setVariants((current) => current.filter((_, i) => i !== index))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={() => setVariants((current) => [...current, { name: "", sku: "", stock: "0" }])}
              >
                Add variation
              </Button>
            </div>
          ) : null}

          {step === "shipping" ? (
            <div className="max-w-sm space-y-4">
              <h2 className="text-[15px] font-semibold">Shipping</h2>
              <p className="text-sm text-muted">Checkout still uses Standard, Express or Collection. Weight is optional and helps with quotes.</p>
              <div>
                <Label>Weight (grams)</Label>
                <Input
                  name="weightGrams"
                  type="number"
                  min="0"
                  step="1"
                  value={form.weightGrams}
                  onChange={(event) => update("weightGrams", event.target.value)}
                />
              </div>
            </div>
          ) : null}

          <FieldError message={error ?? undefined} />
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] bg-white px-5 py-4">
        <p className="text-sm text-muted">
          Product completion <span className="font-medium text-ink">{completion}%</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={() => void save(true)}>
            Save as draft
          </Button>
          <Link to="/admin/catalogue" className="inline-flex h-11 items-center px-4 text-sm text-muted hover:text-ink">
            Cancel
          </Link>
          <Button type="submit" variant="primary" disabled={pending || uploading}>
            {pending ? "Saving…" : lastStep ? (editing ? "Save product" : "Add to shop") : "Next"}
          </Button>
        </div>
      </div>
    </form>
  );
}
