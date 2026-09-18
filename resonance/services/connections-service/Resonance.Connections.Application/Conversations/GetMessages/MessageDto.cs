namespace Resonance.Connections.Application.Conversations.GetMessages;

public record MessageDto(Guid Id, Guid SenderId, string Body, DateTime CreatedAt);
