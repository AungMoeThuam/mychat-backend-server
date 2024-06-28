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
const ProfilePhotoModel = new mongoose.Schema(
  {
    path: String,
    mimetype: String,
    size: Number,
  },
  {
    timestamps: true,
  }
);

const profilePhotoModel = mongoose.model("profilePhotos", ProfilePhotoModel);
export default profilePhotoModel;
