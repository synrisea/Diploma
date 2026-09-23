import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { colors } from '../../theme/tokens';

interface IconProps {
  size?: number;
  color?: string;
}

const stroke = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function Logo({ size = 24, color = colors.brand[500] }: IconProps) {
  return (
    <Svg viewBox="0 0 32 32" width={size} height={size} fill="none">
      <Circle cx="16" cy="16" r="14.5" stroke={color} strokeOpacity="0.28" strokeWidth="1.6" />
      <Circle cx="16" cy="16" r="9.5" stroke={color} strokeOpacity="0.5" strokeWidth="1.6" />
      <Circle cx="16" cy="16" r="4.5" fill={color} />
    </Svg>
  );
}

export function InboxIcon({ size = 16, color = colors.stone[500] }: IconProps) {
  return (
    <Svg viewBox="0 0 16 16" width={size} height={size} stroke={color} strokeWidth="1.3" {...stroke}>
      <Path d="M2 4h12v8H2z" />
      <Path d="M2 4l6 5 6-5" />
    </Svg>
  );
}

export function FriendsIcon({ size = 16, color = colors.stone[500] }: IconProps) {
  return (
    <Svg viewBox="0 0 16 16" width={size} height={size} stroke={color} strokeWidth="1.3" {...stroke}>
      <Circle cx="6" cy="5.5" r="2.25" />
      <Path d="M1.5 13c0-2.2 2-3.75 4.5-3.75s4.5 1.55 4.5 3.75" />
      <Path d="M10.5 3.25c1.1.2 2 1.1 2 2.25s-.9 2.05-2 2.25" />
      <Path d="M12 9.35c1.5.25 2.5 1.5 2.5 3.15" />
    </Svg>
  );
}

export function PlansIcon({ size = 16, color = colors.stone[500] }: IconProps) {
  return (
    <Svg viewBox="0 0 16 16" width={size} height={size} stroke={color} strokeWidth="1.3" {...stroke}>
      <Rect x="2" y="3.5" width="12" height="10.5" rx="1.5" />
      <Path d="M2 6.5h12M5.5 2v3M10.5 2v3" />
    </Svg>
  );
}

export function MapIcon({ size = 16, color = colors.stone[500] }: IconProps) {
  return (
    <Svg viewBox="0 0 16 16" width={size} height={size} stroke={color} strokeWidth="1.3" {...stroke}>
      <Path d="M1.5 4l4-1.5 5 1.5 4-1.5v10l-4 1.5-5-1.5-4 1.5z" />
      <Path d="M5.5 2.5v10M10.5 4v10" />
    </Svg>
  );
}

export function AdminIcon({ size = 16, color = colors.stone[500] }: IconProps) {
  return (
    <Svg viewBox="0 0 16 16" width={size} height={size} stroke={color} strokeWidth="1.3" {...stroke}>
      <Path d="M8 1.5l5.5 2.5v4c0 3-2.3 5.6-5.5 6.5C4.8 13.6 2.5 11 2.5 8V4z" />
      <Path d="M6 8l1.5 1.5L10.5 6.5" />
    </Svg>
  );
}

export function SettingsIcon({ size = 16, color = colors.stone[500] }: IconProps) {
  return (
    <Svg viewBox="0 0 16 16" width={size} height={size} stroke={color} strokeWidth="1.3" strokeLinecap="round" fill="none">
      <Line x1="2" y1="4" x2="14" y2="4" />
      <Line x1="2" y1="8" x2="14" y2="8" />
      <Line x1="2" y1="12" x2="14" y2="12" />
      <Circle cx="6" cy="4" r="1.5" fill={color} stroke="none" />
      <Circle cx="11" cy="8" r="1.5" fill={color} stroke="none" />
      <Circle cx="7" cy="12" r="1.5" fill={color} stroke="none" />
    </Svg>
  );
}

export function MessageIcon({ size = 16, color = colors.stone[500] }: IconProps) {
  return (
    <Svg viewBox="0 0 16 16" width={size} height={size} stroke={color} strokeWidth="1.3" {...stroke}>
      <Path d="M13.5 10c0 .8-.7 1.5-1.5 1.5H6l-3 2.5v-2.5H4c-.8 0-1.5-.7-1.5-1.5V4c0-.8.7-1.5 1.5-1.5h8c.8 0 1.5.7 1.5 1.5z" />
    </Svg>
  );
}

export function RemoveFriendIcon({ size = 16, color = colors.stone[500] }: IconProps) {
  return (
    <Svg viewBox="0 0 16 16" width={size} height={size} stroke={color} strokeWidth="1.3" {...stroke}>
      <Circle cx="6.5" cy="5" r="2.5" />
      <Path d="M2 13.5c0-2.3 2-4 4.5-4s4.5 1.7 4.5 4" />
      <Path d="M11.5 5.5h3.5" />
    </Svg>
  );
}

export function ChevronDownIcon({ size = 12, color = colors.stone[500] }: IconProps) {
  return (
    <Svg viewBox="0 0 12 12" width={size} height={size} stroke={color} strokeWidth="1.4" {...stroke}>
      <Path d="M2.5 4.5L6 8l3.5-3.5" />
    </Svg>
  );
}

export function ChevronLeftIcon({ size = 12, color = colors.stone[500] }: IconProps) {
  return (
    <Svg viewBox="0 0 12 12" width={size} height={size} stroke={color} strokeWidth="1.4" {...stroke}>
      <Path d="M7.5 2.5L3 6l4.5 3.5" />
    </Svg>
  );
}

export function SearchIcon({ size = 14, color = colors.stone[500] }: IconProps) {
  return (
    <Svg viewBox="0 0 16 16" width={size} height={size} fill="none">
      <Circle cx="7" cy="7" r="4.5" stroke={color} strokeWidth="1.4" />
      <Path d="M13 13l-2.5-2.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  );
}

export function CloseIcon({ size = 16, color = colors.stone[900] }: IconProps) {
  return (
    <Svg viewBox="0 0 16 16" width={size} height={size} fill="none">
      <Path d="M3 3l10 10M13 3L3 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function SignalIcon({ size = 12, color }: IconProps) {
  return (
    <Svg viewBox="0 0 16 16" width={size} height={size} fill="none">
      <Circle cx="8" cy="8" r="6.5" stroke={color} strokeOpacity="0.35" strokeWidth="1.3" />
      <Circle cx="8" cy="8" r="2.2" fill={color} />
    </Svg>
  );
}

export function GoogleIcon({ size = 16 }: IconProps) {
  return (
    <Svg viewBox="0 0 18 18" width={size} height={size}>
      <Path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.61z"
      />
      <Path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.36 0-4.36-1.6-5.08-3.75H.9v2.33A8.99 8.99 0 0 0 9 18z"
      />
      <Path fill="#FBBC05" d="M3.92 10.67a5.4 5.4 0 0 1 0-3.34V5H.9a8.99 8.99 0 0 0 0 8l3.02-2.33z" />
      <Path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A8.99 8.99 0 0 0 .9 5l3.02 2.33C4.64 5.18 6.64 3.58 9 3.58z"
      />
    </Svg>
  );
}
