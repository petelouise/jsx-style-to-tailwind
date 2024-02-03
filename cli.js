#!/usr/bin/env node

import { jsxStylesToTailwind } from "./jsxStylesToTailwind.js"

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error("Error: Please provide a file path as an argument.")
    process.exit(1)
  }

  const filePath = args[0]
  try {
    const transformedCode = await jsxStylesToTailwind(filePath)
    console.log(transformedCode)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

main()
