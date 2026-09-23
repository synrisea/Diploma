import { useState } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import {
  useAdminComments,
  useAdminDimensions,
  useAdminTopics,
  useAuditLog,
  useForceRetrain,
  useIsAdmin,
  useHideDimension,
  useMergeTopics,
  usePipelineStatus,
  useRenameDimension,
  useReopenTopic,
  useRestoreDimension,
  useSetCommentHidden,
  useUnmergeTopic,
} from '@/hooks/useAdmin';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { ConfirmButton } from '@/components/admin/ConfirmButton';
import { TopicReview } from '@/components/admin/TopicReview';
import { PhotoStrip } from '@/components/feedback/PhotoStrip';
import { Screen } from '@/components/layout/Screen';
import { Input } from '@/components/ui/Input';
import { PillButton, PrimaryButton } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Text } from '@/components/ui/Text';
import { ErrorLine, Muted } from '@/components/ui/Feedback';
import { cardClass } from '@/components/ui/styles';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { colors } from '@/theme/tokens';
import type { AdminDimension, AdminTopic } from '@/types/admin';

const TABS = ['review', 'topics', 'dimensions', 'content', 'pipeline', 'audit'] as const;
type Tab = (typeof TABS)[number];

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <View className="w-[48%] gap-0.5 rounded-xl border border-stone-900/10 bg-stone-900/[0.025] px-4 py-3">
      <Text className="font-display text-xl text-stone-900">{value}</Text>
      <Label>{label}</Label>
    </View>
  );
}

const STATUS_FILTERS = ['all', 'pending', 'approved', 'rejected'] as const;

function TopicsTab() {
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>('all');
  const { data: topics = [], isLoading } = useAdminTopics(filter === 'all' ? undefined : filter);
  const reopen = useReopenTopic();
  const merge = useMergeTopics();
  const unmerge = useUnmergeTopic();
  const [mergeSource, setMergeSource] = useState<AdminTopic | null>(null);

  if (isLoading) return <Muted>Loading…</Muted>;

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map((name) => (
          <Pressable
            key={name}
            onPress={() => setFilter(name)}
            className={`rounded-full px-3 py-2 active:opacity-75 ${filter === name ? 'bg-stone-900/10' : ''}`}
          >
            <Text
              className={`font-mono text-[11px] uppercase tracking-[0.7px] ${filter === name ? 'text-stone-900' : 'text-stone-500'}`}
            >
              {name}
            </Text>
          </Pressable>
        ))}
      </View>

      {mergeSource && (
        <View className="flex-row flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-500/30 bg-brand-500/10 px-3.5 py-3">
          <Text className="flex-1 text-sm text-stone-900">
            Now pick the tag that{' '}
            <Text className="text-sm font-sans-medium text-stone-900">{mergeSource.approvedLabel ?? mergeSource.label}</Text> should
            join.
          </Text>
          <PillButton label="Cancel" onPress={() => setMergeSource(null)} />
        </View>
      )}

      {merge.isError && <ErrorLine error={merge.error} fallback="That did not work." />}

      <View className="gap-2">
        {topics.map((topic) => (
          <View key={topic.id} className={`${cardClass} gap-2`}>
            <View className="min-w-0">
              <Text numberOfLines={1} className="text-sm font-sans-medium text-stone-900">
                {topic.approvedLabel ?? topic.label}
                {topic.approvedLabel && topic.approvedLabel !== topic.label && (
                  <Text className="font-mono text-[11px] text-stone-500">{`  auto: ${topic.label}`}</Text>
                )}
              </Text>
              <Text className="font-mono text-[11px] text-stone-500">
                #{topic.id} · {topic.mergedInto ? `joined to #${topic.mergedInto}` : topic.status} · {topic.commentCount} comments ·{' '}
                {topic.placeCount} places
              </Text>
            </View>

            <View className="flex-row flex-wrap items-center gap-1.5">
              {mergeSource ? (
                mergeSource.id !== topic.id &&
                !topic.mergedInto && (
                  <ConfirmButton
                    label="Join this"
                    confirmLabel="Tap again"
                    disabled={merge.isPending}
                    onConfirm={() =>
                      merge.mutate({ sourceId: mergeSource.id, targetId: topic.id }, { onSuccess: () => setMergeSource(null) })
                    }
                  />
                )
              ) : topic.mergedInto ? (
                <PillButton label="Undo join" onPress={() => unmerge.mutate(topic.id)} disabled={unmerge.isPending} className="py-2" />
              ) : (
                <>
                  <PillButton label="Join" onPress={() => setMergeSource(topic)} className="py-2" />
                  {topic.status !== 'pending' && (
                    <PillButton label="Reopen" onPress={() => reopen.mutate(topic.id)} disabled={reopen.isPending} className="py-2" />
                  )}
                </>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function DimensionRow({ dimension }: { dimension: AdminDimension }) {
  const rename = useRenameDimension();
  const hide = useHideDimension();
  const restore = useRestoreDimension();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(dimension.label);

  const save = () => {
    const label = draft.trim();
    if (!label || label === dimension.label) {
      setEditing(false);
      return;
    }
    rename.mutate({ dimensionId: dimension.id, label }, { onSuccess: () => setEditing(false) });
  };

  return (
    <View className={`${cardClass} gap-2`}>
      <View className="min-w-0">
        {editing ? (
          <Input
            value={draft}
            autoFocus
            onChangeText={setDraft}
            onSubmitEditing={save}
            maxLength={40}
            className="rounded-lg px-2.5 py-1.5"
          />
        ) : (
          <Text numberOfLines={1} className="text-sm font-sans-medium text-stone-900">
            {dimension.label}
          </Text>
        )}
        <Text className="mt-0.5 font-mono text-[11px] text-stone-500">
          {dimension.hidden ? 'hidden · ' : ''}
          {dimension.comment_count} comments · {dimension.sentiment}
        </Text>
      </View>

      <View className="flex-row flex-wrap items-center gap-1.5">
        {editing ? (
          <>
            <PillButton label={rename.isPending ? 'Saving…' : 'Save'} onPress={save} disabled={rename.isPending} className="py-2" />
            <PillButton label="Cancel" onPress={() => setEditing(false)} className="py-2" />
          </>
        ) : (
          <>
            <PillButton
              label="Rename"
              onPress={() => {
                setDraft(dimension.label);
                setEditing(true);
              }}
              className="py-2"
            />
            {dimension.hidden ? (
              <PillButton label="Show again" onPress={() => restore.mutate(dimension.id)} disabled={restore.isPending} className="py-2" />
            ) : (
              <ConfirmButton
                label="Hide"
                confirmLabel="Tap again to hide"
                disabled={hide.isPending}
                onConfirm={() => hide.mutate(dimension.id)}
              />
            )}
          </>
        )}
      </View>
    </View>
  );
}

function DimensionsTab() {
  const { data: dimensions = [], isLoading } = useAdminDimensions();

  if (isLoading) return <Muted>Loading…</Muted>;

  return (
    <View className="gap-2">
      <Muted>
        These are the options in the heatmap menu. Renaming one changes what people see. Hiding one takes it off the menu, and you
        can put it back.
      </Muted>
      {dimensions.map((dimension) => (
        <DimensionRow key={dimension.id} dimension={dimension} />
      ))}
    </View>
  );
}

function ContentTab() {
  const [text, setText] = useState('');
  const debouncedText = useDebouncedValue(text, 300);
  const [includeHidden, setIncludeHidden] = useState(true);
  const { data: comments = [], isLoading } = useAdminComments(debouncedText, includeHidden);
  const setHidden = useSetCommentHidden();

  return (
    <View className="gap-3">
      <Input value={text} onChangeText={setText} placeholder="Search comments…" returnKeyType="search" />
      <View className="flex-row items-center gap-3">
        <Switch
          value={includeHidden}
          onValueChange={setIncludeHidden}
          trackColor={{ true: colors.brand[500], false: colors.stone[300] }}
          thumbColor={colors.stone[900]}
        />
        <Muted>Show hidden ones too</Muted>
      </View>

      {isLoading ? (
        <Muted>Loading…</Muted>
      ) : comments.length === 0 ? (
        <Muted>No comments match that.</Muted>
      ) : (
        <View className="gap-2">
          {comments.map((comment) => (
            <View key={comment.id} className={cardClass}>
              <View className="flex-row items-start justify-between gap-3">
                <Text className={`flex-1 text-sm ${comment.isHidden ? 'text-stone-500 line-through' : 'text-stone-700'}`}>
                  {comment.comment.length > 240 ? `${comment.comment.slice(0, 240)}…` : comment.comment}
                </Text>
                {comment.isHidden ? (
                  <PillButton
                    label="Show"
                    onPress={() => setHidden.mutate({ commentId: comment.id, hidden: false })}
                    disabled={setHidden.isPending}
                    className="py-2"
                  />
                ) : (
                  <ConfirmButton
                    label="Hide"
                    confirmLabel="Tap again to hide"
                    disabled={setHidden.isPending}
                    onConfirm={() => setHidden.mutate({ commentId: comment.id, hidden: true })}
                  />
                )}
              </View>
              <PhotoStrip urls={comment.photoUrls} size={56} />
              <Text className="mt-1.5 font-mono text-[11px] text-stone-500">
                {comment.isHidden ? 'hidden · ' : ''}
                {formatRelativeTime(comment.createdAt)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function PipelineTab() {
  const { data: status, isLoading } = usePipelineStatus();
  const retrain = useForceRetrain();

  if (isLoading || !status) return <Muted>Loading…</Muted>;

  return (
    <View className="gap-4">
      <View className="flex-row flex-wrap justify-between gap-2">
        <Stat value={status.totalComments} label="Comments" />
        <Stat value={status.commentsSinceLastRun} label="New comments" />
        <Stat value={status.topicCount} label="Tags" />
        <Stat value={status.pendingReview} label="To review" />
      </View>

      <View className={cardClass}>
        <Text className="font-mono text-[11px] text-stone-500">
          last rebuilt {status.lastReclusteredAt ? formatRelativeTime(status.lastReclusteredAt) : 'never'}
          {status.unclassifiedSentiment > 0 ? ` · ${status.unclassifiedSentiment} comments not scored yet` : ''}
        </Text>
      </View>

      <View className="gap-2">
        <PrimaryButton
          label={retrain.isPending ? 'Rebuilding, this takes a minute…' : 'Rebuild tags'}
          onPress={() => retrain.mutate()}
          disabled={retrain.isPending}
          className="self-start"
        />
        <Muted>Looks at every comment again and works out the tags from scratch. New ones go to the review list.</Muted>
        {retrain.isError && <ErrorLine error={retrain.error} fallback="That did not work." />}
      </View>
    </View>
  );
}

function AuditTab() {
  const { data: entries = [], isLoading } = useAuditLog();

  if (isLoading) return <Muted>Loading…</Muted>;
  if (entries.length === 0) return <Muted>No admin actions recorded yet.</Muted>;

  return (
    <View className="gap-2">
      {entries.map((entry, i) => (
        <View key={i} className={cardClass}>
          <Text className="text-sm text-stone-900">
            {entry.action} {entry.targetType} #{entry.targetId}
          </Text>
          <Text className="font-mono text-[11px] text-stone-500">
            {formatRelativeTime(entry.createdAt)}
            {entry.after?.approvedLabel ? ` · "${String(entry.after.approvedLabel)}"` : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function AdminScreen() {
  const { isAuthenticated } = useAuth();
  const { isAdmin, overview, isLoading } = useIsAdmin();
  const [tab, setTab] = useState<Tab>('review');

  if (!isAuthenticated) return <Redirect href="/login" />;

  if (isLoading) {
    return (
      <Screen>
        <Muted>One moment…</Muted>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen>
        <Muted>You do not have access to this page.</Muted>
      </Screen>
    );
  }

  return (
    <Screen eyebrow="Admin" title="Admin">
      {overview && (
        <View className="flex-row flex-wrap justify-between gap-2">
          <Stat value={overview.totalComments} label="Comments" />
          <Stat value={overview.placesWithComments} label="Places" />
          <Stat value={overview.topicsByStatus.pending ?? 0} label="To review" />
          <Stat value={overview.placesWithApprovedTopics} label="Places with tags" />
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-6 border-b border-stone-900/10"
        contentContainerClassName="gap-1.5 px-6 pb-3"
      >
        {TABS.map((name) => (
          <Pressable
            key={name}
            onPress={() => setTab(name)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === name }}
            className={`rounded-full px-3.5 py-2 active:opacity-75 ${tab === name ? 'bg-brand-500' : 'bg-stone-900/[0.05]'}`}
          >
            <Text className={`font-mono text-[11px] uppercase tracking-[0.7px] ${tab === name ? 'text-brand-ink' : 'text-stone-500'}`}>
              {name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {tab === 'review' && <TopicReview />}
      {tab === 'topics' && <TopicsTab />}
      {tab === 'dimensions' && <DimensionsTab />}
      {tab === 'content' && <ContentTab />}
      {tab === 'pipeline' && <PipelineTab />}
      {tab === 'audit' && <AuditTab />}
    </Screen>
  );
}
