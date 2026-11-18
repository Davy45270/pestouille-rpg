// Boutique : transaction atomique ; en cas de refus, rien ne change.
export interface Purse { gold: number; items: Record<string, number> }
export interface ShopItem { id: string; price: number; stackMax: number }
export type BuyResult = { ok: true; inv: Purse } | { ok: false; reason: 'no_gold' | 'stack_full' | 'bad_quantity' };

export function buy(inv: Purse, item: ShopItem, qty: number): BuyResult {
    if (!Number.isInteger(qty) || qty <= 0) return { ok: false, reason: 'bad_quantity' };
    const cost = item.price * qty;
    if (cost > inv.gold) return { ok: false, reason: 'no_gold' };
    const owned = inv.items[item.id] ?? 0;
    if (owned + qty > item.stackMax) return { ok: false, reason: 'stack_full' };
    return { ok: true, inv: { gold: inv.gold - cost, items: { ...inv.items, [item.id]: owned + qty } } };
}
