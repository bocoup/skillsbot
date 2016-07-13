import {query} from '../../../services/db';
import {createCommand, createParser} from 'chatter';
import {parseMatches, prepareAddOutput, throwIfErrors} from '../../lib/matching';

export default createCommand({
  name: 'add category',
  description: 'Add a new skills category.',
  usage: '<category name>',
}, createParser(({args}, {bot, token, getCommand}) => {
  const search = args.join(' ');
  if (!search) {
    return false;
  }
  const output = [];
  return query.categoryByName({token, search})
    // parse matches
    .then(results => parseMatches(results, search))
    // return the matches and output
    .then(prepareAddOutput)
        // handle any errors
    .then(throwIfErrors)
    // if matches do not exist, add new category
    .then(results => {
      const {matches} = results;
      if (matches.length === 0) {
        return query.categoryInsert({token, name: search, isActive: true})
          .then(() => {
            output.push(`_You have successfully added "${search}"._`);
            return {output};
          });
      }
      return results;
    })
    // return output for bot dialogue
    .then(results => {
      return results.output;
    })
    // Error! Print all cached output + error message + usage info, or re-throw.
    .catch(error => {
      if (error.abortData) {
        return [output, error.abortData];
      }
      throw error;
    });
}));
