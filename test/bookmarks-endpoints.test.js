const knex = require('knex');
const app = require('../src/lib/app');
const { API_TOKEN } = require('../src/config');
const { makeBookmarksArray } = require('./bookmarks-fixtures');
const STORE = require('./store-temp');

describe.only(`Bookmarks Endpoints`, () => {
  let db;
  const tableName = 'bookmarks';

  /*****************************************************************
    SETUP
  ******************************************************************/
  before(`make knex instance`, () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    });
    app.set('db', db);
  });

  before(`clean ${tableName}`, () => {
    return db(`${tableName}`).truncate();
  });

  afterEach(`clean ${tableName}`, () => {
    return db(`${tableName}`).truncate();
  });

  after(`disconnect from db`, () => {
    return db.destroy();
  });

  /*****************************************************************
    Unauthorized requests
  ******************************************************************/
  describe(`Unauthorized requests`, () => {
    it(`responds with 401 Unauthorized for GET /bookmarks`, () => {
      return supertest(app)
        .get('/bookmarks')
        .expect(401, { error: 'Unauthorized request' });
    });

    it(`responds with 401 Unauthorized for GET /bookmarks/:bookmark_id`, () => {
      const bookmark = STORE.Bookmarks[1];
      return supertest(app)
        .get(`/bookmarks/${bookmark.id}`)
        .expect(401, { error: 'Unauthorized request' });
    });

    it(`responds with 401 Unauthorized for POST /bookmarks`, () => {
      return supertest(app)
        .post('/bookmarks')
        .send({ title: 'test-title', url: 'http://some.thing.com', rating: 1 })
        .expect(401, { error: 'Unauthorized request' });
    });

    it(`responds with 401 Unauthorized for UPDATE /bookmarks/:bookmark_id`, () => {
      return supertest(app)
        .patch('/bookmarks')
        .send({ rating: 1 })
        .expect(401, { error: 'Unauthorized request' });
    });

    it(`responds with 401 Unauthorized for DELETE /bookmarks/:bookmark_id`, () => {
      const bookmark = STORE.Bookmarks[1];
      return supertest(app)
        .delete(`/bookmarks/${bookmark.id}`)
        .expect(401, { error: 'Unauthorized request' });
    });
  });

  /*****************************************************************
    GET /bookmarks
  ******************************************************************/
  describe('GET /bookmarks', () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', `Bearer ${API_TOKEN}`)
          .expect(200, []);
      });
    });

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach('insert bookmarks', () => {
        return db.insert(testBookmarks).into('bookmarks');
      });

      it('gets the bookmarks from the store', () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', `Bearer ${API_TOKEN}`)
          .expect(200, testBookmarks);
      });
    });
  });

  /*****************************************************************
    GET /bookmarks/:bookmark_id
  ******************************************************************/
  describe('GET /bookmarks/:bookmark_id', () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 404`, () => {
        return supertest(app)
          .get(`/bookmarks/123`)
          .set('Authorization', `Bearer ${API_TOKEN}`)
          .expect(404, `Could not find bookmark with id 123`);
      });
    });

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach('insert bookmarks', () => {
        return db.insert(testBookmarks).into('bookmarks');
      });

      it('responds with 200 and the specified bookmark', () => {
        const bookmarkId = 2;
        const expectedBookmark = testBookmarks[bookmarkId - 1];
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${API_TOKEN}`)
          .expect(200, expectedBookmark);
      });
    });
  });
});
