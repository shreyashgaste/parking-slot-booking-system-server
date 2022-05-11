const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const parkingslotSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Authority",
    required: true,
  },
  availableTwoWheelerSlots: {
    type: Number,
    required: true,
  },
  availableFourWheelerSlots: {
    type: Number,
    required: true,
  },
  totalTwoWheelerSlots: {
    type: Number,
    required: true,
  },
  totalFourWheelerSlots: {
    type: Number,
    required: true,
  },
  fareForTwoWheelerSlots: {
    type: Number,
    required: true,
  },
  fareForFourWheelerSlots: {
    type: Number,
    required: true,
  },
});

const Parkingslot = mongoose.model("parkingslot", parkingslotSchema);

module.exports = Parkingslot;
