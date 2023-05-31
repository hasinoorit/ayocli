import prompts from "prompts";
import chalk from "chalk";
import fs from "node:fs/promises";
import _path from "path";

const join = (...arg) => {
  return _path.join(...arg).replace(/\\/g, "/");
};

const isExist = async ($path) => {
  try {
    await fs.stat($path);
    return true;
  } catch {
    return false;
  }
};

/**
 *
 * @param {string} path
 */
const ensureDir = async (path) => {
  const exist = await isExist(path);
  if (!exist) {
    await fs.mkdir(path, { recursive: true });
  }
};

const createComponent = async (name) => {
  const vueContent = `<script lang="ts" setup>
const props = defineProps({});
const emit = defineEmits([]);
</script>
<template></template>
`;
  const indexContent = `import ${name} from "./${name}.vue";

export default ${name};
  `;
  const testContent = `import { mount } from "@vue/test-utils";
import ${name} from "./${name}.vue";

describe("${name}.vue", () => {
  it("Should render", () => {
    const wrapper = mount(${name}, {});
    expect(wrapper.text()).toContain("");
  });
  it("Should be interactive", async () => {
    const wrapper = mount(${name}, {});
    await wrapper.setProps({});
    expect(wrapper.text()).toContain("");
  });
});
`;
  const cssFileName = `${name.replace("A", "").toLowerCase()}.css`;
  const defaultThemeContent = `@import url("../base/${cssFileName}");\n`;
  const srcPath = join(process.cwd(), "src/components");
  const componentPath = join(srcPath, name);
  const srcExist = await isExist(srcPath);
  if (!srcExist) {
    throw new Error("src directory not found in project directory");
  }
  if (await isExist(componentPath)) {
    throw new Error("Component Directory is not empty");
  }

  await fs.mkdir(componentPath);
  const vuePath = join(componentPath, `${name}.vue`);
  const indexPath = join(componentPath, `index.ts`);
  const baseCssPath = join("src/assets/themes/base", cssFileName);
  const defaultThemeCssPath = join("src/assets/themes/default", cssFileName);
  const testPath = join(componentPath, `${name}.test.ts`);
  await fs.writeFile(vuePath, vueContent);
  await fs.writeFile(indexPath, indexContent);
  await fs.writeFile(testPath, testContent);
  await fs.writeFile(baseCssPath, "");
  await fs.writeFile(defaultThemeCssPath, defaultThemeContent);
  const allThemeCSSFileName = "src/assets/themes/default/all.css";
  const isAllCssExistInTheme = await isExist(allThemeCSSFileName);
  if (!isAllCssExistInTheme) {
    await fs.writeFile(
      allThemeCSSFileName,
      `@import url("./${cssFileName}");\n`
    );
  } else {
    await fs.appendFile(
      allThemeCSSFileName,
      `@import url("./${cssFileName}");\n`
    );
  }
};

const createComposable = async (name) => {
  const srcPath = join(process.cwd(), "src/composables");
  const composablePath = join(srcPath, name);
  const indexPath = join(composablePath, "index.ts");
  const testPath = join(composablePath, "index.test.ts");
  const srcExist = await isExist(srcPath);
  if (!srcExist) {
    throw new Error("src directory not found in project directory");
  }
  if (await isExist(composablePath)) {
    throw new Error("Composable alreardy exist");
  }
  await fs.mkdir(composablePath);
  const composableContent = `export const ${name} = () => {}`;
  const composableTestContent = `describe("${name}", () => {})`;
  await fs.writeFile(indexPath, composableContent);
  await fs.writeFile(testPath, composableTestContent);
};

const askType = async () => {
  return prompts({
    type: "select",
    name: "value",
    message: chalk.bold("What do you want to create?"),
    choices: [
      {
        title: chalk.green("Component"),
        value: "component",
      },
      { title: chalk.green("Composable"), value: "composable" },
    ],
    initial: 0,
  });
};

const askName = (type) => {
  const validateComponentName = (value) =>
    /^[A-Z]{2}[a-zA-Z]+$/.test(value)
      ? true
      : chalk.red("Invalid component Name");

  const validateComposableName = (value) =>
    /^use[A-Z][a-zA-Z]+$/.test(value) ? true : "Invalid composable name";
  const validate =
    type === "component" ? validateComponentName : validateComposableName;
  return prompts({
    type: "text",
    name: "value",
    message: chalk.bold(`Enter ${type} name`),
    validate,
  });
};
// validate: value => value < 18 ? `Nightclub is 18+ only` : true

export const vueCli = async () => {
  await ensureDir("./src/assets/themes/base");
  await ensureDir("./src/assets/themes/default");
  await ensureDir("./src/components");
  await ensureDir("./src/composables");
  const type = await askType();
  if (!type.value) {
    return;
  }
  const name = await askName(type.value);
  if (!name.value) {
    return;
  }
  try {
    switch (type.value) {
      case "component":
        await createComponent(name.value);
        await reBuildIndexFile();
        console.log(
          chalk.bold(`Vue ${type.value} ${chalk.green(name.value)} created`)
        );
        break;
      case "composable":
        await createComposable(name.value);
        await reBuildIndexFile();
        console.log(
          chalk.bold(`Vue ${type.value} ${chalk.green(name.value)} created`)
        );
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(error);
  }
};

const generateList = async (directory, checker) => {
  const list = await fs.readdir(join(process.cwd(), "src", directory), {
    withFileTypes: true,
  });
  const directories = await Promise.all(
    list.map(async (dirent) => {
      if (dirent.isDirectory()) {
        const result = await checker(dirent);
        if (result) {
          const finalPath = join(directory, dirent.name, result.fileName);
          return { name: dirent.name, path: finalPath, named: !!result.named };
        }
      }
      return false;
    })
  );
  return directories;
};

const vueChecker = async (dirent) => {
  const componentName = dirent.name + ".vue";
  const path = join("src/components", dirent.name, componentName);
  const indexPath = join("src/components", dirent.name, "index.ts");
  const existVue = await isExist(path);
  const existIndex = await isExist(indexPath);
  if (existIndex && existVue) {
    return { fileName: "index", named: false };
  }
  return false;
};

const composableChecker = async (dirent) => {
  const indexPath = join("src/composables", dirent.name, "index.ts");
  const existIndex = await isExist(indexPath);
  if (existIndex) {
    return { fileName: "index", named: true };
  }
  return false;
};

const reBuildIndexFile = async () => {
  const list = await generateList("components", vueChecker);
  const composableList = await generateList("composables", composableChecker);
  const defaultImports = list.filter((item) => item && !item.named);
  const generateDefaultImports = defaultImports
    .map((item) => `import ${item.name} from "./${item.path}";\n`)
    .join("");
  const generateNamedExports = composableList
    .map((item) => `export { ${item.name} } from "./${item.path}";\n`)
    .join("");
  const generateExports = `export { ${defaultImports
    .map((item) => item.name)
    .join(", ")} };\n`;
  const contents =
    generateDefaultImports + generateNamedExports + generateExports;
  await fs.writeFile("src/index.ts", contents);
};
