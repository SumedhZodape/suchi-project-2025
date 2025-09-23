import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  star_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Star' },
  prakar_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Prakar' },
  sanghatan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Sanghatan' },
  dayitva_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Dayitva' },
  kshetra_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Kshetra' },
  prant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Prant' },
  kendra: { type: String },
  mobile_no_1: { type: String},
  mobile_no_2: { type: String },
  email: { type: String },
  gatividhi_toli_baithak: { type: Boolean, default: false },
  a_b_baithak: { type: Boolean, default: false },
  prant_pracharak_baithak: { type: Boolean, default: false },
  kshetra_pracharak_baithak: { type: Boolean, default: false },
  gender: { type: String, enum: ['m', 'f'], required: true },
  attendance: { type: String, enum: ['p', 'a'], required: true },
  year: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('Ppuser', UserSchema);