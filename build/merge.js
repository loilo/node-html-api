const args = process.argv.slice(2)
const files = args.filter(file => !file.startsWith('--'))

const fs = require('fs')

for (const file of files) {
    process.stdout.write(fs.readFileSync(file))
    if (args.includes('--sep-newline')) process.stdout.write(require('os').EOL)
}