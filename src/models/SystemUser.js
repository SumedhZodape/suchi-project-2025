import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const SystemUserSchema = new mongoose.Schema({
  password: { type: String, required: true },
  role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  prant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Prant' },
  sanghatan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Sanghatan' },
}, { timestamps: true });

SystemUserSchema.methods.comparePassword = async function (candidatePassword) {
  return candidatePassword === this.password;
};

export default mongoose.model('SystemUser', SystemUserSchema);