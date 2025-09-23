import express from "express";
import cors from "cors";
import authRouter from "./routes/auth/authRouter.js";
import adminRouter from "./routes/adminRouter.js";

const app = express();

// Define your allowed origins (add your actual domains here)
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:3000', 
  'http://127.0.0.1:8080',
  'https://yourdomain.com', // Replace with your actual domain
  'https://another-frontend-domain.com'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all origins in development, or check against allowedOrigins in production
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (isDevelopment) {
      // In development, allow all origins
      return callback(null, true);
    } else {
      // In production, check against allowed origins
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      } else {
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));

app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);

export default app;