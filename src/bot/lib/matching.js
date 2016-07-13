// =============
// MATCHING HELPERS
// =============

// Error-throwing helper function for bot promise chains.
export function abort(...args) {
  const error = new Error();
  error.abortData = args;
  return error;
}

// Find matching items for the given search term.
export function parseMatches(matches, search) {
  let exact;
  if (matches.length > 0) {
    exact = matches.find(m => m.name.toLowerCase() === search.toLowerCase());
  }
  return {
    search,
    // All matches.
    matches,
    // The "best" match. Might not be exact.
    match: exact || matches[0],
    // An exact match. (case-insensitive)
    exact: exact || null,
  };
}

// processes matches and returns output for dialogue
export function prepareMatchOutput(matchResults) {
  const {search, matches, match, exact} = matchResults;
  const output = [];
  const errors = [];

  if (matches.length === 0) {
    errors.push(`_No matches found for "${search}"._`);
  }
  else if (matches.length === 1) {
    output.push(`_You specified "${search}", which matches: *${matches[0].name}*._`);
  }
  else {
    const list = matches.map(item => item.name).join(', ');
    output.push(`_Multiple matches were found: ${list}._`);
    if (exact) {
      output.push(`_You specified "${search}", which matches: *${exact.name}*._`);
    }
    else {
      errors.push(`_You specified "${search}", which is ambiguous. Please be more specific._`);
    }
  }
  return {
    matches,
    match,
    exact,
    output,
    errors,
  };
}

// processes matches for updates and returns output for dialogue
export function prepareUpdateOutput(matchResults) {
  const {search, matches, match, exact} = matchResults;
  const output = [];
  const errors = [];
  // suggest list if there are matches
  if (matches.length !== 1) {
    errors.push(`_Existing matches for "${search}" were found. ` +
      `You can use the \`list\` command to see what items already exist before trying to create them._`);
  }

  return {
    matches,
    match,
    exact,
    output,
    errors,
  };
}

// rethrow abort errors so the output propogates
export function throwIfErrors(results) {
  const {output, errors} = results;
  if (errors && errors.length) {
    throw abort(...output, ...errors);
  }
  return results;
}
