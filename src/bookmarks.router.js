const express = require('express');
const uuidv4 = require('uuid/v4');
const logger = require('./logger');
const bookmarkRouter = express.Router();
const bodyParser = express.json();

const bookmarksData = [
  {
    id: uuidv4(),
    title: 'some title',
    url: 'google.com',
    description: 'some description',
    rating: 1,
  },
  {
    id: uuidv4(),
    title: 'more title',
    url: 'google.com',
    description: 'more description',
    rating: 1,
  },
];

bookmarkRouter
  .route('/bookmarks')
  .get((req, res) => {
    logger.info('bookmarks retreived');
    return res.status(200).json(bookmarksData);
  })

  .post(bodyParser, (req, res) => {
    const { title, url, description, rating } = req.body;
    if (!title) {
      logger.error('Title is required');
      return res.status(400).send('Title is required');
    }
    if (!url) {
      logger.error('url is required');
      return res.status(400).send('url is required');
    }
    if (!rating) {
      logger.error('rating is required');
      return res.status(400).send('rating is required');
    }
    let newBookmark = {
      id: uuidv4(),
      title,
      url,
      description,
      rating,
    };
    bookmarksData.push(newBookmark);
    logger.info(`Bookmark with id ${newBookmark.id} created`);
    return res
      .status(201)
      .location(`http://localhost:8000/bookmarks/${newBookmark.id}`)
      .json(newBookmark);
  });

bookmarkRouter
  .route('/bookmarks/:id')
  .get((req, res) => {
    const { id } = req.params;
    let bookmark = bookmarksData.find((b) => b.id === id);
    if (!bookmark) {
      logger.error(`Could not find bookmark with id ${id}`);
      return res.status(404).send(`Could not find bookmark with id ${id}`);
    }
    logger.info(`Found bookmark with id ${id}`);
    return res.status(200).json(bookmark);
  })
  .delete((req, res) => {
    const { id } = req.params;
    let bookmarkIndex = bookmarksData.findIndex((b) => b.id === id);
    if (bookmarkIndex === -1) {
      logger.error(
        `Could not delete bookmark with id ${id} because it does not exist!`
      );
      return res
        .status(404)
        .send(
          `Could not delete bookmark with id ${id} because it does not exist!`
        );
    }
    bookmarksData.splice(bookmarkIndex, 1);
    logger.info(`Deleted bookmark with id ${id}`);
    return res.status(204).end();
  });

module.exports = bookmarkRouter;
