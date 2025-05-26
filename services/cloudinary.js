// cloudinary.js
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.uploadFile = async (filePath, options = {}) => {
  try {
    const uploadOptions = {
      folder: options.folder || "project_offers",
      resource_type: "auto",
      use_filename: true,
      unique_filename: true,
      ...options,
    };
    const result = await cloudinary.uploader.upload(filePath, uploadOptions);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      resourceType: result.resource_type,
      success: true,
    };
  } catch (error) {
    console.log("Cloudinary upload error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

exports.deleteFile = async (publicId) => {
  try {
    if (!publicId) return { success: false, error: "Public ID is required" };

    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === "ok",
      result,
    };
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};
