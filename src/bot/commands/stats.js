import Promise from 'bluebird';
import {createCommand, createParser} from 'chatter';
import heredoc from 'heredoc-tag';
import {query, one} from '../../services/db';
import {getBestMatch} from '../lib/matching';
import {formatSkillStats} from '../lib/formatting';

export default createCommand({
  name: 'stats',
  description: 'Show statistics for the given skill.',
  usage: '<skill name>',
}, createParser(({args}, {bot, token}) => {
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
    // Get stats for the given skill.
    const {id: skillId} = match;
    return Promise.all([
      one.scalesDistributionForSkill({skillId}),
      one.outstandingUsersForSkill({skillId}).get('users'),
    ])
    .spread((scalesData, outstanding) => {
      // Output an overall count of missing people, instead of all the names.
      const count = outstanding ? outstanding.length : 0;
      const outstandingTxt = count === 0 ? '' : heredoc.oneline.trim`
        , minus the ${count} who ${count > 1 ? "haven't" : "hasn't"} responded
      `;
      return [
        ...buffer,
        formatSkillStats(scalesData),
        heredoc.oneline.trim`
          _These graphs represent the distribution of responses from all team
          members${outstandingTxt}._
        `,
      ];
    });
  });
}));
