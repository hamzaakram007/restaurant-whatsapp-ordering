"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";
import type { MenuCategory, MenuItem, MenuOptionChoice, MenuOptionGroup } from "@/lib/types";

const emptyForm = (): MenuItem => ({
  id: "",
  categoryId: "coffee",
  name: "",
  description: "",
  priceCents: 0,
  available: true,
  prepMinutes: 10,
  optionGroups: [],
});

function emptyGroup(): MenuOptionGroup {
  return {
    id: `group-${Date.now()}`,
    name: "Size",
    required: true,
    choices: [
      { id: "small", label: "Small", priceDeltaCents: 0 },
      { id: "medium", label: "Medium", priceDeltaCents: 3000 },
      { id: "large", label: "Large", priceDeltaCents: 6000 },
    ],
  };
}

export function MenuAdmin() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [form, setForm] = useState<MenuItem>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);

  async function loadItems() {
    const response = await fetch("/api/admin/menu");
    const data = (await response.json()) as {
      items: MenuItem[];
      categories: MenuCategory[];
    };
    setItems(data.items);
    setCategories(data.categories);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadItems();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  function startNew() {
    setEditingId(null);
    setForm(emptyForm());
  }

  function startEdit(item: MenuItem) {
    setEditingId(item.id);
    setForm({
      ...item,
      optionGroups: item.optionGroups.map((group) => ({
        ...group,
        choices: group.choices.map((choice) => ({ ...choice })),
      })),
    });
  }

  function updateGroup(index: number, patch: Partial<MenuOptionGroup>) {
    setForm((current) => ({
      ...current,
      optionGroups: current.optionGroups.map((group, groupIndex) =>
        groupIndex === index ? { ...group, ...patch } : group,
      ),
    }));
  }

  function updateChoice(groupIndex: number, choiceIndex: number, patch: Partial<MenuOptionChoice>) {
    setForm((current) => ({
      ...current,
      optionGroups: current.optionGroups.map((group, index) =>
        index === groupIndex
          ? {
              ...group,
              choices: group.choices.map((choice, currentChoiceIndex) =>
                currentChoiceIndex === choiceIndex ? { ...choice, ...patch } : choice,
              ),
            }
          : group,
      ),
    }));
  }

  function addGroup() {
    setForm((current) => ({
      ...current,
      optionGroups: [...current.optionGroups, emptyGroup()],
    }));
  }

  function removeGroup(index: number) {
    setForm((current) => ({
      ...current,
      optionGroups: current.optionGroups.filter((_, groupIndex) => groupIndex !== index),
    }));
  }

  function addChoice(groupIndex: number) {
    setForm((current) => ({
      ...current,
      optionGroups: current.optionGroups.map((group, index) =>
        index === groupIndex
          ? {
              ...group,
              choices: [
                ...group.choices,
                {
                  id: `choice-${Date.now()}`,
                  label: "New choice",
                  priceDeltaCents: 0,
                },
              ],
            }
          : group,
      ),
    }));
  }

  function removeChoice(groupIndex: number, choiceIndex: number) {
    setForm((current) => ({
      ...current,
      optionGroups: current.optionGroups.map((group, index) =>
        index === groupIndex
          ? {
              ...group,
              choices: group.choices.filter((_, currentChoiceIndex) => currentChoiceIndex !== choiceIndex),
            }
          : group,
      ),
    }));
  }

  async function saveItem(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/menu", {
      method: editingId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        priceCents: Number(form.priceCents),
        prepMinutes: Number(form.prepMinutes),
      }),
    });
    if (!response.ok) {
      alert("Failed to save menu item");
      return;
    }
    startNew();
    await loadItems();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-stone-900">Menu Admin</h1>
          <p className="text-stone-600">
            Manage items, sizes, and add-ons for the WhatsApp bot
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700"
        >
          New item
        </button>
      </div>

      <form onSubmit={saveItem} className="mb-10 space-y-6 rounded-2xl border bg-white p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <input
            className="rounded-lg border px-3 py-2"
            placeholder="Item ID (latte)"
            value={form.id}
            onChange={(event) => setForm({ ...form, id: event.target.value })}
            required
            disabled={Boolean(editingId)}
          />
          <select
            className="rounded-lg border px-3 py-2"
            value={form.categoryId}
            onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            className="rounded-lg border px-3 py-2 md:col-span-2"
            placeholder="Item name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
          <textarea
            className="rounded-lg border px-3 py-2 md:col-span-2"
            placeholder="Description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            rows={2}
          />
          <label className="block">
            <span className="mb-1 block text-sm text-stone-600">Base price (PKR cents)</span>
            <input
              className="w-full rounded-lg border px-3 py-2"
              type="number"
              value={form.priceCents}
              onChange={(event) =>
                setForm({ ...form, priceCents: Number(event.target.value) })
              }
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-stone-600">Prep minutes</span>
            <input
              className="w-full rounded-lg border px-3 py-2"
              type="number"
              value={form.prepMinutes}
              onChange={(event) =>
                setForm({ ...form, prepMinutes: Number(event.target.value) })
              }
              required
            />
          </label>
          <label className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(event) => setForm({ ...form, available: event.target.checked })}
            />
            <span className="text-sm text-stone-700">Available on menu</span>
          </label>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-stone-900">Option groups</h2>
            <button
              type="button"
              onClick={addGroup}
              className="rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-900"
            >
              Add group
            </button>
          </div>

          {form.optionGroups.length === 0 ? (
            <p className="text-sm text-stone-500">
              No option groups yet. Add Size (Small/Medium/Large) or extras like Oat milk.
            </p>
          ) : (
            form.optionGroups.map((group, groupIndex) => (
              <div key={group.id} className="rounded-xl border border-stone-200 p-4">
                <div className="mb-3 grid gap-3 md:grid-cols-3">
                  <input
                    className="rounded-lg border px-3 py-2"
                    placeholder="Group ID"
                    value={group.id}
                    onChange={(event) =>
                      updateGroup(groupIndex, { id: event.target.value })
                    }
                  />
                  <input
                    className="rounded-lg border px-3 py-2"
                    placeholder="Group name (Size)"
                    value={group.name}
                    onChange={(event) =>
                      updateGroup(groupIndex, { name: event.target.value })
                    }
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={group.required}
                      onChange={(event) =>
                        updateGroup(groupIndex, { required: event.target.checked })
                      }
                    />
                    <span className="text-sm">Required</span>
                  </label>
                </div>

                <div className="space-y-2">
                  {group.choices.map((choice, choiceIndex) => (
                    <div key={choice.id} className="grid gap-2 md:grid-cols-4">
                      <input
                        className="rounded-lg border px-3 py-2"
                        placeholder="Choice ID"
                        value={choice.id}
                        onChange={(event) =>
                          updateChoice(groupIndex, choiceIndex, { id: event.target.value })
                        }
                      />
                      <input
                        className="rounded-lg border px-3 py-2 md:col-span-2"
                        placeholder="Label"
                        value={choice.label}
                        onChange={(event) =>
                          updateChoice(groupIndex, choiceIndex, { label: event.target.value })
                        }
                      />
                      <div className="flex gap-2">
                        <input
                          className="w-full rounded-lg border px-3 py-2"
                          type="number"
                          placeholder="Price +cents"
                          value={choice.priceDeltaCents}
                          onChange={(event) =>
                            updateChoice(groupIndex, choiceIndex, {
                              priceDeltaCents: Number(event.target.value),
                            })
                          }
                        />
                        <button
                          type="button"
                          onClick={() => removeChoice(groupIndex, choiceIndex)}
                          className="rounded-lg border px-3 py-2 text-sm text-red-600"
                        >
                          x
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => addChoice(groupIndex)}
                    className="rounded-lg border px-3 py-1.5 text-sm"
                  >
                    Add choice
                  </button>
                  <button
                    type="button"
                    onClick={() => removeGroup(groupIndex)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700"
                  >
                    Remove group
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          type="submit"
          className="rounded-lg bg-stone-900 px-4 py-2 font-medium text-white"
        >
          {editingId ? "Update item" : "Create item"}
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-stone-900">Current menu</h2>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => startEdit(item)}
            className="w-full rounded-xl border border-stone-200 bg-white p-4 text-left transition hover:border-amber-300"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-stone-900">{item.name}</h3>
                  {!item.available ? (
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                      Hidden
                    </span>
                  ) : null}
                  {item.optionGroups.length > 0 ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                      {item.optionGroups.length} option group{item.optionGroups.length === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-stone-500">{item.description}</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-medium text-stone-900">
                  Base {formatMoney(item.priceCents)}
                </p>
                <p className="text-stone-500">{item.prepMinutes} min prep</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
