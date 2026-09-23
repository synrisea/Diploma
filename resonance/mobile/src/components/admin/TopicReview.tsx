import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useAdminTopics, useApproveTopic, useRejectTopic } from '../../hooks/useAdmin';
import type { AdminTopic } from '../../types/admin';
import { ConfirmButton } from './ConfirmButton';
import { Input } from '../ui/Input';
import { PillButton, PrimaryButton } from '../ui/Button';
import { Label } from '../ui/Label';
import { Text } from '../ui/Text';
import { ErrorLine, Muted } from '../ui/Feedback';
import { cardClass } from '../ui/styles';

function CandidateButton({ index, label, selected, onSelect }: { index: number; label: string; selected: boolean; onSelect: () => void }) {
  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={`flex-row items-center gap-2 rounded-xl border px-3.5 py-3 active:opacity-75 ${
        selected ? 'border-brand-500 bg-brand-500/10' : 'border-stone-900/10 bg-stone-900/[0.025]'
      }`}
    >
      <Text className="font-mono text-[10px] text-stone-500">{index}</Text>
      <Text className={`text-sm ${selected ? 'text-brand-500' : 'text-stone-700'}`}>{label}</Text>
    </Pressable>
  );
}

export function TopicReview() {
  const { data: pending = [], isLoading } = useAdminTopics('pending');
  const approve = useApproveTopic();
  const reject = useRejectTopic();

  const [cursor, setCursor] = useState(0);
  const [customLabel, setCustomLabel] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const topic: AdminTopic | undefined = pending[cursor];
  const options = useMemo(() => {
    if (!topic) return [];
    return Array.from(new Set([...topic.candidates, topic.label])).slice(0, 3);
  }, [topic]);

  useEffect(() => {
    setSelected(options[0] ?? null);
    setCustomLabel('');
  }, [topic?.id]);

  const chosenLabel = customLabel.trim() || selected || '';
  const isBusy = approve.isPending || reject.isPending;

  const skip = () => setCursor((c) => Math.min(c + 1, pending.length));

  const submitApproval = () => {
    if (!topic || !chosenLabel) return;
    approve.mutate(
      { topicId: topic.id, label: chosenLabel, expectedComputedAt: topic.computedAt },
      { onSuccess: () => setCursor((c) => (c >= pending.length - 1 ? Math.max(c - 1, 0) : c)) },
    );
  };

  if (isLoading) return <Muted>Loading…</Muted>;

  if (!topic) {
    return (
      <View className={`${cardClass} px-4 py-6`}>
        <Text className="text-sm text-stone-700">Nothing left to review.</Text>
        <Muted className="mt-1">New tags show up here after the next rebuild.</Muted>
      </View>
    );
  }

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <Label>
          {cursor + 1} of {pending.length}
        </Label>
        <PillButton label="Skip" onPress={skip} disabled={isBusy} className="px-4 py-2.5" />
      </View>

      <View className={`${cardClass} gap-4 p-4`}>
        <View>
          <Text className="font-mono text-[11px] text-stone-500">
            {topic.commentCount} comments · {topic.placeCount} places · {topic.sentiment}
          </Text>
          <Text className="mt-1 font-mono text-[11px] text-stone-500">keywords: {topic.keywords.join(', ')}</Text>
        </View>

        {topic.samples.length > 0 && (
          <View className="gap-1.5 border-t border-stone-900/10 pt-3">
            <Label>What people said</Label>
            {topic.samples.map((sample, i) => (
              <Text key={i} className="text-sm text-stone-700">
                “{sample.length > 180 ? `${sample.slice(0, 180)}…` : sample}”
              </Text>
            ))}
          </View>
        )}

        <View className="gap-2 border-t border-stone-900/10 pt-3">
          <Label>Name this tag</Label>
          <View className="gap-1.5">
            {options.map((option, i) => (
              <CandidateButton
                key={option}
                index={i + 1}
                label={option}
                selected={!customLabel.trim() && selected === option}
                onSelect={() => {
                  setSelected(option);
                  setCustomLabel('');
                }}
              />
            ))}
          </View>
          <Input value={customLabel} onChangeText={setCustomLabel} placeholder="or write your own" maxLength={40} />
        </View>

        {(approve.error || reject.error) && <ErrorLine error={approve.error ?? reject.error} fallback="That did not work." />}

        <View className="flex-row flex-wrap items-center gap-2 border-t border-stone-900/10 pt-3">
          <PrimaryButton
            label={approve.isPending ? 'Saving…' : `Use “${chosenLabel || '…'}”`}
            onPress={submitApproval}
            disabled={isBusy || !chosenLabel}
            className="py-2.5"
          />
          <ConfirmButton
            label="Hide this tag"
            confirmLabel="Tap again to hide"
            disabled={isBusy}
            tone="danger"
            size="button"
            onConfirm={() => reject.mutate(topic.id)}
          />
        </View>
      </View>
    </View>
  );
}
