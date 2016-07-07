import Promise from 'bluebird';
import {createCommand, createParser} from 'chatter';
import {query, one} from '../../services/db';
import {findSkillAndHandleErrors} from '../lib/query';
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
  const output = [];
  return findSkillAndHandleErrors(token, search).then(results => {
    const {match: {id: skillId, name: skillName}} = results;
    const updateCommand = `update ${search.toLowerCase()}`;
    output.push(results.output);
    return Promise.all([
      query.currentUsersForSkill({skillId}),
      one.outstandingUsersForSkill({skillId}).get('users'),
    ])
    .spread((userData, outstanding) => [
      outstanding && `> *No data for:* ${outstanding.map(bot.formatId).join(', ')}`,
      formatByInterestAndExperience(userData, o => o.users.map(bot.formatId).join(', ')),
      `_Update your *${skillName}* skill with_ \`${getCommand(updateCommand)}\`.`,
    ]);
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
