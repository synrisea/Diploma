import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveTopic,
  hideDimension,
  forceRetrain,
  getAdminDimensions,
  getAdminOverview,
  getAdminTopics,
  getAuditLog,
  getPipelineStatus,
  mergeTopics,
  rejectTopic,
  renameDimension,
  reopenTopic,
  restoreDimension,
  searchComments,
  setCommentHidden,
  unmergeTopic,
} from '../api/admin';
import { useAuth } from '../auth/AuthContext';
import type { TopicStatus } from '../types/admin';

export function useIsAdmin() {
  const { isAuthenticated, getValidAccessToken } = useAuth();

  const query = useQuery({
    queryKey: ['admin-overview'],
    queryFn: async () => getAdminOverview(await getValidAccessToken()),
    enabled: isAuthenticated,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  return { isAdmin: query.isSuccess, overview: query.data, isLoading: query.isLoading };
}

export function useAdminTopics(status?: TopicStatus) {
  const { isAuthenticated, getValidAccessToken } = useAuth();

  return useQuery({
    queryKey: ['admin-topics', status ?? 'all'],
    queryFn: async () => getAdminTopics(await getValidAccessToken(), status),
    enabled: isAuthenticated,
    retry: false,
  });
}

export function useAdminDimensions() {
  const { isAuthenticated, getValidAccessToken } = useAuth();

  return useQuery({
    queryKey: ['admin-dimensions'],
    queryFn: async () => getAdminDimensions(await getValidAccessToken()),
    enabled: isAuthenticated,
    retry: false,
  });
}

export function usePipelineStatus() {
  const { isAuthenticated, getValidAccessToken } = useAuth();

  return useQuery({
    queryKey: ['admin-pipeline'],
    queryFn: async () => getPipelineStatus(await getValidAccessToken()),
    enabled: isAuthenticated,
    retry: false,
  });
}

export function useAuditLog() {
  const { isAuthenticated, getValidAccessToken } = useAuth();

  return useQuery({
    queryKey: ['admin-audit'],
    queryFn: async () => getAuditLog(await getValidAccessToken()),
    enabled: isAuthenticated,
    retry: false,
  });
}

function useAdminMutation<TArgs>(run: (token: string, args: TArgs) => Promise<void>) {
  const { getValidAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: TArgs) => run(await getValidAccessToken(), args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-topics'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dimensions'] });
      queryClient.invalidateQueries({ queryKey: ['place-topics'] });
    },
  });
}

export function useApproveTopic() {
  return useAdminMutation<{ topicId: number; label: string; expectedComputedAt: string }>(
    (token, a) => approveTopic(token, a.topicId, a.label, a.expectedComputedAt),
  );
}

export function useRejectTopic() {
  return useAdminMutation<number>((token, topicId) => rejectTopic(token, topicId));
}

export function useReopenTopic() {
  return useAdminMutation<number>((token, topicId) => reopenTopic(token, topicId));
}

export function useMergeTopics() {
  return useAdminMutation<{ sourceId: number; targetId: number }>(
    (token, a) => mergeTopics(token, a.sourceId, a.targetId),
  );
}

export function useRenameDimension() {
  return useAdminMutation<{ dimensionId: number; label: string }>(
    (token, a) => renameDimension(token, a.dimensionId, a.label),
  );
}

export function useHideDimension() {
  return useAdminMutation<number>((token, dimensionId) => hideDimension(token, dimensionId));
}

export function useRestoreDimension() {
  return useAdminMutation<number>((token, dimensionId) => restoreDimension(token, dimensionId));
}

export function useUnmergeTopic() {
  return useAdminMutation<number>((token, topicId) => unmergeTopic(token, topicId));
}

export function useForceRetrain() {
  const { getValidAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => forceRetrain(await getValidAccessToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['admin-topics'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
  });
}

export function useAdminComments(text: string, includeHidden: boolean) {
  const { isAuthenticated, getValidAccessToken } = useAuth();

  return useQuery({
    queryKey: ['admin-comments', text, includeHidden],
    queryFn: async () => searchComments(await getValidAccessToken(), text, includeHidden),
    enabled: isAuthenticated,
    retry: false,
  });
}

export function useSetCommentHidden() {
  const { getValidAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { commentId: string; hidden: boolean }) =>
      setCommentHidden(await getValidAccessToken(), args.commentId, args.hidden),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-comments'] }),
  });
}
