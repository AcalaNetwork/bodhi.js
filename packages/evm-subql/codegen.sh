#!/bin/bash

projects=(
  project-acala.ts
  project-acala-testnet.ts
  project-karura.ts
  project-karura-testnet.ts
  project-tc9.ts
  project.ts
)

for project in "${projects[@]}"; do
  yarn subql codegen -f "$project" || exit 1
done
