import Promise from 'bluebird';
import {createCommand, createParser} from 'chatter';
import {query, one} from '../../services/db';
import {getBestMatch} from '../lib/matching';
import {formatByInterestAndExperience} from '../lib/formatting';

export default createCommand({
  name: 'find',
  description: 'List all team members with the given skill, grouped by interest and experience.',
  usage: '<skill name>',
}, createParser(({args}, {bot, token, getCommand}) => {
  const search = args.join(' ');
  if (!search) {
    return false;
  }
  // Create a buffer in which output messages can accumulate.
  const buffer = [];
  // Find matching skills..
  return query.skillByName({token, search})
  .then(matches => {
    // Test if match is good, ambiguous, etc.
    const {match, output} = getBestMatch(search, matches);
    // Add any output from the test to the buffer.
    buffer.push(output);
    // Exit now if match was ambiguous.
    if (!match) {
      return buffer;
    }
    // Find user data for the given skill.
    const {id: skillId, name: skillName} = match;
    const updateCommand = `update ${search.toLowerCase()}`;
    return Promise.all([
      query.currentUsersForSkill({skillId}),
      one.outstandingUsersForSkill({skillId}).get('users'),
    ])
    .spread((userData, outstanding) => [
      ...buffer,
      outstanding && `> *No data for:* ${outstanding.map(bot.formatId).join(', ')}`,
      formatByInterestAndExperience(userData, o => o.users.map(bot.formatId).join(', ')),
      `_Update your *${skillName}* skill with_ \`${getCommand(updateCommand)}\`.`,
    ]);
  });
}));
