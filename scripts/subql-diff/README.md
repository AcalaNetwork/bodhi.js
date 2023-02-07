## Compare Subquery Data Diff
Compares two copies of subquery data, and find out extra/missing/diff records.

### options
```
    --version        Show version number                             [boolean]
    --file1, --f1    first csv file to compare             [string] [required]
    --file2, --f2    second csv file to compare            [string] [required]
-s, --startBlock     start block of interest                          [number]
-e, --endBlock       end block of interest                            [number]
-f, --full           show full result               [boolean] [default: false]
-c, --caseSensitive  caseSensitive for addresses compare
                                                    [boolean] [default: false]
-o, --outFile        save result to output file                       [string]
-i, --ignoredKeys    ignored keys when comparing, separated with comma[string]
    --help           Show help                                       [boolean]
```

### run with example data
first extract the data, which contains some valid karura receipts/logs, and another copy of data that missed some record.
```
tar -xvf data.tgz
```

check for receipts diff
```
npx @acala-network/subql-diff@latest     \
  --f1 data/karura-receipts-missing.csv  \
  --f2 data/karura-receipts-3503328.csv  \
  --start-block 0                        \
  --end-block 3426035                    \
  --full                                 \
  --outFile res.json
```

check for logs diff
```
npx @acala-network/subql-diff@latest \
  --f1 data/karura-logs-missing.csv  \
  --f2 data/karura-logs-3503328.csv  \
  --start-block 0                    \
  --end-block 3426035                \
  --full                             \
  --outFile res.json
```
