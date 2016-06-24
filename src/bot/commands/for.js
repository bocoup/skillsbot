import Promise from 'bluebird';
import {createCommand, createParser} from 'chatter';
import {query} from '../../services/db';
import {formatByInterestAndExperience} from '../lib/formatting';

function forHandler(name, {bot, user, getCommand}) {
  if (!name) {
    return false;
  }
  const targetUser = name === 'me' ? user : bot.getUser(name);
  const userId = targetUser.id;
  if (!userId) {
    return `Unknown user "${name}".`;
  }
  const isMe = userId === user.id;
  return Promise.all([
    query.currentExpertisesForUser({userId}),
    query.outstandingExpertisesForUser({userId}),
  ])
  .spread((expertiseData, outstandingData) => {
    const outstanding = outstandingData.map(o => o.name).join(', ');
    return [
      `Listing all expertise for ${bot.formatId(userId)}:`,
      !isMe && outstanding && `> *No data for:* ${outstanding}`,
      formatByInterestAndExperience(expertiseData, o => o.expertises.join(', ')) || '> No expertise data found.',
      isMe && outstanding && `_*No data for:* ${outstanding}_`,
      isMe && `_Update your expertise with_ \`${getCommand('update')}\`.`,
    ];
  });
}

export const forCommand = createCommand({
  name: 'for',
  description: 'List all expertises for the given team member, grouped by interest and experience.',
  usage: '[me | @teammember]',
}, createParser(({args: [name]}, meta) => forHandler(name, meta)));

export const meCommand = createCommand({
  name: 'me',
  description: 'List all of your expertises, grouped by interest and experience.',
}, createParser((args, meta) => forHandler('me', meta)));
