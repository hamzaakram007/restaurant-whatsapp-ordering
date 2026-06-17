"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";
import type { MenuItem } from "@/lib/types";

export function MenuAdmin() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [form, setForm] = useState({
    id: "",
    categoryId: "coffee",
    name: "",
    description: "",
    priceCents: 0,
    available: true,
    prepMinutes: 10,
  });

  async function loadItems() {
    const response = await fetch("/api/admin/menu");
    const data = (await response.json()) as { items: MenuItem[] };
    setItems(data.items);
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function saveItem(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/menu", {
      method: form.id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        modifiers: [],
        priceCents: Number(form.priceCents),
        prepMinutes: Number(form.prepMinutes),
      }),
    });
    if (!response.ok) {
      alert("Failed to save menu item");
      return;
    }
    setForm({
      id: "",
      categoryId: "coffee",
      name: "",
      description: "",
      priceCents: 0,
      available: true,
      prepMinutes: 10,
    });
    await loadItems();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold text-stone-900">Menu Admin</h1>
      <p className="mb-8 text-stone-600">Add or update menu items for the WhatsApp bot</p>

      <form onSubmit={saveItem} className="mb-10 grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2">
        <input
          className="rounded-lg border px-3 py-2"
          placeholder="Item ID (latte)"
          value={form.id}
          onChange={(event) => setForm({ ...form, id: event.target.value })}
          required
        />
        <select
          className="rounded-lg border px-3 py-2"
          value={form.categoryId}
          onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
        >
          <option value="coffee">Coffee</option>
          <option value="tea">Tea</option>
          <option value="breakfast">Breakfast</option>
          <option value="burgers">Burgers</option>
          <option value="desserts">Desserts</option>
        </select>
        <input
          className="rounded-lg border px-3 py-2"
          placeholder="Name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />
        <input
          className="rounded-lg border px-3 py-2"
          placeholder="Price in cents"
          type="number"
          value={form.priceCents}
          onChange={(event) =>
            setForm({ ...form, priceCents: Number(event.target.value) })
          }
          required
        />
        <textarea
          className="rounded-lg border px-3 py-2 md:col-span-2"
          placeholder="Description"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
        <button
          type="submit"
          className="rounded-lg bg-stone-900 px-4 py-2 font-medium text-white md:col-span-2"
        >
          Save menu item
        </button>
      </form>

      <div className="grid gap-4">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{item.name}</h2>
                <p className="text-sm text-stone-600">{item.description}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatMoney(item.priceCents)}</p>
                <p className="text-xs text-stone-500">{item.available ? "Available" : "Hidden"}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
