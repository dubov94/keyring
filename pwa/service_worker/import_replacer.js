const fs = require('fs').promises
const espree = require('espree')
const escodegen = require('escodegen')

const main = async () => {
  const [package_json, service_worker_js] =
      await Promise.all(process.argv.slice(2, 4).map((path) => fs.readFile(path, 'utf-8')))
  const { dependencies, devDependencies } = JSON.parse(package_json)
  const ast = espree.parse(service_worker_js, {
    ecmaVersion: 10,
    sourceType: 'module'
  })
  for (const [index, node] of ast.body.entries()) {
    if (node.type !== 'ImportDeclaration') {
      continue
    }
    if (node.specifiers.length !== 1) {
      throw new Error(`Expected ImportDeclaration to have 1 specifier: ${node}`)
    }
    const specifier = node.specifiers[0]
    if (specifier.type !== 'ImportDefaultSpecifier') {
      throw new Error(`Expected ImportDeclaration specifier to be ImportDefaultSpecifier: ${node}`)
    }
    const library = node.source.value
    const deps = {...dependencies, ...devDependencies}
    if (!deps.hasOwnProperty(library)) {
      throw new Error(`'${library}' is not in package.json dependencies or devDependencies`)
    }
    ast.body[index] = {
      type: 'ExpressionStatement',
      expression: {
        type: 'CallExpression',
        callee: {
          type: 'Identifier',
          name: 'importScripts'
        },
        arguments: [{
          type: 'Literal',
          value: `https://cdn.jsdelivr.net/npm/${library}@${deps[library]}`
        }]
      }
    }
  }
  console.log(escodegen.generate(ast))
}

main()
