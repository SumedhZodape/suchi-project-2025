import express from "express";
import {
  uploadUsers,
  getDashboardData,
  allUsers,
  getPrant,
  getSanghatan,
  getAllDropdowns,
  addOrUpdatePratinidhiUser,
  getDashboardDataPrantPracharakBaithak,
  allUsersPrantPracharak,
  addOrUpdatePrantPracharakUser,
  allAbkmUsers,
  addOrUpdateAbkmUser,
  getDashboardDataKaryakariMandal,
  addOrUpdateUser,
  updateDropdownStatus,
  getParticularPrantname,
  getParticularSanghatanname, sendMail, createAdminSetting, getAdminSettings, updateAdminSetting, deleteAdminSetting, createSubmitData, getSubmitData,
  updateDropdownItem
} from "../controllers/adminController.js";
import { authenticate } from "../middlewares/auth.js";
import multer from "multer";

const router = express.Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv") {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"), false);
    }
  },
});

// upload csv route
router.post("/upload/:type", authenticate, upload.single("file"), uploadUsers);
router.get("/dashboard-data/:year", authenticate, getDashboardData);
router.get("/all-users/:year", authenticate, allUsers);
router.get("/prants", getPrant);
router.get("/prant/:id", authenticate, getParticularPrantname);

router.get("/sanghatan", getSanghatan);
router.get("/sanghatan/:id", authenticate, getParticularSanghatanname);
router.get("/all-dropdowns", authenticate, getAllDropdowns);
router.post("/add-pratinidhi-user", authenticate, addOrUpdatePratinidhiUser);
router.post("/add_dropdown/:type", authenticate, addOrUpdateUser);

router.put("/update-status/:type/:id", authenticate, updateDropdownItem);

router.post("/send-form", authenticate, sendMail)
router.get("/setting", authenticate, getAdminSettings); // GET all
router.post("/setting", authenticate, createAdminSetting); // POST new
router.put("/setting/:id", authenticate, updateAdminSetting); // PUT update
router.delete("/setting/:id", authenticate, deleteAdminSetting); // DELETE
router.get("/submitted", authenticate, getSubmitData);
router.post("/submitted", authenticate, createSubmitData);

// prant pracharak baithak
router.get(
  "/dashboard-data-prant-pracharak-baithak/:year",
  authenticate,
  getDashboardDataPrantPracharakBaithak
);
router.get(
  "/all-users-prant-pracharak/:year",
  authenticate,
  allUsersPrantPracharak
);
router.post(
  "/add-prant-pracharak-user",
  authenticate,
  addOrUpdatePrantPracharakUser
);

// karyakari mandal
router.get(
  "/dashboard-data-karyakari-mandal/:year",
  authenticate,
  getDashboardDataKaryakariMandal
);

// Route for getting all ABKM users
router.get("/all-abkm-users/:year", authenticate, allAbkmUsers);
// Route for adding or updating an ABKM user
router.post("/add-abkm-user", authenticate, addOrUpdateAbkmUser);
router.put("/update_dropdown/:type/:id", authenticate, updateDropdownItem);
export default router;
