import {createCommand, createParser} from 'chatter';

export default createCommand({
  name: 'update category',
  description: 'Update a new skills category.',
  usage: '<category name>',
}, createParser(({args}) => {
  return 'update category command coming soon';
}));
