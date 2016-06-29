import Promise from 'bluebird';
import moment from 'moment';
import heredoc from 'heredoc-tag';
import {createCommand, createMatcher, createParser} from 'chatter';
import {one, oneOrNone, none, query} from '../../services/db';
import {findExpertiseAndHandleErrors, abort} from '../lib/query';
import {questions} from '../lib/dialog';

const intExpProps = ['interest', 'experience'];

function updateExpertise({userId, expertise, newValues}) {
  const {id: expertiseId} = expertise;
  const {interest, experience, reason = ''} = newValues;
  return Promise.mapSeries([
    // Get current values. This has to be done before getting the new values!
    () => oneOrNone.currentExpertiseValues({userId, expertiseId}),
    // Update database with new values.
    () => none.updateExpertise({userId, expertiseId, experience, interest, reason}),
  ], f => f())
  .spread(oldValues => {
    // Show a summary of the changes.
    const summary = intExpProps.map(prop => {
      const name = prop[0].toUpperCase() + prop.slice(1).toLowerCase();
      if (!oldValues) {
        return `${name} set to ${newValues[prop]}.`;
      }
      else if (String(newValues[prop]) === String(oldValues[prop])) {
        return `${name} unchanged at ${newValues[prop]}.`;
      }
      return `${name} changed from ${oldValues[prop]} to ${newValues[prop]}.`;
    });
    return [
      `Expertise for *${expertise.name}* updated:`,
      summary.map(s => `> ${s}`),
      Boolean(reason) && `Reason set to "${reason}"`,
    ];
  });
}

// =================================
// expertise update <expertise name>
// =================================

function updateExpertiseQuestions(state, headers) {
  const {
    scales,
    oldValues,
    newValues,
    userId,
    expertise,
    expertiseName,
    updateCommand,
    getCommand,
    skippable,
    done,
  } = state;

  const startOver = () => updateExpertiseQuestions(state, ['_Starting over._']);

  const hasInterestChanged = () => !oldValues || newValues.interest !== oldValues.interest;
  const hasExperienceChanged = () => !oldValues || newValues.experience !== oldValues.experience;

  function getInterestQuestion() {
    return {
      question: `Choose your interest level for ${expertiseName}:`,
      choices: scales.interest,
      onAnswer: answer => {
        newValues.interest = Number(answer);
        return `_You selected *${newValues.interest}* for interest, thanks!_`;
      },
    };
  }

  function getExperienceQuestion() {
    return {
      question: `Choose your experience level for ${expertiseName}:`,
      choices: scales.experience,
      onAnswer: answer => {
        newValues.experience = Number(answer);
        return `_You selected *${newValues.experience}* for experience, thanks!_`;
      },
    };
  }

  function getConfirmNoChangeQuestion() {
    return {
      question: heredoc.trim.unindent`
        Your interest and experience for ${expertiseName} haven't changed! Is this ok?
        > Interest: *${scales.interest[newValues.interest]}*
        > Experience: *${scales.experience[newValues.experience]}*

      `,
      choices: [
        `Continue without making changes.`,
        `No, re-choose interest and experience for ${expertiseName}.`,
      ],
      onAnswer(answer) {
        if (answer === 2) {
          return startOver();
        }
        return done(`_Expertise for *${expertise.expertise}* unchanged._`);
      },
    };
  }

  function getReasonQuestion() {
    if (oldValues) {
      const parts = [];
      if (hasInterestChanged()) { parts.push('interest'); }
      if (hasExperienceChanged()) { parts.push('experience'); }
      const str1 = parts.length === 1 ? 'has' : 'have';
      const str2 = parts.join(' and ');
      return {
        question: `Why ${str1} your ${str2} changed for ${expertiseName}?`,
        onAnswer: answer => {
          newValues.reason = answer;
          return '_Noted!_';
        },
      };
    }
  }

  function getConfirmChangeQuestion() {
    const reason = 'reason' in newValues ? `> Reason: *${newValues.reason}*\n` : '';
    return {
      question: heredoc.trim.unindent`
        You've entered the following for ${expertiseName}. Is this ok?
        > Interest: *${scales.interest[newValues.interest]}*
        > Experience: *${scales.experience[newValues.experience]}*
        ${reason}
      `,
      choices: [
        `Save these changes.`,
        `No, re-choose interest and experience for ${expertiseName}.`,
      ],
      onAnswer(answer) {
        if (answer === 2) {
          return startOver();
        }
        return updateExpertise({userId, expertise, newValues}).then(done);
      },
    };
  }

  return questions({
    headers,
    questions: [
      () => getInterestQuestion(),
      () => getExperienceQuestion(),
      () => {
        if (!hasInterestChanged() && !hasExperienceChanged()) {
          return getConfirmNoChangeQuestion();
        }
        return [
          () => getReasonQuestion(),
          () => getConfirmChangeQuestion(),
        ];
      },
    ],
    strExit: skippable ? ['exit', 'skip'] : ['exit'],
    fmtPrompt([exit, skip]) {
      const str1 = skip ? `, type *${skip}* to skip, or` : ' or type';
      return `Please answer${str1} *${exit}* to cancel.`;
    },
    onExit(exit) {
      if (exit === 'skip') {
        return done(`_Skipping ${expertiseName} for now!_`, true);
      }
      return `Canceled, please type \`${getCommand(updateCommand)}\` to try again.`;
    },
  });
}

function updateExpertiseDialog({
  userId,
  expertise,
  updateCommand,
  getCommand,
  oneTimeHeader = null,
  skippable = false,
  done,
}) {
  const {id: expertiseId} = expertise;
  const expertiseName = `*${expertise.name}*`;
  return Promise.all([
    one.expertiseScales(),
    oneOrNone.currentExpertiseValues({userId, expertiseId}),
  ])
  .spread((scales, oldValues) => {
    // Reformat scales object into a per-scale map of ranking-to-description.
    const rankingMap = scale => scale.reduce((memo, [ranking, description]) => {
      memo[ranking] = description;
      return memo;
    }, {});
    intExpProps.forEach(prop => scales[prop] = rankingMap(scales[prop]));

    let lastUpdated;
    if (oldValues) {
      const formatted = moment.duration(-oldValues.age, 'seconds').humanize(true);
      lastUpdated = `_You last updated this expertise *${formatted}*._`;
    }

    const state = {
      scales,
      oldValues,
      newValues: {},
      userId,
      expertise,
      expertiseName,
      updateCommand,
      getCommand,
      skippable,
      done,
    };

    return updateExpertiseQuestions(state, [
      [
        oneTimeHeader,
      ],
      [
        lastUpdated,
        '',
        `> ${expertiseName} / *${expertise.category}*`,
        expertise.description && `${expertise.description.replace(/^/gm, '> ')}`,
      ],
    ]);
  });
}

// ========================
// expertise update missing
// ========================

function updateMissing(userId, getCommand) {
  let i = 0;
  const skipped = [];
  const expertiseCount = n => `${n.length} expertise${n.length === 1 ? '' : 's'}`;
  function next(header) {
    i++;
    return query.outstandingExpertisesForUser({userId})
    .then(missing => {
      const notSkipped = missing.filter(({id}) => skipped.indexOf(id) === -1);
      if (notSkipped.length === 0) {
        const done = i > 1 ? 'Done. ' : '';
        return [
          header,
          missing.length === 0 ? `${done}You have no outstanding expertise data.` :
            `${done}You still have outstanding expertise data for ${expertiseCount(missing)}.`,
          `View your expertise list with \`${getCommand('me')}\`.`,
        ];
      }
      const expertise = notSkipped[0];
      const identifier = notSkipped.length === 1 ? 'it' : i === 1 ? 'the first' : 'the next';
      const now = i > 1 ? ' now' : '';
      const skipTxt = skipped.length > 0 ? ` (you've skipped ${skipped.length})` : '';
      return updateExpertiseDialog({
        userId,
        expertise,
        updateCommand: 'update missing',
        getCommand,
        oneTimeHeader: [
          header && [header, ''],
          `I${now} need data for ${expertiseCount(notSkipped)}${skipTxt}. Let's update ${identifier}:`,
        ],
        skippable: true,
        done: (result, skip) => {
          if (skip) {
            skipped.push(expertise.id);
          }
          return next(result);
        },
      });
    });
  }
  return next();
}

export default createCommand({
  name: 'update',
  description: 'Update your interest and experience for the given expertise.',
  usage: '[missing | <expertise name> [interest=<1-5> experience=<1-5>]]',
}, [
  createMatcher({match: 'missing'}, (_, {user, getCommand}) => updateMissing(user.id, getCommand)),
  createParser({
    parseOptions: {
      experience: Number,
      interest: Number,
    },
  }, ({args, options: newValues, errors}, {user, teamId, getCommand}) => {
    const search = args.join(' ');
    if (!search) {
      return false;
    }
    const userId = user.id;
    const output = [...errors];
    // Print all cached output + final message + tag line.
    const done = message => [
      output,
      message,
      `View your expertise list with \`${getCommand('me')}\`.`,
    ];

    return findExpertiseAndHandleErrors(teamId, search).then(results => {
      output.push(results.output);
      const {match: expertise} = results;
      const numProps = intExpProps.reduce((n, p) => n + (p in newValues), 0);
      if (numProps === 1) {
        throw abort(`_You must update both interest and experience at the same time._`);
      }
      else if (numProps === 2) {
        return updateExpertise({userId, expertise, newValues}).then(done);
      }
      const updateCommand = `update ${search.toLowerCase()}`;
      return updateExpertiseDialog({
        userId,
        expertise,
        updateCommand,
        getCommand,
        oneTimeHeader: output.splice(0, output.length),
        done,
      });
    })
    // Error! Print all cached output + error message + usage info, or re-throw.
    .catch(error => {
      if (error.abortData) {
        return [output, error.abortData];
      }
      throw error;
    });
  }),
]);
