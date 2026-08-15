const express = require('express');
const fs = require('fs');

const router = express.Router();
const middleware = require('../middlewares');

fs.readdirSync(__dirname)
  .filter((file) => file.indexOf('.') !== 0 && file !== '__index.js')
  .forEach((file) => {
    // console.info(`Loading file ${file}`);
    if (file.slice(-3) === '.js') {
      const routesFile = require(`${__dirname}/${file}`);
      router.use('/', middleware.checkSetToken(), routesFile);
    } else if (fs.lstatSync(`${__dirname}/${file}`).isDirectory() && fs.existsSync(`${__dirname}/${file}/__index.js`)) {
      const indexFile = require(`${__dirname}/${file}/__index.js`);
      router.use(indexFile.routes(), indexFile.allowedMethods());
    }
  });

module.exports = router;
