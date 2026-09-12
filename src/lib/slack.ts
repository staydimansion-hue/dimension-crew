import crypto from "crypto";

export async function postSlackMessage(params: {
  channel: string;
  text: string;
  blocks?: unknown[];
}) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    throw new Error("SLACK_BOT_TOKEN 환경변수가 설정되지 않았습니다.");
  }

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error(`슬랙 메시지 전송 실패: ${data.error}`);
  }
  return data;
}

export function verifySlackSignature(params: {
  signingSecret: string;
  timestamp: string;
  signature: string;
  rawBody: string;
}): boolean {
  const { signingSecret, timestamp, signature, rawBody } = params;
  if (!timestamp || !signature) return false;

  const fiveMinutes = 60 * 5;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > fiveMinutes) return false;

  const base = `v0:${timestamp}:${rawBody}`;
  const hmac = crypto.createHmac("sha256", signingSecret).update(base).digest("hex");
  const expected = `v0=${hmac}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
