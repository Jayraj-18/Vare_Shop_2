import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a product name'],
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Please provide a category'],
    enum: ['shirts', 'tshirts', 'jeans'],
  },
  price: {
    type: Number,
    required: [true, 'Please provide a price'],
  },
  originalPrice: {
    type: Number,
    required: [true, 'Please provide an original price'],
  },
  image: {
    type: String,
    required: [true, 'Please provide an image URL'],
  },
  rating: {
    type: Number,
    default: 0,
  },
  reviews: {
    type: Number,
    default: 0,
  },
  badge: {
    type: String,
    default: '',
  },
  sizes: {
    type: [String],
    required: [true, 'Please provide at least one size'],
  },
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
