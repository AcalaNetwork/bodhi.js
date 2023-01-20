## Compare Subquery Data Diff
Compares two copies of subquery data, and find out extra/missing/diff records.
use `--full` to show full difference, or `--no-full` to only show different ids

### run with example data
first extract the data, which contains some valid karura receipts/logs, and another copy of data that missed some record.
```
tar -xvf data.tgz
```

check for receipts diff
```
yarn diff                                \
  --f1 data/karura-receipts-missing.csv  \
  --f2 data/karura-receipts-3503328.csv  \
  --start-block 0                        \
  --end-block 3426035                    \
  --full                                 \
  --outFile res.json
```

check for logs diff
```
yarn diff                            \
  --f1 data/karura-logs-missing.csv  \
  --f2 data/karura-logs-3503328.csv  \
  --start-block 0                    \
  --end-block 3426035                \
  --full                             \
  --outFile res.json
```
