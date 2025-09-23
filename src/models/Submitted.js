import mongoose from 'mongoose';

const SubmittedSchema = new mongoose.Schema({
  system_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SystemUser', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

export default mongoose.model('Submitted', SubmittedSchema);