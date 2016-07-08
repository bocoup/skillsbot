import {createCommand, createParser} from 'chatter';
import {addItemAndHandleErrors} from '../lib/query';

const findFunction = 'categoryByName';
const addFunction = 'categoryInsert';

export default createCommand({
  name: 'admin add category',
  description: 'Add a new skills category.',
  usage: '<category name>',
}, createParser(({args}, {bot, token, getCommand}) => {
  const search = args.join(' ');
  if (!search) {
    return false;
  }
  const output = [];
  return addItemAndHandleErrors(token, search, findFunction, addFunction).then(results => {
    output.push(results.output);
  })
  // Success! Print all cached output + final message.
  .then(message => [output, message])
  // Error! Print all cached output + error message + usage info, or re-throw.
  .catch(error => {
    if (error.abortData) {
      return [output, error.abortData];
    }
    throw error;
  });
}));
