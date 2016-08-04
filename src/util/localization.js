// TODO: use a real localization library.

// Usage
//
// function test(length) {
//   const p = pluralizeOn(length);
//   return `There ${p('is/are')} ${p} thing{p()}.`);
// }
//
// test(1) // "There is 1 thing."
// test(2) // "There are 2 things."
export function pluralizeOn(num) {
  function fn(str = '/s') {
    const parts = str.split('/');
    const index = Number(Number(num) !== 1);
    return parts[index];
  }
  fn.toString = () => num;
  return fn;
}
