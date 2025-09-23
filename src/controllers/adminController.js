import mongoose from "mongoose";
import csv from "csv-parser";
import { Switch } from "antd";
import { Readable } from "stream";
import User from "../models/User.js";
import Star from "../models/Star.js";
import Prakar from "../models/Prakar.js";
import Sanghatan from "../models/Sanghatan.js";
import Dayitva from "../models/Dayitva.js";
import Kshetra from "../models/Kshetra.js";
import Prant from "../models/Prant.js";
import { validationResult } from "express-validator";
import Ppuser from "../models/Ppuser.js";
import AbkmUser from "../models/AbkmUser.js";
import nodemailer from "nodemailer";
import { Parser } from "json2csv";
import AdminSetting from "../models/AdminSetting.js";
import Submitted from "../models/Submitted.js";
// Controller to handle CSV file upload and processing
// Utility: Validate required fields
const validateRequiredFields = (row, requiredFields) => {
  const missing = [];
  for (const field of requiredFields) {
    if (!row[field] || row[field].toString().trim() === "") {
      missing.push(field);
    }
  }
  return missing;
};

// Utility: Validate enum fields
const validateEnumField = (value, allowed, fieldName) => {
  if (value && !allowed.includes(value.toLowerCase())) {
    return `Invalid ${fieldName} value: ${value}`;
  }
  return null;
};

// Utility: Validate boolean fields
const validateBooleanField = (value, fieldName) => {
  if (
    value !== undefined &&
    value !== "" &&
    value !== null &&
    value.toString().trim() !== "1" &&
    value.toString().trim() !== "0"
  ) {
    return `Invalid value for ${fieldName}: ${value}`;
  }
  return null;
};

// Utility: Resolve referenced IDs
const resolveReference = async (Model, name, fieldName) => {
  if (!name) return { id: null, error: `Missing ${fieldName}` };
  const doc = await Model.findOne({ name: name.trim() });
  if (!doc) return { id: null, error: `Invalid ${fieldName}: ${name}` };
  return { id: doc._id, error: null };
};

export const uploadUsers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { type } = req.params;
    let Model, requiredFields, booleanFields;

    if (type === "pratinidhi-sabha") {
      Model = User;
      requiredFields = [
        "name",
        "star_id",
        "prakar_id",
        "sanghatan_id",
        "dayitva_id",
        "kshetra_id",
        "prant_id",
        "kendra",
        "email",
        "gender",
        "attendance",
        "year",
      ];
      booleanFields = [
        "a_b_karykarini_baithak",
        "kshetra_k_p_baithak",
        "prant_k_p_baithak",
        "karyakari_madal",
        "pratinidhi_sabha",
        "prant_p_baithak",
        "kshetra_p_baithak",
        "palak_adhikari_baithak",
      ];
    } else if (type === "prant-pracharak") {
      Model = Ppuser;
      requiredFields = [
        "name",
        "star_id",
        "prakar_id",
        "sanghatan_id",
        "dayitva_id",
        "kshetra_id",
        "prant_id",
        "kendra",
        "email",
        "gender",
        "attendance",
        "year",
      ];
      booleanFields = [
        "gatividhi_toli_baithak",
        "a_b_baithak",
        "prant_pracharak_baithak",
        "kshetra_pracharak_baithak",
      ];
    } else if (type === "karyakari-mandal") {
      Model = AbkmUser;
      requiredFields = [
        "name",
        "star_id",
        "prakar_id",
        "sanghatan_id",
        "dayitva_id",
        "kshetra_id",
        "prant_id",
        "kendra",
        "email",
        "gender",
        "attendance",
        "year",
      ];
      booleanFields = [
        "a_b_baithak",
        "kshetra_karyawah_baithak",
        "prant_karyawah_baithak",
        "karyakari_mandal_baithak",
        "prant_pracharak_baithak",
        "kshetra_pracharak_baithak",
        "bhougolic_palak_adhikari_baithak",
      ];
    } else {
      return res.status(400).json({ error: "Invalid upload type" });
    }

    const expectedHeaders = [...requiredFields, ...booleanFields];
    const results = [];
    const errors = [];
    let rowNumber = 0;
    let isHeaderValidated = false;
    let responseSent = false; // track if headers are sent

    const stream = Readable.from(req.file.buffer);

    stream
      .pipe(csv())
      .on("data", (row) => {
        if (responseSent) return;

        const normalizedRow = {};
        Object.keys(row).forEach((key) => {
          const cleanKey = key.replace(/^['"]+|['"]+$/g, "").trim();
          normalizedRow[cleanKey] = row[key]?.trim();
        });

        if (!isHeaderValidated) {
          const incomingHeaders = Object.keys(normalizedRow).map((h) =>
            h.toLowerCase()
          );
          const missing = expectedHeaders.filter(
            (field) => !incomingHeaders.includes(field.toLowerCase())
          );
          const extra = incomingHeaders.filter(
            (header) =>
              !expectedHeaders.map((f) => f.toLowerCase()).includes(header)
          );
          if (missing.length > 0 || extra.length > 5) {
            responseSent = true;
            stream.destroy();
            return res.status(400).json({
              message:
                "Meeting type mismatch. Uploaded CSV does not match selected meeting format.",
              missingHeaders: missing,
              extraHeaders: extra,
            });
          }
          isHeaderValidated = true;
        }

        results.push(normalizedRow);
      })
      .on("end", async () => {
        if (responseSent) return;
        try {
          for (const row of results) {
            rowNumber++;
            const errorObj = { row: rowNumber, issues: [] };
            const missingFields = validateRequiredFields(row, requiredFields);
            if (missingFields.length) {
              errorObj.issues.push(
                `Missing fields: ${missingFields.join(", ")}`
              );
            }

            const [
              starRef,
              prakarRef,
              sanghatanRef,
              dayitvaRef,
              kshetraRef,
              prantRef,
            ] = await Promise.all([
              resolveReference(Star, row.star_id, "star_id"),
              resolveReference(Prakar, row.prakar_id, "prakar_id"),
              resolveReference(Sanghatan, row.sanghatan_id, "sanghatan_id"),
              resolveReference(Dayitva, row.dayitva_id, "dayitva_id"),
              resolveReference(Kshetra, row.kshetra_id, "kshetra_id"),
              resolveReference(Prant, row.prant_id, "prant_id"),
            ]);

            [
              starRef,
              prakarRef,
              sanghatanRef,
              dayitvaRef,
              kshetraRef,
              prantRef,
            ].forEach((ref) => {
              if (ref.error) errorObj.issues.push(ref.error);
            });

            const attendanceErr = validateEnumField(
              row.attendance,
              ["p", "a"],
              "attendance"
            );
            if (attendanceErr) errorObj.issues.push(attendanceErr);

            const genderErr = validateEnumField(
              row.gender,
              ["m", "f"],
              "gender"
            );
            if (genderErr) errorObj.issues.push(genderErr);

            for (const field of booleanFields) {
              const boolErr = validateBooleanField(row[field], field);
              if (boolErr) errorObj.issues.push(boolErr);
            }

            if (errorObj.issues.length > 0) {
              errors.push(errorObj);
            }
          }

          if (errors.length > 0) {
            return res.status(400).json({
              message: "Validation errors in CSV file",
              errors,
            });
          }

          rowNumber = 0;
          for (const row of results) {
            rowNumber++;
            const [
              starRef,
              prakarRef,
              sanghatanRef,
              dayitvaRef,
              kshetraRef,
              prantRef,
            ] = await Promise.all([
              resolveReference(Star, row.star_id, "star_id"),
              resolveReference(Prakar, row.prakar_id, "prakar_id"),
              resolveReference(Sanghatan, row.sanghatan_id, "sanghatan_id"),
              resolveReference(Dayitva, row.dayitva_id, "dayitva_id"),
              resolveReference(Kshetra, row.kshetra_id, "kshetra_id"),
              resolveReference(Prant, row.prant_id, "prant_id"),
            ]);

            const doc = {
              name: row.name,
              star_id: starRef.id,
              prakar_id: prakarRef.id,
              sanghatan_id: sanghatanRef.id,
              dayitva_id: dayitvaRef.id,
              kshetra_id: kshetraRef.id,
              prant_id: prantRef.id,
              kendra: row.kendra,
              mobile_no_1: row.mobile_no_1 || "",
              mobile_no_2: row.mobile_no_2 || "",
              email: row.email,
              gender: row.gender?.toLowerCase(),
              attendance: row.attendance?.toLowerCase(),
              year: parseInt(row.year),
            };

            for (const field of booleanFields) {
              doc[field] = row[field]?.toString().trim() === "1";
            }

            // const duplicate = await Model.findOne({
            //   $or: [
            //     { mobile_no_1: doc.mobile_no_1 },
            //     { email: doc.email },
            //     { name: doc.name },
            //   ],
            // });

            // if (duplicate) {
            //   errors.push({
            //     row: rowNumber,
            //     issues: [
            //       `User already exists with mobile: ${doc.mobile_no_1}, email: ${doc.email}`,
            //     ],
            //   });
            //   continue;
            // }

            await new Model(doc).save();
          }

          if (errors.length > 0) {
            return res.status(400).json({
              message:
                "कुछ उपयोगकर्ता पहले से मौजूद हैं या डेटा त्रुटियाँ हैं।",
              errors,
            });
          }

          res.status(201).json({
            message: "Users uploaded successfully",
            count: results.length,
          });
        } catch (error) {
          if (!res.headersSent) {
            res.status(500).json({
              message: "Error processing CSV file",
              error: error.message,
            });
          }
        }
      })
      .on("error", (error) => {
        if (!res.headersSent) {
          res
            .status(400)
            .json({ message: "Error parsing CSV file", error: error.message });
        }
      });
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
};

export const getDashboardData = async (req, res) => {
  try {
    const { year } = req.params;

    const totalUsers = await User.countDocuments({ year });
    // Female count
    const femaleCount = await User.countDocuments({ gender: "f", year });

    // Sanghachalak Data
    const sanghachalakNames = [
      "मा. क्षेत्र संघचालक",
      "मा. प्रांत संघचालक",
      "मा. सह क्षेत्र संघचालक",
      "मा. सह प्रांत संघचालक",
    ];
    const sanghachalakDayitvas = await Dayitva.find({
      name: { $in: sanghachalakNames },
    });
    const sanghachalakDayitvaIds = sanghachalakDayitvas.map((d) => d._id);
    const sanghachalakDataCount = await User.countDocuments({
      dayitva_id: { $in: sanghachalakDayitvaIds },
      year,
    });

    // Karyvahak Data
    const karyvahakNames = [
      "क्षेत्र कार्यवाह",
      "प्रांत कार्यवाह",
      "सह क्षेत्र कार्यवाह",
      "सह प्रांत कार्यवाह",
    ];
    const karyvahakDayitvas = await Dayitva.find({
      name: { $in: karyvahakNames },
    });
    const karyvahakDayitvaIds = karyvahakDayitvas.map((d) => d._id);
    const karyvahakDataCount = await User.countDocuments({
      dayitva_id: { $in: karyvahakDayitvaIds },
      year,
    });

    // Pracharak Data
    const pracharakNames = [
      "क्षेत्र प्रचारक",
      "प्रांत प्रचारक",
      "सह क्षेत्र प्रचारक",
      "सह प्रांत प्रचारक",
    ];
    const pracharakDayitvas = await Dayitva.find({
      name: { $in: pracharakNames },
    });
    const pracharakDayitvaIds = pracharakDayitvas.map((d) => d._id);
    const pracharakDataCount = await User.countDocuments({
      dayitva_id: { $in: pracharakDayitvaIds },
      year,
    });

    // Sharirik Pramuk Data
    const sharirikPramukNames = [
      "क्षेत्र शारीरिक प्रमुख",
      "प्रांत शारीरिक प्रमुख",
      "सह क्षेत्र शारीरिक प्रमुख",
    ];
    const sharirikPramukDayitvas = await Dayitva.find({
      name: { $in: sharirikPramukNames },
    });
    const sharirikPramukDayitvaIds = sharirikPramukDayitvas.map((d) => d._id);
    const sharirikPramukDataCount = await User.countDocuments({
      dayitva_id: { $in: sharirikPramukDayitvaIds },
      year,
    });

    // Baudhik Pramukh Data
    const baudhikPramukhNames = [
      "क्षेत्र बौद्धिक प्रमुख",
      "प्रांत बौद्धिक प्रमुख",
      "सह क्षेत्र बौद्धिक प्रमुख",
    ];
    const baudhikPramukhDayitvas = await Dayitva.find({
      name: { $in: baudhikPramukhNames },
    });
    const baudhikPramukhDayitvaIds = baudhikPramukhDayitvas.map((d) => d._id);
    const baudhikPramukhDataCount = await User.countDocuments({
      dayitva_id: { $in: baudhikPramukhDayitvaIds },
      year,
    });



    // Seva Pramukh Data
    const sevaPramukhNames = [
      "क्षेत्र सेवा प्रमुख",
      "प्रांत सेवा प्रमुख",
      "सह क्षेत्र सेवा प्रमुख",
      "सह प्रांत सेवा प्रमुख",
    ];
    const sevaPramukhDayitvas = await Dayitva.find({
      name: { $in: sevaPramukhNames },
    });
    const sevaPramukhDayitvaIds = sevaPramukhDayitvas.map((d) => d._id);
    const sevaPramukhDataCount = await User.countDocuments({
      dayitva_id: { $in: sevaPramukhDayitvaIds },
      year,
    });

    // Vyavastha Pramukh Data
    const vyavasthaPramukhNames = [
      "क्षेत्र व्यवस्था प्रमुख",
      "प्रांत व्यवस्था प्रमुख",
    ];
    const vyavasthaPramukhDayitvas = await Dayitva.find({
      name: { $in: vyavasthaPramukhNames },
    });
    const vyavasthaPramukhDayitvaIds = vyavasthaPramukhDayitvas.map(
      (d) => d._id
    );
    const vyavasthaPramukhDataCount = await User.countDocuments({
      dayitva_id: { $in: vyavasthaPramukhDayitvaIds },
      year,
    });

    // Sampark Pramukh Data
    const samparkPramukhNames = [
      "क्षेत्र संपर्क प्रमुख",
      "क्षेत्र सह संपर्क प्रमुख",
      "प्रांत संपर्क प्रमुख",
      "संपर्क प्रमुख",
      "सह क्षेत्र संपर्क प्रमुख",
    ];
    const samparkPramukhDayitvas = await Dayitva.find({
      name: { $in: samparkPramukhNames },
    });
    const samparkPramukhDayitvaIds = samparkPramukhDayitvas.map((d) => d._id);
    const samparkPramukhDataCount = await User.countDocuments({
      dayitva_id: { $in: samparkPramukhDayitvaIds },
      year,
    });

    // Prachar Pramukh Data
    const pracharPramukhNames = [
      "क्षेत्र प्रचार प्रमुख",
      "प्रचार प्रमुख",
      "प्रांत प्रचार प्रमुख",
      "सह क्षेत्र प्रचार प्रमुख",
    ];
    const pracharPramukhDayitvas = await Dayitva.find({
      name: { $in: pracharPramukhNames },
    });
    const pracharPramukhDayitvaIds = pracharPramukhDayitvas.map((d) => d._id);
    const pracharPramukhDataCount = await User.countDocuments({
      dayitva_id: { $in: pracharPramukhDayitvaIds },
      year,
    });

    // Vibhag Pramukh Data
    const vibhagPramukhNames = ["विभाग प्रचारक"];
    const vibhagPramukhDayitvas = await Dayitva.find({
      name: { $in: vibhagPramukhNames },
    });
    const vibhagPramukhDayitvaIds = vibhagPramukhDayitvas.map((d) => d._id);
    const vibhagPramukhDataCount = await User.countDocuments({
      dayitva_id: { $in: vibhagPramukhDayitvaIds },
      year,
    });

    // Pratinidhi Data
    const pratinidhiNames = ["प्रतिनिधि"];
    const pratinidhiDayitvas = await Dayitva.find({
      name: { $in: pratinidhiNames },
    });
    const pratinidhiDayitvaIds = pratinidhiDayitvas.map((d) => d._id);
    const pratinidhiDataCount = await User.countDocuments({
      dayitva_id: { $in: pratinidhiDayitvaIds },
      year,
    });

    // Purv Prant Pracharak Data
    const purvPrantPracharakNames = ["पूर्व प्रांत प्रचारक"];
    const purvPrantPracharakDayitvas = await Dayitva.find({
      name: { $in: purvPrantPracharakNames },
    });
    const purvPrantPracharakDayitvaIds = purvPrantPracharakDayitvas.map(
      (d) => d._id
    );
    const purvPrantPracharakDataCount = await User.countDocuments({
      dayitva_id: { $in: purvPrantPracharakDayitvaIds },
      year,
    });

    // Nimarntrit Data
    const nimarntritNames = ["विशेष निमंत्रित"];
    const nimarntritDayitvas = await Dayitva.find({
      name: { $in: nimarntritNames },
    });
    const nimarntritDayitvaIds = nimarntritDayitvas.map((d) => d._id);
    const nimarntritDataCount = await User.countDocuments({
      dayitva_id: { $in: nimarntritDayitvaIds },
      year,
    });

    // Vividh Kshetra Data
    // Find star and prakar with name 'विविध क्षेत्र'
    const vividhStar = await Star.findOne({ name: "विविध क्षेत्र" });
    const vividhPrakar = await Prakar.findOne({ name: "विविध क्षेत्र" });
    let vividhkshetraDataCount = 0;
    if (vividhStar && vividhPrakar) {
      vividhkshetraDataCount = await User.countDocuments({
        star_id: vividhStar._id,
        prakar_id: vividhPrakar._id,
        year,
      });
    }

    // Prant Shaha Data
    // Find star and prakar with name 'रा. स्व. संघ'
    const raSwaStar = await Star.findOne({ name: "प्रांत" });
    const raSwaStarPrakar = await Prakar.findOne({ name: "रा. स्व. संघ" });
    let prantShahaDataCount = 0;
    if (raSwaStar && raSwaStarPrakar) {
      prantShahaDataCount = await User.countDocuments({
        star_id: raSwaStar._id,
        prakar_id: raSwaStarPrakar._id,
        year,
      });
    }

    // baithakCount
    const baithakCount = await User.countDocuments({
      $or: [
        { a_b_karykarini_baithak: true },
        { kshetra_k_p_baithak: true },
        { prant_k_p_baithak: true },
        { karyakari_madal: true },
        { pratinidhi_sabha: true },
        { prant_p_baithak: true },
        { kshetra_p_baithak: true },
        { palak_adhikari_baithak: true },
      ],
      year,
    });

    // karykari mandal baithak count
    const karykariMandalBaithakCount = await User.countDocuments({
      karyakari_madal: true,
      year,
    });

    res.status(200).json({
      totalUsers,
      sanghachalakDataCount,
      karyvahakDataCount,
      pracharakDataCount,
      sharirikPramukDataCount,
      baudhikPramukhDataCount,
      sevaPramukhDataCount,
      vyavasthaPramukhDataCount,
      samparkPramukhDataCount,
      pracharPramukhDataCount,
      vibhagPramukhDataCount,
      pratinidhiDataCount,
      purvPrantPracharakDataCount,
      nimarntritDataCount,
      vividhkshetraDataCount,
      prantShahaDataCount,
      femaleCount,
      baithakCount,
      karykariMandalBaithakCount,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching dashboard data",
      error: error.message,
    });
  }
};

export const allUsers = async (req, res) => {
  try {
    const { year } = req.params;
    console.log(year);
    const users = await User.find({ year })
      .populate("star_id", "name")
      .populate("prakar_id", "name")
      .populate("sanghatan_id", "name")
      .populate("dayitva_id", "name")
      .populate("kshetra_id", "name")
      .populate("prant_id", "name");

    // Map users to return only required fields and rename keys
    const mappedUsers = users.map((user) => {
      const obj = user.toObject();
      return {
        _id: obj._id,
        name: obj.name,
        star: obj.star_id?.name || "",
        prakar: obj.prakar_id?.name || "",
        sanghatan: obj.sanghatan_id?.name || "",
        dayitva: obj.dayitva_id?.name || "",
        kshetra: obj.kshetra_id?.name || "",
        prant: obj.prant_id?.name || "",
        kendra: obj.kendra,
        mobile_no_1: obj.mobile_no_1,
        mobile_no_2: obj.mobile_no_2,
        email: obj.email,
        a_b_karykarini_baithak: obj.a_b_karykarini_baithak,
        kshetra_k_p_baithak: obj.kshetra_k_p_baithak,
        prant_k_p_baithak: obj.prant_k_p_baithak,
        karyakari_madal: obj.karyakari_madal,
        pratinidhi_sabha: obj.pratinidhi_sabha,
        prant_p_baithak: obj.prant_p_baithak,
        kshetra_p_baithak: obj.kshetra_p_baithak,
        palak_adhikari_baithak: obj.palak_adhikari_baithak,
        gender: obj.gender,
        attendance: obj.attendance,
        // usertype: obj.usertype,
        year: obj.year,
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt,
        __v: obj.__v,
      };
    });

    res.status(200).json(mappedUsers);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching users",
      error: error.message,
    });
  }
};

export const getPrant = async (req, res) => {
  try {
    const prants = await Prant.find().select("name");
    res.status(200).json(prants);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching prants",
      error: error.message,
    });
  }
};

export const getParticularPrantname = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Prant ID is required" });
    }

    const users = await User.find({ prant_id: id })
      .populate("star_id", "name")
      .populate("prakar_id", "name")
      .populate("sanghatan_id", "name")
      .populate("dayitva_id", "name")
      .populate("kshetra_id", "name")
      .populate("prant_id", "name");
    const mappedUsers = users.map((user) => {
      const obj = user.toObject();
      return {
        _id: obj._id,
        name: obj.name,
        star: obj.star_id?.name || "",
        prakar: obj.prakar_id?.name || "",
        sanghatan: obj.sanghatan_id?.name || "",
        dayitva: obj.dayitva_id?.name || "",
        kshetra: obj.kshetra_id?.name || "",
        prant: obj.prant_id?.name || "",
        kendra: obj.kendra,
        mobile_no_1: obj.mobile_no_1,
        mobile_no_2: obj.mobile_no_2,
        email: obj.email,
        a_b_karykarini_baithak: obj.a_b_karykarini_baithak,
        kshetra_k_p_baithak: obj.kshetra_k_p_baithak,
        prant_k_p_baithak: obj.prant_k_p_baithak,
        karyakari_madal: obj.karyakari_madal,
        pratinidhi_sabha: obj.pratinidhi_sabha,
        prant_p_baithak: obj.prant_p_baithak,
        kshetra_p_baithak: obj.kshetra_p_baithak,
        palak_adhikari_baithak: obj.palak_adhikari_baithak,
        gender: obj.gender,
        attendance: obj.attendance,
        // usertype: obj.usertype,
        year: obj.year,
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt,
        __v: obj.__v,
      };
    });

    res.status(200).json(mappedUsers);
  } catch (error) {
    console.error("Error fetching prant:", error);
    res.status(500).json({
      message: "Error fetching prant",
      error: error.message,
    });
  }
};

export const getSanghatan = async (req, res) => {
  try {
    const sanghatans = await Sanghatan.find().select("name");
    res.status(200).json(sanghatans);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching sanghatans",
      error: error.message,
    });
  }
};
export const getParticularSanghatanname = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Sanghatan ID is required" });
    }

    const users = await User.find({ sanghatan_id: id })
      .populate("star_id", "name")
      .populate("prakar_id", "name")
      .populate("sanghatan_id", "name")
      .populate("dayitva_id", "name")
      .populate("kshetra_id", "name")
      .populate("prant_id", "name");

    const mappedUsers = users.map((user) => {
      const obj = user.toObject();
      return {
        _id: obj._id,
        name: obj.name,
        star: obj.star_id?.name || "",
        prakar: obj.prakar_id?.name || "",
        sanghatan: obj.sanghatan_id?.name || "",
        dayitva: obj.dayitva_id?.name || "",
        kshetra: obj.kshetra_id?.name || "",
        prant: obj.prant_id?.name || "",
        kendra: obj.kendra,
        mobile_no_1: obj.mobile_no_1,
        mobile_no_2: obj.mobile_no_2,
        email: obj.email,
        a_b_karykarini_baithak: obj.a_b_karykarini_baithak,
        kshetra_k_p_baithak: obj.kshetra_k_p_baithak,
        prant_k_p_baithak: obj.prant_k_p_baithak,
        karyakari_madal: obj.karyakari_madal,
        pratinidhi_sabha: obj.pratinidhi_sabha,
        prant_p_baithak: obj.prant_p_baithak,
        kshetra_p_baithak: obj.kshetra_p_baithak,
        palak_adhikari_baithak: obj.palak_adhikari_baithak,
        gender: obj.gender,
        attendance: obj.attendance,
        year: obj.year,
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt,
        __v: obj.__v,
      };
    });
    console.log("Sanghatan:", mappedUsers);
    res.status(200).json(mappedUsers);
  } catch (error) {
    console.error("Error fetching sanghatan:", error);
    res.status(500).json({
      message: "Error fetching sanghatan",
      error: error.message,
    });
  }
};

export const getAllDropdowns = async (req, res) => {
  try {
    const stars = await Star.find().select("name active kshetra_id"); // Remove { active: true }
    const prakars = await Prakar.find().select("name active");
    const sanghatans = await Sanghatan.find().select("name active");
    const dayitvas = await Dayitva.find().select("name active");
    const kshetras = await Kshetra.find().select("name active");
    const prants = await Prant.find().select("name active kshetra_id");

    res.status(200).json({
      stars,
      prakars,
      sanghatans,
      dayitvas,
      kshetras,
      prants,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching dropdown data",
      error: error.message,
    });
  }
};

export const addOrUpdateUser = async (req, res) => {
  try {
    const { type } = req.params;
    const { name, active = true, kshetra_id } = req.body;

    if (!type || !name) {
      return res.status(400).json({ message: "Type and name are required" });
    }

    let Model;
    switch (type) {
      case "stars":
        Model = Star;
        break;
      case "prakars":
        Model = Prakar;
        break;
      case "sanghatans":
        Model = Sanghatan;
        break;
      case "dayitvas":
        Model = Dayitva;
        break;
      case "kshetras":
        Model = Kshetra;
        break;
      case "prants":
        Model = Prant;
        break;
      default:
        return res.status(400).json({ message: "Invalid type" });
    }

    // Check for existing name
    const existing = await Model.findOne({ name: name });
    if (existing) {
      return res.status(400).json({ message: "Name already exists" });
    }

    // If type is 'prants', ensure valid kshetra_id
    let dataToSave = { name, active };
    if (type === "prants") {
      if (!kshetra_id || !mongoose.Types.ObjectId.isValid(kshetra_id)) {
        return res
          .status(400)
          .json({ message: "Valid kshetra_id is required for prants" });
      }
      dataToSave.kshetra_id = kshetra_id;
    }

    const doc = new Model(dataToSave);
    await doc.save();

    res.status(201).json({ message: "Added successfully", data: doc });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error adding data", error: error.message });
  }
};

export const updateDropdownStatus = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { isActive } = req.body;

    let Model;
    switch (type) {
      case "stars":
        Model = Star;
        break;
      case "prakars":
        Model = Prakar;
        break;
      case "sanghatans":
        Model = Sanghatan;
        break;
      case "dayitvas":
        Model = Dayitva;
        break;
      case "kshetras":
        Model = Kshetra;
        break;
      case "prants":
        Model = Prant;
        break;
      default:
        return res.status(400).json({ message: "Invalid type" });
    }

    const doc = await Model.findById(id);
    if (!doc) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Simulate toggle without saving to DB
    const simulatedDoc = {
      ...doc.toObject(),
      isActive: isActive, // not persisted
    };

    res
      .status(200)
      .json({ message: "Status toggled (not saved)", data: simulatedDoc });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating status", error: err.message });
  }
};

export const addOrUpdatePratinidhiUser = async (req, res) => {
  try {
    const {
      id, // optional, if present then update
      name,
      star_id,
      prakar_id,
      sanghatan_id,
      dayitva_id,
      kshetra_id,
      prant_id,
      kendra,
      mobile_no_1,
      mobile_no_2,
      email,
      a_b_karykarini_baithak,
      kshetra_k_p_baithak,
      prant_k_p_baithak,
      karyakari_madal,
      pratinidhi_sabha,
      prant_p_baithak,
      kshetra_p_baithak,
      palak_adhikari_baithak,
      gender,
      attendance,
    } = req.body;
    console.log(req.body)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Validate required fields
    if (
      !name ||
      !star_id ||
      !prakar_id ||
      !sanghatan_id ||
      !dayitva_id ||
      !kshetra_id ||
      !prant_id ||
      !kendra ||
      !email ||
      !gender
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate gender and attendance enums
    if (!["m", "f"].includes(gender.toLowerCase())) {
      return res.status(400).json({ message: "Invalid gender value" });
    }
    if (attendance && !["p", "a"].includes(attendance.toLowerCase())) {
      return res.status(400).json({ message: "Invalid attendance value" });
    }

    // Set current year
    const currentYear = new Date().getFullYear().toString();

    const userData = {
      name,
      star_id,
      prakar_id,
      sanghatan_id,
      dayitva_id,
      kshetra_id,
      prant_id,
      kendra,
      mobile_no_1,
      mobile_no_2,
      email,
      a_b_karykarini_baithak: !!a_b_karykarini_baithak,
      kshetra_k_p_baithak: !!kshetra_k_p_baithak,
      prant_k_p_baithak: !!prant_k_p_baithak,
      karyakari_madal: !!karyakari_madal,
      pratinidhi_sabha: !!pratinidhi_sabha,
      prant_p_baithak: !!prant_p_baithak,
      kshetra_p_baithak: !!kshetra_p_baithak,
      palak_adhikari_baithak: !!palak_adhikari_baithak,
      gender: gender.toLowerCase(),
      attendance: attendance ? attendance.toLowerCase() : "p",
      year: currentYear,
    };

    let user;
    if (id) {
      // Update existing user
      user = await User.findByIdAndUpdate(id, userData, { new: true });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json({
        message: "User updated successfully",
        user,
      });
    } else {
      // Add new user
      user = new User(userData);
      await user.save();
      res.status(201).json({
        message: "User added successfully",
        user,
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error adding or updating user",
      error: error.message,
    });
  }
};

//prant pracharak
export const getDashboardDataPrantPracharakBaithak = async (req, res) => {
  try {
    const { year } = req.params;

    const totalUsers = await Ppuser.countDocuments({ year });

    // Find star document with name 'अ. भा.'
    const abhaStar = await Star.findOne({ name: "अ. भा." });
    console.log(abhaStar);
    const a_b_adhikariTotal = abhaStar
      ? await Ppuser.countDocuments({ star_id: abhaStar._id, year })
      : 0;

    // Find star document with name 'गतिविधि'
    const gatiStar = await Star.findOne({ name: "गतिविधि" });
    const gatividhiTotal = gatiStar
      ? await Ppuser.countDocuments({ star_id: gatiStar._id, year })
      : 0;

    // क्षेत्र प्रचारक - star (क्षेत्र) dayitva (क्षेत्र प्रचारक)
    const kshetraStar = await Star.findOne({ name: "क्षेत्र" });
    const kshetraPracharkDayitva = await Dayitva.findOne({
      name: "क्षेत्र प्रचारक",
    });
    const kshetraPracharkTotal =
      kshetraStar && kshetraPracharkDayitva
        ? await Ppuser.countDocuments({
          star_id: kshetraStar._id,
          dayitva_id: kshetraPracharkDayitva._id,
          year,
        })
        : 0;

    // क्षेत्र प्रचारक प्रमुख - star (क्षेत्र) dayitva (क्षेत्र प्रचारक प्रमुख)
    const kshetraPracharkPramukhDayitva = await Dayitva.findOne({
      name: "क्षेत्र प्रचारक प्रमुख",
    });
    const kshetraPracharkPramukhTotal =
      kshetraStar && kshetraPracharkPramukhDayitva
        ? await Ppuser.countDocuments({
          star_id: kshetraStar._id,
          dayitva_id: kshetraPracharkPramukhDayitva._id,
          year,
        })
        : 0;

    // प्रांत प्रचारक - star (प्रांत) dayitva (प्रांत प्रचारक)
    const prantStar = await Star.findOne({ name: "प्रांत" });
    const prantPracharkDayitva = await Dayitva.findOne({
      name: "प्रांत प्रचारक",
    });
    const prantPracharkTotal =
      prantStar && prantPracharkDayitva
        ? await Ppuser.countDocuments({
          star_id: prantStar._id,
          dayitva_id: prantPracharkDayitva._id,
          year,
        })
        : 0;

    // विविध क्षेत्र - star/prakar (विविध क्षेत्र)

    const vividhStar = await Star.findOne({ name: "विविध क्षेत्र" });
    const vividhPrakar = await Prakar.findOne({ name: "विविध क्षेत्र" });
    let vividhKshetraTotal = 0;
    if (vividhStar && vividhPrakar) {
      vividhKshetraTotal = await Ppuser.countDocuments({
        star_id: vividhStar._id,
        prakar_id: vividhPrakar._id,
        year,
      });
    }

    // Baithak Shahsankhya
    const baithakShahSuchi = await Ppuser.find({
      $or: [
        { a_b_baithak: true },
        { kshetra_pracharak_baithak: true },
        { prant_pracharak_baithak: true },
        { gatividhi_toli_baithak: true },
      ],
      year,
    }).countDocuments();

    const baithakShahsankhya = await Ppuser.countDocuments({
      $or: [
        { a_b_baithak: true },
        { kshetra_pracharak_baithak: true },
        { prant_pracharak_baithak: true },
        { gatividhi_toli_baithak: true },
      ],
      year,
    });


    res.status(200).json({
      totalUsers,
      a_b_adhikariTotal,
      gatividhiTotal,
      kshetraPracharkTotal,
      kshetraPracharkPramukhTotal,
      prantPracharkTotal,
      vividhKshetraTotal,
      baithakShahsankhya,
      baithakShahSuchi,
    });

  } catch (error) {
    res.status(500).json({
      message: "Error fetching dashboard data",
      error: error.message,
    });
  }
};
export const allUsersPrantPracharak = async (req, res) => {
  try {
    const { year } = req.params;
    const users = await Ppuser.find({ year })
      .populate("star_id", "name")
      .populate("prakar_id", "name")
      .populate("sanghatan_id", "name")
      .populate("dayitva_id", "name")
      .populate("kshetra_id", "name")
      .populate("prant_id", "name");

    // Map users to return only required fields and rename keys
    const mappedUsers = users.map((user) => {
      const obj = user.toObject();
      return {
        _id: obj._id,
        name: obj.name,
        star: obj.star_id?.name || "",
        prakar: obj.prakar_id?.name || "",
        sanghatan: obj.sanghatan_id?.name || "",
        dayitva: obj.dayitva_id?.name || "",
        kshetra: obj.kshetra_id?.name || "",
        prant: obj.prant_id?.name || "",
        kendra: obj.kendra,
        mobile_no_1: obj.mobile_no_1,
        mobile_no_2: obj.mobile_no_2,
        email: obj.email,
        gatividhi_toli_baithak: obj.gatividhi_toli_baithak,
        a_b_baithak: obj.a_b_baithak,
        prant_pracharak_baithak: obj.prant_pracharak_baithak,
        kshetra_pracharak_baithak: obj.kshetra_pracharak_baithak,
        gender: obj.gender,
        attendance: obj.attendance,
        // usertype: obj.usertype,
        year: obj.year,
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt,
        __v: obj.__v,
      };
    });

    res.status(200).json(mappedUsers);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching users",
      error: error.message,
    });
  }
};
// Add or update Prant Pracharak user
export const addOrUpdatePrantPracharakUser = async (req, res) => {
  try {
    const {
      id, // optional, if present then update
      name,
      star_id,
      prakar_id,
      sanghatan_id,
      dayitva_id,
      kshetra_id,
      prant_id,
      kendra,
      mobile_no_1,
      mobile_no_2,
      email,
      gatividhi_toli_baithak,
      a_b_baithak,
      prant_pracharak_baithak,
      kshetra_pracharak_baithak,
      gender,
      attendance,
    } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Validate required fields
    if (
      !name ||
      !star_id ||
      !prakar_id ||
      !sanghatan_id ||
      !dayitva_id ||
      !kshetra_id ||
      !prant_id ||
      !kendra ||
      !email ||
      !gender
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate gender and attendance enums
    if (!["m", "f"].includes(gender.toLowerCase())) {
      return res.status(400).json({ message: "Invalid gender value" });
    }
    if (attendance && !["p", "a"].includes(attendance.toLowerCase())) {
      return res.status(400).json({ message: "Invalid attendance value" });
    }

    // Set current year
    const currentYear = new Date().getFullYear().toString();

    const userData = {
      name,
      star_id,
      prakar_id,
      sanghatan_id,
      dayitva_id,
      kshetra_id,
      prant_id,
      kendra,
      mobile_no_1,
      mobile_no_2,
      email,
      gatividhi_toli_baithak: !!gatividhi_toli_baithak,
      a_b_baithak: !!a_b_baithak,
      prant_pracharak_baithak: !!prant_pracharak_baithak,
      kshetra_pracharak_baithak: !!kshetra_pracharak_baithak,
      gender: gender.toLowerCase(),
      attendance: attendance ? attendance.toLowerCase() : "p",
      year: currentYear,
    };

    let user;
    if (id) {
      // Update existing user
      user = await Ppuser.findByIdAndUpdate(id, userData, { new: true });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json({
        message: "User updated successfully",
        user,
      });
    } else {
      // Add new user
      user = new Ppuser(userData);
      await user.save();
      res.status(201).json({
        message: "User added successfully",
        user,
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error adding or updating user",
      error: error.message,
    });
  }
};

//karyakari mandal
// get all AbKMUsers

export const getDashboardDataKaryakariMandal = async (req, res) => {
  try {
    const { year } = req.params;

    if (!year) {
      return res.status(400).json({ message: "Year parameter is required" });
    }

    const parsedYear = parseInt(year, 10);
    if (isNaN(parsedYear)) {
      return res
        .status(400)
        .json({ message: "Invalid year format, must be a number" });
    }

    // --- Common Data Lookups ---
    const [abhaStar, kshetraStar, prantStar, vividhStar] = await Promise.all([
      Star.findOne({ name: "अ. भा." }),
      Star.findOne({ name: "क्षेत्र" }),
      Star.findOne({ name: "प्रांत" }),
      Star.findOne({ name: "विविध क्षेत्र" }),
    ]);

    const [
      kshetraPracharakDayitva,
      SahakshetraPracharakDayitva,
      kshetraPracharakPramukhDayitva,
      prantPracharakDayitva,
      prantPracharakSaha,
      kshetraKaryavahDayitva,
      SahakshetraKaryavahDayitva,
      kshetraSanchalakDayitva,
      SahakshetraSanchalakDayitva,
      prantKaryavahDayitva,
      sahaprantKaryavahDayitva,
      prantSanghachalakDayitva,
      SahaprantSanghachalakDayitva,
    ] = await Promise.all([
      Dayitva.findOne({ name: "क्षेत्र प्रचारक" }),
      Dayitva.findOne({ name: "सह क्षेत्र प्रचारक" }),
      Dayitva.findOne({ name: "क्षेत्र प्रचारक प्रमुख" }),
      Dayitva.findOne({ name: "प्रांत प्रचारक" }),
      Dayitva.findOne({ name: "सह प्रांत प्रचारक" }),
      Dayitva.findOne({ name: "क्षेत्र कार्यवाह" }),
      Dayitva.findOne({ name: "सह क्षेत्र कार्यवाह" }),
      Dayitva.findOne({ name: "मा. क्षेत्र संघचालक" }),
      Dayitva.findOne({ name: "मा. सह क्षेत्र संघचालक" }),
      Dayitva.findOne({ name: "प्रांत कार्यवाह" }),
      Dayitva.findOne({ name: "सह प्रांत कार्यवाह" }),
      Dayitva.findOne({ name: "मा. प्रांत संघचालक" }),
      Dayitva.findOne({ name: "मा. सह प्रांत संघचालक" }),
    ]);

    const vividhPrakar = await Prakar.findOne({ name: "विविध क्षेत्र" });

    // --- Total Users ---
    const totalUsers = await AbkmUser.countDocuments({ year: parsedYear });

    // --- User Counts ---
    const a_b_adhikariTotal = abhaStar
      ? await AbkmUser.countDocuments({
        year: parsedYear,
        star_id: abhaStar._id,
      })
      : 0;

    const kshetraPracharak =
      kshetraStar && kshetraPracharakDayitva
        ? await AbkmUser.countDocuments({
          year: parsedYear,
          star_id: kshetraStar._id,
          dayitva_id: kshetraPracharakDayitva._id,
        })
        : 0;
    const SahakshetraPracharakTotal =
      kshetraStar && SahakshetraPracharakDayitva
        ? await AbkmUser.countDocuments({
          year: parsedYear,
          star_id: kshetraStar._id,
          dayitva_id: SahakshetraPracharakDayitva._id,
        })
        : 0;

    const kshetraPracharakTotal = kshetraPracharak + SahakshetraPracharakTotal
    const kshetraPracharakPramukhTotal =
      kshetraStar && kshetraPracharakPramukhDayitva
        ? await AbkmUser.countDocuments({
          year: parsedYear,
          star_id: kshetraStar._id,
          dayitva_id: kshetraPracharakPramukhDayitva._id,
        })
        : 0;

    const kshetrakaryavahTotal =
      kshetraStar && kshetraKaryavahDayitva
        ? await AbkmUser.countDocuments({
          year: parsedYear,
          star_id: kshetraStar._id,
          dayitva_id: kshetraKaryavahDayitva._id,
        })
        : 0;
    const SahakshetraKaryavahDayitvaTotal =
      kshetraStar && SahakshetraKaryavahDayitva
        ? await AbkmUser.countDocuments({
          year: parsedYear,
          star_id: kshetraStar._id,
          dayitva_id: SahakshetraKaryavahDayitva._id,
        })
        : 0;

    const kshetrakaryavah = kshetrakaryavahTotal + SahakshetraKaryavahDayitvaTotal
    const kshtrasanchalka =
      kshetraStar && kshetraSanchalakDayitva
        ? await AbkmUser.countDocuments({
          year: parsedYear,
          star_id: kshetraStar._id,
          dayitva_id: kshetraSanchalakDayitva._id,
        })
        : 0;
    const SahakshtrasanchalkaTotal =
      kshetraStar && SahakshetraSanchalakDayitva
        ? await AbkmUser.countDocuments({
          year: parsedYear,
          star_id: kshetraStar._id,
          dayitva_id: SahakshetraSanchalakDayitva._id,
        })
        : 0;

    const kshtrasanchalkaTotal = kshtrasanchalka + SahakshtrasanchalkaTotal
    const prantkaryavah =
      prantStar && prantKaryavahDayitva
        ? await AbkmUser.countDocuments({
          year: parsedYear,
          star_id: prantStar._id,
          dayitva_id: prantKaryavahDayitva._id,
        })
        : 0;
    const SahaprantKaryavahDayitva =
      prantStar && sahaprantKaryavahDayitva
        ? await AbkmUser.countDocuments({
          year: parsedYear,
          star_id: prantStar._id,
          dayitva_id: sahaprantKaryavahDayitva._id,
        })
        : 0;
    const prantkaryavahTotal = prantkaryavah + SahaprantKaryavahDayitva
    const prantsanghachalak =
      prantStar && prantSanghachalakDayitva
        ? await AbkmUser.countDocuments({
          year: parsedYear,
          star_id: prantStar._id,
          dayitva_id: prantSanghachalakDayitva._id,
        })
        : 0;
    const Sahaprantsanghachalak =
      prantStar && SahaprantSanghachalakDayitva
        ? await AbkmUser.countDocuments({
          year: parsedYear,
          star_id: prantStar._id,
          dayitva_id: SahaprantSanghachalakDayitva._id,
        })
        : 0;

    const prantsanghachalakTotal = prantsanghachalak + Sahaprantsanghachalak
    const prantPracharakTotal =
      prantStar && prantPracharakSaha && prantPracharakDayitva
        ? await AbkmUser.countDocuments({
          year: parsedYear,
          star_id: prantStar._id,
          dayitva_id: prantPracharakDayitva._id,
        })
        : 0;
    const prantPracharaksahaTotal =
      prantStar && prantPracharakSaha
        ? await AbkmUser.countDocuments({
          year: parsedYear,
          star_id: prantStar._id,
          dayitva_id: prantPracharakSaha._id,
        })
        : 0;

    const vividhKshetraTotal =
      vividhStar && vividhPrakar
        ? await AbkmUser.countDocuments({
          year: parsedYear,
          star_id: vividhStar._id,
          prakar_id: vividhPrakar._id,
        })
        : 0;

    // --- Baithak Counts ---
    const baithakShahsankhya = await AbkmUser.countDocuments({
      year: parsedYear,
      karyakari_mandal_baithak: true,
    });

    const baithakShahSuchi = await AbkmUser.countDocuments({
      year: parsedYear,
      $or: [
        { a_b_baithak: true },
        { kshetra_karyawah_baithak: true },
        { prant_karyawah_baithak: true },
        { karyakari_mandal_baithak: true },
        { prant_pracharak_baithak: true },
        { kshetra_pracharak_baithak: true },
        { bhougolic_palak_adhikari_baithak: true },
      ],
    });

    const prantPracharak_total = prantPracharakTotal + prantPracharaksahaTotal
    // --- Final Response ---
    return res.status(200).json({
      totalUsers,
      a_b_adhikariTotal,
      kshetrakaryavah,
      kshtrasanchalkaTotal,
      kshetraPracharakTotal,
      kshetraPracharakPramukhTotal,
      prantkaryavahTotal,
      prantsanghachalakTotal,
      prantPracharak_total,
      vividhKshetraTotal,
      baithakShahsankhya,
      baithakShahSuchi,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    return res.status(500).json({
      message: "Error fetching dashboard data for Karyakari Mandal",
      error: error.message,
    });
  }
};


export const allAbkmUsers = async (req, res) => {
  try {
    const { year } = req.params;

    // Validate year parameter
    if (!year) {
      return res.status(400).json({
        message: "Year parameter is required",
      });
    }

    const parsedYear = parseInt(year, 10);
    if (isNaN(parsedYear)) {
      return res.status(400).json({
        message: "Invalid year format, must be a number",
      });
    }

    const users = await AbkmUser.find({ year: parsedYear })
      .populate("star_id", "name")
      .populate("prakar_id", "name")
      .populate("sanghatan_id", "name")
      .populate("dayitva_id", "name")
      .populate("kshetra_id", "name")
      .populate("prant_id", "name");

    const mappedUsers = users.map((user) => {
      const obj = user.toObject();
      return {
        _id: obj._id,
        name: obj.name,
        star: obj.star_id?.name || "",
        prakar: obj.prakar_id?.name || "",
        sanghatan: obj.sanghatan_id?.name || "",
        dayitva: obj.dayitva_id?.name || "",
        kshetra: obj.kshetra_id?.name || "",
        prant: obj.prant_id?.name || "",
        kendra: obj.kendra,
        mobile_no_1: obj.mobile_no_1,
        mobile_no_2: obj.mobile_no_2,
        email: obj.email,
        a_b_baithak: obj.a_b_baithak,
        kshetra_karyawah_baithak: obj.kshetra_karyawah_baithak,
        prant_karyawah_baithak: obj.prant_karyawah_baithak,
        karyakari_mandal_baithak: obj.karyakari_mandal_baithak,
        prant_pracharak_baithak: obj.prant_pracharak_baithak,
        kshetra_pracharak_baithak: obj.kshetra_pracharak_baithak,
        bhougolic_palak_adhikari_baithak: obj.bhougolic_palak_adhikari_baithak,
        gender: obj.gender,
        attendance: obj.attendance,
        year: obj.year,
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt,
        __v: obj.__v,
      };
    });

    res.status(200).json(mappedUsers);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching ABKM users",
      error: error.message,
    });
  }
};

export const addOrUpdateAbkmUser = async (req, res) => {
  try {
    const {
      id,
      name,
      star_id,
      prakar_id,
      sanghatan_id,
      dayitva_id,
      kshetra_id,
      prant_id,
      kendra,
      mobile_no_1,
      mobile_no_2,
      email,
      gender,
      attendance,
      a_b_baithak,
      kshetra_karyawah_baithak,
      prant_karyawah_baithak,
      karyakari_mandal_baithak,
      prant_pracharak_baithak,
      kshetra_pracharak_baithak,
      bhougolic_palak_adhikari_baithak,
    } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Required fields check
    if (
      !name ||
      !star_id ||
      !prakar_id ||
      !sanghatan_id ||
      !dayitva_id ||
      !kshetra_id ||
      !prant_id ||
      !kendra ||
      !email ||
      !gender
    ) {

      return res.status(400).json({ message: "Missing required fields" });
    }

    // Gender enum check
    if (!["m", "f"].includes(gender.toLowerCase())) {
      return res.status(400).json({ message: "Invalid gender value" });
    }

    // Attendance enum check
    if (attendance && !["p", "a"].includes(attendance.toLowerCase())) {
      return res.status(400).json({ message: "Invalid attendance value" });
    }

    const currentYear = new Date().getFullYear().toString();

    const userData = {
      name,
      star_id,
      prakar_id,
      sanghatan_id,
      dayitva_id,
      kshetra_id,
      prant_id,
      kendra,
      mobile_no_1,
      mobile_no_2,
      email,
      a_b_baithak: !!a_b_baithak,
      kshetra_karyawah_baithak: !!kshetra_karyawah_baithak,
      prant_karyawah_baithak: !!prant_karyawah_baithak,
      karyakari_mandal_baithak: !!karyakari_mandal_baithak,
      prant_pracharak_baithak: !!prant_pracharak_baithak,
      kshetra_pracharak_baithak: !!kshetra_pracharak_baithak,
      bhougolic_palak_adhikari_baithak: !!bhougolic_palak_adhikari_baithak,
      gender: gender.toLowerCase(),
      attendance: attendance ? attendance.toLowerCase() : "p",
      year: currentYear,
    };

    let user;
    if (id) {
      user = await AbkmUser.findByIdAndUpdate(id, userData, { new: true });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json({
        message: "User updated successfully",
        user,
      });
    } else {
      user = new AbkmUser(userData);
      await user.save();
      res.status(201).json({
        message: "User added successfully",
        user,
      });
    }
  } catch (error) {
    console.log("error", error);
    res.status(500).json({
      message: "Error adding or updating user",
      error: error.message,
    });
  }
};

export const sendMail = async (req, res) => {
  try {
    const {
      name,
      date,
      year,
      filteredData,
      prant,
      sanghatan,
      columns,
      userDataKeys,
    } = req.body;

    if (
      !name ||
      // !date ||
      // !year ||
      !Array.isArray(filteredData) ||
      filteredData.length === 0 ||
      !Array.isArray(columns) ||
      columns.length === 0 ||
      !Array.isArray(userDataKeys) ||
      userDataKeys.length === 0
    ) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Corrected: assign a key for "अ. क्र."
    const fields = [
      { label: "अ. क्र.", value: "serial" },
      ...userDataKeys.map((key, index) => ({
        label: columns[index + 1], // skipping "अ. क्र."
        value: key,
      })),
    ];

    // Insert serial number manually
    const dataWithSerial = filteredData.map((row, index) => ({
      serial: index + 1,
      ...row,
    }));

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(dataWithSerial);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    let detailName;
    if (sanghatan === "स्वदेशी जागरण मंच") {
      detailName = sanghatan;
    } else {
      detailName = prant;
    }
    const mailOptions = {
      from: process.env.MAIL_USER,
      to: "receiver.email@example.com",
      subject: `(${detailName}) सूची रिपोर`,
      text: `
        नमस्ते,
        यह रही ${detailName} की सूची:
        नाम: ${name}
        तारीख: ${date}
        वर्ष: ${year}

        कृपया अटैचमेंट देखें।
      `,
      attachments: [
        {
          filename: "user_list.csv",
          content: csv,
          contentType: "text/csv; charset=utf-8", // ✅ ensure correct charset
          encoding: "utf-8", // ✅ explicitly set encoding
        },
      ],
    };
    console.log(mailOptions)
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "मेल सफलतापूर्वक भेजा गया।" });
  } catch (error) {
    console.error("Email Sending Error:", error);
    res.status(500).json({ error: "मेल भेजने में त्रुटि हुई।" });
  }
};

// GET all settings
export const getAdminSettings = async (req, res) => {
  try {
    const settings = await AdminSetting.find();
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
};

// POST new setting
export const createAdminSetting = async (req, res) => {
  try {
    const newSetting = new AdminSetting(req.body);
    await newSetting.save();
    res.status(201).json(newSetting);
  } catch (error) {
    res.status(400).json({ error: "Failed to create setting" });
  }
};

// PUT update setting by ID
export const updateAdminSetting = async (req, res) => {
  try {
    const updated = await AdminSetting.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Setting not found" });
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ error: "Failed to update setting" });
  }
};

// DELETE setting by ID
export const deleteAdminSetting = async (req, res) => {
  try {
    const deleted = await AdminSetting.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Setting not found" });
    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: "Failed to delete setting" });
  }
};




export const getSubmitData = async (req, res) => {
  try {
    const data = await Submitted.find();
    console.log(data)
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const createSubmitData = async (req, res) => {
  try {
    const { system_user_id, name, email, date } = req.body;

    if (!system_user_id || !name || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const submitted = new Submitted({
      system_user_id,
      name,
      email,
      date
    });

    await submitted.save();
    res.status(201).json(submitted);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Newly 
export const updateDropdownItem = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { name, active, kshetra_id } = req.body;

    // Validate required fields
    if (!type || !id || !name) {
      return res.status(400).json({ message: "Type, ID, and name are required" });
    }

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Determine the Mongoose model based on type
    let Model;
    switch (type) {
      case "stars":
        Model = Star;
        break;
      case "prakars":
        Model = Prakar;
        break;
      case "sanghatans":
        Model = Sanghatan;
        break;
      case "dayitvas":
        Model = Dayitva;
        break;
      case "kshetras":
        Model = Kshetra;
        break;
      case "prants":
        Model = Prant;
        break;
      default:
        return res.status(400).json({ message: "Invalid type" });
    }

    // Check if item exists
    const existingItem = await Model.findById(id);
    if (!existingItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Check for duplicate name (excluding current item)
    const duplicate = await Model.findOne({
      name: name.trim(),
      _id: { $ne: id },
    });
    if (duplicate) {
      return res.status(400).json({ message: "Name already exists" });
    }

    // Prepare update data
    const updateData = {
      name: name.trim(),
      active: active !== undefined ? active : existingItem.active, // Preserve existing active if not provided
    };

    // Handle kshetra_id for 'prants' type
    if (type === "prants") {
      if (kshetra_id) {
        if (!mongoose.Types.ObjectId.isValid(kshetra_id)) {
          return res.status(400).json({ message: "Invalid kshetra_id format" });
        }
        const kshetraExists = await Kshetra.findById(kshetra_id);
        if (!kshetraExists) {
          return res.status(400).json({ message: "Kshetra not found" });
        }
        updateData.kshetra_id = kshetra_id;
      } else if (!existingItem.kshetra_id) {
        return res.status(400).json({ message: "kshetra_id is required for prants" });
      } else {
        // Keep existing kshetra_id if not provided and it exists
        updateData.kshetra_id = existingItem.kshetra_id;
      }
    }

    // Update the item with validation
    const updatedItem = await Model.findByIdAndUpdate(
      id,
      { $set: updateData }, // Use $set to update only specified fields
      { new: true, runValidators: true, lean: true } // lean: true for better performance
    );

    res.status(200).json({
      message: "Updated successfully",
      data: updatedItem,
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({
      message: "Error updating data",
      error: error.message,
    });
  }
};