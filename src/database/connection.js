const mongoose = require('mongoose');
const chalk = require('chalk');

require('dotenv').config();

module.exports = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI1, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(chalk.green('MongoDB is connected.'));
  } catch (error) {
    console.log(chalk.red('MongoDB connection error:', err));
  }
};
