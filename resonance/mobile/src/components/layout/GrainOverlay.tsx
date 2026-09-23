import { ImageBackground, StyleSheet } from 'react-native';

export function GrainOverlay() {
  return (
    <ImageBackground
      source={require('../../../assets/grain.png')}
      resizeMode="repeat"
      style={[StyleSheet.absoluteFill, { opacity: 0.035, zIndex: 1300, pointerEvents: 'none' }]}
    />
  );
}
