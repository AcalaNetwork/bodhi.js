#!/bin/env node

import { execSync } from 'child_process';
import { existsSync } from 'fs'

(async () => {
    // set max block number
    const head = await fetch('http://localhost:8545', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_getBlockByNumber",
            params: ["latest", false]
        })
    }).then(res => res.json());

    const latestBlock = Number(head.result.number);
    console.log(`Latest block: ${latestBlock}`);

    process.env.MAX_BLOCK_NUMBER = latestBlock.toString();

    if (!existsSync('flood')) {
        execSync('git clone --branch acala-bodhi --depth 0 git@github.com:ermalkaleci/flood.git');
    }

    const tests = [
        "eth_call",
        "eth_getBalance",
        "eth_getBlockByNumber",
        "eth_getCode",
        "eth_getLogs",
        "eth_getStorageAt",
        "eth_getTransactionByHash",
        "eth_getTransactionCount",
        "eth_getTransactionReceipt",
    ];

    for (const test of tests) {
        execSync(`cd flood; python3 -m flood ${test} http://localhost:8545 -o ../flood-result/${test} --deep-check`, {
            stdio: 'inherit',
            env: process.env
        });
        await new Promise(resolve => setTimeout(resolve, 10_000));
    }
})();