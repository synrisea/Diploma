import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { UploadFile } from '../../api/identity';

const EXPORT_SIZE = 512;

export async function pickAvatar(): Promise<UploadFile | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Photo library access is needed to pick an avatar.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
    exif: false,
  });
  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  const side = Math.min(asset.width ?? EXPORT_SIZE, asset.height ?? EXPORT_SIZE);
  const context = ImageManipulator.manipulate(asset.uri);
  if (side > EXPORT_SIZE) context.resize({ width: EXPORT_SIZE, height: EXPORT_SIZE });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.92 });

  return { uri: saved.uri, name: 'avatar.jpg', type: 'image/jpeg' };
}
