#!/usr/bin/env node

import { jsxStylesToTailwind } from "./jsxStylesToTailwind.js"

const filePath = "/Users/petelouise/code/online/app/components/Author.jsx"

try {
  const transformedCode = await jsxStylesToTailwind(filePath)
  console.log(transformedCode)
} catch (error) {
  console.error(error)
  process.exit(1)
}
