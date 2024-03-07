const express = require('express');
const app = express();
const chalk = require('chalk');
const connectDB = require('./database/connection');

const PORT = process.env.PORT || 8000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(chalk.green(`Server is running on port ${PORT}`));
    });
  })
  .catch((err) => {
    console.error(chalk.red('Failed to connect to the database', err));
    process.exit(1);
  });
