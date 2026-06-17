import type { MenuItem, MenuOptionGroup, SelectedOption } from "@/lib/types";
import { formatMoney } from "@/lib/format";

export function buildLineKey(menuItemId: string, selectedOptions: SelectedOption[]) {
  const choiceIds = [...selectedOptions.map((option) => option.choiceId)].sort().join(":");
  return choiceIds ? `${menuItemId}:${choiceIds}` : menuItemId;
}

export function computeUnitPrice(baseCents: number, selectedOptions: SelectedOption[]) {
  return baseCents + selectedOptions.reduce((sum, option) => sum + option.priceDeltaCents, 0);
}

export function formatCartLineName(baseName: string, selectedOptions: SelectedOption[]) {
  if (selectedOptions.length === 0) return baseName;
  const labels = selectedOptions.map((option) => option.label).join(", ");
  return `${baseName} (${labels})`;
}

export function getPromptableGroups(item: MenuItem): MenuOptionGroup[] {
  return item.optionGroups.filter((group) => group.choices.length > 0);
}

export function formatOptionGroupPrompt(group: MenuOptionGroup, itemName: string) {
  const lines = group.choices.map((choice, index) => {
    const delta =
      choice.priceDeltaCents > 0
        ? ` (+${formatMoney(choice.priceDeltaCents)})`
        : choice.priceDeltaCents < 0
          ? ` (${formatMoney(choice.priceDeltaCents)})`
          : "";
    return `${index + 1}. ${choice.label}${delta}`;
  });

  const skipHint = group.required ? "" : "\nReply skip to skip this option.";

  return [
    `Choose ${group.name.toLowerCase()} for ${itemName}:`,
    ...lines,
    skipHint,
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatChoiceDelta(priceDeltaCents: number) {
  if (priceDeltaCents === 0) return "";
  const prefix = priceDeltaCents > 0 ? "+" : "";
  return ` (${prefix}${formatMoney(priceDeltaCents)})`;
}
