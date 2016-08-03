import {query} from '../../../services/db';
import {createCommand, createParser} from 'chatter';
import {getBestMatch} from '../../lib/matching';

const activateHander = isActive => ({args}, {bot, token, getCommand}) => {
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
    // Deactivate the category.
    return query.categorySetActive({categoryId: match.id, isActive})
    .then(() => [
      ...buffer,
      `_You have successfully ${isActive ? '' : 'de'}activated category "${search}"._`,
    ]);
  });
};

export const categoryActivate = createCommand({
  name: 'category activate',
  description: 'Activate a skill category.',
  usage: '<category name>',
}, createParser(activateHander(true)));

export const categoryDeactivate = createCommand({
  name: 'category deactivate',
  description: 'Deactivate a skill category.',
  usage: '<category name>',
}, createParser(activateHander(false)));
