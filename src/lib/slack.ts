export async function postSlackMessage(params: { channel: string; text: string }) {
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
