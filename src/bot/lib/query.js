import {query} from '../../services/db';

// =============
// QUERY HELPERS
// =============

// Error-throwing helper function for bot promise chains.
export function abort(...args) {
  const error = new Error();
  error.abortData = args;
  return error;
}

// Find matching item (skills or categories) for the given search term.
export function findItemByName(token, search, table) {
  const byNameFunction = (table === 'skill') ? 'skillByName' : 'categoryByName';
  return query[byNameFunction]({token, search, table}).then(matches => {
    let exact;
    if (matches.length > 0) {
      exact = matches.find(m => m.name.toLowerCase() === search.toLowerCase());
    }
    return {
      // All matches.
      matches,
      // The "best" match. Might not be exact.
      match: exact || matches[0],
      // An exact match. (case-insensitive)
      exact: exact || null,
    };
  });
}

// Find the best match for the given search term, and complain if necessary.
export function findItemAndHandleErrors(token, search, table) {
  const output = [];
  const label = (table === 'skill') ? 'skill' : 'category';
  return findItemByName(token, search, table).then(({matches, match, exact}) => {
    if (matches.length === 0) {
      throw abort(`_No matches found for ${label} "${search}"._`);
    }
    else if (matches.length === 1) {
      output.push(`_You specified "${search}", which matches: *${matches[0].name}*._`);
    }
    else {
      const skillsList = matches.map(skill => skill.name).join(', ');
      output.push(`_Multiple matches were found: ${skillsList}._`);
      if (exact) {
        output.push(`_You specified "${search}", which matches: *${exact.name}*._`);
      }
      else {
        throw abort(`_You specified "${search}", which is ambiguous. Please be more specific._`);
      }
    }
    return {
      matches,
      match,
      exact,
      output,
    };
  })
  .catch(error => {
    // If abort was used, re-throw with abort so the output propagates!
    if (error.abortData) {
      throw abort(...output, error.abortData);
    }
    throw error;
  });
}
