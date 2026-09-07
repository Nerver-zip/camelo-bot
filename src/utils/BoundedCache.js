// Keep recently used entries without retaining every lookup for the bot's lifetime.
class BoundedCache extends Map {
  constructor(maxSize = 500) {
    super();
    if (!Number.isInteger(maxSize) || maxSize < 1) throw new RangeError('Invalid cache size');
    this.maxSize = maxSize;
  }

  get(key) {
    if (!super.has(key)) return undefined;
    const value = super.get(key);
    super.delete(key);
    super.set(key, value);
    return value;
  }

  set(key, value) {
    super.delete(key);
    super.set(key, value);
    if (this.size > this.maxSize) super.delete(this.keys().next().value);
    return this;
  }
}

module.exports = { BoundedCache };
