#!/usr/bin/env node

import fs from "fs/promises"
import { parse } from "@babel/parser"
import traverse from "@babel/traverse"
import * as t from "@babel/types"
import generate from "@babel/generator"
import { TailwindConverter } from "css-to-tailwindcss"
import postcssNested from "postcss-nested"

// Initialize TailwindConverter with desired configuration
const converter = new TailwindConverter({
  remInPx: 16,
  postCSSPlugins: [postcssNested],
  tailwindConfig: {
    content: [],
    theme: {
      extend: {},
    },
  },
})

const toCSSString = (styles) => {
  return Object.entries(styles).reduce((css, [key, value]) => {
    const cssKey = key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())
    return `${css}${cssKey}: ${value}; `
  }, "")
}

const convertInlineStylesToTailwind = async (styles) => {
  const cssString = toCSSString(styles)
  const { convertedRoot } = await converter.convertCSS(
    `.component { ${cssString} }`,
  )
  return convertedRoot.toString().replace(".component ", "").trim()
}

const convertComponentStylesToTailwind = async (filePath) => {
  const code = await fs.readFile(filePath, "utf8")
  const ast = parse(code, { sourceType: "module", plugins: ["jsx"] })

  const conversionPromises = []

  traverse(ast, {
    JSXAttribute(path) {
      if (
        path.node.name.name === "style" &&
        t.isJSXExpressionContainer(path.node.value)
      ) {
        const styles = path.node.value.expression.properties.reduce(
          (acc, prop) => {
            acc[prop.key.name || prop.key.value] =
              prop.value.value || prop.value.expression.value
            return acc
          },
          {},
        )

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

  // Wait for all conversions to complete
  await Promise.all(conversionPromises)

  const output = generate(ast, {}, code)
  return output.code
}

// CLI handling
if (require.main === module) {
  const filePath = process.argv[2]
  if (!filePath) {
    console.error("Error: Please provide a file path as an argument.")
    process.exit(1)
  }

  convertComponentStylesToTailwind(filePath)
    .then((transformedCode) => {
      console.log(transformedCode)
      // Optionally, write the transformed code to a new file
      // fs.writeFile('outputFilePath.js', transformedCode);
    })
    .catch(console.error)
}

export { convertComponentStylesToTailwind }
