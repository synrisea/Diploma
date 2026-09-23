import { useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { useSubmitComment } from '../../hooks/useSubmitComment';
import { Input } from '../ui/Input';
import { PrimaryButton } from '../ui/Button';
import { ErrorBanner, errorMessage, Muted } from '../ui/Feedback';

export function CommentForm({ placeId }: { placeId: string }) {
  const { isAuthenticated } = useAuth();
  const submitComment = useSubmitComment(placeId);
  const [comment, setComment] = useState('');

  if (!isAuthenticated) {
    return <Muted>Log in to leave a comment for this place.</Muted>;
  }

  const handleSubmit = () => {
    const trimmed = comment.trim();
    if (!trimmed) return;

    submitComment.mutate(trimmed, {
      onSuccess: () => setComment(''),
    });
  };

  return (
    <View className="gap-2">
      <Input
        value={comment}
        onChangeText={setComment}
        placeholder="What's it like here?"
        multiline
        numberOfLines={3}
        maxLength={2000}
        textAlignVertical="top"
        className="min-h-[84px] px-3 py-2"
      />

      {submitComment.isError && <ErrorBanner message={errorMessage(submitComment.error)} />}

      <PrimaryButton
        label={submitComment.isPending ? 'Submitting…' : 'Submit comment'}
        onPress={handleSubmit}
        disabled={submitComment.isPending || !comment.trim()}
        className="self-start"
      />
    </View>
  );
}
