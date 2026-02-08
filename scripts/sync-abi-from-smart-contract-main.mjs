import fs from "node:fs";
import path from "node:path";

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function extractAbi(value, filePath) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && Array.isArray(value.abi))
    return value.abi;
  throw new Error(`Unable to extract ABI from ${filePath}`);
}

function writeAbiArray(filePath, abi) {
  fs.writeFileSync(filePath, `${JSON.stringify(abi, null, 2)}\n`, "utf8");
}

const root = process.cwd();
const sourceDir = path.join(root, "Smart-Contract-main");
const outDir = path.join(root, "src", "contracts", "abi");

const moaiAbi = extractAbi(
  readJson(path.join(sourceDir, "Moai.json")),
  "Smart-Contract-main/Moai.json",
);
const moaiFactoryAbi = extractAbi(
  readJson(path.join(sourceDir, "MoaiFactory.json")),
  "Smart-Contract-main/MoaiFactory.json",
);

writeAbiArray(path.join(outDir, "Moai.json"), moaiAbi);
writeAbiArray(path.join(outDir, "MoaiFactory.json"), moaiFactoryAbi);

console.log(
  "Synced ABI arrays to src/contracts/abi/* from Smart-Contract-main.",
);
