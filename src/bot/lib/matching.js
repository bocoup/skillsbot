import heredoc from 'heredoc-tag';
import OutputBuffer from './output-buffer';

// Find matching items for the given search term.
export function getMatchDetails(search, matches) {
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

// Test to see if a match was ambiguous.
export function getBestMatch(search, matches) {
  // Create a buffer in which output messages can accumulate.
  const buffer = new OutputBuffer();
  // No matches found = fail!
  if (matches.length === 0) {
    buffer.push(`_No matches found for "${search}"._`);
    return buffer.result();
  }
  // Get match details.
  const {exact, match} = getMatchDetails(search, matches);
  // There was one match. A match with no ambiguity = success!
  if (matches.length === 1) {
    buffer.push(`_You specified "${search}", which matches: *${match.name}*._`);
    return buffer.result({match});
  }
  // There were multiple matches.
  const list = matches.map(item => item.name).join(', ');
  buffer.push(`_Multiple matches were found: ${list}._`);
  // An exact match = success!
  if (exact) {
    buffer.push(`_You specified "${search}", which matches: *${exact.name}*._`);
    return buffer.result({match: exact});
  }
  // Ambiguity = fail!
  buffer.push(`_You specified "${search}", which is ambiguous. Please be more specific._`);
  return buffer.result();
}

// Test to see if a match is a duplicate.
export function testDuplicateMatch(search, matches) {
  // Create a buffer in which output messages can accumulate.
  const buffer = new OutputBuffer();
  // Get match details.
  const {exact} = getMatchDetails(search, matches);
  // An exact match = fail!
  if (exact) {
    buffer.push(heredoc.trim.oneline`
      _You specified "${search}", which matches: *${exact.name}*.
      Please use the \`list\` command to see what already exists
      before trying to add something new._
    `);
  }
  return buffer.result({isDuplicate: Boolean(exact)});
}
