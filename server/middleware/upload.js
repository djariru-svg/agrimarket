import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../uploads');

// Ensure uploads directories exist
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(path.join(uploadsDir, 'avatars'))) fs.mkdirSync(path.join(uploadsDir, 'avatars'), { recursive: true });
if (!fs.existsSync(path.join(uploadsDir, 'products'))) fs.mkdirSync(path.join(uploadsDir, 'products'), { recursive: true });

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  }
});

export async function resizeAndSaveImage(file, dir, filename) {
  const filepath = path.join(uploadsDir, dir, filename);
  await sharp(file.buffer)
    .resize(500, 500, { fit: 'cover' })
    .toFile(filepath);
  return `/uploads/${dir}/${filename}`;
}

export async function deleteImage(filepath) {
  try {
    const fullPath = path.join(uploadsDir, filepath.replace('/uploads/', ''));
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.error('Error deleting image:', err);
  }
}
