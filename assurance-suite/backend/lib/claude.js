// Calls the real Anthropic Messages API. Needs ANTHROPIC_API_KEY set on the
// server (see backend/.env.example) — this is a normal API integration, not
// the special no-key sandbox used inside Claude.ai artifacts.
async function callClaude(system, messages) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set on the server. Add it to backend/.env to enable the evidence assistant.");
  }
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      max_tokens: 1000,
      system,
      messages,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error((data && data.error && data.error.message) || `Claude API request failed (${resp.status})`);
  }
  return (data.content || []).map((c) => c.text || "").join("\n").trim();
}

module.exports = { callClaude };
