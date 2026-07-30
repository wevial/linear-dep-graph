import assert from "node:assert/strict";
import test from "node:test";
import { renderMarkdown } from "../src/markdown.mjs";

test("renderMarkdown renders common issue description formatting", () => {
  const html = renderMarkdown(`
**Important** and \`inline code\`

- First
- Second

[Linear](https://linear.app)
  `);

  assert.match(html, /<strong>Important<\/strong>/);
  assert.match(html, /<code>inline code<\/code>/);
  assert.match(html, /<ul>[\s\S]*<li>First<\/li>/);
  assert.match(
    html,
    /<a href="https:\/\/linear\.app" target="_blank" rel="noopener noreferrer">Linear<\/a>/,
  );
});

test("renderMarkdown strips unsafe HTML and link protocols", () => {
  const html = renderMarkdown(
    '<script>alert("no")</script>\n\n[unsafe](javascript:alert("no"))',
  );

  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /href=["']javascript:/i);
  assert.match(html, /unsafe/);
});
