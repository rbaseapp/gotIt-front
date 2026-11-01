// Writes Brotli (.br) and gzip (.gz) copies of the built text assets, at the highest levels, so
// the gateway (server/gateway.mjs) can send them without compressing on every request.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { brotliCompress, constants, gzip } from "node:zlib";

const brotli = promisify(brotliCompress);
const gzipAsync = promisify(gzip);
const dist = resolve(process.argv[2] ?? "dist");
const textTypes = new Set([".js", ".css", ".html", ".json", ".svg"]);

async function* files(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else yield path;
  }
}

let before = 0;
let after = 0;
const jobs = [];
for await (const path of files(dist)) {
  if (!textTypes.has(extname(path))) continue;
  jobs.push(
    (async () => {
      const body = await readFile(path);
      if (body.length < 1024) return;
      const [br, gz] = await Promise.all([
        brotli(body, {
          params: {
            [constants.BROTLI_PARAM_QUALITY]: 11,
            [constants.BROTLI_PARAM_SIZE_HINT]: body.length,
          },
        }),
        gzipAsync(body, { level: 9 }),
      ]);
      await Promise.all([writeFile(`${path}.br`, br), writeFile(`${path}.gz`, gz)]);
      before += body.length;
      after += br.length;
    })(),
  );
}
await Promise.all(jobs);
console.log(
  `precompressed ${jobs.length} files: ${(before / 1024).toFixed(0)} kB -> ${(after / 1024).toFixed(0)} kB (brotli)`,
);
