#!/usr/bin/env node

const fs = require("fs")
const { parse } = require("@babel/parser")
const traverse = require("@babel/traverse").default
const t = require("@babel/types")
const generate = require("@babel/generator").default
const { CssToTailwind } = require("css2tailwind")

// Utility function to convert style object to CSS string
const toCSSString = (styles) => {
  return Object.entries(styles).reduce((css, [key, value]) => {
    const cssKey = key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())
    return `${css}${cssKey}: ${value}; `
  }, "")
}

// Converts CSS to Tailwind classes using css2tailwind
const convertCSSToTailwind = (cssString) => {
  const conversionResult = CssToTailwind(cssString)
  return conversionResult.data.map(({ resultVal }) => resultVal).join(" ")
}

// Main function to convert inline styles to Tailwind classes in a React component
const convertComponentStylesToTailwind = async (filePath) => {
  const code = fs.readFileSync(filePath, "utf8")
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx"],
  })

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

        const cssString = toCSSString(styles)
        const tailwindClasses = convertCSSToTailwind(
          `.component {${cssString}}`,
        )

        path.replaceWith(
          t.jsxAttribute(
            t.jsxIdentifier("className"),
            t.stringLiteral(tailwindClasses),
          ),
        )
      }
    },
  })

  const { code: transformedCode } = generate(ast)

  return transformedCode
}

function handleCliInput() {
  const filePath = process.argv[2]
  if (!filePath) {
    console.error("Error: Please provide a file path as an argument.")
    process.exit(1)
  }
  output = convertComponentStylesToTailwind(filePath)
  console.log(output)
}

if (require.main === module) {
  handleCliInput()
}

module.exports = { convertComponentStylesToTailwind }
