import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { requireRole } from "@/lib/auth/session";
import { getCart } from "@/lib/data/cart";
import { getStoreSettings } from "@/lib/data/catalog";
import { listOpenSlots } from "@/lib/data/orders";
import { getDictionary } from "@/lib/i18n/server";

export const metadata = { title: "Checkout" };

/** Checkout. An empty cart goes back to the cart page. */
export default async function CheckoutPage() {
  await requireRole(["customer", "staff", "doctor", "owner"], "/checkout");
  const { t, locale } = await getDictionary();
  const [lines, settings, slots] = await Promise.all([getCart(locale), getStoreSettings(), listOpenSlots()]);
  if (lines.length === 0) redirect("/cart");

  return (
    <div className="wrap flex flex-1 flex-col gap-8 py-10 lg:py-14">
      <div className="flex flex-col gap-2">
        <Link href="/cart" className="self-start text-[0.94rem] font-semibold text-action hover:underline">
          ← {t.checkout.editCart}
        </Link>
        <h1 className="text-[2.1rem] font-semibold tracking-tight">{t.checkout.title}</h1>
        <p className="text-lg text-ink/80">{t.checkout.intro}</p>
      </div>
      <CheckoutForm
        lines={lines.map((line) => ({ unitPriceCents: line.priceCents, quantity: line.quantity, taxable: !line.requiresRx }))}
        rates={settings}
        slots={slots}
        deliveryZips={settings.deliveryZips}
        idempotencyKey={randomUUID()}
      />
    </div>
  );
}
