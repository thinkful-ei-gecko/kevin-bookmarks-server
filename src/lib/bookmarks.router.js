const express = require('express');
const uuidv4 = require('uuid/v4');
const logger = require('../bin/logger');
const BookmarksService = require('./bookmarks-service');
const Bookmarks = require('../../test/store-temp');
const bookmarkRouter = express.Router();
const bodyParser = express.json();

bookmarkRouter
  .route('/bookmarks')
  .get((req, res, next) => {
    logger.info('bookmarks retreived');
    BookmarksService.getAllBookmarks(req.app.get('db'))
      .then((bookmarks) => {
        return res.status(200).json(bookmarks);
      })
      .catch(next);
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
    Bookmarks.push(newBookmark);
    logger.info(`Bookmark with id ${newBookmark.id} created`);
    return res
      .status(201)
      .location(`http://localhost:8000/bookmarks/${newBookmark.id}`)
      .json(newBookmark);
  });

bookmarkRouter
  .route('/bookmarks/:bookmark_id')
  .get((req, res, next) => {
    const { bookmark_id } = req.params;
    BookmarksService.getBookmarkById(req.app.get('db'), bookmark_id)
      .then((bookmark) => {
        if (!bookmark) {
          logger.error(`Could not find bookmark with id ${bookmark_id}`);
          return res
            .status(404)
            .send(`Could not find bookmark with id ${bookmark_id}`);
        }
        logger.info(`Found bookmark with id ${bookmark_id}`);
        return res.status(200).json(bookmark);
      })
      .catch(next);
  })
  .delete((req, res) => {
    const { bookmark_id } = req.params;
    let bookmarkIndex = Bookmarks.findIndex((b) => b.id === bookmark_id);
    if (bookmarkIndex === -1) {
      logger.error(
        `Could not delete bookmark with id ${bookmark_id} because it does not exist!`
      );
      return res
        .status(404)
        .send(
          `Could not delete bookmark with id ${bookmark_id} because it does not exist!`
        );
    }
    Bookmarks.splice(bookmarkIndex, 1);
    logger.info(`Deleted bookmark with id ${bookmark_id}`);
    return res.status(204).end();
  });

module.exports = bookmarkRouter;
