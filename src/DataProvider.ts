import { BigNumber } from "@ethersproject/bignumber";
import initDB from '@open-web3/indexer/models';
import { Op, Sequelize } from 'sequelize';
import type { BlockTag, Filter, FilterByBlockHash, Log, TransactionReceipt } from './Provider';

export class DataProvider {
  constructor(public db: Sequelize) {

  }

  async init() {
    await this.db.authenticate()
    initDB(this.db);
  }

  async getLogs(filter: Filter, resolveBlockNumber: (blockTag?: BlockTag | Promise<BlockTag>) => Promise<number | undefined>): Promise<Array<Log>> {
    const condition = []

    if ((filter as any).transactionHash) {
      condition.push({
        transactionHash: (filter as any).transactionHash
      })
    }

    if ((filter as FilterByBlockHash).blockHash) {
      condition.push({
        blockHash: (filter as FilterByBlockHash).blockHash
      })
    } else if (filter.fromBlock || filter.toBlock) {
      const blockNumberFilter: any = {}

      if (filter.fromBlock) {
        const from = await resolveBlockNumber(filter.fromBlock)
        blockNumberFilter[Op.gte] = from
      }
      if (filter.toBlock) {
        const to = await resolveBlockNumber(filter.toBlock)
        blockNumberFilter[Op.lte] = to
      }
      condition.push({
        blockNumber: blockNumberFilter
      })
    }

    if (filter.address) {
      condition.push({
        address: filter.address.toLowerCase()
      })
    }

    if (filter.topics) {
      condition.push({
        [Op.contains]: {
          // @ts-ignore
          topics: [].concat(filter.topics) as String[]
        }
      })
    }
    const model = this.db.model('EvmLogs')

    const data = await model.findAll({
      attributes: [
        "blockNumber",
        "blockHash",
        "transactionIndex",
        "removed",
        "address",
        "data",
        "topics",
        "transactionHash",
        "logIndex"
      ],
      where: {
        [Op.and]: condition
      },
      raw: true,
    })

    return data as any
  }

  async getTransactionReceipt(txHash: string, resolveBlockNumber: (blockTag?: BlockTag | Promise<BlockTag>) => Promise<number | undefined>): Promise<TransactionReceipt> {
    const Extrinsic = this.db.model('Extrinsic')
    const Events = this.db.model('Events')

    await new Promise((resolve) => setTimeout(() => {
      resolve()
    }, 1000))

    const { blockNumber, blockHash, index: transactionIndex, hash: transactionHash, args } = await Extrinsic.findOne({
      attributes: ['blockNumber', 'blockHash', 'index', 'hash', 'args'],
      where: {
        hash: txHash
      },
      raw: true
    }) as any

    const from = args.source

    const events = await Events.findAll({
      attributes: ['section', 'method', 'args'],

      where: {
        phaseIndex: transactionIndex,
        blockHash: blockHash
      },
      raw: true
    }) as any

    const findCreated = events.find((x: any) => x.section.toUpperCase() === 'EVM' && x.method.toUpperCase() === 'CREATED')
    const findExecuted = events.find((x: any) => x.section.toUpperCase() === 'EVM' && x.method.toUpperCase() === 'EXECUTED')
    const result = events.find((x: any) => x.section.toUpperCase() === 'SYSTEM' && x.method.toUpperCase() === 'EXTRINSICSUCCESS')

    const status = !!(findCreated || findExecuted) ? 1 : 0

    const contractAddress = findCreated ? findCreated.args[0] : null

    const to = findExecuted ? findExecuted.args[0] : null

    const logs = await this.getLogs({
      // @ts-ignore
      transactionHash,
    }, resolveBlockNumber)

    const gasUsed = BigNumber.from(result.args[0].weight)

    return {
      to,
      from,
      contractAddress,
      transactionIndex,
      gasUsed,
      logsBloom: '0x',
      blockHash,
      transactionHash,
      logs,
      blockNumber,
      confirmations: 4,
      cumulativeGasUsed: gasUsed,
      byzantium: false,
      status,
    }
  }
}