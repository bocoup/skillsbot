import Promise from 'bluebird';
import {createCommand, createParser} from 'chatter';
import heredoc from 'heredoc-tag';
import {query, one} from '../../services/db';
import {parseMatches, prepareMatchOutput, throwIfMatchErrors} from '../lib/matching';
>>>>>>> pass functions and not strings to finditemandhandleerrors
import {formatSkillStats} from '../lib/formatting';

export default createCommand({
  name: 'stats',
  description: 'Provide statistics about a given skill.',
  usage: '<skill name>',
}, createParser(({args}, {bot, token}) => {
  const search = args.join(' ');
  if (!search) {
    return false;
  }
  const output = [];
  return query.skillByName({token, search})
    // parse matches
    .then(results => parseMatches(results, search))
    // return the matches and output
    .then(prepareMatchOutput)
    // handle any errors
    .then(throwIfMatchErrors)
    // use results to find users for matching skill
    .then(results => {
      const {match: {id: skillId}} = results;
      output.push(results.output);
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
          formatSkillStats(scalesData),
          heredoc.oneline.trim`
            _These graphs represent the distribution of responses from all team
            members${outstandingTxt}._
          `,
        ];
      });
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
