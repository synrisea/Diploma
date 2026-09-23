import { Text } from './Text';
import { errorClass } from './styles';

export function errorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  return error instanceof Error ? error.message : fallback;
}

export function ErrorBanner({ message }: { message: string }) {
  return <Text className={errorClass}>{message}</Text>;
}

export function ErrorLine({ error, fallback }: { error: unknown; fallback?: string }) {
  return <Text className="text-sm text-sentiment-negative">{errorMessage(error, fallback)}</Text>;
}

export function Muted({ children, className }: { children: string; className?: string }) {
  return <Text className={`text-sm text-stone-500 ${className ?? ''}`}>{children}</Text>;
}
