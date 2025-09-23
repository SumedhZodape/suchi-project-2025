import mongoose from 'mongoose';

const PrantSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  kshetra_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Kshetra', required: true },
   active: { type: Boolean, default: true }
});

export default mongoose.model('Prant', PrantSchema);