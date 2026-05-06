const express = require('express');
const app = express();

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  }),
);

const routing = require('./project_modules/routing.js');
routing.configure(app);

app.listen(8080, () => {
  console.log(`App running on port ${8080}.`);
});
