require('dotenv').config();
const { liveJobConsumer } = require('./consumers');

liveJobConsumer.connect();