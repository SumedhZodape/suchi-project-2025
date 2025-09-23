import mongoose from 'mongoose';

const SanghatanDayitvaSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  dayitva_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Dayitva', required: true },
   active: { type: Boolean, default: true }
});

export default mongoose.model('SanghatanDayitva', SanghatanDayitvaSchema);