import type { Dirent } from 'fs'
import prompts from 'prompts'
import chalk from 'chalk'
import { promises as fs } from 'fs'
import path from 'path'
import { vueContent, indexContent, testContent, metaContent } from './vueString'

const join = (...arg: string[]): string => {
  return path.join(...arg).replace(/\\/g, '/')
}

const isExist = async ($path: string): Promise<boolean> => {
  try {
    await fs.stat($path)
    return true
  } catch {
    return false
  }
}

/**
 *
 * @param {string} path
 */
const ensureDir = async (path: string): Promise<void> => {
  const exist = await isExist(path)
  if (!exist) {
    await fs.mkdir(path, { recursive: true })
  }
}

const createComponent = async (name: string): Promise<void> => {
  //   const indexContent = `import ${name} from "./${name}.vue";

  // export default ${name};
  //   `;

  const cssFileName = `${name.replace('A', '').toLowerCase()}.css`
  const defaultThemeContent = `@import url("../base/${cssFileName}");\n`
  const srcPath = join(process.cwd(), 'src/components')
  const componentPath = join(srcPath, name)
  const srcExist = await isExist(srcPath)
  if (!srcExist) {
    throw new Error('src directory not found in project directory')
  }
  if (await isExist(componentPath)) {
    throw new Error('Component Directory is not empty')
  }

  await fs.mkdir(componentPath)
  const vuePath = join(componentPath, `${name}.vue`)
  const indexPath = join(componentPath, `index.ts`)
  const baseCssPath = join('src/assets/themes/base', cssFileName)
  const defaultThemeCssPath = join('src/assets/themes/default', cssFileName)
  const testPath = join(componentPath, `${name}.test.ts`)
  const metaPath = join(componentPath, `${name}.meta.ts`)
  await fs.writeFile(vuePath, vueContent)
  await fs.writeFile(indexPath, indexContent(name))
  await fs.writeFile(testPath, testContent(name))
  await fs.writeFile(metaPath, metaContent(name))
  await fs.writeFile(baseCssPath, '')
  await fs.writeFile(defaultThemeCssPath, defaultThemeContent)
  const allThemeCSSFileName = 'src/assets/themes/default/all.css'
  const isAllCssExistInTheme = await isExist(allThemeCSSFileName)
  if (!isAllCssExistInTheme) {
    await fs.writeFile(
      allThemeCSSFileName,
      `@import url("./${cssFileName}");\n`
    )
  } else {
    await fs.appendFile(
      allThemeCSSFileName,
      `@import url("./${cssFileName}");\n`
    )
  }
}

const createComposable = async (name: string): Promise<void> => {
  const srcPath = join(process.cwd(), 'src/composables')
  const composablePath = join(srcPath, name)
  const indexPath = join(composablePath, 'index.ts')
  const testPath = join(composablePath, 'index.test.ts')
  const srcExist = await isExist(srcPath)
  if (!srcExist) {
    throw new Error('src directory not found in project directory')
  }
  if (await isExist(composablePath)) {
    throw new Error('Composable alreardy exist')
  }
  await fs.mkdir(composablePath)
  const composableContent = `export const ${name} = () => {}`
  const composableTestContent = `describe("${name}", () => {})`
  await fs.writeFile(indexPath, composableContent)
  await fs.writeFile(testPath, composableTestContent)
}
const createDirective = async (name: string): Promise<void> => {
  const srcPath = join(process.cwd(), 'src/directives')
  const directivePath = join(srcPath, name + '.ts')
  const srcExist = await isExist(srcPath)
  if (!srcExist) {
    throw new Error('src directory not found in project directory')
  }
  if (await isExist(directivePath)) {
    throw new Error('Composable alreardy exist')
  }
  const composableContent = `export const ${name} = () => {}`
  await fs.writeFile(directivePath, composableContent)
}

const askType = async (): Promise<{ value: string }> => {
  return prompts({
    type: 'select',
    name: 'value',
    message: chalk.bold('What do you want to create?'),
    choices: [
      {
        title: chalk.green('Component'),
        value: 'component',
      },
      { title: chalk.green('Composable'), value: 'composable' },
      { title: chalk.green('Directive'), value: 'directive' },
    ],
    initial: 0,
  })
}

const askName = async (type: string): Promise<{ value: string }> => {
  const validateComponentName = (value: string): boolean | string =>
    /^[A-Z]{2}[a-zA-Z]+$/.test(value)
      ? true
      : chalk.red('Invalid component Name')

  const validateComposableName = (value: string): boolean | string =>
    /^use[A-Z][a-zA-Z]+$/.test(value) ? true : 'Invalid composable name'
  const validateDirectiveName = (value: string): boolean | string =>
    /^v[A-Z][a-zA-Z]+$/.test(value) ? true : 'Invalid directive name'
  const validate =
    type === 'component'
      ? validateComponentName
      : type === 'composable'
      ? validateComposableName
      : validateDirectiveName
  return prompts({
    type: 'text',
    name: 'value',
    message: chalk.bold(`Enter ${type} name`),
    validate,
  })
}

export const vueCli = async (): Promise<void> => {
  Promise.allSettled([
    ensureDir('./src/assets/themes/base'),
    ensureDir('./src/assets/themes/default'),
    ensureDir('./src/components'),
    ensureDir('./src/composables'),
    ensureDir('./src/directives'),
  ])
  const type = await askType()
  if (!type.value) {
    return
  }
  const name = await askName(type.value)
  if (!name.value) {
    return
  }
  try {
    switch (type.value) {
      case 'component':
        await createComponent(name.value)
        await reBuildIndexFile()
        console.log(
          chalk.bold(`Vue ${type.value} ${chalk.green(name.value)} created`)
        )
        break
      case 'composable':
        await createComposable(name.value)
        await reBuildIndexFile()
        console.log(
          chalk.bold(`Vue ${type.value} ${chalk.green(name.value)} created`)
        )
        break
      case 'directive':
        await createDirective(name.value)
        await reBuildIndexFile()
        console.log(
          chalk.bold(`Vue ${type.value} ${chalk.green(name.value)} created`)
        )
        break
      default:
        break
    }
  } catch (error) {
    console.error(error)
  }
}

interface Directory {
  name: string
  path: string
  named: boolean
}

const generateList = async (
  directory: string,
  checker: (
    dirent: Dirent
  ) => Promise<false | { fileName: string; named: boolean }>
): Promise<Directory[]> => {
  const list = await fs.readdir(join(process.cwd(), 'src', directory), {
    withFileTypes: true,
  })
  const directories = await Promise.all(
    list.map(async (dirent) => {
      if (dirent.isDirectory()) {
        const result = await checker(dirent)
        if (result) {
          const finalPath = join(directory, dirent.name, result.fileName)
          return { name: dirent.name, path: finalPath, named: !!result.named }
        }
      }
      return false
    })
  )
  return directories as Directory[]
}

const getDirectiveList = async () => {
  const list = await fs.readdir(join(process.cwd(), 'src', 'directives'), {
    withFileTypes: true,
  })
  return list
    .filter(
      (dirent) =>
        dirent.isFile() &&
        dirent.name.endsWith('.ts') &&
        dirent.name.startsWith('v')
    )
    .map((d) => d.name.replace('.ts', ''))
}

const vueChecker = async (
  dirent: Dirent
): Promise<false | { fileName: string; named: boolean }> => {
  const componentName = dirent.name + '.vue'
  const path = join('src/components', dirent.name, componentName)
  const indexPath = join('src/components', dirent.name, 'index.ts')
  const existVue = await isExist(path)
  const existIndex = await isExist(indexPath)
  if (existIndex && existVue) {
    return { fileName: 'index', named: false }
  }
  return false
}

const composableChecker = async (
  dirent: Dirent
): Promise<false | { fileName: string; named: boolean }> => {
  const indexPath = join('src/composables', dirent.name, 'index.ts')
  const existIndex = await isExist(indexPath)
  if (existIndex) {
    return { fileName: 'index', named: true }
  }
  return false
}

const reBuildIndexFile = async (): Promise<void> => {
  const list = await generateList('components', vueChecker)
  const composableList = await generateList('composables', composableChecker)
  const directiveList = await getDirectiveList()
  const defaultImports = list.filter((item) => item && !item.named)
  const generateDefaultImports = defaultImports
    .map((item) => `import ${item.name} from "./${item.path}";\n`)
    .join('')
  const generateNamedExports = composableList
    .map((item) => `export { ${item.name} } from "./${item.path}";\n`)
    .join('')
  const directiveExports = directiveList
    .map(
      (directive) =>
        `export { ${directive} } from "./directives/${directive}";\n`
    )
    .join('')
  const generateExports = `export { ${defaultImports
    .map((item) => item.name)
    .join(', ')} };\n`
  const contents =
    generateDefaultImports +
    generateNamedExports +
    directiveExports +
    generateExports
  await fs.writeFile('src/index.ts', contents)
}
