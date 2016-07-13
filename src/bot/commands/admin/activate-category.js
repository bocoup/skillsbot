import {query} from '../../../services/db';
import {createCommand, createParser} from 'chatter';
import {parseMatches, prepareMatchOutput, throwIfErrors} from '../../lib/matching';

export default createCommand({
  name: 'activate category',
  description: 'Activate a new skills category.',
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
    .then(prepareMatchOutput)
    // handle any errors
    .then(throwIfErrors)
    // if a match exists, set the category as active
    .then(results => {
      const {exact} = results;
      if (exact) {
        return query.categoryIsActive({token, name: exact.name, isActive: true})
          .then(() => {
            output.push(`_You have successfully activated "${search}"._`);
            return {output};
          });
      }
      return results;
    })
    // return output for bot dialogue
    .get('output')
    // Error! Print all cached output + error message + usage info, or re-throw.
    .catch(error => {
      if (error.abortData) {
        return [output, error.abortData];
      }
      throw error;
    });
}));
