namespace Resonance.Connections.Application.Conversations.GetConversations;

public record ConversationSummaryDto(Guid ConversationId, Guid OtherUserId, string? LastMessage, DateTime? LastMessageAt);
