interface Item {
  blockHash: string;
  next: Item | null;
}

/* ----------
   a set with O(1) add and O(1) lookup
   which automatically preserve a maxsize
                               ---------- */
export class MaxSizeSet {
  private items: { [key: string]: Item };
  private maxSize: number;
  private size: number;
  private head: Item | null;
  private tail: Item | null;

  constructor(maxSize: number) {
    this.items = {};
    this.maxSize = maxSize;
    this.size = 0;
    this.head = null;
    this.tail = null;
  }

  add(blockHash: string): void {
    const alreadyExist = this.items[blockHash] !== undefined;
    if (alreadyExist) return;

    if (this.size === this.maxSize) {
      // remove oldest blockHash
      const oldestblockHash = this.tail!.blockHash;
      this.tail = this.tail!.next;
      delete this.items[oldestblockHash];
      this.size--;
    }

    // add new blockHash
    const newNode: Item = { blockHash, next: null };
    if (this.head === null) {
      this.head = newNode;
      this.tail = this.head;
    } else {
      this.head.next = newNode;
    }
    this.head = newNode;
    this.items[blockHash] = newNode;
    this.size++;
  }

  has(blockHash: string): boolean {
    return this.items[blockHash] !== undefined;
  }

  toString(): string[] {
    const res = [];
    let cur = this.tail;
    while (cur && cur !== this.head?.next) {
      res.push(cur.blockHash);
      cur = cur.next;
    }

    return res;
  }
}
