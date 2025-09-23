import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String },
    star_id: { type: mongoose.Schema.Types.ObjectId, ref: "Star" },
    prakar_id: { type: mongoose.Schema.Types.ObjectId, ref: "Prakar" },
    sanghatan_id: { type: mongoose.Schema.Types.ObjectId, ref: "Sanghatan" },
    dayitva_id: { type: mongoose.Schema.Types.ObjectId, ref: "Dayitva" },
    kshetra_id: { type: mongoose.Schema.Types.ObjectId, ref: "Kshetra" },
    prant_id: { type: mongoose.Schema.Types.ObjectId, ref: "Prant" },
    kendra: { type: String },
    mobile_no_1: { type: String },
    mobile_no_2: { type: String },
    email: { type: String },
    a_b_karykarini_baithak: { type: Boolean, default: false },
    kshetra_k_p_baithak: { type: Boolean, default: false },
    prant_k_p_baithak: { type: Boolean, default: false },
    karyakari_madal: { type: Boolean, default: false },
    pratinidhi_sabha: { type: Boolean, default: false },
    prant_p_baithak: { type: Boolean, default: false },
    kshetra_p_baithak: { type: Boolean, default: false },
    palak_adhikari_baithak: { type: Boolean, default: false },
    gender: { type: String, enum: ["m", "f"], required: true },
    attendance: { type: String, enum: ["p", "a"], default: "p" },
    year: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
