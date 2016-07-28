export default class OutputBuffer {
  constructor() {
    this.output = [];
  }
  // Add a message into the output to eventually be flushed.
  // Return this so that it's chainable.
  push(message) {
    if (message) {
      this.output.push(message);
    }
    return this;
  }
  // Flush the buffer. Use this method when you only need to return the
  // buffer (at the top level).
  flush() {
    return this.output;
  }
  // Flush the buffer. Use this method when you only need to return both a
  // value and the buffer. "obj" is an object that will be merged with an
  // {output: ...} object containing the buffer array.
  result(obj = {}) {
    return Object.assign({}, obj, {output: this.output});
  }
}
