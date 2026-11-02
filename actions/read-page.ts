import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|br|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

const DATE_RE =
  /\b(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.? \d{1,2}(?:st|nd|rd|th)?,? \d{4}(?:[^.\n]{0,40}?\b\d{1,2}(?::\d{2})? ?(?:AM|PM|am|pm)(?: ?(?:PT|PST|PDT|ET|EST|EDT|UTC|GMT|IST|CET))?)?|\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}[^\s]*)?)/g;
const MONEY_RE = /(?:US)?\$ ?\d[\d,]*(?:\.\d+)?(?: ?[kKmM]\b)?|\b\d[\d,]* ?USD\b/g;

export default defineAction({
  description:
    "Fetch a public web page (hackathon listing, rules, bounty page) and return its title, readable text, and the dates and money amounts it mentions, so you can extract deadline, prize, and requirements. Read-only; it never submits anything.",
  schema: z.object({
    url: z.string().url().describe("Public http(s) URL to read"),
    maxChars: z.coerce.number().int().min(1000).max(40000).default(16000).describe("Max characters of text to return"),
  }),
  http: { method: "GET" },
  readOnly: true,
  run: async ({ url, maxChars }) => {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) fail("Only http(s) URLs.", { errorCode: "bad_url" });
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(u.hostname) || u.hostname.endsWith(".internal"))
      fail("Private addresses are not allowed.", { errorCode: "bad_url", statusCode: 403 });
    const res = await fetch(url, {
      headers: { "user-agent": "HackHunt/0.1 (+https://github.com/abidhussain19932-stack/hackhunt)" },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    }).catch((e) => fail(`Could not fetch page: ${String(e?.message ?? e)}`, { errorCode: "fetch_failed", statusCode: 502 }));
    if (!res.ok) fail(`Page answered HTTP ${res.status}.`, { errorCode: "fetch_failed", statusCode: 502 });
    const raw = (await res.text()).slice(0, 2_000_000);
    const title = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? null;
    const description =
      raw.match(/<meta[^>]+(?:name|property)=["'](?:og:)?description["'][^>]+content=["']([^"']*)/i)?.[1] ?? null;
    const text = /<html|<body|<div/i.test(raw) ? stripHtml(raw) : raw;
    return {
      url: res.url,
      title,
      description,
      datesMentioned: [...new Set(text.match(DATE_RE) ?? [])].slice(0, 25),
      amountsMentioned: [...new Set(text.match(MONEY_RE) ?? [])].slice(0, 25),
      text: text.slice(0, maxChars),
      truncated: text.length > maxChars,
    };
  },
});
