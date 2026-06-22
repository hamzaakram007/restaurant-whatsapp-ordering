export function formatMoney(cents: number, currency = "PKR") {
  const amount = cents / 100;
  return `${currency} ${amount.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatOrderNumber(orderNumber: number) {
  return `#${String(orderNumber).padStart(4, "0")}`;
}
