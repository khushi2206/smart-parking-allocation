/**
 * Reusable binary min-heap. The comparator receives two values and returns
 * true when the first value should be extracted before the second.
 */
export class MinPriorityQueue {
  constructor(compare = (a, b) => a < b) {
    this.heap = [];
    this.compare = compare;
    this.operations = 0;
  }

  insert(value) {
    this.heap.push(value);
    this.operations++;
    this.#bubbleUp(this.heap.length - 1);
  }

  extractMin() {
    if (this.isEmpty()) return undefined;
    const minimum = this.heap[0];
    const last = this.heap.pop();
    this.operations++;
    if (this.heap.length && last !== undefined) {
      this.heap[0] = last;
      this.#bubbleDown(0);
    }
    return minimum;
  }

  peek() {
    return this.heap[0];
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  size() {
    return this.heap.length;
  }

  #bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (!this.compare(this.heap[index], this.heap[parent])) break;
      [this.heap[index], this.heap[parent]] = [this.heap[parent], this.heap[index]];
      index = parent;
    }
  }

  #bubbleDown(index) {
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let best = index;
      if (left < this.heap.length && this.compare(this.heap[left], this.heap[best])) best = left;
      if (right < this.heap.length && this.compare(this.heap[right], this.heap[best])) best = right;
      if (best === index) break;
      [this.heap[index], this.heap[best]] = [this.heap[best], this.heap[index]];
      index = best;
    }
  }
}
