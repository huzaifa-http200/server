const mongoose = require('mongoose');
require('mongoose-currency').loadType(mongoose);
const Currency = mongoose.Types.Currency;

const Schema = mongoose.Schema;

// Document Schema.
const paymentSchema = new Schema({
    amount: {
        type: Currency,
        required: true,
    },
    description: {
        type: String,
        required: false
    },
    recieved: {
        type: Boolean,
        required: true
    },
    status: {
        type: String,
        required: true
    },
}, {
    timestamps: true
});

// This automatically creates the collection (table) named as "payments" if it doesn't find it.
var Payments = mongoose.model('Payment', paymentSchema);

module.exports = Payments;