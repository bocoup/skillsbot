import {createCommand, createParser} from 'chatter';

export default createCommand({
  name: 'category update',
  description: 'Update a new skill category.',
  usage: '<category name>',
}, createParser(({args}) => {
  return 'update command coming soon';
}));
