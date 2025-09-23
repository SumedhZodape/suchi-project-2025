import mongoose from 'mongoose';

const abkmUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  star_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Star', required: true },
  prakar_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Prakar' },
  sanghatan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Sanghatan' },
  dayitva_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Dayitva', required: true },
  kshetra_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Kshetra', required: true },
  prant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Prant', required: true },
  kendra: { type: String, required: true },
  mobile_no_1: { type: String },
  mobile_no_2: { type: String },
  email: { type: String, required: true },
  a_b_baithak: { type: Boolean, default: false },
  kshetra_karyawah_baithak: { type: Boolean, default: false },
  prant_karyawah_baithak: { type: Boolean, default: false },
  karyakari_mandal_baithak: { type: Boolean, default: false },
  prant_pracharak_baithak: { type: Boolean, default: false },
  kshetra_pracharak_baithak: { type: Boolean, default: false },
  bhougolic_palak_adhikari_baithak: { type: Boolean, default: false },
  gender: { type: String, enum: ['m', 'f'], required: true },
  attendance: { type: String, enum: ['p', 'a'], required: true },
  year: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('AbkmUser', abkmUserSchema);