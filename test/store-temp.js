const uuid4 = require('uuid/v4');

const Bookmarks = [
  {
    id: uuid4(),
    title: 'Thinkful',
    url: 'https://www.thinkful.com',
    description: 'Think outside the classroom',
    rating: 5,
  },
  {
    id: uuid4(),
    title: 'Google',
    url: 'https://www.google.com',
    description: 'Where we find everything else',
    rating: 4,
  },
  {
    id: uuid4(),
    title: 'MDN',
    url: 'https://developer.mozilla.org',
    description: 'The only place to find web documentation',
    rating: 1,
  },
];

module.exports = { Bookmarks };
