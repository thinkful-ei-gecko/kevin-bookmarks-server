const express = require('express');
const xss = require('xss');
const logger = require('../bin/logger');
const BookmarksService = require('./bookmarks-service');
const bookmarkRouter = express.Router();
const bodyParser = express.json();

const sanitizedBookmark = (bookmark) => ({
  id: bookmark.id,
  title: xss(bookmark.title),
  url: bookmark.url,
  description: xss(bookmark.description),
  rating: Number(bookmark.rating),
});

bookmarkRouter
  .route('/')
  .get((req, res, next) => {
    logger.info('bookmarks retreived');
    BookmarksService.getAllBookmarks(req.app.get('db'))
      .then((bookmarks) => {
        return res.status(200).json(bookmarks.map(sanitizedBookmark));
      })
      .catch(next);
  })
  .post(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body;
    const newBookmark = { title, url, description, rating };

    for (const field of ['title', 'url', 'rating']) {
      if (!req.body[field]) {
        logger.error(`${field} is required`);
        return res
          .status(400)
          .send({ error: { message: `${field} is required` } });
      }
    }

    if (
      !Number.isInteger(Number(rating)) ||
      Number(rating) < 0 ||
      Number(rating) > 5
    ) {
      logger.error(`Invalid rating '${rating}' supplied`);
      return res.status(400).send({
        error: { message: 'rating must be a number between 0 and 5' },
      });
    }

    BookmarksService.insertBookmark(req.app.get('db'), newBookmark)
      .then((bookmark) => {
        logger.info(`Bookmark with id ${bookmark.id} created`);
        return res
          .status(201)
          .location(`/bookmarks/${bookmark.id}`)
          .json(sanitizedBookmark(bookmark));
      })
      .catch(next);
  });

bookmarkRouter
  .route('/:bookmark_id')
  .all((req, res, next) => {
    const { bookmark_id } = req.params;
    BookmarksService.getBookmarkById(req.app.get('db'), bookmark_id).then(
      (bookmark) => {
        if (!bookmark) {
          logger.error(`Could not find bookmark with id ${bookmark_id}`);
          return res
            .status(404)
            .send(`Could not find bookmark with id ${bookmark_id}`);
        }
        res.bookmark = bookmark;
        next();
      }
    );
  })
  .get((req, res) => {
    logger.info(`Found bookmark with id ${res.bookmark.id}`);
    return res.status(200).json(sanitizedBookmark(res.bookmark));
  })
  .delete((req, res, next) => {
    const { bookmark_id } = req.params;
    BookmarksService.deleteBookmark(req.app.get('db'), bookmark_id)
      .then(() => {
        logger.info(`Deleted bookmark with id ${bookmark_id}`);
        return res.status(204).end();
      })
      .catch(next);
  });

module.exports = bookmarkRouter;
