import fs from "fs/promises"
import { parse } from "@babel/parser"
import _traverse from "@babel/traverse"
const traverse = _traverse.default

import * as t from "@babel/types"
import _generate from "@babel/generator"
const generate = _generate.default

import { TailwindConverter } from "css-to-tailwind"

const converter = new TailwindConverter({})

const toCSSString = (styles) => {
  return Object.entries(styles).reduce((css, [key, value]) => {
    const cssKey = key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())
    return `${css}${cssKey}: ${value}; `
  }, "")
}

const convertInlineStylesToTailwind = async (styles) => {
  const cssString = toCSSString(styles)
  const { nodes } = await converter.convertCSS(`.component { ${cssString} }`, {
    from: undefined,
  })

  const classNames = nodes.flatMap((node) => node.tailwindClasses).join(" ")
  return classNames
}

const jsxStylesToTailwind = async (filePath) => {
  const code = await fs.readFile(filePath, "utf8")
  const ast = parse(code, { sourceType: "module", plugins: ["jsx"] })

  let conversionPromises = []

  traverse(ast, {
    JSXAttribute(path) {
      if (
        path.node.name.name === "style" &&
        t.isJSXExpressionContainer(path.node.value)
      ) {
        // Extracting the style object
        const styles = path.node.value.expression.properties.reduce(
          (acc, prop) => {
            acc[prop.key.name || prop.key.value] =
              prop.value.value || prop.value.expression.value
            return acc
          },
          {},
        )

        // Create a promise for each conversion and replace JSXAttribute upon resolution
        const promise = convertInlineStylesToTailwind(styles).then(
          (tailwindClasses) => {
            path.replaceWith(
              t.jsxAttribute(
                t.jsxIdentifier("className"),
                t.stringLiteral(tailwindClasses),
              ),
            )
          },
        )

        conversionPromises.push(promise)
      }
    },
  })

  // Await all promises for conversion
  await Promise.all(conversionPromises)

  const { code: transformedCode } = generate(ast, {}, code)
  return transformedCode
}

export { jsxStylesToTailwind }
