import {query, one} from '../../../services/db';
import {createCommand, createParser} from 'chatter';
import {getBestMatch} from '../../lib/matching';
import {pluralizeOn} from '../../../util/localization';

export default createCommand({
  name: 'category info',
  description: 'Get information about a category.',
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
    // Test if match is good, ambiguous, etc.
    const {match, output} = getBestMatch(search, matches);
    // Add any output from the test to the buffer.
    buffer.push(output);
    // Exit now if match was ambiguous.
    if (!match) {
      return buffer;
    }
    console.log(match);
    return one.categoryInfo({categoryId: match.id})
    .then(({name, skills, is_active: isActive}) => {
      const p = pluralizeOn(skills.length);
      return [
        `The category name is *${name}*`,
        `The category state is *${isActive ? 'active' : 'deactivated'}*.`,
        `There ${p('is/are')} *${p}* skill${p()} that belong to this category:`,
        `> ${skills.join(', ')}`,
      ];
    });
  });
}));
