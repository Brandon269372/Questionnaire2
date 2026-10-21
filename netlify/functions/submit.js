// Appends a questionnaire response to the JSONBin bin.
// This file runs on the server, so the key below never reaches the browser.
const BIN_ID = "6ad77719ac6210605a427616";

// Paste your JSONBin X-Master-Key between the quotes below.
// (If the JSONBIN_MASTER_KEY environment variable is set, it is used instead.)
const MASTER_KEY_PLACEHOLDER = "placeholder";
const MASTER_KEY = "$2a$10$SRtHDXaPHaSC9sIXWyi30OtRNlMwwBeWVZv7eeI/wksO/phUb29FO";
const BIN_URL = "https://api.jsonbin.io/v3/b/" + BIN_ID;

export default async (req: Request) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const pasted = MASTER_KEY.trim();
  const key =
    Netlify.env.get("JSONBIN_MASTER_KEY") ||
    (pasted && pasted !== MASTER_KEY_PLACEHOLDER ? pasted : "");
  if (!key) {
    return Response.json({ error: "JSONBin master key is not configured" }, { status: 500 });
  }

  let entry: unknown;
  try {
    entry = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return Response.json({ error: "Invalid submission" }, { status: 400 });
  }

  const headers = { "X-Master-Key": key, "Content-Type": "application/json" };

  // JSONBin replaces the whole bin on update, so read the current
  // record first and append the new response to its submissions list.
  const current = await fetch(BIN_URL + "/latest", {
    headers: { ...headers, "X-Bin-Meta": "false" }
  });
  if (!current.ok) {
    return Response.json({ error: "JSONBin read failed (" + current.status + ")" }, { status: 502 });
  }
  const record = await current.json().catch(() => ({}));
  const base = record && typeof record === "object" && !Array.isArray(record) ? record : {};
  const submissions = Array.isArray(base.submissions) ? base.submissions : [];
  submissions.push({ ...entry, receivedAt: new Date().toISOString() });

  const update = await fetch(BIN_URL, {
    method: "PUT",
    headers,
    body: JSON.stringify({ ...base, submissions })
  });
  if (!update.ok) {
    return Response.json({ error: "JSONBin write failed (" + update.status + ")" }, { status: 502 });
  }

  return Response.json({ ok: true, count: submissions.length });
};
