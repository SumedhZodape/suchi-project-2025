import dotenv from 'dotenv';
dotenv.config();
import app from './app.js';
import config from './config/config.js';
import connectDB from './services/db.js';

const PORT = process.env.PORT || config.port || 3000;

connectDB();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
