import { Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import type { PlaceDto } from '../../types/place';
import { colors, fonts } from '../../theme/tokens';

const SIZE = 26;

function RouteStopBadge({ index }: { index: number }) {
  return (
    <View
      style={{
        width: SIZE + 4,
        height: SIZE + 4,
        borderRadius: (SIZE + 4) / 2,
        backgroundColor: 'rgba(11,10,7,0.92)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.brand[500],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 7,
      }}
    >
      <View
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          backgroundColor: colors.brand[500],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: colors.brand.ink, fontFamily: fonts.monoSemibold, fontSize: 12, fontVariant: ['tabular-nums'] }}>
          {index + 1}
        </Text>
      </View>
    </View>
  );
}

export function RouteStopMarkers({ stops }: { stops: PlaceDto[] }) {
  return (
    <>
      {stops.map((stop, i) => (
        <Marker
          key={`route-${stop.id}`}
          coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={20}
          tracksViewChanges={false}
        >
          <RouteStopBadge index={i} />
        </Marker>
      ))}
    </>
  );
}
