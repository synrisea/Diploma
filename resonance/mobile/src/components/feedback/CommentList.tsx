import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlaceComments } from '../../hooks/usePlaceComments';
import { useCommentAuthors } from '../../hooks/useCommentAuthors';
import { PhotoLightbox } from './PhotoLightbox';
import { PhotoStrip } from './PhotoStrip';
import { Avatar } from '../ui/Avatar';
import { Text } from '../ui/Text';
import { Muted } from '../ui/Feedback';
import { cardClass } from '../ui/styles';

export function CommentList({ placeId }: { placeId: string }) {
  const router = useRouter();
  const { data, isLoading, isError } = usePlaceComments(placeId);
  const { data: authors } = useCommentAuthors(data);
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);

  if (isLoading) return <Muted>Reading comments…</Muted>;
  if (isError) return <Text className="text-sm text-sentiment-negative">Couldn't load comments.</Text>;
  if (!data || data.length === 0) return <Muted>No comments yet — be the first to leave one.</Muted>;

  return (
    <>
      <View className="gap-2.5">
        {data.map((comment) => {
          const author = authors?.[comment.userId];
          const displayName = author?.displayName ?? 'Anonymous';

          return (
            <View key={comment.id} className={`${cardClass} p-3`}>
              <Pressable
                onPress={() => router.push({ pathname: '/users/[id]', params: { id: comment.userId } })}
                className="flex-row items-center gap-2 self-start active:opacity-80"
              >
                <Avatar displayName={displayName} avatarUrl={author?.avatarUrl} size="xs" />
                <Text className="text-sm font-sans-medium text-stone-900">{displayName}</Text>
              </Pressable>
              <Text className="mt-2 text-sm text-stone-700">{comment.comment}</Text>
              <PhotoStrip urls={comment.photoUrls} onExpand={setExpandedUrl} />
              <Text className="mt-1.5 font-mono text-[10px] text-stone-500">
                {new Date(comment.createdAt).toLocaleDateString()}
              </Text>
            </View>
          );
        })}
      </View>

      {expandedUrl && <PhotoLightbox url={expandedUrl} onClose={() => setExpandedUrl(null)} />}
    </>
  );
}
