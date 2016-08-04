import {query} from '../../../services/db';
import {createCommand, createParser} from 'chatter';
import {getBestMatch} from '../../lib/matching';

const getHandler = isActive => ({args}, {token}) => {
  const search = args.join(' ');
  if (!search) {
    return false;
  }
  // Create a buffer in which output messages can accumulate.
  const buffer = [];
  // Find matching categories.
  return query.categoryByName({token, search})
  .then(matches => {
    // Test if match is good, ambiguous, etc.
    const {match, output} = getBestMatch(search, matches);
    // Add any output from the test to the buffer.
    buffer.push(output);
    // Exit now if match was ambiguous.
    if (!match) {
      return buffer;
    }
    // Enable or disable the category.
    return query.categorySetActive({categoryId: match.id, isActive})
    .then(() => [
      ...buffer,
      `_You have successfully ${isActive ? 'enabled' : 'disabled'} category "${search}"._`,
    ]);
  });
};

export const categoryEnable = createCommand({
  name: 'category enable',
  description: 'Enable a skill category.',
  usage: '<category name>',
}, createParser(getHandler(true)));

export const categoryDisable = createCommand({
  name: 'category disable',
  description: 'Disable a skill category.',
  usage: '<category name>',
}, createParser(getHandler(false)));
