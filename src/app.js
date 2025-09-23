import express from "express";
import cors from "cors";
import authRouter from "./routes/auth/authRouter.js";
import adminRouter from "./routes/adminRouter.js";

const app = express();

// Define CORS options for production

// Use the cors middleware with your defined options
const allowedOrigins = ['http://localhost:8080/', 'http://192.168.31.19:8080/'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};

app.use(cors(corsOptions));
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);

export default app;
