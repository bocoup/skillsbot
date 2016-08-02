import {createMatcher} from 'chatter';

import Scheduler from '../util/scheduler';
import {query} from '../services/db';

export const jobs = new Scheduler();

const pluralizeOn = n => s => s.split('/')[Number(n !== 1)];

export function notifyMissing({bot, token, debug} = {}) {
  const buffer = [];
  const push = (...messages) => {
    buffer.push(...messages);
    if (!debug) {
      messages.forEach(msg => console.log('[notifyMissing]', msg));
    }
  };
  // Get users with outstanding skills.
  return query.outstandingSkillsForTeam({token})
  // Iterate over each user, in order.
  .mapSeries(({slack_id: userId, skills}) => {
    const p = pluralizeOn(skills.length);
    // Get DM with user.
    const {id: dmId} = bot.getDMByUserId(userId);
    // If there is no DM for user, send message directly (via @slackbot) and give
    // the user the correct command to talk to the bot.
    const cmdPrefix = dmId ? '' : `/msg <@${bot.slack.rtmClient.activeUserId}> `;
    // Construct the message for this user.
    const message = [
      `*You have ${skills.length} outstanding skill${p('/s')} that need${p('s/')} to be updated.*`,
      `Please update ${p('it/them')} with \`${cmdPrefix}update missing\`.`,
    ];
    // If in debug mode, buffer the message instead of actually sending it.
    if (debug) {
      return push(`Message to <@${userId}> via ${dmId ? 'DM' : 'slackbot'}:`, ...message.map(m => `> ${m}`));
    }
    // Message the user via DM and wait a moment before processing the next user.
    return bot.postMessage(dmId || userId, message).delay(2000);
  })
  // Done.
  .then(results => {
    const p = pluralizeOn(results.length);
    push(`Job done, ${results.length} user${p('/s')} processed.`);
  })
  // Handle errors.
  .catch(e => push(`Error: ${e.message}`))
  // Flush the buffer, in case the job was run manually.
  .then(() => buffer);
}

jobs.add('00 0 12 * * 1-5', notifyMissing);

// Allow the command to be run manually, for testing purposes.
export const jobCommand = createMatcher({
  match: 'job',
}, (message, {bot, token}) => {
  if (message === 'missing') {
    return notifyMissing({bot, token, debug: true});
  }
  return false;
});
