import {createMatcher} from 'chatter';

import Scheduler from '../util/scheduler';
import {query} from '../services/db';
import {pluralizeOn} from '../util/localization';

export const jobs = new Scheduler();

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
      `*We're tracking some new skills! There ${p('is/are')} ${p} left we'd like to know about.*`,
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
    push(`Job done, ${p} user${p()} processed.`);
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
