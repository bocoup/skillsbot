import {createCommand} from 'chatter';
import {query} from '../../services/db';

export default createCommand({
  name: 'list',
  description: 'List all expertises, grouped by category.',
}, (message, {user}) => {
  return query.categoriesAndExpertises(user).then(categories => {
    return categories.map(({name, expertises}) => {
      return `*${name}*\n> ${expertises.join(', ')}`;
    });
  });
});
