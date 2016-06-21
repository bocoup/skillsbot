import {query} from '../../services/db';

// =============
// QUERY HELPERS
// =============

export function getIntExpScales() {
  return query.expertiseScales()
  .then(results => results.reduce((memo, {type, description, ranking}) => {
    if (!memo[type]) {
      memo[type] = {};
    }
    memo[type][ranking] = description;
    return memo;
  }, {}));
}
