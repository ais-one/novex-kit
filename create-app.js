import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname);
const APPS_DIR = path.join(ROOT_DIR, "apps");

const templates = {
  "vision-rest-app": "vision-rest-app-sample",
  "vision-queue-consumer": "vision-queue-consumer-sample",
};

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function copyDirectory(source, destination) {
  fs.cpSync(source, destination, {
    recursive: true,
  });
}

function updatePackageJson(appDir, appName) {
  const packageJsonPath = path.join(appDir, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    return;
  }

  const packageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, "utf8")
  );

  packageJson.name = appName;

  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + "\n"
  );
}

async function main() {
  console.log("\n🚀 Create new app\n");

  const templateNames = Object.keys(templates);

  console.log("Available templates:\n");

  templateNames.forEach((name, index) => {
    console.log(`  ${index + 1}. ${name}`);
  });

  console.log("");

  const templateInput = await ask(
    `Choose template [1-${templateNames.length}]: `
  );

  const templateIndex = Number(templateInput) - 1;

  if (
    !Number.isInteger(templateIndex) ||
    templateIndex < 0 ||
    templateIndex >= templateNames.length
  ) {
    console.error("\n❌ Invalid template.\n");
    process.exit(1);
  }

  const templateName = templateNames[templateIndex];
  const templateDirName = templates[templateName];

  const appName = await ask("\nApp name: ");

  if (!appName) {
    console.error("\n❌ App name is required.\n");
    process.exit(1);
  }

  if (!/^[a-z0-9][a-z0-9-]*$/.test(appName)) {
    console.error(
      "\n❌ Invalid app name. Use lowercase letters, numbers, and hyphens only.\n"
    );
    process.exit(1);
  }

  const sourceDir = path.join(APPS_DIR, templateDirName);
  const targetDir = path.join(APPS_DIR, appName);

  if (!fs.existsSync(sourceDir)) {
    console.error(`\n❌ Template not found: ${sourceDir}\n`);
    process.exit(1);
  }

  if (fs.existsSync(targetDir)) {
    console.error(`\n❌ App already exists: apps/${appName}\n`);
    process.exit(1);
  }

  fs.mkdirSync(APPS_DIR, { recursive: true });

  console.log(`\n📦 Using template: ${templateName}`);
  console.log(`📁 Creating: apps/${appName}\n`);

  copyDirectory(sourceDir, targetDir);

  console.log("✔ Template copied");

  updatePackageJson(targetDir, appName);

  console.log("✔ package.json updated");

  console.log(`
✨ Done!

Created:
  apps/${appName}

Run:
  npm run dev --workspace apps/${appName}
`);
}

main().catch((error) => {
  console.error("\n❌ Failed to create app:");
  console.error(error);
  process.exit(1);
});
