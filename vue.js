import prompts from "prompts";
import chalk from "chalk";
import fs from "node:fs/promises";
import { join } from "path";

const isExist = async ($path) => {
  try {
    await fs.stat($path);
    return true;
  } catch {
    return false;
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
  const testPath = join(componentPath, `${name}.test.ts`);
  await fs.writeFile(vuePath, vueContent);
  await fs.writeFile(indexPath, indexContent);
  await fs.writeFile(testPath, testContent);
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

const reBuildIndexFile = async () => {
  const list = await generateList("components", vueChecker);
  const defaultImports = list.filter((item) => item && !item.named);
  const generateImports = defaultImports
    .map((item) => `import ${item.name} from "./${item.path}";\n`)
    .join("");
  const generateExports = `export { ${defaultImports
    .map((item) => item.name)
    .join(", ")} };\n`;
  const contents = generateImports + generateExports;
  await fs.writeFile("src/index.ts", contents);
};
