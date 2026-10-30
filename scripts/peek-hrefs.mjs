import fs from "node:fs";

const html = fs.readFileSync(process.argv[2], "utf8");
const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
const unique = [...new Set(hrefs)];
for (const href of unique) {
  if (/node|hansard|debate|publication|bill|act/i.test(href)) console.log(href);
}
