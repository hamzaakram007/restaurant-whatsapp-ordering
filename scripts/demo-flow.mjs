const baseUrl = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const phone = process.env.DEMO_PHONE ?? "whatsapp:+15550001111";

async function simulate(body, mediaUrl) {
  const response = await fetch(`${baseUrl}/api/simulate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone, body, mediaUrl }),
  });
  const data = await response.json();
  const reply = (data.messages ?? []).map((message) => message.body).join("\n\n");
  console.log(`\n> ${body || "[payment screenshot]"}`);
  console.log(reply.slice(0, 500) + (reply.length > 500 ? "..." : ""));
  return data;
}

const steps = [
  { body: "menu" },
  { body: "1" },
  { body: "1x2" },
  { body: "3" },
  { body: "checkout" },
  { body: "1" },
  { body: "House 22, Liberty Market, Lahore" },
  { body: "yes" },
  {
    body: "",
    mediaUrl: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80",
  },
  { body: "track" },
];

console.log(`Running restaurant demo flow against ${baseUrl} as ${phone}`);

for (const step of steps) {
  await simulate(step.body, step.mediaUrl);
}

const orders = await fetch(`${baseUrl}/api/orders`).then((response) => response.json());
console.log("\nOrders:", orders.orders?.length ?? 0);
for (const order of orders.orders ?? []) {
  console.log(
    `- #${order.orderNumber} ${order.customerName ?? order.customerPhone} [${order.status}]`,
  );
}
