process.env.TZ = 'UTC';
process.env.NODE_ENV = 'test';
require('dotenv').config();
const chai = require('chai');
const supertest = require('supertest');

global.chai = chai;
global.supertest = supertest;
