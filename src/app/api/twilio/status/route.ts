export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const messageSid = String(formData.get("MessageSid") ?? "");
  const status = String(formData.get("MessageStatus") ?? "");
  const errorCode = formData.get("ErrorCode");

  console.info("Twilio status callback", {
    messageSid,
    status,
    errorCode,
  });

  return new Response(null, { status: 204 });
}
