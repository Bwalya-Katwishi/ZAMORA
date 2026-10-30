import fs from "node:fs";

const html = fs.readFileSync(process.argv[2], "utf8");
const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
const interesting = hrefs.filter((href) => /judgment|akn|hansard|gazett|legislation/i.test(href));
console.log(interesting.slice(0, 60).join("\n"));
console.log("count", interesting.length);
