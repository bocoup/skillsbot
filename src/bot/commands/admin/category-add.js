import {query} from '../../../services/db';
import {createCommand, createParser} from 'chatter';
import {testDuplicateMatch} from '../../lib/matching';

export default createCommand({
  name: 'category add',
  description: 'Add a new skill category.',
  usage: '<category name>',
}, createParser(({args}, {token}) => {
  const search = args.join(' ');
  if (!search) {
    return false;
  }
  // Create a buffer in which output messages can accumulate.
  const buffer = [];
  // Find matching categories.
  return query.categoryByName({token, search})
  .then(matches => {
    // Test if match is a duplicate.
    const {isDuplicate, output} = testDuplicateMatch(search, matches);
    // Add any output from the test to the buffer.
    buffer.push(output);
    // Exit now if match was a duplicate.
    if (isDuplicate) {
      return buffer;
    }
    // Insert the new category.
    return query.categoryInsert({token, name: search})
    .then(() => [
      ...buffer,
      `_You have successfully added category "${search}"._`,
    ]);
  });
}));
