import { execSync } from 'child_process'
import { packages } from './config'
import { Package } from './types'

export async function builder() {
  await Promise.all(
    packages.map(async (pkg) => {
      buildPackage(pkg)
    })
  )
}

function buildPackage(pkg: Package) {
  execSync(`cd packages/${pkg.packageDir} && yarn build`, { stdio: 'inherit' })
}
