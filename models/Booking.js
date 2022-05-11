const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const bookingSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  vehicleNo: {
    type: String,
    required: true,
  },
  entryTime: {
    type: Date,
    required: true,
  },
  exitTime: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
});

const Booking = mongoose.model("booking", bookingSchema);

module.exports = Booking;
