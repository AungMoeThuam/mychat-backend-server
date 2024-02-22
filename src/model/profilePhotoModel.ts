import { mongoose } from "../config/dbConnection";

// {
//   fieldname: 'uploadPhoto',
//   originalname: '3.PNG',
//   encoding: '7bit',
//   mimetype: 'image/png',
//   destination: 'D:\\projects\\mychatbackend\\src/storage/profile',
//   filename: 'uploadPhoto-1706642558322-200500370-3.PNG',
//   path: 'D:\\projects\\mychatbackend\\src\\storage\\profile\\uploadPhoto-1706642558322-200500370-3.PNG',
//   size: 176593
// }
const profilePhotoModel = new mongoose.Schema({
  userId: {
    ref: "users",
    type: mongoose.Types.ObjectId,
    require: true,
  },
  name: String,
  mimetype: String,
  size: Number,
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

const ProfilePhotoModel = mongoose.model("profilePhotos", profilePhotoModel);
export default ProfilePhotoModel;
