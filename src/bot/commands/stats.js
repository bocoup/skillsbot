import Promise from 'bluebird';
import {createCommand, createParser} from 'chatter';
import heredoc from 'heredoc-tag';
import {one} from '../../services/db';
import {findExpertiseAndHandleErrors} from '../lib/query';
import {formatExpertiseStats} from '../lib/formatting';

export default createCommand({
  name: 'stats',
  description: 'Provide statistics about a given expertise.',
  usage: '<expertise name>',
}, createParser(({args}, {bot, teamId}) => {
  const search = args.join(' ');
  if (!search) {
    return false;
  }
  const output = [];
  return findExpertiseAndHandleErrors(teamId, search).then(results => {
    const {match: {id: expertiseId}} = results;
    output.push(results.output);
    return Promise.all([
      one.scalesDistributionForExpertise({expertiseId}),
      one.outstandingUsersForExpertise({expertiseId}).get('users'),
    ])
    .spread((scalesData, outstanding) => {
      // Output an overall count of missing people, instead of all the names.
      const count = outstanding ? outstanding.length : 0;
      const outstandingTxt = count === 0 ? '' : heredoc.oneline.trim`
        , minus the ${count} who ${count > 1 ? "haven't" : "hasn't"} responded
      `;
      return [
        formatExpertiseStats(scalesData),
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
