const knex = require('knex');
const app = require('../src/lib/app');
const { API_TOKEN } = require('../src/config');
const {
  makeBookmarksArray,
  makeMaliciousBookmark,
} = require('./bookmarks-fixtures');

describe.only('Bookmarks Endpoints', () => {
  let db;
  const tableName = 'bookmarks';

  /*****************************************************************
    SETUP
  ******************************************************************/
  before('make knex instance', () => {
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

  after('disconnect from db', () => {
    return db.destroy();
  });

  /*****************************************************************
    Unauthorized requests
  ******************************************************************/
  describe('Unauthorized requests', () => {
    const testBookmarks = makeBookmarksArray();

    beforeEach(`insert testBookmarks into ${tableName}`, () => {
      return db.insert(testBookmarks).into(`${tableName}`);
    });

    it('responds with 401 Unauthorized for GET /bookmarks', () => {
      return supertest(app)
        .get('/bookmarks')
        .expect(401, { error: 'Unauthorized request' });
    });

    it('responds with 401 Unauthorized for GET /bookmarks/:bookmark_id', () => {
      const bookmark = testBookmarks[1];
      return supertest(app)
        .get(`/bookmarks/${bookmark.id}`)
        .expect(401, { error: 'Unauthorized request' });
    });

    it('responds with 401 Unauthorized for POST /bookmarks', () => {
      return supertest(app)
        .post('/bookmarks')
        .send({ title: 'test-title', url: 'http://some.thing.com', rating: 1 })
        .expect(401, { error: 'Unauthorized request' });
    });

    it('responds with 401 Unauthorized for UPDATE /bookmarks/:bookmark_id', () => {
      return supertest(app)
        .patch('/bookmarks')
        .send({ rating: 1 })
        .expect(401, { error: 'Unauthorized request' });
    });

    it('responds with 401 Unauthorized for DELETE /bookmarks/:bookmark_id', () => {
      const bookmark = testBookmarks[1];
      return supertest(app)
        .delete(`/bookmarks/${bookmark.id}`)
        .expect(401, { error: 'Unauthorized request' });
    });
  });

  /*****************************************************************
    GET /bookmarks
  ******************************************************************/
  describe('GET /bookmarks', () => {
    context('Given no bookmarks', () => {
      it('responds with 200 and an empty list', () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', `Bearer ${API_TOKEN}`)
          .expect(200, []);
      });
    });

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach(`insert testBookmarks into ${tableName}`, () => {
        return db.insert(testBookmarks).into(`${tableName}`);
      });

      it('gets the bookmarks from the store', () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', `Bearer ${API_TOKEN}`)
          .expect(200, testBookmarks);
      });
    });

    context('Given an XSS attack bookmark', () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();

      beforeEach(`insert maliciousBookmark into ${tableName}`, () => {
        return db.insert([maliciousBookmark]).into(`${tableName}`);
      });

      it('removes XSS attack content', () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', `Bearer ${API_TOKEN}`)
          .expect(200)
          .expect((res) => {
            expect(res.body[0].title).to.eql(expectedBookmark.title);
            expect(res.body[0].description).to.eql(
              expectedBookmark.description
            );
          });
      });
    });
  });

  /*****************************************************************
    GET /bookmarks/:bookmark_id
  ******************************************************************/
  describe('GET /bookmarks/:bookmark_id', () => {
    context('Given no bookmarks', () => {
      it('responds with 404', () => {
        return supertest(app)
          .get('/bookmarks/123')
          .set('Authorization', `Bearer ${API_TOKEN}`)
          .expect(404, 'Could not find bookmark with id 123');
      });
    });

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach(`insert testBookmarks into ${tableName}`, () => {
        return db.insert(testBookmarks).into(`${tableName}`);
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

    context('Given an XSS attack bookmark', () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();

      beforeEach(`insert maliciousBookmark into ${tableName}`, () => {
        return db.insert([maliciousBookmark]).into(`${tableName}`);
      });

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/bookmarks/${maliciousBookmark.id}`)
          .set('Authorization', `Bearer ${API_TOKEN}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.title).to.eql(expectedBookmark.title);
            expect(res.body.description).to.eql(expectedBookmark.description);
          });
      });
    });
  });

  /*****************************************************************
    DELETE /bookmarks/:bookmark_id
  ******************************************************************/
  describe('DELETE /bookmarks/:bookmark_id', () => {
    context('Given no bookmarks', () => {
      it('responds with 404', () => {
        return supertest(app)
          .delete('/bookmarks/123')
          .set('Authorization', `Bearer ${API_TOKEN}`)
          .expect(404, 'Could not find bookmark with id 123');
      });
    });

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach(`insert testBookmarks into ${tableName}`, () => {
        return db.insert(testBookmarks).into(`${tableName}`);
      });

      it('removes the bookmark by ID from the store', () => {
        const idToRemove = 2;
        const expectedBookmarks = testBookmarks.filter(
          (bm) => bm.id !== idToRemove
        );
        return supertest(app)
          .delete(`/bookmarks/${idToRemove}`)
          .set('Authorization', `Bearer ${API_TOKEN}`)
          .expect(204)
          .then(() =>
            supertest(app)
              .get('/bookmarks')
              .set('Authorization', `Bearer ${API_TOKEN}`)
              .expect(expectedBookmarks)
          );
      });
    });
  });

  /*****************************************************************
    POST /bookmarks
  ******************************************************************/
  describe('POST /bookmarks', () => {
    it('responds with 400 missing title if not supplied', () => {
      const newBookmarkMissingTitle = {
        // title: 'test-title',
        url: 'https://test.com',
        rating: 1,
      };
      return supertest(app)
        .post('/bookmarks')
        .send(newBookmarkMissingTitle)
        .set('Authorization', `Bearer ${API_TOKEN}`)
        .expect(400, {
          error: { message: 'title is required' },
        });
    });

    it('responds with 400 missing url if not supplied', () => {
      const newBookmarkMissingUrl = {
        title: 'test-title',
        // url: 'https://test.com',
        rating: 1,
      };
      return supertest(app)
        .post('/bookmarks')
        .send(newBookmarkMissingUrl)
        .set('Authorization', `Bearer ${API_TOKEN}`)
        .expect(400, {
          error: { message: 'url is required' },
        });
    });

    it('responds with 400 missing rating if not supplied', () => {
      const newBookmarkMissingRating = {
        title: 'test-title',
        url: 'https://test.com',
        // rating: 1,
      };
      return supertest(app)
        .post('/bookmarks')
        .send(newBookmarkMissingRating)
        .set('Authorization', `Bearer ${API_TOKEN}`)
        .expect(400, {
          error: { message: 'rating is required' },
        });
    });

    it('responds with 400 invalid rating if not between 0 and 5', () => {
      const newBookmarkInvalidRating = {
        title: 'test-title',
        url: 'https://test.com',
        rating: 'invalid',
      };
      return supertest(app)
        .post('/bookmarks')
        .send(newBookmarkInvalidRating)
        .set('Authorization', `Bearer ${API_TOKEN}`)
        .expect(400, {
          error: { message: 'rating must be a number between 0 and 5' },
        });
    });

    it('adds a new bookmark to the store', () => {
      const newBookmark = {
        title: 'test-title',
        url: 'https://test.com',
        description: 'test description',
        rating: 1,
      };
      return supertest(app)
        .post('/bookmarks')
        .send(newBookmark)
        .set('Authorization', `Bearer ${API_TOKEN}`)
        .expect(201)
        .expect((res) => {
          expect(res.body.title).to.eql(newBookmark.title);
          expect(res.body.url).to.eql(newBookmark.url);
          expect(res.body.description).to.eql(newBookmark.description);
          expect(res.body.rating).to.eql(newBookmark.rating);
          expect(res.body).to.have.property('id');
          expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`);
        })
        .then((res) =>
          supertest(app)
            .get(`/bookmarks/${res.body.id}`)
            .set('Authorization', `Bearer ${API_TOKEN}`)
            .expect(res.body)
        );
    });

    it('removes XSS attack content', () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();

      return supertest(app)
        .post('/bookmarks')
        .send(maliciousBookmark)
        .set('Authorization', `Bearer ${API_TOKEN}`)
        .expect(201)
        .expect((res) => {
          expect(res.body.title).to.eql(expectedBookmark.title);
          expect(res.body.description).to.eql(expectedBookmark.description);
        });
    });
  });
});
