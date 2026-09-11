import { useEffect, useState, type FormEvent } from "react";
import { api, peekApi } from "@/lib/api";
import { Eyebrow, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";

type Settings = {
  businessName: string;
  tagline: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  address: string;
  announcement: string;
  announcementActive: boolean;
  deliveryInfo: string;
  returnsInfo: string;
  aboutText: string;
  instagramUrl: string;
  facebookUrl: string;
  bankDetails: string;
  standardDeliveryFee: number;
  freeDeliveryThreshold: number;
  expressDeliveryFee: number;
};

function pounds(pence: number) {
  return (Number(pence || 0) / 100).toString();
}

function pence(value: FormDataEntryValue | null) {
  return Math.round(Number(value || 0) * 100);
}

export function AdminSettings() {
  const [settings, setSettings] = useState<Settings | null>(() => peekApi<Settings>("/api/admin/settings") ?? null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<Settings>("/api/admin/settings").then(setSettings).catch((err: Error) => setError(err.message));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setSaved(false);
    try {
      const next = await api<Settings>("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          businessName: form.get("businessName"),
          tagline: form.get("tagline"),
          email: form.get("email"),
          phone: form.get("phone"),
          whatsappNumber: form.get("whatsappNumber"),
          address: form.get("address"),
          announcement: form.get("announcement"),
          announcementActive: form.get("announcementActive") === "on",
          aboutText: form.get("aboutText"),
          bankDetails: form.get("bankDetails"),
          deliveryInfo: form.get("deliveryInfo"),
          returnsInfo: form.get("returnsInfo"),
          instagramUrl: form.get("instagramUrl"),
          facebookUrl: form.get("facebookUrl"),
          standardDeliveryFee: pence(form.get("standardDeliveryFee")),
          expressDeliveryFee: pence(form.get("expressDeliveryFee")),
          freeDeliveryThreshold: pence(form.get("freeDeliveryThreshold")),
        }),
      });
      setSettings(next);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    }
  }

  if (!settings && !error) return <p className="text-sm text-muted">Loading house copy…</p>;
  if (!settings) return <p className="text-sm text-danger">{error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Front of house</Eyebrow>
        <h1 className="mt-2 font-display text-4xl">House</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          These lines appear on the banner, contact page, footer, WhatsApp button and checkout delivery math.
        </p>
      </div>

      <form onSubmit={(event) => void onSubmit(event)} className="grid gap-6 lg:grid-cols-2">
        <Panel className="space-y-4">
          <Eyebrow>Banner & voice</Eyebrow>
          <div>
            <Label>Announcement</Label>
            <Input name="announcement" defaultValue={settings.announcement} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="announcementActive" defaultChecked={settings.announcementActive} />
            Show the top bar
          </label>
          <div>
            <Label>Tagline</Label>
            <Input name="tagline" defaultValue={settings.tagline} />
          </div>
          <div>
            <Label>About</Label>
            <Textarea name="aboutText" defaultValue={settings.aboutText} />
          </div>
        </Panel>

        <Panel className="space-y-4">
          <Eyebrow>Reach</Eyebrow>
          <div>
            <Label>Email</Label>
            <Input name="email" type="email" defaultValue={settings.email} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input name="phone" defaultValue={settings.phone} />
          </div>
          <div>
            <Label>WhatsApp number</Label>
            <Input name="whatsappNumber" defaultValue={settings.whatsappNumber} placeholder="447..." />
          </div>
          <div>
            <Label>Address</Label>
            <Textarea name="address" defaultValue={settings.address} />
          </div>
        </Panel>

        <Panel className="space-y-4">
          <Eyebrow>Checkout delivery (GBP)</Eyebrow>
          <div>
            <Label>Standard</Label>
            <Input name="standardDeliveryFee" type="number" step="0.01" defaultValue={pounds(settings.standardDeliveryFee)} />
          </div>
          <div>
            <Label>Express</Label>
            <Input name="expressDeliveryFee" type="number" step="0.01" defaultValue={pounds(settings.expressDeliveryFee)} />
          </div>
          <div>
            <Label>Free over</Label>
            <Input name="freeDeliveryThreshold" type="number" step="0.01" defaultValue={pounds(settings.freeDeliveryThreshold)} />
          </div>
          <div>
            <Label>Delivery note</Label>
            <Textarea name="deliveryInfo" defaultValue={settings.deliveryInfo} />
          </div>
        </Panel>

        <Panel className="space-y-4">
          <Eyebrow>Trade</Eyebrow>
          <div>
            <Label>Business name</Label>
            <Input name="businessName" defaultValue={settings.businessName} />
          </div>
          <div>
            <Label>Bank details</Label>
            <Textarea name="bankDetails" defaultValue={settings.bankDetails} />
          </div>
          <div>
            <Label>Returns</Label>
            <Textarea name="returnsInfo" defaultValue={settings.returnsInfo} />
          </div>
          <div>
            <Label>Instagram</Label>
            <Input name="instagramUrl" defaultValue={settings.instagramUrl} />
          </div>
          <div>
            <Label>Facebook</Label>
            <Input name="facebookUrl" defaultValue={settings.facebookUrl} />
          </div>
        </Panel>

        <div className="lg:col-span-2 flex items-center gap-4">
          <Button type="submit">Save house</Button>
          {saved ? <p className="text-sm text-success">Live on the storefront.</p> : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
      </form>
    </div>
  );
}
